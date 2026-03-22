/**
 * PromoSnap Shopping Assistant — OpenAI-powered universal commerce search.
 *
 * Architecture:
 *   User query → OpenAI Responses API (with tools) → Local catalog + Web search
 *   → Normalized results → Decision layer → Affiliate routing → Response
 *
 * Tools available to the AI:
 *   1. searchLocalCatalog — Search verified PromoSnap catalog
 *   2. compareProducts — Compare products by use case
 *   3. getBuySignal — "Is now a good time to buy?"
 *   4. web_search — OpenAI built-in web search for products not in catalog
 *
 * The AI NEVER invents products or prices. It reasons over real data.
 */

import { logger } from '@/lib/logger'
import { buildAffiliateUrl } from '@/lib/affiliate'
import { getFlag } from '@/lib/config/feature-flags'
import { classifyIntent, getIntentTone } from './intent-classifier'
import { buildIntentPromptSection } from './response-composer'
import { trackAssistantInteraction } from './assistant-metrics'
import { enrichProducts } from './product-enrichment'
import { generateFollowUps, generateAlertSuggestions } from './follow-up-generator'
import type { StructuredBlock, EnrichedProduct } from './structured-response'

const log = logger.child({ module: 'shopping-assistant' })

// Read at runtime, not module load (Vercel edge may not have env at import time)
function getOpenAIKey(): string | undefined { return process.env.OPENAI_API_KEY }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'

// ── Types ──────────────────────────────────────────────────────────────────

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantResponse {
  message: string
  products?: AssistantProduct[]
  /** Structured blocks for rich UI rendering */
  blocks?: StructuredBlock[]
  /** Which data sources were used */
  dataSources: ('catalog' | 'web' | 'comparison')[]
  /** Tracking metadata */
  meta: {
    toolsUsed: string[]
    catalogHits: number
    webUsed: boolean
    durationMs: number
  }
}

export type MonetizationStatus = 'verified' | 'best_effort' | 'none'

export interface AssistantProduct {
  name: string
  price?: number
  originalPrice?: number
  discount?: number
  source: string
  url: string
  affiliateUrl: string
  imageUrl?: string
  /** Whether this product comes from our verified catalog */
  isFromCatalog: boolean
  /** Confidence in the data: verified (catalog), resolved (matched external), raw (web result) */
  confidence: 'verified' | 'resolved' | 'raw'
  /** Can we monetize this clickout? */
  monetization: MonetizationStatus
  buySignal?: string
  slug?: string
}

// ── Tool Definitions ───────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function' as const,
    name: 'searchLocalCatalog',
    description: 'Busca produtos no catálogo verificado do PromoSnap com preços reais e comparados. Use SEMPRE que o usuário perguntar sobre um produto específico ou categoria.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca (ex: "notebook até 3000", "iPhone 15")' },
        category: { type: 'string', description: 'Categoria opcional (celulares, notebooks, audio, smart-tvs, casa, games, etc.)' },
        maxPrice: { type: 'number', description: 'Preço máximo em R$' },
        limit: { type: 'number', description: 'Número de resultados (default 5)' },
      },
      required: ['query'],
    },
  },
  {
    type: 'function' as const,
    name: 'compareByUseCase',
    description: 'Compara produtos de uma categoria por caso de uso específico (fotografia, gaming, trabalho, estudo, etc.). Retorna ranking explicável.',
    parameters: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'Categoria (celulares, notebooks, audio, smart-tvs)' },
        useCase: { type: 'string', description: 'Caso de uso (fotografia, bateria, gaming, custo-beneficio, trabalho, estudo, portatil, musica, exercicio, escritorio, filmes, gaming-tv, sala-grande)' },
      },
      required: ['category', 'useCase'],
    },
  },
  {
    type: 'function' as const,
    name: 'searchGoogleShopping',
    description: 'Busca produtos em TODAS as lojas brasileiras via Google Shopping (Amazon, ML, Shopee, Magalu, KaBuM, etc.). Use quando o catálogo local não tiver resultados suficientes ou quando o usuário quiser ver opções de várias lojas.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Termo de busca' },
        maxPrice: { type: 'number', description: 'Preço máximo em R$' },
        limit: { type: 'number', description: 'Número de resultados (default 8)' },
      },
      required: ['query'],
    },
  },
]

