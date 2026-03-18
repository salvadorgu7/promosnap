import prisma from './prisma'
import type { ProductCard, Badge } from '@/types'
import { calculateCommercialScore, type CommercialSignals } from '@/lib/ranking/commercial'
import { memoryCache } from '@/lib/cache/memory'

const HOMEPAGE_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// ============================================
// PRODUCT CARD BUILDER
// ============================================

export function buildProductCard(p: any): ProductCard | null {
  const allOffers = p.listings?.flatMap((l: any) =>
    l.offers?.map((o: any) => ({
      ...o,
      sourceSlug: l.source?.slug || 'unknown',
      sourceName: l.source?.name || 'Unknown',
    })) || []
  ) || []

  const best = allOffers.sort((a: any, b: any) => b.offerScore - a.offerScore)[0]
  if (!best) return null

  const discount = best.originalPrice && best.originalPrice > best.currentPrice
    ? Math.round(((best.originalPrice - best.currentPrice) / best.originalPrice) * 100)
    : undefined

  const badges: Badge[] = []
  if (best.offerScore >= 80) badges.push({ type: 'hot_deal', label: 'Oferta Quente', color: 'red' })
  if (discount && discount >= 40) badges.push({ type: 'price_drop', label: `${discount}% OFF`, color: 'green' })
  if (best.isFreeShipping) badges.push({ type: 'free_shipping', label: 'Frete Grátis', color: 'purple' })
  if (best.couponText) badges.push({ type: 'coupon', label: 'Cupom', color: 'orange' })
  if (p.listings?.[0]?.salesCountEstimate > 5000) badges.push({ type: 'best_seller', label: 'Mais Vendido', color: 'yellow' })

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    imageUrl: p.imageUrl || p.listings?.find((l: any) => l.imageUrl)?.imageUrl || null,
    brand: p.brand?.name,
    category: p.category?.name,
    categorySlug: p.category?.slug,
    bestOffer: {
      offerId: best.id,
      price: best.currentPrice,
      originalPrice: best.originalPrice ?? undefined,
      discount,
      sourceSlug: best.sourceSlug,
      sourceName: best.sourceName,
      affiliateUrl: best.affiliateUrl || '#',
      isFreeShipping: best.isFreeShipping,
      offerScore: best.offerScore,
    },
    offersCount: allOffers.length,
    popularityScore: p.popularityScore,
    originType: p.originType || undefined,
    badges,
  }
}

// Lean source select — only fields used by buildProductCard
const SOURCE_SELECT = { select: { slug: true, name: true } } as const

export const PRODUCT_INCLUDE = {
  brand: { select: { name: true, slug: true } },
  category: { select: { name: true, slug: true } },
  listings: {
    where: { status: 'ACTIVE' as const },
    select: {
      imageUrl: true,
      salesCountEstimate: true,
      source: SOURCE_SELECT,
      offers: {
        where: { isActive: true },
        orderBy: { offerScore: 'desc' as const },
        take: 3,
        select: {
          id: true,
          currentPrice: true,
          originalPrice: true,
          offerScore: true,
          isFreeShipping: true,
          couponText: true,
          affiliateUrl: true,
        },
      },
    },
  },
}

// Product select — only fields used by buildProductCard + ranking helpers
const PRODUCT_SELECT_FOR_CARD = {
  id: true,
  name: true,
  slug: true,
  imageUrl: true,
  popularityScore: true,
  originType: true,
}

// ============================================
// COMMERCIAL RANKING HELPER
// ============================================

function cardToSignals(card: ProductCard): CommercialSignals {
  return {
    currentPrice: card.bestOffer.price,
    originalPrice: card.bestOffer.originalPrice,
    offerScore: card.bestOffer.offerScore,
    isFreeShipping: card.bestOffer.isFreeShipping,
    hasImage: !!card.imageUrl,
    hasAffiliate: card.bestOffer.affiliateUrl !== '#',
  }
}

function rankCards(cards: ProductCard[], preset: string): ProductCard[] {
  return cards
    .map(card => ({
      card,
      score: calculateCommercialScore(cardToSignals(card), preset),
    }))
    .sort((a, b) => b.score.total - a.score.total)
    .map(s => s.card)
}

