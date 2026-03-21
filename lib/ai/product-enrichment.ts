/**
 * Product Enrichment — adds price history, buy signals, specs, and deal scores
 * to assistant products using existing PromoSnap analytics infrastructure.
 *
 * This is the key bridge between the assistant pipeline and the mature
 * price analytics, buy signal, and comparison modules.
 */

import prisma from '@/lib/db/prisma'
import { computePriceStats, isHistoricalLow, computeTrend } from '@/lib/price/analytics'
import { generateBuySignal } from '@/lib/decision/buy-signal'
import { extractAttributes } from '@/lib/comparison/category-specs'
import { logger } from '@/lib/logger'
import type { EnrichedProduct, PriceContext, ExtractedSpec } from './structured-response'
import type { AssistantProduct } from './shopping-assistant'

const log = logger.child({ module: 'product-enrichment' })

// ── Source Credibility ──────────────────────────────────────────────────────

const SOURCE_CREDIBILITY: Record<string, number> = {
  'Amazon Brasil': 95,
  'Mercado Livre': 90,
  'Shopee': 85,
  'Magazine Luiza': 88,
  'Magalu': 88,
  'KaBuM!': 85,
  'Casas Bahia': 82,
  'Americanas': 80,
  'Carrefour': 78,
  'Ponto': 78,
  'Shein': 75,
}

function getSourceCredibility(source: string): number {
  for (const [name, score] of Object.entries(SOURCE_CREDIBILITY)) {
    if (source.toLowerCase().includes(name.toLowerCase())) return score
  }
  return 50 // Unknown source
}

// ── Main Enrichment ─────────────────────────────────────────────────────────

/**
 * Enrich assistant products with price history, buy signals, specs, and deal scores.
 * Only catalog products (with slugs) get full enrichment — external products get basic scoring.
 */
export async function enrichProducts(
  products: AssistantProduct[],
  categorySlug?: string
): Promise<EnrichedProduct[]> {
  const start = Date.now()

  // Separate catalog vs external products
  const catalogSlugs = products
    .filter(p => p.isFromCatalog && p.slug)
    .map(p => p.slug!)

  // Batch-load price history for catalog products
  let priceDataMap = new Map<string, PriceContext>()
  let buySignalMap = new Map<string, EnrichedProduct['buySignal']>()

  if (catalogSlugs.length > 0) {
    try {
      const dbProducts = await prisma.product.findMany({
        where: { slug: { in: catalogSlugs } },
        select: {
          slug: true,
          name: true,
          listings: {
            select: {
              offers: {
                where: { isActive: true },
                select: {
                  id: true,
                  currentPrice: true,
                  originalPrice: true,
                  priceSnapshots: {
                    select: { price: true, originalPrice: true, capturedAt: true },
                    orderBy: { capturedAt: 'desc' },
                    take: 90, // Last 90 snapshots
                  },
                },
                take: 1,
              },
            },
            take: 1,
          },
        },
      })

      for (const dbProd of dbProducts) {
        const offer = dbProd.listings?.[0]?.offers?.[0]
        if (!offer || !offer.currentPrice) continue

        const snapshots = offer.priceSnapshots.map(s => ({
          price: s.price,
          originalPrice: s.originalPrice,
          capturedAt: s.capturedAt,
        }))

        if (snapshots.length < 2) continue

        const stats = computePriceStats(snapshots, offer.currentPrice)
        const trend30d = computeTrend(snapshots, offer.currentPrice, 30)

        // Compute price position within 90d range (0 = at min, 100 = at max)
        const range = stats.max90d - stats.min90d
        const position = range > 0
          ? Math.round(((offer.currentPrice - stats.min90d) / range) * 100)
          : 50

        const pctBelowAvg = stats.avg30d > 0
          ? Math.round(((stats.avg30d - offer.currentPrice) / stats.avg30d) * 100)
          : null

        const priceContext: PriceContext = {
          avg30d: stats.avg30d,
          min90d: stats.min90d,
          allTimeMin: stats.allTimeMin,
          trend: trend30d.direction,
          position,
          isHistoricalLow: isHistoricalLow(offer.currentPrice, stats.allTimeMin),
          pctBelowAvg,
        }

        priceDataMap.set(dbProd.slug, priceContext)

        // Generate buy signal
        const signal = generateBuySignal(offer.currentPrice, stats, {
          discount: offer.originalPrice
            ? Math.round((1 - offer.currentPrice / offer.originalPrice) * 100)
            : null,
        })

        buySignalMap.set(dbProd.slug, {
          level: signal.level,
          headline: signal.headline,
          color: signal.color,
        })
      }
    } catch (err) {
      log.error('enrichment.price-data-failed', { error: err })
    }
  }

  // Enrich all products
  const enriched: EnrichedProduct[] = products.map(p => {
    const priceContext = p.slug ? priceDataMap.get(p.slug) : undefined
    const buySignal = p.slug ? buySignalMap.get(p.slug) : undefined
    const sourceCredibility = getSourceCredibility(p.source)

    // Extract specs from title
    const specs = extractSpecsFromTitle(p.name, categorySlug)

    // Compute deal score (0-100)
    const dealScore = computeDealScore(p, priceContext, sourceCredibility)

    return {
      ...p,
      priceContext,
      buySignal,
      dealScore,
      specs,
      sourceCredibility,
    }
  })

  // Sort by deal score (best deals first)
  enriched.sort((a, b) => (b.dealScore ?? 0) - (a.dealScore ?? 0))

  log.info('enrichment.complete', {
    total: products.length,
    withPriceHistory: priceDataMap.size,
    withBuySignal: buySignalMap.size,
    durationMs: Date.now() - start,
  })

  return enriched
}

