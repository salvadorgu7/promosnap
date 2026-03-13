// ============================================================================
// Search Engine v2 — query-first, intent-aware, with fallback & metrics
// ============================================================================

import prisma from '@/lib/db/prisma'
import { cacheGet, cacheSet } from '@/lib/db/redis'
import { normalizeText } from '@/lib/utils'
import { understandQuery } from '@/lib/query'
import { calculateCommercialScore, presetForIntent, type CommercialSignals } from '@/lib/ranking/commercial'
import type { QueryUnderstanding, SearchMetrics } from '@/lib/query/types'
import type { ProductCard, SearchResult, SearchFilters, Badge } from '@/types'

// ── Types ──────────────────────────────────────────────────────────────────

interface SearchParams {
  query: string
  page?: number
  limit?: number
  category?: string
  brand?: string
  source?: string
  minPrice?: number
  maxPrice?: number
  freeShipping?: boolean
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'popularity' | 'score'
}

export interface EnhancedSearchResult extends SearchResult {
  understanding?: QueryUnderstanding
  metrics?: SearchMetrics
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Build Prisma OR conditions from query + expansions + entities */
function buildSearchConditions(
  raw: string,
  understanding: QueryUnderstanding
): Record<string, unknown>[] {
  const conditions: Record<string, unknown>[] = []

  // Primary: original query
  conditions.push(
    { name: { contains: raw, mode: 'insensitive' } },
    { brand: { name: { contains: raw, mode: 'insensitive' } } },
    { listings: { some: { rawTitle: { contains: raw, mode: 'insensitive' } } } },
  )

  // Normalized (without accents)
  if (understanding.normalized !== raw.toLowerCase()) {
    conditions.push(
      { name: { contains: understanding.normalized, mode: 'insensitive' } },
    )
  }

  // Synonym expansions — broader matching
  for (const expansion of understanding.expansions) {
    conditions.push(
      { name: { contains: expansion, mode: 'insensitive' } },
      { listings: { some: { rawTitle: { contains: expansion, mode: 'insensitive' } } } },
    )
  }

  // Brand entity resolution (typo correction)
  const brandEntities = understanding.entities.filter(e => e.type === 'brand')
  for (const brandEntity of brandEntities) {
    if (brandEntity.value !== brandEntity.original) {
      // Corrected brand name — add as search condition
      conditions.push(
        { brand: { name: { contains: brandEntity.value, mode: 'insensitive' } } },
        { name: { contains: brandEntity.value, mode: 'insensitive' } },
      )
    }
  }

  // Model entity
  const modelEntities = understanding.entities.filter(e => e.type === 'model')
  for (const model of modelEntities) {
    conditions.push(
      { name: { contains: model.value, mode: 'insensitive' } },
    )
  }

  return conditions
}

/** Build Prisma WHERE filters from entities + params */
function buildWhereFilters(
  understanding: QueryUnderstanding,
  params: SearchParams
): Record<string, unknown> {
  const where: Record<string, unknown> = {
    status: 'ACTIVE',
    listings: { some: { offers: { some: { isActive: true } } } },
  }

  // Explicit filters from params always take priority
  if (params.category) {
    where.category = { slug: params.category }
  }
  if (params.brand) {
    where.brand = { slug: params.brand }
  }

  // If intent is brand-only and no explicit brand filter, try to filter by detected brand
  if (!params.brand && understanding.intent === 'brand') {
    const brandEntity = understanding.entities.find(e => e.type === 'brand')
    if (brandEntity && brandEntity.confidence === 'high') {
      where.brand = { name: { contains: brandEntity.value, mode: 'insensitive' } }
    }
  }

  return where
}

/** Build listing sub-filter for source/price constraints */
function buildListingFilter(params: SearchParams): Record<string, unknown> {
  const listingWhere: Record<string, unknown> = {
    offers: {
      some: {
        isActive: true,
        ...(params.minPrice ? { currentPrice: { gte: params.minPrice } } : {}),
        ...(params.maxPrice ? { currentPrice: { lte: params.maxPrice } } : {}),
      },
    },
  }
  if (params.source) {
    listingWhere.source = { slug: params.source }
  }
  return listingWhere
}

/** Convert product + offers into a ProductCard */
function toProductCard(p: any): ProductCard | null {
  const allOffers = p.listings.flatMap((l: any) =>
    l.offers.map((o: any) => ({
      ...o,
      sourceSlug: l.source.slug,
      sourceName: l.source.name,
    }))
  )
  const best = allOffers.sort((a: any, b: any) => b.offerScore - a.offerScore)[0]
  if (!best) return null

  const discount = best.originalPrice
    ? Math.round(((best.originalPrice - best.currentPrice) / best.originalPrice) * 100)
    : undefined

  const badges: Badge[] = []
  if (best.offerScore >= 80) badges.push({ type: 'hot_deal', label: '🔥 Oferta Quente', color: 'red' })
  if (best.isFreeShipping) badges.push({ type: 'free_shipping', label: '🚚 Frete Grátis', color: 'purple' })
  if (discount && discount >= 30) badges.push({ type: 'price_drop', label: `↓ ${discount}% OFF`, color: 'green' })

  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    imageUrl: p.imageUrl,
    brand: p.brand?.name,
    category: p.category?.name,
    categorySlug: p.category?.slug,
    bestOffer: {
      price: best.currentPrice,
      originalPrice: best.originalPrice ?? undefined,
      discount,
      sourceSlug: best.sourceSlug,
      sourceName: best.sourceName,
      affiliateUrl: best.affiliateUrl ?? '#',
      isFreeShipping: best.isFreeShipping,
      offerScore: best.offerScore,
    },
    offersCount: allOffers.length,
    popularityScore: p.popularityScore,
    badges,
  }
}