// ============================================
// HOME PAGE QUERIES
// ============================================

export async function getHotOffers(limit = 16): Promise<ProductCard[]> {
  const cacheKey = `homepage:hotOffers:${limit}`
  const cached = memoryCache.get<ProductCard[]>(cacheKey)
  if (cached) return cached

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', listings: { some: { offers: { some: { isActive: true, currentPrice: { gt: 10 } } } } } },
    select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
    orderBy: { popularityScore: 'desc' },
    take: limit * 2,
  })
  const cards = products.map(buildProductCard).filter(Boolean) as ProductCard[]
  const result = rankCards(cards, 'deal')
    .filter(c => (c.bestOffer.discount ?? 0) < 92) // Skip parse-error "98% off" products
    .slice(0, limit)
  memoryCache.set(cacheKey, result, HOMEPAGE_CACHE_TTL_MS)
  return result
}

export async function getBestSellers(limit = 16): Promise<ProductCard[]> {
  const cacheKey = `homepage:bestSellers:${limit}`
  const cached = memoryCache.get<ProductCard[]>(cacheKey)
  if (cached) return cached

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', listings: { some: { offers: { some: { isActive: true } }, salesCountEstimate: { gt: 0 } } } },
    select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
    orderBy: { popularityScore: 'desc' },
    take: limit * 2,
  })
  const cards = products.map(buildProductCard).filter(Boolean) as ProductCard[]
  const result = rankCards(cards, 'trending').slice(0, limit)
  memoryCache.set(cacheKey, result, HOMEPAGE_CACHE_TTL_MS)
  return result
}

export async function getLowestPrices(limit = 16): Promise<ProductCard[]> {
  const cacheKey = `homepage:lowestPrices:${limit}`
  const cached = memoryCache.get<ProductCard[]>(cacheKey)
  if (cached) return cached

  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', listings: { some: { offers: { some: { isActive: true, originalPrice: { not: null } } } } } },
    select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
    take: limit * 2,
  })
  const result = products.map(buildProductCard).filter(Boolean)
    .filter(p => p!.bestOffer.discount && p!.bestOffer.discount > 10 && p!.bestOffer.discount < 92)
    .filter(p => p!.bestOffer.price > 10) // Skip parse-error prices
    .sort((a, b) => (b!.bestOffer.discount || 0) - (a!.bestOffer.discount || 0))
    .slice(0, limit) as ProductCard[]
  memoryCache.set(cacheKey, result, HOMEPAGE_CACHE_TTL_MS)
  return result
}

// ============================================
// RECENTLY IMPORTED (last 14 days — wider window for sparse catalogs)
// ============================================

export async function getRecentlyImported(limit = 16): Promise<ProductCard[]> {
  const cacheKey = `homepage:recentlyImported:${limit}`
  const cached = memoryCache.get<ProductCard[]>(cacheKey)
  if (cached) return cached

  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

    // Try imported products first
    let products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        originType: 'imported',
        importedAt: { not: null, gte: fourteenDaysAgo },
        listings: { some: { offers: { some: { isActive: true } } } },
      },
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      orderBy: { importedAt: 'desc' },
      take: limit,
    })

    // Fallback: if no imported products, show most recently updated active products
    if (products.length === 0) {
      products = await prisma.product.findMany({
        where: {
          status: 'ACTIVE',
          listings: { some: { offers: { some: { isActive: true } } } },
        },
        select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      })
    }

    const result = products.map(buildProductCard).filter(Boolean) as ProductCard[]
    memoryCache.set(cacheKey, result, HOMEPAGE_CACHE_TTL_MS)
    return result
  } catch {
    // Defensive: importedAt/originType column may not exist yet
    return []
  }
}

// ============================================
// BEST VALUE (highest discount + free shipping)
// ============================================