// ── Spec Extraction ─────────────────────────────────────────────────────────

function extractSpecsFromTitle(title: string, categorySlug?: string): ExtractedSpec[] {
  // Use category-specific extractors if available
  if (categorySlug) {
    const attrs = extractAttributes(title, null, categorySlug)
    if (attrs.length > 0) {
      return attrs.map(a => ({
        key: a.key,
        label: a.label,
        value: a.value,
        unit: a.unit,
      }))
    }
  }

  // Generic spec extraction for any category
  const specs: ExtractedSpec[] = []
  const patterns: [RegExp, string, string, string?][] = [
    [/(\d+)\s*gb\s*ram/i, 'ram', 'RAM', 'GB'],
    [/(\d+)\s*gb(?!\s*ram)/i, 'storage', 'Armazenamento', 'GB'],
    [/(\d+)\s*tb/i, 'storage', 'Armazenamento', 'TB'],
    [/(\d+)\s*mp/i, 'camera', 'Câmera', 'MP'],
    [/(\d{4,5})\s*mah/i, 'battery', 'Bateria', 'mAh'],
    [/tela\s*(\d+[.,]?\d*)["\s]*(?:pol)?/i, 'screen', 'Tela', '"'],
    [/(\d+[.,]?\d*)\s*(?:pol|polegadas)/i, 'screen', 'Tela', '"'],
    [/(\d+)\s*hz/i, 'refresh', 'Taxa', 'Hz'],
    [/(5g|4g|wifi\s*6)/i, 'connectivity', 'Conectividade'],
  ]

  for (const [pattern, key, label, unit] of patterns) {
    const match = title.match(pattern)
    if (match && !specs.some(s => s.key === key)) {
      const val = match[1] || match[0]
      const numVal = parseFloat(val.replace(',', '.'))
      specs.push({ key, label, value: isNaN(numVal) ? val : numVal, unit })
    }
  }

  return specs
}

// ── Deal Score ──────────────────────────────────────────────────────────────

function computeDealScore(
  product: AssistantProduct,
  priceContext?: PriceContext,
  sourceCredibility?: number
): number {
  let score = 50 // Base score

  // Discount component (max +25)
  if (product.discount && product.discount > 0) {
    score += Math.min(product.discount * 0.5, 25)
  }

  // Price position component (max +25)
  if (priceContext) {
    // Lower position = better deal (closer to min)
    const positionBonus = Math.max(0, 25 - (priceContext.position * 0.25))
    score += positionBonus

    // Historical low bonus
    if (priceContext.isHistoricalLow) score += 15

    // Below average bonus
    if (priceContext.pctBelowAvg && priceContext.pctBelowAvg > 0) {
      score += Math.min(priceContext.pctBelowAvg * 0.5, 10)
    }
  }

  // Catalog verification bonus
  if (product.isFromCatalog) score += 10

  // Source credibility component (max +10)
  if (sourceCredibility) {
    score += (sourceCredibility - 50) * 0.2 // 50→0, 95→9
  }

  return Math.min(100, Math.max(0, Math.round(score)))
}
