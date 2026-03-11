import prisma from '@/lib/db/prisma'
import { cacheGet, cacheSet } from '@/lib/db/redis'
import { normalizeText } from '@/lib/utils'
import type { ProductCard, SearchResult, SearchFilters, Badge } from '@/types'

interface SearchParams {
  query: string; page?: number; limit?: number; category?: string; brand?: string
  source?: string; minPrice?: number; maxPrice?: number; freeShipping?: boolean
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'popularity' | 'score'
}

export async function searchProducts(params: SearchParams): Promise<SearchResult> {
  const { query, page = 1, limit = 24, sortBy = 'relevance', category, brand, source, minPrice, maxPrice } = params
  const normalizedQuery = normalizeText(query)
  const cacheKey = `search:${normalizedQuery}:${page}:${limit}:${sortBy}:${category||''}:${brand||''}:${minPrice||''}:${maxPrice||''}`
  const cached = await cacheGet<SearchResult>(cacheKey)
  if (cached) return cached

  const offset = (page - 1) * limit
  const where: Record<string, unknown> = { status: 'ACTIVE', listings: { some: { offers: { some: { isActive: true } } } } }
  if (category) where.category = { slug: category }
  if (brand) where.brand = { slug: brand }

  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: { ...where, OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { brand: { name: { contains: query, mode: 'insensitive' } } },
        { listings: { some: { rawTitle: { contains: query, mode: 'insensitive' } } } },
      ]},
      include: {
        brand: true, category: true,
        listings: {
          include: { offers: { where: { isActive: true }, orderBy: { offerScore: 'desc' }, take: 1 }, source: true },
          where: { offers: { some: { isActive: true, ...(minPrice ? { currentPrice: { gte: minPrice } } : {}), ...(maxPrice ? { currentPrice: { lte: maxPrice } } : {}) } }, ...(source ? { source: { slug: source } } : {}) },
        },
      },
      orderBy: [{ popularityScore: 'desc' }],
      skip: offset, take: limit,
    }),
    prisma.product.count({ where: { ...where, OR: [
      { name: { contains: query, mode: 'insensitive' } },
      { brand: { name: { contains: query, mode: 'insensitive' } } },
    ]}})
  ])

  const productCards: ProductCard[] = products.filter(p => p.listings.some(l => l.offers.length > 0)).map(p => {
    const allOffers = p.listings.flatMap(l => l.offers.map(o => ({ ...o, sourceSlug: l.source.slug, sourceName: l.source.name })))
    const best = allOffers.sort((a, b) => b.offerScore - a.offerScore)[0]
    if (!best) return null
    const discount = best.originalPrice ? Math.round(((best.originalPrice - best.currentPrice) / best.originalPrice) * 100) : undefined
    const badges: Badge[] = []
    if (best.offerScore >= 80) badges.push({ type: 'hot_deal', label: '🔥 Oferta Quente', color: 'red' })
    if (best.isFreeShipping) badges.push({ type: 'free_shipping', label: '🚚 Frete Grátis', color: 'purple' })
    return {
      id: p.id, name: p.name, slug: p.slug, imageUrl: p.imageUrl, brand: p.brand?.name,
      category: p.category?.name, categorySlug: p.category?.slug,
      bestOffer: { price: best.currentPrice, originalPrice: best.originalPrice ?? undefined, discount,
        sourceSlug: best.sourceSlug, sourceName: best.sourceName, affiliateUrl: best.affiliateUrl ?? '#',
        isFreeShipping: best.isFreeShipping, offerScore: best.offerScore },
      offersCount: allOffers.length, popularityScore: p.popularityScore, badges,
    } as ProductCard
  }).filter(Boolean) as ProductCard[]

  if (sortBy === 'price_asc') productCards.sort((a, b) => a.bestOffer.price - b.bestOffer.price)
  else if (sortBy === 'price_desc') productCards.sort((a, b) => b.bestOffer.price - a.bestOffer.price)
  else if (sortBy === 'score') productCards.sort((a, b) => b.bestOffer.offerScore - a.bestOffer.offerScore)

  const filters: SearchFilters = {
    categories: [], brands: [], sources: [],
    priceRange: { min: Math.min(...productCards.map(p => p.bestOffer.price), 0), max: Math.max(...productCards.map(p => p.bestOffer.price), 99999) },
    hasOptions: { freeShipping: productCards.some(p => p.bestOffer.isFreeShipping), coupon: false, lowestPrice: false },
  }

  const result: SearchResult = { products: productCards, totalCount, filters, query, suggestions: [] }
  await cacheSet(cacheKey, result, 300)
  prisma.searchLog.create({ data: { query, normalizedQuery, resultsCount: totalCount } }).catch(() => {})
  return result
}