export async function getBestValue(limit = 16): Promise<ProductCard[]> {
  const cacheKey = `homepage:bestValue:${limit}`
  const cached = memoryCache.get<ProductCard[]>(cacheKey)
  if (cached) return cached

  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        listings: {
          some: {
            offers: {
              some: {
                isActive: true,
                originalPrice: { not: null },
                currentPrice: { gt: 0 },
              },
            },
          },
        },
      },
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      take: limit * 3,
    })
    // Sort raw products so imported ones come first
    products.sort((a: any, b: any) => {
      const aImported = a.originType === 'imported' ? 1 : 0
      const bImported = b.originType === 'imported' ? 1 : 0
      return bImported - aImported
    })
    const result = products
      .map(buildProductCard)
      .filter(Boolean)
      .filter((p) => p!.bestOffer.discount && p!.bestOffer.discount > 10 && p!.bestOffer.price > 0)
      .sort((a, b) => (b!.bestOffer.discount || 0) - (a!.bestOffer.discount || 0))
      .slice(0, limit) as ProductCard[]
    memoryCache.set(cacheKey, result, HOMEPAGE_CACHE_TTL_MS)
    return result
  } catch {
    return []
  }
}

// ============================================
// NEWSLETTER PRODUCTS (imported, >15% discount, free shipping)
// ============================================

export async function getNewsletterProducts(limit = 10): Promise<ProductCard[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        originType: 'imported',
        listings: {
          some: {
            offers: {
              some: {
                isActive: true,
                isFreeShipping: true,
                originalPrice: { not: null },
              },
            },
          },
        },
      },
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      take: limit * 3,
    })
    return products
      .map(buildProductCard)
      .filter(Boolean)
      .filter((p) => p!.bestOffer.discount && p!.bestOffer.discount > 15 && p!.bestOffer.isFreeShipping)
      .sort((a, b) => (b!.bestOffer.discount || 0) - (a!.bestOffer.discount || 0))
      .slice(0, limit) as ProductCard[]
  } catch {
    // Defensive: originType column may not exist yet
    return []
  }
}

// ============================================
// CAMPAIGN-READY PRODUCTS (imported, good image, affiliate URL, >15% discount, in stock)
// ============================================

export async function getReadyForCampaign(limit = 20): Promise<ProductCard[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        originType: 'imported',
        imageUrl: { not: null },
        listings: {
          some: {
            status: 'ACTIVE',
            availability: 'IN_STOCK',
            offers: {
              some: {
                isActive: true,
                affiliateUrl: { not: null },
                originalPrice: { not: null },
                currentPrice: { gt: 0 },
              },
            },
          },
        },
      },
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      take: limit * 3,
    })
    return products
      .map(buildProductCard)
      .filter(Boolean)
      .filter((p) =>
        p!.bestOffer.discount && p!.bestOffer.discount > 15
        && p!.bestOffer.affiliateUrl !== '#'
        && !!p!.imageUrl
      )
      .sort((a, b) => (b!.bestOffer.offerScore || 0) - (a!.bestOffer.offerScore || 0))
      .slice(0, limit) as ProductCard[]
  } catch {
    return []
  }
}

// ============================================
// CATEGORY/BRAND QUERIES
// ============================================

export async function getProductsByCategory(slug: string, options: {
  limit?: number; page?: number; sort?: string
} = {}): Promise<{ products: ProductCard[]; total: number }> {
  const { limit = 24, page = 1, sort = 'score' } = options
  const offset = (page - 1) * limit

  const where = {
    status: 'ACTIVE' as const,
    category: { slug },
    listings: { some: { offers: { some: { isActive: true } } } },
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      skip: offset,
      take: limit,
      orderBy: { popularityScore: 'desc' },
    }),
    prisma.product.count({ where }),
  ])

  let cards = products.map(buildProductCard).filter(Boolean) as ProductCard[]
  if (sort === 'price_asc') cards.sort((a, b) => a.bestOffer.price - b.bestOffer.price)
  else if (sort === 'price_desc') cards.sort((a, b) => b.bestOffer.price - a.bestOffer.price)
  else if (sort === 'discount') cards.sort((a, b) => (b.bestOffer.discount || 0) - (a.bestOffer.discount || 0))
  else cards = rankCards(cards, 'category')

  return { products: cards, total }
}

