// ============================================================================
// Opportunity Engine — detect catalog gaps, trending opportunities, stale data
// ============================================================================

import prisma from '@/lib/db/prisma'
import type {
  Opportunity, OpportunityPriority, OpportunityReport,
  CatalogHealth, CategoryCoverage, SourceBreakdown, ZeroResultSearch,
} from './types'

// ── Zero-Result Searches ───────────────────────────────────────────────────

/**
 * Find queries that users searched but got zero results.
 * These represent catalog gaps — unserved demand.
 */
export async function findZeroResultSearches(limit = 20): Promise<ZeroResultSearch[]> {
  const results = await prisma.searchLog.groupBy({
    by: ['normalizedQuery'],
    where: {
      resultsCount: 0,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      normalizedQuery: { not: null },
    },
    _count: { id: true },
    _max: { createdAt: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit,
  })

  return results
    .filter(r => r.normalizedQuery)
    .map(r => ({
      query: r.normalizedQuery!,
      normalizedQuery: r.normalizedQuery!,
      count: r._count.id,
      lastSearched: r._max.createdAt!,
    }))
}

// ── Catalog Health ─────────────────────────────────────────────────────────

export async function getCatalogHealth(): Promise<CatalogHealth> {
  const now = new Date()
  const stale7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    totalProducts,
    activeProducts,
    productsWithOffers,
    productsStale7d,
    productsNoPrice,
    categories,
    sources,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({
      where: { listings: { some: { offers: { some: { isActive: true } } } } },
    }),
    prisma.product.count({
      where: { status: 'ACTIVE', updatedAt: { lt: stale7d } },
    }),
    prisma.product.count({
      where: {
        status: 'ACTIVE',
        listings: { none: { offers: { some: { isActive: true } } } },
      },
    }),
    // Category coverage
    prisma.category.findMany({
      select: {
        id: true, name: true, slug: true,
        _count: { select: { products: true } },
        products: {
          select: {
            listings: {
              select: {
                offers: {
                  where: { isActive: true },
                  select: { offerScore: true },
                },
              },
            },
          },
          where: { status: 'ACTIVE' },
          take: 100,
        },
      },
      orderBy: { products: { _count: 'desc' } },
      take: 30,
    }),
    // Source breakdown
    prisma.source.findMany({
      select: {
        id: true, name: true, slug: true,
        _count: { select: { listings: true } },
        listings: {
          select: {
            offers: {
              where: { isActive: true },
              select: { currentPrice: true },
            },
          },
          take: 200,
        },
      },
    }),
  ])

  const categoryCoverage: CategoryCoverage[] = categories.map(cat => {
    const allOffers = cat.products.flatMap(p => p.listings.flatMap(l => l.offers))
    const avgScore = allOffers.length > 0
      ? allOffers.reduce((sum, o) => sum + o.offerScore, 0) / allOffers.length
      : 0
    const productCount = cat._count.products
    let healthStatus: CategoryCoverage['healthStatus'] = 'healthy'
    if (productCount === 0) healthStatus = 'empty'
    else if (allOffers.length === 0) healthStatus = 'stale'
    else if (productCount < 3) healthStatus = 'thin'

    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      productCount,
      activeOfferCount: allOffers.length,
      avgOfferScore: Math.round(avgScore),
      healthStatus,
    }
  })

  const sourceBreakdown: SourceBreakdown[] = sources.map(src => {
    const activeOffers = src.listings.flatMap(l => l.offers)
    const avgPrice = activeOffers.length > 0
      ? activeOffers.reduce((sum, o) => sum + o.currentPrice, 0) / activeOffers.length
      : 0

    return {
      id: src.id,
      name: src.name,
      slug: src.slug,
      totalListings: src._count.listings,
      activeOffers: activeOffers.length,
      avgPrice: Math.round(avgPrice * 100) / 100,
    }
  })

  return {
    totalProducts,
    activeProducts,
    productsWithOffers,
    productsStale7d,
    productsNoPrice,
    categoryCoverage,
    sourceBreakdown,
  }
}

// ── Opportunity Detection ──────────────────────────────────────────────────

