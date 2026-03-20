// ============================================================================
// Article Generator — generates markdown articles from catalog data
// ============================================================================
//
// Supports two modes:
// 1. AI-powered (OpenAI gpt-4o-mini) — rich, natural language articles
// 2. Template-based fallback — deterministic, no API cost

import prisma from '@/lib/db/prisma'
import { generatePageSEO } from '@/lib/seo/auto-generator'
import { logger } from '@/lib/logger'

// ── Types ───────────────────────────────────────────────────────────────────

export interface ArticleInput {
  type: 'guide' | 'comparison' | 'vale-a-pena' | 'hot-topic'
  topic: string
  categorySlug?: string
  brandSlug?: string
}

export interface GeneratedArticle {
  title: string
  slug: string
  content: string // markdown
  category: string | null
  tags: string[]
}

// ── Main Generator ──────────────────────────────────────────────────────────

export async function generateArticle(input: ArticleInput): Promise<GeneratedArticle> {
  // Gather catalog data for the topic
  const context = await gatherContext(input)

  // Try AI generation if available
  if (process.env.OPENAI_API_KEY) {
    try {
      return await generateWithAI(input, context)
    } catch (err) {
      logger.warn('article-generator.ai-failed', { error: err })
    }
  }

  // Fallback to template-based generation
  return generateFromTemplate(input, context)
}

// ── Context Gathering ───────────────────────────────────────────────────────

interface ArticleContext {
  products: Array<{ name: string; price: number; brand?: string; slug: string }>
  categoryName: string | null
  brandName: string | null
  avgPrice: number
  minPrice: number
  maxPrice: number
  productCount: number
}

async function gatherContext(input: ArticleInput): Promise<ArticleContext> {
  const where: Record<string, unknown> = { status: 'ACTIVE' as const }

  if (input.categorySlug) {
    where.category = { slug: input.categorySlug }
  }
  if (input.brandSlug) {
    where.brand = { slug: input.brandSlug }
  }
  // Fallback: match by topic name
  if (!input.categorySlug && !input.brandSlug) {
    where.name = { contains: input.topic, mode: 'insensitive' }
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      listings: {
        where: { status: 'ACTIVE' },
        include: {
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: 'asc' },
            take: 1,
          },
        },
        take: 1,
      },
    },
    orderBy: { popularityScore: 'desc' },
    take: 10,
  })

  const prices = products
    .map(p => p.listings[0]?.offers[0]?.currentPrice)
    .filter(Boolean) as number[]

  return {
    products: products.map(p => ({
      name: p.name,
      price: p.listings[0]?.offers[0]?.currentPrice ?? 0,
      brand: p.brand?.name,
      slug: p.slug,
    })),
    categoryName: products[0]?.category?.name ?? null,
    brandName: products[0]?.brand?.name ?? null,
    avgPrice: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
    minPrice: prices.length > 0 ? Math.min(...prices) : 0,
    maxPrice: prices.length > 0 ? Math.max(...prices) : 0,
    productCount: products.length,
  }
}

// ── AI Generation ───────────────────────────────────────────────────────────