export async function getProductsByBrand(slug: string, options: {
  limit?: number; page?: number; sort?: string
} = {}): Promise<{ products: ProductCard[]; total: number }> {
  const { limit = 24, page = 1, sort = 'score' } = options
  const offset = (page - 1) * limit

  const where = {
    status: 'ACTIVE' as const,
    brand: { slug },
    listings: { some: { offers: { some: { isActive: true } } } },
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      skip: offset,
      take: limit,
      orderBy: { popularityScore: 'desc' },
    }),
    prisma.product.count({ where }),
  ])

  let cards = products.map(buildProductCard).filter(Boolean) as ProductCard[]
  if (sort === 'price_asc') cards.sort((a, b) => a.bestOffer.price - b.bestOffer.price)
  else if (sort === 'price_desc') cards.sort((a, b) => b.bestOffer.price - a.bestOffer.price)
  else cards = rankCards(cards, 'brand')

  return { products: cards, total }
}

// ============================================
// PRODUCT DETAIL QUERIES
// ============================================

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: { select: { name: true, slug: true, logoUrl: true } },
      category: { select: { name: true, slug: true } },
      listings: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          rawTitle: true,
          imageUrl: true,
          rating: true,
          reviewsCount: true,
          salesCountEstimate: true,
          source: SOURCE_SELECT,
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: 'asc' },
            select: {
              id: true,
              currentPrice: true,
              originalPrice: true,
              couponText: true,
              shippingPrice: true,
              installmentText: true,
              isFreeShipping: true,
              offerScore: true,
              affiliateUrl: true,
              lastSeenAt: true,
            },
          },
        },
      },
    },
  })
}

export async function getSimilarProducts(categorySlug: string | undefined, excludeSlug: string, limit = 8): Promise<ProductCard[]> {
  if (!categorySlug) return []
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      category: { slug: categorySlug },
      slug: { not: excludeSlug },
      listings: { some: { offers: { some: { isActive: true } } } },
    },
    select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
    take: limit,
    orderBy: { popularityScore: 'desc' },
  })
  return products.map(buildProductCard).filter(Boolean) as ProductCard[]
}

export async function getAlternatives(categorySlug: string | undefined, price: number, excludeId: string, limit = 6): Promise<ProductCard[]> {
  if (!categorySlug || !price) return []
  const minPrice = price * 0.7
  const maxPrice = price * 1.3
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      id: { not: excludeId },
      category: { slug: categorySlug },
      listings: {
        some: {
          offers: {
            some: {
              isActive: true,
              currentPrice: { gte: minPrice, lte: maxPrice },
            },
          },
        },
      },
    },
    select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
    take: limit * 2,
    orderBy: { popularityScore: 'desc' },
  })
  const cards = products.map(buildProductCard).filter(Boolean) as ProductCard[]
  return rankCards(cards, 'deal').slice(0, limit)
}

export async function getPriceHistory(offerId: string, days = 90) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return prisma.priceSnapshot.findMany({
    where: { offerId, capturedAt: { gte: since } },
    select: { price: true, originalPrice: true, capturedAt: true },
    orderBy: { capturedAt: 'asc' },
  })
}

// ============================================
// SEARCH
// ============================================