function priorityFromScore(score: number): OpportunityPriority {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

async function detectTrendingOpportunities(): Promise<Opportunity[]> {
  const recentTrends = await prisma.trendingKeyword.findMany({
    where: { fetchedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    orderBy: { position: 'asc' },
    take: 15,
  })

  const opportunities: Opportunity[] = []

  for (const trend of recentTrends) {
    // Check if we have products matching this trend
    const matchCount = await prisma.product.count({
      where: {
        status: 'ACTIVE',
        OR: [
          { name: { contains: trend.keyword, mode: 'insensitive' } },
          { listings: { some: { rawTitle: { contains: trend.keyword, mode: 'insensitive' } } } },
        ],
      },
    })

    if (matchCount < 3) {
      // Catalog gap — trending but few products
      const score = Math.min(90 - (matchCount * 15) + (15 - trend.position) * 2, 95)
      opportunities.push({
        id: `trend-gap-${trend.keyword.replace(/\s+/g, '-').toLowerCase()}`,
        source: 'trending',
        priority: priorityFromScore(score),
        score,
        title: `Trend "${trend.keyword}" com apenas ${matchCount} produto(s) no catálogo`,
        keyword: trend.keyword,
        productCount: matchCount,
        actionUrl: `/admin/ml/discovery?q=${encodeURIComponent(trend.keyword)}`,
        detectedAt: new Date().toISOString(),
      })
    }
  }

  return opportunities
}

async function detectCatalogGaps(): Promise<Opportunity[]> {
  const zeroResults = await findZeroResultSearches(10)
  return zeroResults
    .filter(zr => zr.count >= 2) // At least 2 searches
    .map(zr => {
      const score = Math.min(40 + zr.count * 5, 85)
      return {
        id: `gap-${zr.normalizedQuery.replace(/\s+/g, '-')}`,
        source: 'catalog_gap' as const,
        priority: priorityFromScore(score),
        score,
        title: `"${zr.query}" buscado ${zr.count}x sem resultados`,
        keyword: zr.query,
        estimatedDemand: zr.count,
        actionUrl: `/admin/ml/discovery?q=${encodeURIComponent(zr.query)}`,
        detectedAt: zr.lastSearched.toISOString(),
      }
    })
}

async function detectUnderservedCategories(
  health: CatalogHealth
): Promise<Opportunity[]> {
  return health.categoryCoverage
    .filter(cat => cat.healthStatus === 'thin' || cat.healthStatus === 'stale')
    .map(cat => {
      const score = cat.healthStatus === 'stale' ? 70 : 55
      return {
        id: `underserved-${cat.slug}`,
        source: 'underserved' as const,
        priority: priorityFromScore(score),
        score,
        title: cat.healthStatus === 'stale'
          ? `Categoria "${cat.name}" sem ofertas ativas`
          : `Categoria "${cat.name}" com poucos produtos (${cat.productCount})`,
        categoryId: cat.id,
        categoryName: cat.name,
        productCount: cat.productCount,
        actionUrl: `/admin/ml/discovery?category=${cat.slug}`,
        detectedAt: new Date().toISOString(),
      }
    })
}

async function detectPriceDrops(): Promise<Opportunity[]> {
  // Find products where current price dropped significantly from yesterday
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      capturedAt: { gte: yesterday },
      offer: { isActive: true },
    },
    include: {
      offer: {
        include: {
          listing: {
            include: { product: true, source: true },
          },
        },
      },
    },
    orderBy: { capturedAt: 'desc' },
    take: 100,
  })

  const opportunities: Opportunity[] = []
  const seen = new Set<string>()

  for (const snap of snapshots) {
    const offer = snap.offer
    if (!offer.listing?.product || seen.has(offer.listing.product.id)) continue
    seen.add(offer.listing.product.id)

    // Compare snapshot price to current price
    if (snap.price > offer.currentPrice && offer.currentPrice > 0) {
      const dropPct = ((snap.price - offer.currentPrice) / snap.price) * 100
      if (dropPct >= 15) {
        const score = Math.min(50 + dropPct, 95)
        opportunities.push({
          id: `price-drop-${offer.listing.product.id}`,
          source: 'price_drop',
          priority: priorityFromScore(score),
          score,
          title: `${offer.listing.product.name} caiu ${Math.round(dropPct)}% (R$${snap.price.toFixed(2)} → R$${offer.currentPrice.toFixed(2)})`,
          metadata: {
            productId: offer.listing.product.id,
            oldPrice: snap.price,
            newPrice: offer.currentPrice,
            dropPercent: Math.round(dropPct),
          },
          actionUrl: `/produto/${offer.listing.product.slug}`,
          detectedAt: new Date().toISOString(),
        })
      }
    }
  }

  return opportunities.slice(0, 10)
}

// ── Main Report ────────────────────────────────────────────────────────────

/**
 * Generate a full opportunity report: catalog health + prioritized opportunities.
 */
export async function generateOpportunityReport(): Promise<OpportunityReport> {
  const start = Date.now()

  // Run in parallel where possible
  const [health, trendingOps, gapOps, priceOps] = await Promise.all([
    getCatalogHealth(),
    detectTrendingOpportunities(),
    detectCatalogGaps(),
    detectPriceDrops(),
  ])

  // Underserved depends on health
  const underservedOps = await detectUnderservedCategories(health)

  // Merge and sort all opportunities by score
  const allOpportunities = [
    ...trendingOps,
    ...gapOps,
    ...underservedOps,
    ...priceOps,
  ].sort((a, b) => b.score - a.score)

  return {
    opportunities: allOpportunities.slice(0, 30),
    catalogHealth: health,
    generatedAt: new Date().toISOString(),
    processingMs: Date.now() - start,
  }
}
