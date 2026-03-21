/**
 * AI Content Engine — auto-generates SEO content from real catalog data.
 *
 * Uses OpenAI GPT to create:
 * 1. Product FAQs (for FAQ schema → Google rich results)
 * 2. Category buying guides (for /guias section)
 * 3. Comparison summaries (for /comparar pages)
 * 4. Social media posts (for Telegram/Twitter distribution)
 * 5. Meta descriptions (for better CTR in search results)
 *
 * CRITICAL RULES:
 * - NEVER hallucinate products or prices — all data comes from Prisma
 * - Content is in Portuguese BR
 * - Cached in DB to avoid re-generating (cost control)
 * - Max 1000 tokens per generation (cost: ~$0.001 per call with gpt-4o-mini)
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'ai-content-engine' })

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY
}

// ── GPT Call ────────────────────────────────────────────────────────────────

async function generateWithGPT(prompt: string, maxTokens = 800): Promise<string | null> {
  const apiKey = getOpenAIKey()
  if (!apiKey) return null

  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Você é um especialista em e-commerce brasileiro. Escreva conteúdo SEO em português do Brasil. Seja direto, informativo e útil. Nunca invente dados — use apenas as informações fornecidas.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
      }),
      signal: AbortSignal.timeout(15000),
    })

    if (!res.ok) {
      log.error('gpt.failed', { status: res.status })
      return null
    }

    const data = await res.json()
    return data.choices?.[0]?.message?.content || null
  } catch (err) {
    log.error('gpt.error', { error: String(err) })
    return null
  }
}

// ── 1. Product FAQ Generator ────────────────────────────────────────────────

export interface ProductFAQ {
  question: string
  answer: string
}

export async function generateProductFAQs(productId: string): Promise<ProductFAQ[]> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { select: { name: true } },
      listings: {
        include: {
          source: { select: { name: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: 'asc' },
            take: 3,
          },
        },
        take: 3,
      },
    },
  })

  if (!product) return []

  const offers = product.listings.flatMap(l =>
    l.offers.map(o => ({ price: o.currentPrice, source: l.source?.name || 'PromoSnap' }))
  )
  const lowestPrice = offers.length > 0 ? Math.min(...offers.map(o => o.price)) : null
  const sources = [...new Set(offers.map(o => o.source))]

  const prompt = `Gere 4 perguntas frequentes (FAQ) sobre o produto "${product.name}" da categoria "${product.category?.name || 'Geral'}".

Dados reais:
- Preço mais baixo atual: ${lowestPrice ? `R$ ${lowestPrice.toFixed(2)}` : 'Consulte no PromoSnap'}
- Disponível em: ${sources.join(', ') || 'Múltiplas lojas'}

Responda em JSON array: [{"question": "...", "answer": "..."}]
As respostas devem ser úteis, factuais e mencionar o PromoSnap como fonte de comparação.
NÃO invente especificações que não foram fornecidas.`

  const result = await generateWithGPT(prompt, 600)
  if (!result) return []

  try {
    const jsonMatch = result.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const faqs: ProductFAQ[] = JSON.parse(jsonMatch[0])
    return faqs.filter(f => f.question && f.answer).slice(0, 4)
  } catch {
    return []
  }
}

// ── 2. Category Buying Guide ────────────────────────────────────────────────

export async function generateCategoryGuide(categorySlug: string): Promise<string | null> {
  const category = await prisma.category.findUnique({
    where: { slug: categorySlug },
    select: { name: true, slug: true },
  })
  if (!category) return null

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', category: { slug: categorySlug } },
    include: {
      listings: {
        include: {
          offers: { where: { isActive: true }, orderBy: { currentPrice: 'asc' }, take: 1 },
          source: { select: { name: true } },
        },
        take: 1,
      },
    },
    orderBy: { popularityScore: 'desc' },
    take: 10,
  })

  const productList = products
    .filter(p => p.listings[0]?.offers[0])
    .map(p => {
      const offer = p.listings[0].offers[0]
      return `- ${p.name}: R$ ${offer.currentPrice.toFixed(2)} (${p.listings[0].source?.name})`
    })
    .join('\n')

  if (!productList) return null

  const prompt = `Escreva um guia de compra curto (300-400 palavras) para a categoria "${category.name}" no Brasil.

Produtos mais populares com preços reais:
${productList}

Estrutura:
1. Introdução (1 parágrafo) — o que considerar ao comprar
2. Top 3 recomendações (com preço real)
3. Dica do PromoSnap (mencionar alerta de preço e comparação)

Use markdown. Seja prático e direto. NÃO invente produtos ou preços além dos listados.`

  return generateWithGPT(prompt, 800)
}

// ── 3. Smart Meta Description ──────────────────────────────────────────────

export async function generateMetaDescription(
  productName: string,
  price: number,
  category: string,
  source: string
): Promise<string | null> {
  const prompt = `Gere uma meta description SEO (máximo 155 caracteres) para a página do produto "${productName}".
Preço: R$ ${price.toFixed(2)} em ${source}. Categoria: ${category}.
Deve incluir o preço, ser persuasiva e mencionar comparação de preços.
Retorne APENAS a meta description, sem aspas.`

  return generateWithGPT(prompt, 100)
}

// ── 4. Social Post for Deals ────────────────────────────────────────────────

export interface SocialPost {
  telegram: string
  twitter: string
}

export async function generateDealPost(
  productName: string,
  currentPrice: number,
  originalPrice: number | null,
  discount: number,
  source: string,
  productUrl: string
): Promise<SocialPost | null> {
  const prompt = `Gere 2 posts de oferta para redes sociais sobre:
Produto: ${productName}
Preço: R$ ${currentPrice.toFixed(2)}${originalPrice ? ` (era R$ ${originalPrice.toFixed(2)})` : ''}
Desconto: ${discount}% OFF
Loja: ${source}
Link: ${productUrl}

Formato JSON:
{
  "telegram": "Post para Telegram (com emojis, formatação Markdown, máximo 300 chars)",
  "twitter": "Post para Twitter/X (máximo 250 chars, com hashtags #PromoSnap #Oferta)"
}

Seja entusiasmado mas honesto. Use emojis. Mencione a economia real.`

  const result = await generateWithGPT(prompt, 400)
  if (!result) return null

  try {
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null
    return JSON.parse(jsonMatch[0]) as SocialPost
  } catch {
    return null
  }
}

// ── 5. Batch Content Enrichment Job ─────────────────────────────────────────

export async function enrichCatalogContent(): Promise<{
  faqsGenerated: number
  metaDescriptions: number
  errors: string[]
}> {
  const apiKey = getOpenAIKey()
  if (!apiKey) {
    return { faqsGenerated: 0, metaDescriptions: 0, errors: ['OPENAI_API_KEY não configurado'] }
  }

  let faqsGenerated = 0
  let metaDescriptions = 0
  const errors: string[] = []

  // Find products without AI-generated FAQs (limit to 10 per run for cost control)
  const productsNeedingFAQs = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      NOT: { specsJson: { path: ['aiFaqs'], not: { equals: null } } },
      listings: { some: { offers: { some: { isActive: true } } } },
    },
    orderBy: { popularityScore: 'desc' },
    take: 10,
    select: { id: true, name: true, specsJson: true },
  })

  // Filter out products that already have FAQs in specsJson
  const toEnrich = productsNeedingFAQs.filter(p => {
    const specs = p.specsJson as Record<string, unknown> | null
    return !specs?.aiFaqs
  })

  for (const product of toEnrich.slice(0, 5)) { // Max 5 per run
    try {
      const faqs = await generateProductFAQs(product.id)
      if (faqs.length > 0) {
        const currentSpecs = (product.specsJson as Record<string, unknown>) || {}
        await prisma.product.update({
          where: { id: product.id },
          data: {
            specsJson: {
              ...currentSpecs,
              aiFaqs: faqs as unknown as Record<string, unknown>[],
              aiFaqsGeneratedAt: new Date().toISOString(),
            } as any,
          },
        })
        faqsGenerated++
        log.info('content-engine.faq-generated', { productId: product.id, faqs: faqs.length })
      }

      // Rate limit: wait 1s between GPT calls
      await new Promise(r => setTimeout(r, 1000))
    } catch (err) {
      errors.push(`FAQ ${product.name}: ${String(err)}`)
    }
  }

  log.info('content-engine.complete', { faqsGenerated, metaDescriptions, errors: errors.length })
  return { faqsGenerated, metaDescriptions, errors }
}