export async function searchListings(query: string, options: {
  page?: number; limit?: number; sort?: string
  minPrice?: number; maxPrice?: number; source?: string
  freeShipping?: boolean; category?: string; brand?: string
} = {}): Promise<{ products: ProductCard[]; total: number }> {
  const { page = 1, limit = 24, sort = 'relevance', minPrice, maxPrice, source, freeShipping, category, brand } = options
  const offset = (page - 1) * limit

  const where: any = {
    status: 'ACTIVE',
    listings: { some: { offers: { some: { isActive: true } } } },
    OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { brand: { name: { contains: query, mode: 'insensitive' } } },
      { listings: { some: { rawTitle: { contains: query, mode: 'insensitive' } } } },
    ],
  }
  if (category) where.category = { slug: category }
  if (brand) where.brand = { slug: brand }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      skip: offset,
      take: limit,
      orderBy: { popularityScore: 'desc' },
    }),
    prisma.product.count({ where }),
  ])

  let cards = products.map(buildProductCard).filter(Boolean) as ProductCard[]

  // Apply post-query filters
  if (minPrice) cards = cards.filter(c => c.bestOffer.price >= minPrice)
  if (maxPrice) cards = cards.filter(c => c.bestOffer.price <= maxPrice)
  if (source) cards = cards.filter(c => c.bestOffer.sourceSlug === source)
  if (freeShipping) cards = cards.filter(c => c.bestOffer.isFreeShipping)

  // Sort
  if (sort === 'price_asc') cards.sort((a, b) => a.bestOffer.price - b.bestOffer.price)
  else if (sort === 'price_desc') cards.sort((a, b) => b.bestOffer.price - a.bestOffer.price)
  else if (sort === 'score') cards.sort((a, b) => b.bestOffer.offerScore - a.bestOffer.offerScore)
  else if (sort === 'discount') cards.sort((a, b) => (b.bestOffer.discount || 0) - (a.bestOffer.discount || 0))
  else if (sort === 'relevance') {
    // Secondary boost: prefer imported/real products over seed data
    // Primary sort is already popularityScore from the DB query
    cards.sort((a, b) => {
      const aImported = a.originType === 'imported' ? 1 : 0
      const bImported = b.originType === 'imported' ? 1 : 0
      if (aImported !== bImported) return bImported - aImported
      // Preserve existing popularityScore order for ties
      return b.popularityScore - a.popularityScore
    })
  }

  // Log search (fire-and-forget)
  prisma.searchLog.create({ data: { query, normalizedQuery: query.toLowerCase().trim(), resultsCount: total } }).catch(() => {})

  return { products: cards, total }
}

export interface SearchSuggestion {
  text: string
  type: 'product' | 'trending' | 'recent'
}

export async function getSearchSuggestions(query: string, limit = 8): Promise<SearchSuggestion[]> {
  if (!query || query.length < 2) return []

  const suggestions: SearchSuggestion[] = []
  const seen = new Set<string>()

  // Source 1: Product names (highest priority)
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      name: { contains: query, mode: 'insensitive' },
    },
    select: { name: true },
    take: limit,
    orderBy: { popularityScore: 'desc' },
  })

  for (const p of products) {
    const key = p.name.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      suggestions.push({ text: p.name, type: 'product' })
    }
  }

  // Source 2: Trending keywords
  try {
    const trending = await prisma.trendingKeyword.findMany({
      where: {
        keyword: { contains: query, mode: 'insensitive' },
      },
      select: { keyword: true },
      take: 5,
      orderBy: { position: 'asc' },
    })

    for (const t of trending) {
      const key = t.keyword.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        suggestions.push({ text: t.keyword, type: 'trending' })
      }
    }
  } catch {
    // non-critical
  }

  // Source 3: Recent popular searches (last 7 days)
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentSearches = await prisma.searchLog.groupBy({
      by: ['normalizedQuery'],
      where: {
        normalizedQuery: { contains: query.toLowerCase() },
        createdAt: { gte: sevenDaysAgo },
      },
      _count: { normalizedQuery: true },
      having: {
        normalizedQuery: { _count: { gt: 1 } },
      },
      orderBy: { _count: { normalizedQuery: 'desc' } },
      take: 5,
    })

    for (const s of recentSearches) {
      if (!s.normalizedQuery) continue
      const key = s.normalizedQuery.toLowerCase()
      if (!seen.has(key)) {
        seen.add(key)
        suggestions.push({ text: s.normalizedQuery, type: 'recent' })
      }
    }
  } catch {
    // non-critical — SearchLog may not have data yet
  }

  return suggestions.slice(0, limit)
}

// ============================================
// SITE STATS
// ============================================

export async function getSiteStats() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  const [listings, activeOffers, sources, clickoutsToday, clickoutsWeek, categories, brands] = await Promise.all([
    prisma.listing.count({ where: { status: 'ACTIVE' } }),
    prisma.offer.count({ where: { isActive: true } }),
    prisma.source.count({ where: { status: 'ACTIVE' } }),
    prisma.clickout.count({ where: { clickedAt: { gte: today } } }),
    prisma.clickout.count({ where: { clickedAt: { gte: weekAgo } } }),
    prisma.category.count(),
    prisma.brand.count(),
  ])

  return { listings, activeOffers, sources, clickoutsToday, clickoutsWeek, categories, brands }
}