/** Build signals for commercial ranking from a ProductCard */
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

/** Build aggregated filter options from result set */
function buildFilters(products: ProductCard[]): SearchFilters {
  const categoryMap = new Map<string, { label: string; count: number }>()
  const brandMap = new Map<string, { label: string; count: number }>()
  const sourceMap = new Map<string, { label: string; count: number }>()
  let minPrice = Infinity
  let maxPrice = 0
  let hasFreeShipping = false

  for (const p of products) {
    if (p.categorySlug && p.category) {
      const entry = categoryMap.get(p.categorySlug) || { label: p.category, count: 0 }
      entry.count++
      categoryMap.set(p.categorySlug, entry)
    }
    if (p.brand) {
      const slug = p.brand.toLowerCase().replace(/\s+/g, '-')
      const entry = brandMap.get(slug) || { label: p.brand, count: 0 }
      entry.count++
      brandMap.set(slug, entry)
    }
    const src = p.bestOffer.sourceSlug
    if (src) {
      const entry = sourceMap.get(src) || { label: p.bestOffer.sourceName, count: 0 }
      entry.count++
      sourceMap.set(src, entry)
    }
    if (p.bestOffer.price < minPrice) minPrice = p.bestOffer.price
    if (p.bestOffer.price > maxPrice) maxPrice = p.bestOffer.price
    if (p.bestOffer.isFreeShipping) hasFreeShipping = true
  }

  const toOptions = (map: Map<string, { label: string; count: number }>) =>
    Array.from(map.entries())
      .map(([value, { label, count }]) => ({ value, label, count }))
      .sort((a, b) => b.count - a.count)

  return {
    categories: toOptions(categoryMap),
    brands: toOptions(brandMap),
    sources: toOptions(sourceMap),
    priceRange: { min: minPrice === Infinity ? 0 : minPrice, max: maxPrice || 99999 },
    hasOptions: { freeShipping: hasFreeShipping, coupon: false, lowestPrice: false },
  }
}

// ── Core Query ─────────────────────────────────────────────────────────────

