/**
 * Product-level price consolidation.
 *
 * Aggregates price data across ALL offers of a product (multi-source)
 * to provide a single, reliable view of pricing for the canonical product.
 *
 * This complements the per-offer analytics in analytics.ts by providing
 * product-centric insights used in comparison, buy signals, and homepage.
 */

import prisma from '@/lib/db/prisma'
import { computePriceStats, computeExtendedPriceStats, type PriceSnapshot } from './analytics'
import { memoryCache } from '@/lib/cache/memory'
import { logger } from '@/lib/logger'
import type { PriceStats } from '@/types'

const log = logger.child({ module: 'product-price' })

// ── Types ──────────────────────────────────────────────────────────────────

export interface ProductPriceOverview {
  /** Current best (lowest) price across all active offers */
  bestPrice: number
  /** Source of the best price */
  bestPriceSource: string
  /** Number of active sources with this product */
  activeSources: number
  /** Consolidated stats from all snapshots across all offers */
  stats: PriceStats
  /** Per-source price breakdown */
  sourceBreakdown: SourcePrice[]
  /** Overall confidence in price data (based on snapshot count + source diversity) */
  confidence: 'high' | 'medium' | 'low'
  /** Signals for buy decision */
  signals: PriceSignal[]
}

export interface SourcePrice {
  sourceSlug: string
  sourceName: string
  currentPrice: number
  originalPrice: number | null
  isFreeShipping: boolean
  offerScore: number
  offerId: string
  affiliateUrl: string | null
}

export interface PriceSignal {
  type: string
  label: string
  positive: boolean
  confidence: 'high' | 'medium' | 'low'
}

// ── Cache ──────────────────────────────────────────────────────────────────

const CACHE_TTL = 3 * 60 * 1000 // 3 minutes

// ── Core Function ──────────────────────────────────────────────────────────

/**
 * Get consolidated price overview for a product.
 * Aggregates data from all active offers across all sources.
 */
export async function getProductPriceOverview(
  productId: string
): Promise<ProductPriceOverview | null> {
  const cacheKey = `product-price:${productId}`
  const cached = memoryCache.get<ProductPriceOverview>(cacheKey)
  if (cached) return cached

  try {
    // Get all active offers with their snapshots
    const listings = await prisma.listing.findMany({
      where: {
        productId,
        status: 'ACTIVE',
        offers: { some: { isActive: true } },
      },
      select: {
        source: { select: { slug: true, name: true } },
        offers: {
          where: { isActive: true },
          orderBy: { offerScore: 'desc' },
          take: 1,
          select: {
            id: true,
            currentPrice: true,
            originalPrice: true,
            isFreeShipping: true,
            offerScore: true,
            affiliateUrl: true,
            priceSnapshots: {
              orderBy: { capturedAt: 'desc' },
              take: 100,
              select: { price: true, originalPrice: true, capturedAt: true },
            },
          },
        },
      },
    })

    if (listings.length === 0) return null

    // Build source breakdown
    const sourceBreakdown: SourcePrice[] = listings
      .filter(l => l.offers.length > 0)
      .map(l => {
        const offer = l.offers[0]
        return {
          sourceSlug: l.source.slug,
          sourceName: l.source.name,
          currentPrice: offer.currentPrice,
          originalPrice: offer.originalPrice,
          isFreeShipping: offer.isFreeShipping,
          offerScore: offer.offerScore,
          offerId: offer.id,
          affiliateUrl: offer.affiliateUrl,
        }
      })
      .sort((a, b) => a.currentPrice - b.currentPrice)

    if (sourceBreakdown.length === 0) return null

    const bestSource = sourceBreakdown[0]

    // Consolidate ALL snapshots across all offers for stats
    const allSnapshots: PriceSnapshot[] = listings
      .flatMap(l => l.offers.flatMap(o => o.priceSnapshots))
      .map(s => ({
        price: s.price,
        originalPrice: s.originalPrice,
        capturedAt: s.capturedAt,
      }))
      .sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime())

    // Compute stats from consolidated snapshots
    const stats = computePriceStats(allSnapshots, bestSource.currentPrice)

    // Compute confidence
    const activeSources = new Set(sourceBreakdown.map(s => s.sourceSlug)).size
    const snapshotCount = allSnapshots.length
    const confidence: 'high' | 'medium' | 'low' =
      snapshotCount >= 10 && activeSources >= 2 ? 'high' :
      snapshotCount >= 3 || activeSources >= 2 ? 'medium' : 'low'

    // Generate signals
    const signals: PriceSignal[] = []

    // Signal: historical low
    if (stats.allTimeMin > 0 && bestSource.currentPrice <= stats.allTimeMin * 1.05) {
      signals.push({
        type: 'historical_low',
        label: 'Menor preço histórico',
        positive: true,
        confidence: snapshotCount >= 5 ? 'high' : 'medium',
      })
    }

    // Signal: below 30d average
    if (stats.avg30d > 0 && bestSource.currentPrice < stats.avg30d * 0.95) {
      const pctBelow = Math.round((1 - bestSource.currentPrice / stats.avg30d) * 100)
      signals.push({
        type: 'below_avg',
        label: `${pctBelow}% abaixo da média 30d`,
        positive: true,
        confidence: 'medium',
      })
    }

    // Signal: above average (negative)
    if (stats.avg30d > 0 && bestSource.currentPrice > stats.avg30d * 1.05) {
      signals.push({
        type: 'above_avg',
        label: 'Acima da média recente',
        positive: false,
        confidence: 'medium',
      })
    }

    // Signal: multi-source
    if (activeSources >= 2) {
      signals.push({
        type: 'multi_source',
        label: `Comparado em ${activeSources} lojas`,
        positive: true,
        confidence: 'high',
      })
    }

    // Signal: free shipping
    if (bestSource.isFreeShipping) {
      signals.push({
        type: 'free_shipping',
        label: 'Frete grátis',
        positive: true,
        confidence: 'high',
      })
    }

    // Signal: big discount
    if (bestSource.originalPrice && bestSource.originalPrice > bestSource.currentPrice) {
      const discount = Math.round((1 - bestSource.currentPrice / bestSource.originalPrice) * 100)
      if (discount >= 20) {
        signals.push({
          type: 'discount',
          label: `${discount}% de desconto`,
          positive: true,
          confidence: 'medium',
        })
      }
    }

    const result: ProductPriceOverview = {
      bestPrice: bestSource.currentPrice,
      bestPriceSource: bestSource.sourceName,
      activeSources,
      stats,
      sourceBreakdown,
      confidence,
      signals,
    }

    memoryCache.set(cacheKey, result, CACHE_TTL)
    return result
  } catch (err) {
    log.error('product-price.failed', { productId, error: err })
    return null
  }
}

/**
 * Batch compute price overviews for multiple products.
 * Used for homepage rails and search results.
 */
export async function batchProductPriceOverview(
  productIds: string[]
): Promise<Map<string, ProductPriceOverview>> {
  const results = new Map<string, ProductPriceOverview>()
  // Process in parallel (limited concurrency)
  const BATCH = 10
  for (let i = 0; i < productIds.length; i += BATCH) {
    const batch = productIds.slice(i, i + BATCH)
    const promises = batch.map(async (id) => {
      const overview = await getProductPriceOverview(id)
      if (overview) results.set(id, overview)
    })
    await Promise.all(promises)
  }
  return results
}
