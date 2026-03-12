import prisma from './prisma'
import type { ProductCard, Badge } from '@/types'

// ============================================
// PRODUCT CARD BUILDER
// ============================================

function buildProductCard(p: any): ProductCard | null {
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
    imageUrl: p.imageUrl || p.listings?.[0]?.imageUrl,
    brand: p.brand?.name,
    category: p.category?.name,
    categorySlug: p.category?.slug,
    bestOffer: {
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
    badges,
  }
}

const PRODUCT_INCLUDE = {
  brand: true,
  category: true,
  listings: {
    where: { status: 'ACTIVE' as const },
    include: {
      offers: { where: { isActive: true }, orderBy: { offerScore: 'desc' as const }, take: 3 },
      source: true,
    },
  },
}

// ============================================
// HOME PAGE QUERIES
// ============================================

export async function getHotOffers(limit = 16): Promise<ProductCard[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', listings: { some: { offers: { some: { isActive: true } } } } },
    include: PRODUCT_INCLUDE,
    orderBy: { popularityScore: 'desc' },
    take: limit * 2, // fetch more, filter after
  })
  return products.map(buildProductCard).filter(Boolean).sort((a, b) => (b!.bestOffer.offerScore) - (a!.bestOffer.offerScore)).slice(0, limit) as ProductCard[]
}

export async function getBestSellers(limit = 16): Promise<ProductCard[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', listings: { some: { offers: { some: { isActive: true } }, salesCountEstimate: { gt: 0 } } } },
    include: PRODUCT_INCLUDE,
    orderBy: { popularityScore: 'desc' },
    take: limit,
  })
  return products.map(buildProductCard).filter(Boolean) as ProductCard[]
}

export async function getLowestPrices(limit = 16): Promise<ProductCard[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE', listings: { some: { offers: { some: { isActive: true, originalPrice: { not: null } } } } } },
    include: PRODUCT_INCLUDE,
    take: limit * 2,
  })
  return products.map(buildProductCard).filter(Boolean)
    .filter(p => p!.bestOffer.discount && p!.bestOffer.discount > 10)
    .sort((a, b) => (b!.bestOffer.discount || 0) - (a!.bestOffer.discount || 0))
    .slice(0, limit) as ProductCard[]
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
      include: PRODUCT_INCLUDE,
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
  else cards.sort((a, b) => b.bestOffer.offerScore - a.bestOffer.offerScore)

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
      include: PRODUCT_INCLUDE,
      skip: offset,
      take: limit,
      orderBy: { popularityScore: 'desc' },
    }),
    prisma.product.count({ where }),
  ])

  let cards = products.map(buildProductCard).filter(Boolean) as ProductCard[]
  if (sort === 'price_asc') cards.sort((a, b) => a.bestOffer.price - b.bestOffer.price)
  else if (sort === 'price_desc') cards.sort((a, b) => b.bestOffer.price - a.bestOffer.price)
  else cards.sort((a, b) => b.bestOffer.offerScore - a.bestOffer.offerScore)

  return { products: cards, total }
}

// ============================================
// PRODUCT DETAIL QUERIES
// ============================================

export async function getProductBySlug(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      brand: true,
      category: true,
      listings: {
        where: { status: 'ACTIVE' },
        include: {
          offers: { where: { isActive: true }, orderBy: { currentPrice: 'asc' } },
          source: true,
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
    include: PRODUCT_INCLUDE,
    take: limit,
    orderBy: { popularityScore: 'desc' },
  })
  return products.map(buildProductCard).filter(Boolean) as ProductCard[]
}

export async function getPriceHistory(offerId: string, days = 90) {
  const since = new Date()
  since.setDate(since.getDate() - days)
  return prisma.priceSnapshot.findMany({
    where: { offerId, capturedAt: { gte: since } },
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
      include: PRODUCT_INCLUDE,
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

  // Log search
  prisma.searchLog.create({ data: { query, normalizedQuery: query.toLowerCase().trim(), resultsCount: total } }).catch(() => {})

  return { products: cards, total }
}

export async function getSearchSuggestions(query: string, limit = 5): Promise<string[]> {
  if (!query || query.length < 2) return []

  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      name: { contains: query, mode: 'insensitive' },
    },
    select: { name: true },
    take: limit,
    orderBy: { popularityScore: 'desc' },
  })

  return products.map(p => p.name)
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
      include: { offer: { include: { listing: { include: { source: true } } } } },
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
    prisma.jobRun.findMany({ take: 10, orderBy: { startedAt: 'desc' } }),
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
      include: {
        brand: true,
        category: true,
        listings: {
          take: 1,
          include: {
            offers: { where: { isActive: true }, take: 1, orderBy: { currentPrice: 'asc' } },
            source: true,
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
      include: { listing: { include: { source: true } } },
      skip: offset,
      take: limit,
      orderBy: { offerScore: 'desc' },
    }),
    prisma.offer.count({ where }),
  ])

  return { offers, total, page, limit, totalPages: Math.ceil(total / limit) }
}

export async function getAdminSources() {
  const sources = await prisma.source.findMany({
    include: {
      _count: { select: { listings: true, coupons: true } },
    },
  })

  // For each source get offer count and last update
  const enriched = await Promise.all(sources.map(async (s) => {
    const [offerCount, lastListing] = await Promise.all([
      prisma.offer.count({ where: { isActive: true, listing: { sourceId: s.id } } }),
      prisma.listing.findFirst({ where: { sourceId: s.id }, orderBy: { updatedAt: 'desc' }, select: { updatedAt: true } }),
    ])
    return {
      ...s,
      offerCount,
      listingCount: s._count.listings,
      couponCount: s._count.coupons,
      lastUpdate: lastListing?.updatedAt || null,
    }
  }))

  return enriched
}

export async function getAdminJobRuns(limit = 50) {
  return prisma.jobRun.findMany({
    take: limit,
    orderBy: { startedAt: 'desc' },
  })
}

// ============================================
// CATEGORIES & BRANDS
// ============================================

export async function getCategories() {
  return prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { position: 'asc' },
  })
}

export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({
    where: { slug },
    include: { _count: { select: { products: true } } },
  })
}

export async function getBrands() {
  return prisma.brand.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function getBrandBySlug(slug: string) {
  return prisma.brand.findUnique({
    where: { slug },
    include: { _count: { select: { products: true } } },
  })
}

// ============================================
// COUPONS
// ============================================

export async function getActiveCoupons() {
  return prisma.coupon.findMany({
    where: { status: 'ACTIVE' },
    include: { source: true },
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