const SYSTEM_PROMPT = `Você é o assistente de compras do PromoSnap — um comparador de preços brasileiro. Sua função é ajudar o usuário a encontrar as MELHORES OPORTUNIDADES de compra com dados reais de preço e histórico.

## PERSONALIDADE
Você é direto, entusiasmado com boas ofertas e honesto sobre preços ruins. Fale como um amigo expert que CAÇA OFERTAS e quer genuinamente ajudar — não como um robô listando specs. Use linguagem natural, brasileira. Tenha opinião forte. Diga "esse tá imperdível", "essa economia é real", "esse tá caro, não vale agora". Seu papel é de CONSULTOR DE COMPRA, não de catálogo.

## REGRAS ABSOLUTAS
1. Use APENAS os produtos de RESULTADOS ENCONTRADOS. NUNCA invente produtos, preços ou especificações.
2. Se o usuário deu um orçamento, mostre APENAS produtos dentro desse limite. Sem exceções.
3. Priorize [VERIFICADO] (catálogo PromoSnap, preço confirmado e monitorado).
4. NUNCA recomende usados, seminovos, classificados (OLX, Enjoei).
5. Responda em português brasileiro.

## PRINCÍPIO CENTRAL: LIDERE COM A OPORTUNIDADE
Cada recomendação deve começar pelo DEAL, não pela spec. O usuário quer saber:
1. "Quanto eu economizo?" → Sempre calcule a economia em R$ (ex: "você economiza R$ 300 vs. o preço normal")
2. "Esse preço é bom?" → Compare com histórico (ex: "mais barato que nos últimos 90 dias")
3. "Por que agora?" → Crie urgência real quando há dados (ex: "última vez nesse preço foi há 47 dias")

## COMO ESTRUTURAR SUA RESPOSTA

### Para buscas por categoria/orçamento ("melhor celular até 2000"):
1. **Abra com a oportunidade** (1-2 frases): Destaque o MELHOR DEAL encontrado, com economia em R$. Ex: "Achei uma oportunidade real: o Galaxy A55 está R$ 300 mais barato que o normal."
2. **Sua recomendação principal**: Nome em **negrito** + preço + loja + POR QUÊ é um bom deal (economia, histórico, desconto real). Specs são SECUNDÁRIAS — mencione 2-3 que importam, não uma lista.
3. **Alternativas** (2-3): Cada uma com 1 frase que COMPARA com a principal: "Custa menos", "Entrega mais", "Melhor custo-benefício".
4. **Chamada para ação**: O que o usuário deve fazer AGORA (comprar, criar alerta, esperar).

### Para perguntas "vale a pena?" ou comparação:
1. **Resposta direta**: "Sim, é hora de comprar — está no menor preço dos últimos 3 meses" ou "Agora não — o preço subiu 15% recentemente, sugiro criar um alerta."
2. **Justificativa com números reais**: Economia em R$, posição vs. média, tendência.
3. **Ação clara**: Comprar / Esperar / Criar alerta com preço-alvo.

### Para busca de produto específico:
1. **Quanto está vs. quanto deveria**: "Está R$ 1.299 mas já foi R$ 999 há 2 meses."
2. **Melhor oferta encontrada**: A mais barata com economia calculada.
3. **Timing**: Comprar agora ou esperar? Se esperar, qual preço-alvo pro alerta?

## REGRAS DE COPY (OBRIGATÓRIO)
- LIDERE com o desconto/economia, não com specs técnicas
- Use **negrito** para nomes de produtos, preços-chave e ECONOMIA
- Sempre que houver desconto, calcule economia em R$: "você economiza **R$ 250**"
- Use bullet points (•) para listar alternativas
- NÃO use tabelas, NÃO use emojis excessivos (máximo 2-3)
- Máximo 3-5 produtos — seja seletivo, recomende apenas os que VALEM
- Cada produto DEVE ter preço + loja + razão de ser deal (ou não)
- Nunca liste specs sem contexto — diga POR QUÊ cada spec importa pro usuário

## SINAIS DE COMPRA → COMO COMUNICAR
- "MENOR PREÇO HISTÓRICO" → 🔥 Lidere com isso! "Esse é o menor preço desde que monitoramos — oportunidade rara."
- "X% abaixo da média" → Calcule em R$: "Está X% abaixo da média, ou seja, **R$ Y mais barato** que o normal."
- "Preço estável" → "Preço estável — não é urgente. Se quiser economizar mais, crie um alerta."
- "Preço subindo" → "Atenção: o preço subiu X% recentemente. Se precisa, compre logo. Se não, espere normalizar."
- Score 80+/100 → "Oferta nota 85/100 — preço bom + loja confiável + produto bem avaliado."
- Score <60/100 → Não destaque o score, foque em alternativas melhores.

## EXEMPLO DE BOA RESPOSTA (para "melhor fone bluetooth barato"):
---
Achei uma boa oportunidade: o **Basike Fone OWS** está com **40% OFF** na Amazon — de R$ 200 por **R$ 121**, ou seja, você economiza **R$ 79**. É o tipo de desconto que vale aproveitar.

**Minha recomendação: Basike Fone OWS** — **R$ 121,00** na Amazon. Esse desconto de 40% é real (confirmado pelo nosso histórico). Fone com gancho pra esporte, 30h de bateria e resistente a suor (IPX4). Pra quem treina, é o que importa.

Se o orçamento é mais apertado:
• **Fone M10** — **R$ 20,99** na Shopee. Economia máxima, mas qualidade de som e durabilidade são limitadas. Pra uso casual, quebra um galho.
• **Airs Pro TWS** — **R$ 24,99** na Shopee, 64% OFF. Preço agressivo, mas em fones muito baratos o cancelamento de ruído é mais marketing do que realidade.

💡 Meu conselho: se puder investir os R$ 121, o Basike entrega muito mais por real gasto. Os modelos de R$ 20 funcionam, mas a diferença de experiência é grande.
---

## CONVERSA COM HISTÓRICO
Se houver mensagens anteriores, o usuário está fazendo um follow-up. Use o contexto:
- Se pediu "e esse?" ou "e o segundo?", refira-se aos produtos da resposta anterior
- Se pediu "mais barato", busque abaixo do preço dos que já mostrou
- Se pediu "comparar esses dois", faça uma comparação detalhada
- Seja natural na continuidade — não repita a introdução toda vez

## CONHECIMENTO POR CATEGORIA

### Celulares
Critérios-chave: tela (AMOLED > LCD), processador (Snapdragon 8 > Dimensity > Helio), câmera (MP + sensor), bateria (4500mAh+), armazenamento (128GB mínimo em 2026), atualizações (Samsung 5 anos, Apple 6+, Xiaomi 3-4).
Marcas tier: Premium (Apple, Samsung S) → Custo-benefício (Samsung A, Xiaomi, Motorola) → Econômico (Realme, Poco).

### Notebooks
Critérios-chave: processador (i5/Ryzen 5 mínimo para trabalho), RAM (8GB mínimo, 16GB ideal), SSD (obrigatório, 256GB+), tela (IPS > TN, 15.6" trabalho, 14" portátil), bateria (6h+ real), peso (<2kg portátil).
Para trabalho: ThinkPad, Dell Latitude. Custo-benefício: Acer, Lenovo IdeaPad. Para criação: MacBook, Dell XPS.

### Fones
Critérios-chave: tipo (TWS vs over-ear vs in-ear), ANC (cancelamento de ruído), driver (40mm+), bateria (6h+ TWS, 30h+ over-ear), codec (LDAC > aptX > AAC > SBC), IP rating (exercício precisa IPX4+).
TWS top: AirPods Pro, Galaxy Buds, Sony WF. Over-ear: Sony WH-1000XM, AirPods Max. Custo-benefício: Edifier, QCY, Haylou.

### Smart TVs
Critérios-chave: painel (OLED > QLED > LED), resolução (4K obrigatório 50"+), HDR (Dolby Vision > HDR10+), sistema (Google TV > Tizen > webOS), refresh (120Hz para gaming), tamanho (sala: 55-65", quarto: 32-43").

### Air Fryers / Casa
Critérios-chave: capacidade (4L+ para família, 2-3L individual), potência (1500W+), material (inox > plástico), facilidade de limpeza, funcionalidades extras (grill, desidratador).

## CONTEXTO DA PLATAFORMA
- PromoSnap compara Amazon, Mercado Livre, Shopee, Magazine Luiza e Shein
- Produtos [VERIFICADO] têm histórico de preços de 90 dias
- Os cards de produto aparecem automaticamente abaixo da sua resposta — NÃO precisa repetir links ou URLs
- Quando sugerir alerta de preço, o card de alerta também aparece automaticamente`