async function generateWithAI(input: ArticleInput, ctx: ArticleContext): Promise<GeneratedArticle> {
  const productList = ctx.products
    .slice(0, 5)
    .map(p => `- ${p.name} (R$${p.price.toFixed(2)}${p.brand ? `, ${p.brand}` : ''})`)
    .join('\n')

  const typePrompt = {
    guide: `Escreva um guia de compra completo sobre "${input.topic}"`,
    comparison: `Escreva um comparativo entre os principais produtos de "${input.topic}"`,
    'vale-a-pena': `Analise se vale a pena comprar "${input.topic}" em ${new Date().getFullYear()}`,
    'hot-topic': `Escreva sobre as melhores opcoes de "${input.topic}" no momento`,
  }[input.type]

  const prompt = `${typePrompt}.

Dados reais do catalogo:
${productList}
Faixa de preco: R$${ctx.minPrice.toFixed(2)} a R$${ctx.maxPrice.toFixed(2)}
Media: R$${ctx.avgPrice.toFixed(2)}
${ctx.productCount} produtos disponiveis.

Instrucoes:
- Escreva em portugues do Brasil
- Use markdown (##, ###, **bold**, listas)
- Tom informativo e confiavel
- Maximo 1500 palavras
- Inclua uma secao "Para quem e indicado" e "O que considerar antes de comprar"
- Referencie os produtos pelo nome quando relevante
- Nao invente dados — use apenas os precos e produtos fornecidos
- Termine com uma secao de conclusao`

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Voce e um redator especializado em tecnologia e compras inteligentes para o site PromoSnap, um comparador de precos brasileiro.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    }),
  })

  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`)

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content ?? ''

  const slug = input.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  return {
    title: `${input.type === 'guide' ? 'Guia de Compra: ' : input.type === 'comparison' ? 'Comparativo: ' : ''}${input.topic}`,
    slug,
    content,
    category: ctx.categoryName,
    tags: [input.type, ...(ctx.brandName ? [ctx.brandName.toLowerCase()] : [])],
  }
}

// ── Template Fallback ───────────────────────────────────────────────────────

function generateFromTemplate(input: ArticleInput, ctx: ArticleContext): GeneratedArticle {
  const year = new Date().getFullYear()
  const slug = input.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const seo = generatePageSEO({
    type: input.type === 'guide' ? 'melhores' : input.type === 'comparison' ? 'comparacao' : 'ofertas',
    data: input.type === 'comparison' && ctx.products.length >= 2
      ? {
          productA: { name: ctx.products[0].name, price: ctx.products[0].price },
          productB: { name: ctx.products[1].name, price: ctx.products[1].price },
          slug,
          category: ctx.categoryName ?? undefined,
        } as any
      : {
          title: input.topic,
          keyword: input.topic,
          slug,
          productCount: ctx.productCount,
        } as any,
  })

  const productList = ctx.products
    .slice(0, 5)
    .map((p, i) => `${i + 1}. **${p.name}** — R$${p.price.toFixed(2).replace('.', ',')}${p.brand ? ` (${p.brand})` : ''}`)
    .join('\n')

  const faqSection = (seo.faqs ?? [])
    .map(f => `### ${f.question}\n\n${f.answer}`)
    .join('\n\n')

  const content = `# ${seo.h1}

${seo.intro || `Comparamos os melhores produtos de ${input.topic} disponiveis em ${year}.`}

## Melhores opcoes

${productList || 'Estamos coletando dados. Volte em breve.'}

## Faixa de preco

Os precos variam de **R$${ctx.minPrice.toFixed(2).replace('.', ',')}** a **R$${ctx.maxPrice.toFixed(2).replace('.', ',')}**, com media de **R$${ctx.avgPrice.toFixed(2).replace('.', ',')}**.

## Para quem e indicado

Este guia e ideal para quem esta buscando ${input.topic} e quer comparar precos antes de decidir.

## O que considerar antes de comprar

- Compare precos em diferentes lojas
- Verifique o historico de precos (use o PromoSnap!)
- Considere frete e prazo de entrega
- Leia avaliacoes de outros compradores

${faqSection ? `## Perguntas Frequentes\n\n${faqSection}` : ''}

## Conclusao

Com ${ctx.productCount} opcoes no nosso catalogo, ha boas oportunidades em ${input.topic}. Use o PromoSnap para monitorar precos e comprar no melhor momento.

---

*Atualizado em ${new Date().toLocaleDateString('pt-BR')}. Precos podem variar.*
`

  return {
    title: seo.h1,
    slug,
    content,
    category: ctx.categoryName,
    tags: [input.type, ...(ctx.brandName ? [ctx.brandName.toLowerCase()] : [])],
  }
}
