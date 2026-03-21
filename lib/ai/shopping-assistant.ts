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

const SYSTEM_PROMPT = `Você é o assistente de compras do PromoSnap — plataforma brasileira de comparação de preços.

REGRAS OBRIGATÓRIAS:
1. Use APENAS os produtos listados em RESULTADOS ENCONTRADOS. NUNCA invente produtos, preços ou especificações.
2. Se o usuário definiu um orçamento (ex: "até R$ 2000"), mostre APENAS produtos dentro desse limite. IGNORE produtos acima do orçamento.
3. Priorize produtos marcados como [VERIFICADO] — são do catálogo PromoSnap com preços confirmados.
4. Mostre pelo menos 3-5 produtos quando disponíveis, ordenados por melhor custo-benefício.
5. Para cada produto inclua: nome, preço, desconto (se houver), e loja.
6. Responda em português brasileiro, de forma direta e prática.
7. Nunca recomende produtos usados, seminovos ou de classificados (OLX, Enjoei, etc.).

FORMATO:
- Liste produtos com preço em destaque e loja entre parênteses
- Destaque o melhor custo-benefício com uma breve justificativa (1 linha)
- No final, sugira criar um alerta de preço no PromoSnap se o usuário estiver em dúvida

CONTEXTO:
- PromoSnap compara Amazon, Mercado Livre, Shopee e Shein
- Todos os links geram comissão sem custo extra ao usuário
- Produtos verificados têm histórico de preços de 90 dias`

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
    const [localResults, shoppingResults, marketplaceResults] = await Promise.all([
      executeLocalSearch(userMessage, intent.categories?.[0], intent.budget?.max, Math.max(intentTone.maxItems, 8)).catch(() => []),
      executeGoogleShoppingSearch(userMessage, intent.budget?.max, 10).catch(() => []),
      executeMarketplaceSearch(userMessage, intent.budget?.max, 8).catch(() => []),
    ])

    const merged = deduplicateProducts([...localResults, ...shoppingResults, ...marketplaceResults])
    // Enforce budget: remove products above maxPrice (API filters may fail)
    const budgetFiltered = intent.budget?.max
      ? merged.filter(p => !p.price || p.price <= intent.budget!.max!)
      : merged

    // ── Enrich products with price history, buy signals, specs, deal scores ─
    const enrichedProducts: EnrichedProduct[] = await enrichProducts(budgetFiltered, intent.categories?.[0])
      .catch(() => budgetFiltered.map(p => ({ ...p, dealScore: 50 })) as EnrichedProduct[])
    const allProducts = enrichedProducts as (AssistantProduct & Partial<EnrichedProduct>)[]

    // Build rich context for GPT (includes price intelligence)
    const productContext = allProducts.length > 0
      ? `\n\nRESULTADOS ENCONTRADOS (use estes dados REAIS para responder):\n${allProducts.map((p, i) => {
          const ep = p as EnrichedProduct
          let line = `${i + 1}. ${p.name} — R$ ${p.price?.toFixed(2) || '?'} em ${p.source}`
          if (p.isFromCatalog) line += ' [VERIFICADO]'
          if (p.discount && p.discount > 0) line += ` (${p.discount}% OFF)`
          if (ep.buySignal) line += ` | Sinal: ${ep.buySignal.headline}`
          if (ep.priceContext?.isHistoricalLow) line += ' | MENOR PRECO HISTORICO'
          else if (ep.priceContext?.pctBelowAvg && ep.priceContext.pctBelowAvg > 0) line += ` | ${ep.priceContext.pctBelowAvg}% abaixo da media`
          if (ep.dealScore) line += ` | Score: ${ep.dealScore}/100`
          if (ep.specs && ep.specs.length > 0) line += ` | ${ep.specs.map(s => `${s.value}${s.unit || ''}`).join(', ')}`
          return line
        }).join('\n')}`
      : '\n\nNenhum resultado encontrado no catalogo nem no Google Shopping.'

    // Enhanced system prompt with intent understanding
    const enhancedSystemPrompt = SYSTEM_PROMPT + intentPromptSection

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
        temperature: 0.3,
        max_tokens: 1500,
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
    if (shoppingResults.length > 0) dataSources.push('web')

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

    // Product cards block (enriched)
    if (enrichedProducts.length > 0) {
      blocks.push({
        type: 'product_cards',
        products: enrichedProducts.slice(0, 8),
        layout: enrichedProducts.length <= 3 ? 'list' : 'grid',
      })
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

    const connectors = ['mercadolivre-search', 'shopee-search']
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