// ── Helpers ────────────────────────────────────────────────────────────────

function makeResponse(message: string, startTime: number, extra?: Partial<AssistantResponse>): AssistantResponse {
  return {
    message,
    dataSources: extra?.dataSources || [],
    meta: {
      toolsUsed: extra?.meta?.toolsUsed || [],
      catalogHits: extra?.meta?.catalogHits || 0,
      webUsed: extra?.meta?.webUsed || false,
      durationMs: Date.now() - startTime,
    },
    products: extra?.products,
  }
}

// ── Core Function ──────────────────────────────────────────────────────────

export function isAIConfigured(): boolean {
  return !!getOpenAIKey()
}

/**
 * Process a shopping query through the AI assistant.
 * Uses OpenAI Responses API with function calling + web search.
 */
export async function processShoppingQuery(
  userMessage: string,
  conversationHistory: AssistantMessage[] = []
): Promise<AssistantResponse> {
  const startTime = Date.now()
  const meta = { toolsUsed: [] as string[], catalogHits: 0, webUsed: false, durationMs: 0 }

  const OPENAI_API_KEY = getOpenAIKey()
  if (!OPENAI_API_KEY) {
    return {
      message: 'O assistente de compras não está configurado. Configure OPENAI_API_KEY para ativar.',
      dataSources: [],
      meta: { ...meta, durationMs: Date.now() - startTime },
    }
  }

  try {
    // ── Classify intent FIRST — drives search, prompt, and copy ───────────
    const intent = classifyIntent(userMessage)
    const intentTone = getIntentTone(intent)
    const intentPromptSection = buildIntentPromptSection(intent)

    log.info('intent.classified', {
      query: userMessage.slice(0, 50),
      type: intent.type,
      mode: intent.mode,
      budget: intent.budget,
      brands: intent.brands,
      confidence: intent.confidence,
    })

    // ── Pre-fetch results BEFORE calling AI (saves 1 round trip) ──────────
    const [localResults, shoppingResults, marketplaceResults, expandedResults] = await Promise.all([
      executeLocalSearch(userMessage, intent.categories?.[0], intent.budget?.max, Math.max(intentTone.maxItems, 8)).catch(() => []),
      executeGoogleShoppingSearch(userMessage, intent.budget?.max, 10).catch(() => []),
      executeMarketplaceSearch(userMessage, intent.budget?.max, 8).catch(() => []),
      executeExpandedSearch(userMessage, intent.budget?.max, intent.categories?.[0]).catch(() => []),
    ])

    const merged = deduplicateProducts([...localResults, ...shoppingResults, ...marketplaceResults, ...expandedResults])
    // Enforce budget: remove products above maxPrice (API filters may fail)
    const budgetFiltered = intent.budget?.max
      ? merged.filter(p => !p.price || p.price <= intent.budget!.max!)
      : merged

    // Track which results came from expanded search
    const hasExpandedSources = expandedResults.length > 0
    const catalogCount = budgetFiltered.filter(p => p.isFromCatalog).length
    const externalCount = budgetFiltered.filter(p => !p.isFromCatalog).length

    // ── Enrich products with price history, buy signals, specs, deal scores ─
    const enrichedProducts: EnrichedProduct[] = await enrichProducts(budgetFiltered, intent.categories?.[0])
      .catch(() => budgetFiltered.map(p => ({ ...p, dealScore: 50 })) as EnrichedProduct[])
    const allProducts = enrichedProducts as (AssistantProduct & Partial<EnrichedProduct>)[]

    // Build rich context for GPT — DEAL-FIRST structure: lead with opportunity, not specs
    const productContext = allProducts.length > 0
      ? `\n\n---\nRESULTADOS ENCONTRADOS (${allProducts.length} produtos — use APENAS estes dados):\n\n${allProducts.map((p, i) => {
          const ep = p as EnrichedProduct
          const parts: string[] = []
          parts.push(`${i + 1}. **${p.name}**`)
          // Price + source + verification
          const sourceTag = p.isFromCatalog ? '[VERIFICADO]' : '[LOJA PARCEIRA]'
          parts.push(`   💰 Preço: R$ ${p.price?.toFixed(2) || '?'} em ${p.source} ${sourceTag}`)
          // DEAL SIGNALS FIRST — what makes this a good (or bad) deal
          if (p.discount && p.discount > 0 && p.originalPrice) {
            const savingsReais = (p.originalPrice - (p.price || 0)).toFixed(2)
            parts.push(`   🏷️ ${p.discount}% OFF — era R$ ${p.originalPrice.toFixed(2)}, economia de R$ ${savingsReais}`)
          } else if (p.discount && p.discount > 0) {
            parts.push(`   🏷️ ${p.discount}% OFF`)
          }
          if (ep.priceContext?.isHistoricalLow) parts.push('   🔥 MENOR PREÇO HISTÓRICO — oportunidade rara, destaque isso com urgência')
          if (ep.priceContext?.pctBelowAvg && ep.priceContext.pctBelowAvg > 0) {
            const avgSavings = ep.priceContext.avg30d && p.price ? (ep.priceContext.avg30d - p.price).toFixed(2) : null
            parts.push(`   📉 ${ep.priceContext.pctBelowAvg}% abaixo da média de 30d${avgSavings ? ` (economia de R$ ${avgSavings} vs. preço normal)` : ''}`)
          }
          if (ep.priceContext?.trend === 'up') parts.push('   ⚠️ Preço SUBINDO — mencione que o usuário deve decidir rápido ou criar alerta')
          else if (ep.priceContext?.trend === 'stable') parts.push('   ➡️ Preço estável — sem urgência')
          if (ep.buySignal) parts.push(`   Sinal: ${ep.buySignal.headline} (${ep.buySignal.level})`)
          if (ep.dealScore) parts.push(`   Score da oferta: ${ep.dealScore}/100${ep.dealScore >= 80 ? ' (excelente deal)' : ep.dealScore >= 70 ? ' (bom deal)' : ep.dealScore >= 50 ? ' (deal mediano)' : ' (deal fraco — evite destacar)'}`)
          // Specs LAST — context only, not the lead
          if (ep.specs && ep.specs.length > 0) parts.push(`   Specs: ${ep.specs.map(s => `${s.label}: ${s.value}${s.unit || ''}`).join(' | ')}`)
          return parts.join('\n')
        }).join('\n\n')}\n---`
      : '\n\n---\nNenhum resultado encontrado. Sugira que o usuário tente termos diferentes ou use a busca em /busca.\n---'

    // ── Consultative framing when expanded search contributed results ──────
    const expandedFramingPrompt = hasExpandedSources ? `

## BUSCA AMPLIADA ATIVA
Você tem ${catalogCount} produtos do catálogo verificado PromoSnap e ${externalCount} de lojas parceiras.
Siga estas regras adicionais:
- Priorize SEMPRE os [VERIFICADO] — são produtos com preço monitorado e confiável.
- Apresente os [LOJA PARCEIRA] como alternativas complementares: "Também encontramos em lojas parceiras..."
- NUNCA diga "busca ampliada" ao usuário. Use linguagem natural: "ampliamos a pesquisa", "encontramos em mais lojas", "há alternativas em lojas parceiras".
- Se só tem [LOJA PARCEIRA] (sem verificados), seja transparente: "Não temos esse produto no catálogo monitorado, mas encontramos opções em lojas parceiras — os preços podem variar."
- Para [LOJA PARCEIRA], sempre mencione a loja e note que o preço é "no momento da consulta" (não monitorado).
- Se um [LOJA PARCEIRA] tem preço muito menor que um [VERIFICADO] similar, sugira verificar diretamente na loja.
` : ''

    // Enhanced system prompt with intent understanding + expanded framing
    const enhancedSystemPrompt = SYSTEM_PROMPT + intentPromptSection + expandedFramingPrompt

    const messages = [
      { role: 'system' as const, content: enhancedSystemPrompt },
      ...conversationHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: userMessage + productContext },
    ]

    // Single API call — no tool calling needed (data already fetched)
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
        max_tokens: 2500,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      log.error('openai.chat.failed', { status: response.status, error: errText.slice(0, 200) })
      return makeResponse('Não foi possível conectar ao assistente.', startTime)
    }

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content || 'Sem resposta.'

    const dataSources: AssistantResponse['dataSources'] = []
    if (localResults.length > 0) dataSources.push('catalog')
    if (shoppingResults.length > 0 || marketplaceResults.length > 0 || expandedResults.length > 0) dataSources.push('web')

    log.info('ai.chat.success', {
      query: userMessage.slice(0, 50),
      intent: intent.type,
      localHits: localResults.length,
      shoppingHits: shoppingResults.length,
      durationMs: Date.now() - startTime,
    })

    // ── Track assistant metrics (non-blocking) ───────────────────────────
    const affiliateCount = allProducts.filter(p => p.monetization === 'verified').length
    trackAssistantInteraction({
      query: userMessage,
      intentType: intent.type,
      productsShown: allProducts.length,
      productsFromCatalog: localResults.length,
      productsFromExternal: shoppingResults.length,
      affiliateCoverage: allProducts.length > 0 ? affiliateCount / allProducts.length : 0,
      durationMs: Date.now() - startTime,
      timestamp: new Date(),
    }).catch(() => {})

    // ── Fire-and-forget: auto-import external products into catalog ──────
    // Products found via Google Shopping that aren't in our catalog get
    // imported in background. Next time someone searches, they'll be local.
    if (shoppingResults.length > 0) {
      autoImportExternalProducts(shoppingResults).catch(err => {
        log.debug('auto-import.background-failed', { error: String(err) })
      })
    }

    // ── Build structured blocks for rich UI ───────────────────────────────
    const blocks: StructuredBlock[] = []

    // Text block (AI narrative)
    blocks.push({ type: 'text', content: message })

    // Product cards block (enriched) — cap at 5 to match AI's 3-5 selection
    if (enrichedProducts.length > 0) {
      const maxCards = Math.min(intentTone.maxItems, 5)
      blocks.push({
        type: 'product_cards',
        products: enrichedProducts.slice(0, maxCards),
        layout: enrichedProducts.length <= 3 ? 'list' : 'grid',
      })
    }

    // Deal verdict block — for "vale a pena?" / "worth_it" queries or when we have strong signals
    if (intent.type === 'worth_it' || intent.type === 'specific_product' || intent.type === 'has_promo') {
      const topProduct = enrichedProducts[0]
      if (topProduct?.priceContext || topProduct?.buySignal) {
        const verdict = buildDealVerdict(topProduct)
        if (verdict) blocks.push(verdict)
      }
    }

    // Comparison table block — for "X vs Y" / compare_models queries
    if (intent.type === 'compare_models' && enrichedProducts.length >= 2) {
      const comparisonBlock = buildComparisonTable(enrichedProducts.slice(0, 3))
      if (comparisonBlock) blocks.push(comparisonBlock)
    }

    // Alert suggestions (for products not at historical low)
    const alertSuggestions = generateAlertSuggestions(enrichedProducts)
    for (const alert of alertSuggestions) {
      blocks.push(alert)
    }

    // Follow-up buttons
    const followUps = generateFollowUps(intent, enrichedProducts, userMessage)
    if (followUps.length > 0) {
      blocks.push({ type: 'follow_up_buttons', suggestions: followUps })
    }

    return {
      message,
      products: allProducts.length > 0 ? allProducts : undefined,
      blocks,
      dataSources,
      meta: {
        toolsUsed: ['searchLocalCatalog', ...(shoppingResults.length > 0 ? ['searchGoogleShopping'] : [])],
        catalogHits: localResults.length,
        webUsed: shoppingResults.length > 0,
        durationMs: Date.now() - startTime,
      },
    }
  } catch (err) {
    log.error('shopping-assistant.failed', { error: err })
    return makeResponse('Desculpe, houve um erro ao processar sua busca. Tente novamente ou use a busca tradicional.', startTime)
  }
}