// ============================================
// ADMIN QUERIES
// ============================================

export async function getAdminDashboardData() {
  const stats = await getSiteStats()

  const [recentClickouts, topProducts, jobRuns, couponsActive] = await Promise.all([
    prisma.clickout.findMany({
      take: 20,
      orderBy: { clickedAt: 'desc' },
      select: {
        id: true,
        sourceSlug: true,
        clickedAt: true,
        query: true,
        offer: {
          select: {
            currentPrice: true,
            listing: {
              select: {
                rawTitle: true,
                source: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.$queryRaw`
      SELECT o."listingId", COUNT(c.id)::int as clicks, l."rawTitle", s.name as "sourceName"
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      JOIN listings l ON o."listingId" = l.id
      JOIN sources s ON l."sourceId" = s.id
      WHERE c."clickedAt" > NOW() - INTERVAL '7 days'
      GROUP BY o."listingId", l."rawTitle", s.name
      ORDER BY clicks DESC
      LIMIT 10
    `.catch(() => []),
    prisma.jobRun.findMany({
      take: 10,
      orderBy: { startedAt: 'desc' },
      select: { id: true, jobName: true, status: true, startedAt: true, endedAt: true, durationMs: true, itemsTotal: true, itemsDone: true },
    }),
    prisma.coupon.count({ where: { status: 'ACTIVE' } }),
  ])

  // Clickouts per day for last 7 days
  const clickoutsByDay = await prisma.$queryRaw`
    SELECT DATE(c."clickedAt") as day, COUNT(c.id)::int as count
    FROM clickouts c
    WHERE c."clickedAt" > NOW() - INTERVAL '7 days'
    GROUP BY DATE(c."clickedAt")
    ORDER BY day ASC
  `.catch(() => [])

  return { stats, recentClickouts, topProducts, jobRuns, couponsActive, clickoutsByDay }
}

export async function getAdminProducts(options: {
  page?: number; limit?: number; search?: string; sort?: string; order?: string
} = {}) {
  const { page = 1, limit = 25, search, sort = 'updatedAt', order = 'desc' } = options
  const offset = (page - 1) * limit

  const where: any = { status: 'ACTIVE' }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { listings: { some: { rawTitle: { contains: search, mode: 'insensitive' } } } },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        status: true,
        popularityScore: true,
        updatedAt: true,
        brand: { select: { name: true, slug: true } },
        category: { select: { name: true, slug: true } },
        listings: {
          take: 1,
          select: {
            offers: {
              where: { isActive: true },
              take: 1,
              orderBy: { currentPrice: 'asc' },
              select: { currentPrice: true, originalPrice: true },
            },
            source: { select: { name: true, slug: true } },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: { [sort]: order },
    }),
    prisma.product.count({ where }),
  ])

  return { products, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAdminOffers(options: {
  page?: number; limit?: number; source?: string
} = {}) {
  const { page = 1, limit = 25, source } = options
  const offset = (page - 1) * limit

  const where: any = { isActive: true }
  if (source) {
    where.listing = { source: { slug: source } }
  }

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      select: {
        id: true,
        currentPrice: true,
        originalPrice: true,
        offerScore: true,
        isFreeShipping: true,
        couponText: true,
        affiliateUrl: true,
        updatedAt: true,
        listing: {
          select: {
            rawTitle: true,
            imageUrl: true,
            source: { select: { name: true, slug: true } },
          },
        },
      },
      skip: offset,
      take: limit,
      orderBy: { offerScore: 'desc' },
    }),
    prisma.offer.count({ where }),
  ])

  return { offers, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAdminSources() {
  // Use a single query with counts to avoid N+1
  const sources = await prisma.source.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      status: true,
      affiliateConfig: true,
      updatedAt: true,
      _count: { select: { listings: true, coupons: true } },
    },
  })

  // Batch the extra queries instead of N+1
  const sourceIds = sources.map(s => s.id)
  const [offerCounts, lastUpdates] = await Promise.all([
    prisma.$queryRaw<{ sourceId: string; count: number }[]>`
      SELECT l."sourceId", COUNT(o.id)::int as count
      FROM offers o
      JOIN listings l ON o."listingId" = l.id
      WHERE o."isActive" = true AND l."sourceId" = ANY(${sourceIds})
      GROUP BY l."sourceId"
    `.catch(() => []),
    prisma.$queryRaw<{ sourceId: string; lastUpdate: Date }[]>`
      SELECT "sourceId", MAX("updatedAt") as "lastUpdate"
      FROM listings
      WHERE "sourceId" = ANY(${sourceIds})
      GROUP BY "sourceId"
    `.catch(() => []),
  ])

  const offerMap = new Map((offerCounts as any[]).map(r => [r.sourceId, r.count]))
  const updateMap = new Map((lastUpdates as any[]).map(r => [r.sourceId, r.lastUpdate]))

  return sources.map(s => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    logoUrl: s.logoUrl,
    status: s.status,
    affiliateConfig: s.affiliateConfig,
    updatedAt: s.updatedAt,
    listingCount: s._count.listings,
    couponCount: s._count.coupons,
    offerCount: offerMap.get(s.id) || 0,
    lastUpdate: updateMap.get(s.id) || null,
  }))
}