async function executeSearch(
  conditions: Record<string, unknown>[],
  where: Record<string, unknown>,
  listingFilter: Record<string, unknown>,
  offset: number,
  limit: number,
): Promise<{ products: any[]; totalCount: number }> {
  const [products, totalCount] = await Promise.all([
    prisma.product.findMany({
      where: { ...where, OR: conditions },
      include: {
        brand: true,
        category: true,
        listings: {
          include: {
            offers: { where: { isActive: true }, orderBy: { offerScore: 'desc' }, take: 1 },
            source: true,
          },
          where: listingFilter,
        },
      },
      orderBy: [{ popularityScore: 'desc' }],
      skip: offset,
      take: limit,
    }),
    prisma.product.count({
      where: { ...where, OR: conditions },
    }),
  ])
  return { products, totalCount }
}

// ── Fallback Strategies ────────────────────────────────────────────────────

/** Progressively relaxed search when no results found */
async function fallbackSearch(
  understanding: QueryUnderstanding,
  where: Record<string, unknown>,
  listingFilter: Record<string, unknown>,
  offset: number,
  limit: number,
): Promise<{ products: any[]; totalCount: number; fallbackLevel: string } | null> {
  const words = understanding.normalized.split(/\s+/).filter(w => w.length > 2)

  // Level 1: Try each word independently (broader OR)
  if (words.length >= 2) {
    const wordConditions = words.flatMap(w => [
      { name: { contains: w, mode: 'insensitive' } },
      { listings: { some: { rawTitle: { contains: w, mode: 'insensitive' } } } },
    ])

    const result = await executeSearch(wordConditions, where, listingFilter, offset, limit)
    if (result.totalCount > 0) {
      return { ...result, fallbackLevel: 'word_split' }
    }
  }

  // Level 2: Brand entity only (if detected)
  const brandEntity = understanding.entities.find(e => e.type === 'brand')
  if (brandEntity) {
    const brandConditions = [
      { brand: { name: { contains: brandEntity.value, mode: 'insensitive' } } },
      { name: { contains: brandEntity.value, mode: 'insensitive' } },
    ]
    const result = await executeSearch(brandConditions, where, listingFilter, offset, limit)
    if (result.totalCount > 0) {
      return { ...result, fallbackLevel: 'brand_only' }
    }
  }

  // Level 3: Category match from intent (e.g. "celular samsung barato" → try "celular")
  const categoryWords = [
    'celular', 'smartphone', 'notebook', 'laptop', 'tablet', 'fone', 'headphone',
    'tv', 'televisao', 'monitor', 'camera', 'console', 'teclado', 'mouse',
    'ssd', 'geladeira', 'perfume', 'tenis', 'smartwatch', 'air fryer',
  ]
  const detectedCategory = words.find(w => categoryWords.includes(w))
  if (detectedCategory) {
    const catConditions = [
      { name: { contains: detectedCategory, mode: 'insensitive' } },
      { category: { name: { contains: detectedCategory, mode: 'insensitive' } } },
    ]
    // Relax the base filters too (remove brand/category constraints)
    const relaxedWhere: Record<string, unknown> = {
      status: 'ACTIVE',
      listings: { some: { offers: { some: { isActive: true } } } },
    }
    const result = await executeSearch(catConditions, relaxedWhere, listingFilter, offset, limit)
    if (result.totalCount > 0) {
      return { ...result, fallbackLevel: 'category_fallback' }
    }
  }

  return null
}

// ── Log Search Metrics ─────────────────────────────────────────────────────

function logSearchMetrics(metrics: SearchMetrics): void {
  const level = metrics.zeroResult ? 'warn' : 'info'
  const tag = metrics.zeroResult ? '[search:zero-result]' :
    metrics.fallbackUsed ? '[search:fallback]' : '[search]'

  const msg = `${tag} q="${metrics.query}" intent=${metrics.intent}(${metrics.confidence}) ` +
    `results=${metrics.resultsCount} expansions=${metrics.expansionsUsed} ` +
    `fallback=${metrics.fallbackUsed} ${metrics.processingMs}ms`

  if (level === 'warn') {
    console.warn(msg)
  } else {
    console.log(msg)
  }
}

// ============================================================================
// Main Search Function
// ============================================================================