/**
 * Fallback to Chat Completions API (more widely available).
 */
async function fallbackToChatCompletions(
  messages: { role: string; content: string }[]
): Promise<AssistantResponse> {
  const apiKey = getOpenAIKey()
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        tools: TOOLS.filter(t => t.type === 'function').map(t => ({
          type: 'function',
          function: { name: (t as any).name, description: (t as any).description, parameters: (t as any).parameters },
        })),
        // Force the AI to call searchLocalCatalog first — never let it skip tools
        tool_choice: 'required',
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      log.error('openai.chat.failed', { status: response.status, error: errText.slice(0, 200) })
      return makeResponse('Não foi possível conectar ao assistente. Use a busca tradicional em /busca.', 0)
    }

    const data = await response.json()
    const choice = data.choices?.[0]

    if (!choice) {
      return makeResponse('Resposta vazia do assistente. Tente reformular sua pergunta.', 0)
    }

    // Handle tool calls
    if (choice.finish_reason === 'tool_calls' && choice.message?.tool_calls) {
      return await handleToolCalls(choice.message.tool_calls, messages)
    }

    return makeResponse(choice.message?.content || 'Sem resposta.', 0)
  } catch (err) {
    log.error('chat-completions.failed', { error: err })
    return makeResponse('Erro ao processar. Tente a busca tradicional em /busca.', 0)
  }
}