export async function getAdminJobRuns(limit = 50) {
  return prisma.jobRun.findMany({
    take: limit,
    orderBy: { startedAt: 'desc' },
    select: {
      id: true,
      jobName: true,
      status: true,
      startedAt: true,
      endedAt: true,
      durationMs: true,
      itemsTotal: true,
      itemsDone: true,
      errorLog: true,
    },
  })
}

// ============================================
// CATEGORIES & BRANDS
// ============================================

export async function getCategories() {
  return prisma.category.findMany({
    select: {
      id: true, name: true, slug: true, icon: true, position: true,
      _count: { select: { products: { where: { status: 'ACTIVE' } } } },
    },
    orderBy: { position: 'asc' },
  })
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, icon: true, description: true, seoTitle: true, seoDescription: true, _count: { select: { products: true } } },
  })
}

export async function getBrands() {
  return prisma.brand.findMany({
    select: { id: true, name: true, slug: true, logoUrl: true, _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, logoUrl: true, _count: { select: { products: true } } },
  })
}

// ============================================
// COUPONS
// ============================================

export async function getActiveCoupons() {
  return prisma.coupon.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      code: true,
      description: true,
      startAt: true,
      endAt: true,
      source: { select: { name: true, slug: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
}

// ============================================
// CLICKOUT ANALYTICS
// ============================================

export async function getTopSearchTerms(limit = 10) {
  return prisma.$queryRaw`
    SELECT "normalizedQuery" as term, COUNT(*)::int as count
    FROM search_logs
    WHERE "createdAt" > NOW() - INTERVAL '7 days'
    AND "normalizedQuery" IS NOT NULL
    GROUP BY "normalizedQuery"
    ORDER BY count DESC
    LIMIT ${limit}
  `.catch(() => [])
}

export async function getClickoutsBySource() {
  return prisma.$queryRaw`
    SELECT c."sourceSlug", COUNT(c.id)::int as count
    FROM clickouts c
    WHERE c."clickedAt" > NOW() - INTERVAL '7 days'
    GROUP BY c."sourceSlug"
    ORDER BY count DESC
  `.catch(() => [])
}

// ============================================
// MOST SEARCHED (from SearchLog)
// ============================================

export async function getMostSearched(limit = 10): Promise<{ term: string; count: number }[]> {
  try {
    const results = await prisma.$queryRaw<{ term: string; count: number }[]>`
      SELECT "normalizedQuery" as term, COUNT(*)::int as count
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
      AND "normalizedQuery" IS NOT NULL
      AND LENGTH("normalizedQuery") > 2
      GROUP BY "normalizedQuery"
      ORDER BY count DESC
      LIMIT ${limit}
    `
    return results as { term: string; count: number }[]
  } catch {
    return []
  }
}

// ============================================
// HIGHLIGHTED IMPORTS (high-discount imported products)
// ============================================

export async function getHighlightedImports(limit = 16): Promise<ProductCard[]> {
  const cacheKey = `homepage:highlightedImports:${limit}`
  const cached = memoryCache.get<ProductCard[]>(cacheKey)
  if (cached) return cached

  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        originType: 'imported',
        imageUrl: { not: null },
        listings: {
          some: {
            offers: {
              some: {
                isActive: true,
                originalPrice: { not: null },
                affiliateUrl: { not: null },
              },
            },
          },
        },
      },
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      take: limit * 3,
    })
    const result = products
      .map(buildProductCard)
      .filter(Boolean)
      .filter((p) => p!.bestOffer.discount && p!.bestOffer.discount > 15 && p!.imageUrl)
      .sort((a, b) => (b!.bestOffer.discount || 0) - (a!.bestOffer.discount || 0))
      .slice(0, limit) as ProductCard[]
    memoryCache.set(cacheKey, result, HOMEPAGE_CACHE_TTL_MS)
    return result
  } catch {
    return []
  }
}