export async function searchProducts(params: SearchParams): Promise<EnhancedSearchResult> {
  const totalStart = Date.now()
  const { query, page = 1, limit = 24, sortBy = 'relevance' } = params
  const normalizedQuery = normalizeText(query)

  // ── Cache check ────────────────────────────────────────────────────────
  const cacheKey = `search:v2:${normalizedQuery}:${page}:${limit}:${sortBy}:${params.category || ''}:${params.brand || ''}:${params.minPrice || ''}:${params.maxPrice || ''}`
  const cached = await cacheGet<EnhancedSearchResult>(cacheKey)
  if (cached) return cached

  // ── Query Understanding ────────────────────────────────────────────────
  const { understanding } = understandQuery(query)
  const offset = (page - 1) * limit

  // ── Build conditions ───────────────────────────────────────────────────
  const searchConditions = buildSearchConditions(query, understanding)
  const where = buildWhereFilters(understanding, params)
  const listingFilter = buildListingFilter(params)

  // ── Execute primary search ─────────────────────────────────────────────
  let { products, totalCount } = await executeSearch(
    searchConditions, where, listingFilter, offset, limit,
  )

  let fallbackUsed = false
  let fallbackLevel: string | undefined

  // ── Fallback if zero results ───────────────────────────────────────────
  if (totalCount === 0 && page === 1) {
    const fallbackResult = await fallbackSearch(understanding, where, listingFilter, offset, limit)
    if (fallbackResult) {
      products = fallbackResult.products
      totalCount = fallbackResult.totalCount
      fallbackUsed = true
      fallbackLevel = fallbackResult.fallbackLevel
    }
  }

  // ── Build ProductCards ─────────────────────────────────────────────────
  let productCards: ProductCard[] = products
    .map(toProductCard)
    .filter(Boolean) as ProductCard[]

  // ── Apply commercial ranking (when sorting by relevance or score) ──────
  if (sortBy === 'relevance' || sortBy === 'score') {
    const preset = presetForIntent(understanding.intent)
    const scored = productCards.map(card => ({
      card,
      score: calculateCommercialScore(cardToSignals(card), preset),
    }))
    scored.sort((a, b) => b.score.total - a.score.total)
    productCards = scored.map(s => s.card)
  } else if (sortBy === 'price_asc') {
    productCards.sort((a, b) => a.bestOffer.price - b.bestOffer.price)
  } else if (sortBy === 'price_desc') {
    productCards.sort((a, b) => b.bestOffer.price - a.bestOffer.price)
  }

  // ── Build filters from results ─────────────────────────────────────────
  const filters = buildFilters(productCards)

  // ── Suggestions ────────────────────────────────────────────────────────
  const suggestions: string[] = [...understanding.suggestions]
  if (fallbackUsed && fallbackLevel) {
    // Suggest the original query with a note
    if (fallbackLevel === 'word_split') {
      suggestions.unshift(query) // keep original as first suggestion
    }
  }
  // If zero results even after fallback, suggest expansions
  if (totalCount === 0 && understanding.expansions.length > 0) {
    suggestions.push(...understanding.expansions.slice(0, 2))
  }

  // ── Build metrics ──────────────────────────────────────────────────────
  const processingMs = Date.now() - totalStart
  const metrics: SearchMetrics = {
    query,
    intent: understanding.intent,
    confidence: understanding.confidence,
    resultsCount: totalCount,
    fallbackUsed,
    zeroResult: totalCount === 0,
    expansionsUsed: understanding.expansions.length,
    processingMs,
    timestamp: new Date().toISOString(),
  }

  // ── Async logging (fire-and-forget) ────────────────────────────────────
  logSearchMetrics(metrics)
  prisma.searchLog.create({
    data: {
      query,
      normalizedQuery,
      resultsCount: totalCount,
    },
  }).catch(() => {})

  // ── Result ─────────────────────────────────────────────────────────────
  const result: EnhancedSearchResult = {
    products: productCards,
    totalCount,
    filters,
    query,
    suggestions: suggestions.slice(0, 5),
    understanding,
    metrics,
  }

  await cacheSet(cacheKey, result, 180) // 3 min cache (shorter for freshness)
  return result
}