/**
 * Handle tool calls from the AI — execute local functions and return results.
 */
async function handleToolCalls(
  toolCalls: any[],
  originalMessages: { role: string; content: string }[]
): Promise<AssistantResponse> {
  const toolResults: any[] = []
  const collectedProducts: AssistantProduct[] = []

  for (const call of toolCalls) {
    const args = JSON.parse(call.function.arguments || '{}')

    if (call.function.name === 'searchLocalCatalog') {
      const results = await executeLocalSearch(args.query, args.category, args.maxPrice, args.limit)
      toolResults.push({
        tool_call_id: call.id,
        role: 'tool',
        content: JSON.stringify(results),
      })
      collectedProducts.push(...results.map(r => ({
        ...r,
        isFromCatalog: true,
      })))
    } else if (call.function.name === 'compareByUseCase') {
      const results = await executeUseCaseComparison(args.category, args.useCase)
      toolResults.push({
        tool_call_id: call.id,
        role: 'tool',
        content: JSON.stringify(results),
      })
    } else if (call.function.name === 'searchGoogleShopping') {
      const results = await executeGoogleShoppingSearch(args.query, args.maxPrice, args.limit)
      toolResults.push({
        tool_call_id: call.id,
        role: 'tool',
        content: JSON.stringify(results),
      })
      collectedProducts.push(...results)
    }
  }

  // Send tool results back to get final response
  const apiKey = getOpenAIKey()
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          ...originalMessages,
          { role: 'assistant', content: null, tool_calls: toolCalls },
          ...toolResults,
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    })

    const data = await response.json()
    const finalMessage = data.choices?.[0]?.message?.content || 'Sem resposta.'

    const dataSources: AssistantResponse['dataSources'] = []
    if (collectedProducts.some(p => p.isFromCatalog)) dataSources.push('catalog')

    return {
      message: finalMessage,
      products: collectedProducts.length > 0 ? collectedProducts : undefined,
      dataSources,
      meta: { toolsUsed: toolCalls.map((c: any) => c.function.name), catalogHits: collectedProducts.length, webUsed: false, durationMs: 0 },
    }
  } catch {
    return {
      message: 'Erro ao processar resultados. Tente novamente.',
      products: collectedProducts.length > 0 ? collectedProducts : undefined,
      dataSources: ['catalog'],
      meta: { toolsUsed: [], catalogHits: 0, webUsed: false, durationMs: 0 },
    }
  }
}