// ============================================
// RELATED SEARCHES (for internal linking)
// ============================================

export async function getRelatedSearches(context: string, limit = 8): Promise<string[]> {
  try {
    const results = await prisma.$queryRaw<{ term: string }[]>`
      SELECT DISTINCT "normalizedQuery" as term
      FROM search_logs
      WHERE "normalizedQuery" IS NOT NULL
      AND LENGTH("normalizedQuery") > 2
      AND "resultsCount" > 0
      AND "createdAt" > NOW() - INTERVAL '30 days'
      AND "normalizedQuery" != ${context.toLowerCase().trim()}
      ORDER BY term ASC
      LIMIT ${limit}
    `
    return (results as { term: string }[]).map(r => r.term)
  } catch {
    return []
  }
}

// ============================================
// CATEGORY BRANDS (for brand filtering)
// ============================================

export async function getCategoryBrands(categorySlug: string): Promise<{ name: string; slug: string; count: number }[]> {
  try {
    const brands = await prisma.brand.findMany({
      where: {
        products: {
          some: {
            status: 'ACTIVE',
            category: { slug: categorySlug },
            listings: { some: { offers: { some: { isActive: true } } } },
          },
        },
      },
      select: {
        name: true,
        slug: true,
        _count: {
          select: {
            products: {
              where: {
                status: 'ACTIVE',
                category: { slug: categorySlug },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    })
    return brands.map(b => ({ name: b.name, slug: b.slug, count: b._count.products }))
  } catch {
    return []
  }
}

// ============================================
// CATEGORY RECENTLY IMPORTED
// ============================================

export async function getCategoryRecentImports(categorySlug: string, limit = 8): Promise<ProductCard[]> {
  try {
    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        originType: 'imported',
        importedAt: { not: null, gte: fourteenDaysAgo },
        category: { slug: categorySlug },
        listings: { some: { offers: { some: { isActive: true } } } },
      },
      select: { ...PRODUCT_SELECT_FOR_CARD, ...PRODUCT_INCLUDE },
      orderBy: { importedAt: 'desc' },
      take: limit,
    })
    return products.map(buildProductCard).filter(Boolean) as ProductCard[]
  } catch {
    return []
  }
}

// ============================================
// CATEGORY TRENDING KEYWORDS
// ============================================

export async function getCategoryTrendingKeywords(categorySlug: string, limit = 6): Promise<string[]> {
  try {
    // Get product names in this category to match against search logs
    const results = await prisma.$queryRaw<{ term: string }[]>`
      SELECT DISTINCT sl."normalizedQuery" as term
      FROM search_logs sl
      WHERE sl."normalizedQuery" IS NOT NULL
      AND sl."createdAt" > NOW() - INTERVAL '14 days'
      AND sl."resultsCount" > 0
      AND LENGTH(sl."normalizedQuery") > 2
      AND EXISTS (
        SELECT 1 FROM products p
        JOIN categories c ON p."categoryId" = c.id
        WHERE c.slug = ${categorySlug}
        AND p.status = 'ACTIVE'
        AND LOWER(p.name) LIKE '%' || sl."normalizedQuery" || '%'
      )
      ORDER BY term ASC
      LIMIT ${limit}
    `
    return (results as { term: string }[]).map(r => r.term)
  } catch {
    return []
  }
}