// ── Tool Implementations ───────────────────────────────────────────────────

async function executeLocalSearch(
  query: string,
  category?: string,
  maxPrice?: number,
  limit: number = 5
): Promise<AssistantProduct[]> {
  try {
    // Direct DB call instead of self-referencing HTTP (avoids Vercel serverless deadlock)
    const { searchProducts } = await import('@/lib/search/engine')
    const result = await searchProducts({
      query,
      category: category || undefined,
      maxPrice: maxPrice || undefined,
      limit,
      sortBy: 'relevance',
    })

    const products = result.products || []

    return products.slice(0, limit).map((p: any) => {
      const hasAffiliate = p.bestOffer?.affiliateUrl && p.bestOffer.affiliateUrl !== '#'
      // Always provide a clickout/affiliate URL — never link to internal product page
      const offerId = p.bestOffer?.offerId
      const clickoutUrl = offerId ? `${APP_URL}/api/clickout/${offerId}?page=assistant` : `${APP_URL}/produto/${p.slug}`
      return {
        name: p.name,
        price: p.bestOffer?.price,
        originalPrice: p.bestOffer?.originalPrice,
        discount: p.bestOffer?.discount,
        source: p.bestOffer?.sourceName || 'PromoSnap',
        url: `${APP_URL}/produto/${p.slug}`,
        affiliateUrl: hasAffiliate ? p.bestOffer.affiliateUrl : clickoutUrl,
        imageUrl: p.imageUrl,
        isFromCatalog: true,
        confidence: 'verified' as const,
        monetization: (hasAffiliate ? 'verified' : 'best_effort') as MonetizationStatus,
        slug: p.slug,
      }
    })
  } catch (err) {
    log.error('local-search.failed', { query, error: err })
    return []
  }
}

async function executeUseCaseComparison(
  category: string,
  useCase: string
): Promise<any> {
  try {
    // Direct call instead of self-referencing HTTP
    const { getCategoryConfig, rankByUseCase } = await import('@/lib/comparison/category-specs')
    const config = getCategoryConfig(category)
    if (!config) return { error: `Categoria "${category}" não configurada para comparação` }

    const uc = config.useCases.find(u => u.slug === useCase)
    if (!uc) return { error: `Caso de uso "${useCase}" não encontrado`, useCases: config.useCases.map(u => u.slug) }

    return { category: config.name, useCase: { slug: useCase, label: uc.label, description: uc.description } }
  } catch {
    return { error: 'Falha ao comparar produtos' }
  }
}

async function executeGoogleShoppingSearch(
  query: string,
  maxPrice?: number,
  limit: number = 8
): Promise<AssistantProduct[]> {
  try {
    const { connectorRegistry, resolveCandidates, candidateToAssistantProduct } = await import('./candidate-resolver')

    const connector = connectorRegistry.get('google-shopping')
    if (!connector || !connector.isReady()) {
      log.debug('google-shopping.not-ready')
      return []
    }

    const rawResults = await connector.search(query, { maxPrice, limit })
    if (rawResults.length === 0) return []

    // Resolve candidates (normalize, dedup, monetize)
    const resolved = resolveCandidates(rawResults)

    log.info('google-shopping.resolved', {
      query,
      raw: rawResults.length,
      resolved: resolved.length,
      monetizable: resolved.filter(r => r.monetization !== 'none').length,
    })

    return resolved.slice(0, limit).map(candidateToAssistantProduct)
  } catch (err) {
    log.error('google-shopping.failed', { query, error: err })
    return []
  }
}

// ── Marketplace Direct Search (ML + Shopee) ──────────────────────────────

async function executeMarketplaceSearch(
  query: string,
  maxPrice?: number,
  limit: number = 4
): Promise<AssistantProduct[]> {
  try {
    const { connectorRegistry, resolveCandidates, candidateToAssistantProduct } = await import('./candidate-resolver')

    const connectors = ['mercadolivre-search', 'shopee-search', 'magalu-search']
      .map(slug => connectorRegistry.get(slug))
      .filter((c): c is NonNullable<typeof c> => !!c && c.isReady())

    if (connectors.length === 0) return []

    const allResults = await Promise.all(
      connectors.map(c => c.search(query, { maxPrice, limit: Math.ceil(limit / connectors.length) }).catch(() => []))
    )

    const rawResults = allResults.flat()
    if (rawResults.length === 0) return []

    const resolved = resolveCandidates(rawResults)

    log.info('marketplace-search.resolved', {
      query,
      connectors: connectors.map(c => c.slug),
      raw: rawResults.length,
      resolved: resolved.length,
    })

    return resolved.slice(0, limit).map(candidateToAssistantProduct)
  } catch (err) {
    log.error('marketplace-search.failed', { query, error: err })
    return []
  }
}

// ── Expanded Search (Busca Ampliada) ────────────────────────────────────

/**
 * Uses the expanded search pipeline to find external results when FF_EXPANDED_SEARCH is enabled.
 * Returns results as AssistantProduct[] for seamless integration with existing flow.
 * If the feature flag is off or the pipeline fails, returns empty array (non-blocking).
 */
async function executeExpandedSearch(
  query: string,
  maxPrice?: number,
  category?: string,
): Promise<AssistantProduct[]> {
  // Gate on feature flag — returns [] if not enabled
  if (!getFlag('expandedSearch')) return []

  try {
    const { expandedSearch } = await import('@/lib/search/expanded')

    const result = await expandedSearch({
      query,
      page: 1,
      limit: 12,
      category,
      maxPrice,
      sortBy: 'relevance',
    })

    // Only take external results (internal are already covered by executeLocalSearch)
    if (result.expandedResults.length === 0) return []

    log.info('expanded-search.assistant', {
      query,
      expanded: result.expandedResults.length,
      coverage: result.coverage.coverageScore,
    })

    return result.expandedResults.map(r => ({
      name: r.title,
      price: r.price,
      originalPrice: r.originalPrice,
      discount: r.discount,
      source: r.storeName,
      url: r.href,
      affiliateUrl: r.affiliateUrl,
      imageUrl: r.imageUrl,
      isFromCatalog: false,
      confidence: r.affiliateStatus === 'verified' ? 'resolved' as const : 'raw' as const,
      monetization: r.affiliateStatus as MonetizationStatus,
    }))
  } catch (err) {
    log.error('expanded-search.assistant.failed', { query, error: err })
    return []
  }
}

// ── Product Deduplication ─────────────────────────────────────────────────

function deduplicateProducts(products: AssistantProduct[]): AssistantProduct[] {
  const seen = new Map<string, AssistantProduct>()

  for (const p of products) {
    // Fingerprint: normalized name + source
    const key = p.name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40) + ':' + p.source.toLowerCase()
    const existing = seen.get(key)
    if (!existing) {
      seen.set(key, p)
    } else {
      // Keep the one with better monetization or lower price
      if (p.isFromCatalog && !existing.isFromCatalog) {
        seen.set(key, p) // Prefer catalog
      } else if (p.monetization === 'verified' && existing.monetization !== 'verified') {
        seen.set(key, p) // Prefer verified affiliate
      } else if (p.price && existing.price && p.price < existing.price) {
        seen.set(key, p) // Prefer lower price
      }
    }
  }

  return Array.from(seen.values())
}

// ── Response Parsing ───────────────────────────────────────────────────────

function parseOpenAIResponse(data: any): AssistantResponse {
  // Handle Responses API format
  const output = data.output || []
  let message = ''
  const products: AssistantProduct[] = []

  for (const item of output) {
    if (item.type === 'message' && item.content) {
      for (const block of item.content) {
        if (block.type === 'output_text') {
          message += block.text
        }
      }
    }
  }

  return makeResponse(message || 'Processando sua busca...', 0, {
    products: products.length > 0 ? products : undefined,
    dataSources: ['web'],
    meta: { toolsUsed: ['web_search'], catalogHits: 0, webUsed: true, durationMs: 0 },
  })
}

// ── Deal Verdict Builder ─────────────────────────────────────────────────

function buildDealVerdict(product: EnrichedProduct): StructuredBlock | null {
  const reasons: string[] = []
  let verdict: 'comprar' | 'esperar' | 'neutro' = 'neutro'

  const pc = product.priceContext
  const bs = product.buySignal

  if (pc?.isHistoricalLow) {
    verdict = 'comprar'
    reasons.push('Preço no menor valor histórico')
  }

  if (pc?.pctBelowAvg && pc.pctBelowAvg >= 15) {
    verdict = 'comprar'
    reasons.push(`${pc.pctBelowAvg}% abaixo da média dos últimos 30 dias`)
  } else if (pc?.pctBelowAvg && pc.pctBelowAvg >= 5) {
    if (verdict !== 'comprar') verdict = 'comprar'
    reasons.push(`${pc.pctBelowAvg}% abaixo da média recente`)
  }

  if (product.discount && product.discount >= 20) {
    reasons.push(`Desconto real de ${product.discount}%`)
  }

  if (pc?.trend === 'up') {
    if (verdict !== 'comprar') verdict = 'esperar'
    reasons.push('Tendência de preço subindo — pode ser melhor criar alerta')
  } else if (pc?.trend === 'down') {
    reasons.push('Tendência de queda — preço pode cair mais')
    if (verdict !== 'comprar') verdict = 'esperar'
  } else if (pc?.trend === 'stable' && verdict === 'neutro') {
    reasons.push('Preço estável — sem urgência para comprar')
  }

  if (bs?.level === 'excelente') {
    verdict = 'comprar'
    reasons.push(bs.headline)
  } else if (bs?.level === 'aguarde') {
    verdict = 'esperar'
    reasons.push(bs.headline)
  }

  if (product.dealScore && product.dealScore >= 80) {
    reasons.push(`Score de oferta: ${product.dealScore}/100`)
  }

  if (reasons.length === 0) return null

  return {
    type: 'deal_verdict',
    productName: product.name,
    verdict,
    reasons: reasons.slice(0, 4),
    priceContext: pc,
  }
}

// ── Comparison Table Builder ─────────────────────────────────────────────

function buildComparisonTable(products: EnrichedProduct[]): StructuredBlock | null {
  if (products.length < 2) return null

  const specs: { key: string; label: string; unit?: string; values: (string | number | null)[] }[] = []

  // Always show price
  specs.push({
    key: 'price',
    label: 'Preço',
    unit: 'R$',
    values: products.map(p => p.price ?? null),
  })

  // Show store
  specs.push({
    key: 'source',
    label: 'Loja',
    values: products.map(p => p.source),
  })

  // Show discount if any product has one
  if (products.some(p => p.discount && p.discount > 0)) {
    specs.push({
      key: 'discount',
      label: 'Desconto',
      unit: '%',
      values: products.map(p => p.discount ?? null),
    })
  }

  // Show buy signal level
  if (products.some(p => p.buySignal)) {
    specs.push({
      key: 'buySignal',
      label: 'Sinal de compra',
      values: products.map(p => p.buySignal?.headline ?? null),
    })
  }

  // Show deal score
  if (products.some(p => p.dealScore && p.dealScore > 0)) {
    specs.push({
      key: 'dealScore',
      label: 'Score',
      unit: '/100',
      values: products.map(p => p.dealScore ?? null),
    })
  }

  // Extract matching specs from enriched data
  const allSpecKeys = new Set<string>()
  for (const p of products) {
    if (p.specs) {
      for (const s of p.specs) allSpecKeys.add(s.key)
    }
  }

  for (const key of allSpecKeys) {
    const firstSpec = products.find(p => p.specs?.some(s => s.key === key))?.specs?.find(s => s.key === key)
    if (!firstSpec) continue

    specs.push({
      key,
      label: firstSpec.label,
      unit: firstSpec.unit,
      values: products.map(p => {
        const spec = p.specs?.find(s => s.key === key)
        return spec ? spec.value : null
      }),
    })
  }

  // Build a verdict line
  const cheapest = products.reduce((a, b) => ((a.price ?? Infinity) < (b.price ?? Infinity) ? a : b))
  const bestScore = products.reduce((a, b) => ((a.dealScore ?? 0) > (b.dealScore ?? 0) ? a : b))

  let verdict = ''
  if (cheapest.name === bestScore.name) {
    verdict = `**${shortenProductName(cheapest.name)}** ganha em preço e score de oferta.`
  } else {
    verdict = `**${shortenProductName(cheapest.name)}** é mais barato, mas **${shortenProductName(bestScore.name)}** tem melhor score geral.`
  }

  return {
    type: 'comparison_table',
    products,
    specs,
    verdict,
  }
}

function shortenProductName(name: string): string {
  const words = name.split(/\s+/).filter(w => w.length > 1)
  return words.length <= 4 ? name : words.slice(0, 4).join(' ')
}

// ── Auto-Import External Products ────────────────────────────────────────

/**
 * Fire-and-forget: import external products found by the AI into the catalog.
 * Runs after response is sent — does NOT block the user.
 * Only imports products that have a known marketplace URL (Amazon, ML, Shopee).
 */
async function autoImportExternalProducts(products: AssistantProduct[]): Promise<void> {
  // Only import products that are NOT from catalog and have a real external URL
  const candidates = products.filter(p =>
    !p.isFromCatalog &&
    p.name &&
    p.price &&
    p.price > 5 &&
    p.url &&
    p.url.startsWith('http')
  )

  if (candidates.length === 0) return

  try {
    const { runImportPipeline } = await import('@/lib/import/pipeline')
    const { buildAffiliateUrl: buildAffiliate } = await import('@/lib/affiliate')

    const items = candidates.slice(0, 5).map(c => {
      // Try to extract external ID from URL
      let externalId = ''
      try {
        const url = new URL(c.url)
        // Amazon ASIN
        const asinMatch = url.pathname.match(/\/dp\/([A-Z0-9]{10})/) || url.pathname.match(/\/([A-Z0-9]{10})(?:\/|$)/)
        if (asinMatch) externalId = asinMatch[1]
        // ML MLB ID
        const mlbMatch = url.pathname.match(/MLB-?(\d+)/) || url.href.match(/MLB-?(\d+)/)
        if (mlbMatch) externalId = `MLB${mlbMatch[1]}`
        // Shopee
        const shopeeMatch = url.pathname.match(/\.(\d+)\.(\d+)/) || url.pathname.match(/\/(\d{5,})\/(\d{5,})/)
        if (shopeeMatch) externalId = `${shopeeMatch[1]}.${shopeeMatch[2]}`
      } catch {}

      if (!externalId) {
        // Generate hash-based ID from URL
        externalId = `ai-${c.url.replace(/[^a-zA-Z0-9]/g, '').slice(-12)}`
      }

      // Detect source from URL
      const urlLower = c.url.toLowerCase()
      let sourceSlug = 'unknown'
      if (urlLower.includes('amazon.com.br')) sourceSlug = 'amazon-br'
      else if (urlLower.includes('mercadolivre.com.br') || urlLower.includes('mercadolibre.com')) sourceSlug = 'mercadolivre'
      else if (urlLower.includes('shopee.com.br')) sourceSlug = 'shopee'
      else if (urlLower.includes('shein.com')) sourceSlug = 'shein'
      else if (urlLower.includes('magalu.com') || urlLower.includes('magazineluiza')) sourceSlug = 'magalu'
      else if (urlLower.includes('kabum.com.br')) sourceSlug = 'kabum'

      return {
        externalId,
        title: c.name,
        currentPrice: c.price!,
        originalPrice: c.originalPrice,
        productUrl: c.url,
        imageUrl: c.imageUrl,
        sourceSlug,
        discoverySource: 'ai-assistant' as const,
      }
    })

    if (items.length === 0) return

    const result = await runImportPipeline(items)
    log.info('auto-import.from-ai', {
      candidates: candidates.length,
      imported: items.length,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
    })
  } catch (err) {
    log.debug('auto-import.failed', { error: String(err) })
  }
}
