// ============================================================================
// ML Discovery Engine — orchestrates the full pipeline
// ============================================================================

import type { DiscoveryMode, DiscoveryResult, DiscoveryMeta, PipelineStage, MLProduct, MLCategory } from './types'
import { resolveIntentToCategories, getCronCategories, getAllCategories } from './categories'
import { fetchTrendingSignals, getTrendCategories } from './trends'
import { fetchHighlightsForCategories } from './highlights'
import { batchHydrateItems, normalizeItem } from './items'
import { rankDiscoveryResults, deduplicateProducts } from './ranking'

function log(stage: string, msg: string, extra?: Record<string, unknown>) {
  console.log(`[ml-discovery] [${stage}] ${msg}`, extra ? JSON.stringify(extra) : '')
}

// ============================================================================
// Main discovery function
// ============================================================================

export interface DiscoveryOptions {
  mode: DiscoveryMode
  query?: string          // Free-text term
  categoryId?: string     // Explicit category ID
  limit?: number          // Max products to return
  includeTrends?: boolean // Also fetch trends for additional signals
}

/**
 * Run the full discovery pipeline.
 * This is the single entry point — handles all modes.
 */
export async function runDiscovery(options: DiscoveryOptions): Promise<DiscoveryResult> {
  const start = Date.now()
  const stages: PipelineStage[] = []
  const stageTimings: Record<string, number> = {}
  const limit = options.limit ?? 20
  const resolvedCategories: MLCategory[] = []
  const trendsUsed: string[] = []

  // ── Stage 1: Intent Resolution ──────────────────────────────────────────
  const intentStart = Date.now()
  let categoryIds: string[] = []

  if (options.categoryId) {
    // Explicit category
    categoryIds = [options.categoryId]
    const allCats = getAllCategories()
    const cat = allCats.find((c) => c.id === options.categoryId)
    if (cat) resolvedCategories.push(cat)
    stages.push({ stage: 'intent', status: 'success', itemsIn: 1, itemsOut: 1, durationMs: Date.now() - intentStart })

  } else if (options.query) {
    // Free-text: resolve to categories semantically
    const cats = resolveIntentToCategories(options.query)
    categoryIds = cats.map((c) => c.id).slice(0, 3) // Top 3 matches
    resolvedCategories.push(...cats.slice(0, 3))
    log('intent', `"${options.query}" → ${cats.length} categories`, { top: cats.slice(0, 3).map((c) => c.name) })

    stages.push({
      stage: 'intent',
      status: cats.length > 0 ? 'success' : 'failure',
      itemsIn: 1,
      itemsOut: cats.length,
      durationMs: Date.now() - intentStart,
    })

  } else if (options.mode === 'scheduled-auto-import' || options.mode === 'category-bestsellers') {
    // Cron mode: use priority categories
    const cronCats = getCronCategories()
    categoryIds = cronCats.map((c) => c.id)
    resolvedCategories.push(...cronCats)
    stages.push({ stage: 'intent', status: 'success', itemsIn: 0, itemsOut: cronCats.length, durationMs: Date.now() - intentStart })

  } else if (options.mode === 'trending-capture') {
    // Trends mode: discover categories from trends
    categoryIds = [] // Will be populated in trends stage
    stages.push({ stage: 'intent', status: 'skipped', itemsIn: 0, itemsOut: 0, durationMs: 0 })
  }
  stageTimings.intent = Date.now() - intentStart

  // ── Stage 2: Trends (optional enrichment) ──────────────────────────────
  if (options.mode === 'trending-capture' || options.mode === 'mixed-discovery' || options.includeTrends) {
    const trendsStart = Date.now()
    try {
      const trends = await fetchTrendingSignals()
      trendsUsed.push(...trends.map((t) => t.keyword))

      if (options.mode === 'trending-capture') {
        const trendCatIds = await getTrendCategories()
        categoryIds = [...new Set([...categoryIds, ...trendCatIds])]
      }

      // Add trend-resolved categories if we had no intent matches
      if (categoryIds.length === 0 && options.query) {
        for (const t of trends) {
          if (t.resolvedCategory && t.keyword.toLowerCase().includes(options.query.toLowerCase())) {
            categoryIds.push(t.resolvedCategory.id)
            resolvedCategories.push(t.resolvedCategory)
          }
        }
      }

      stages.push({ stage: 'trends', status: 'success', itemsIn: 0, itemsOut: trends.length, durationMs: Date.now() - trendsStart })
    } catch (err) {
      log('trends', 'failed', { error: String(err) })
      stages.push({ stage: 'trends', status: 'failure', itemsIn: 0, itemsOut: 0, durationMs: Date.now() - trendsStart, error: String(err) })
    }
    stageTimings.trends = Date.now() - trendsStart
  }

  // ── Stage 3: Highlights ─────────────────────────────────────────────────
  const hlStart = Date.now()
  let productIds: string[] = []

  if (categoryIds.length > 0) {
    try {
      const highlights = await fetchHighlightsForCategories(categoryIds)
      const allEntries = highlights.flatMap((h) => h.entries)
      productIds = allEntries.map((e) => e.id)

      log('highlights', `${categoryIds.length} categories → ${productIds.length} product IDs`)
      stages.push({ stage: 'highlights', status: 'success', itemsIn: categoryIds.length, itemsOut: productIds.length, durationMs: Date.now() - hlStart })
    } catch (err) {
      log('highlights', 'failed', { error: String(err) })
      stages.push({ stage: 'highlights', status: 'failure', itemsIn: categoryIds.length, itemsOut: 0, durationMs: Date.now() - hlStart, error: String(err) })
    }
  } else {
    stages.push({ stage: 'highlights', status: 'skipped', itemsIn: 0, itemsOut: 0, durationMs: 0 })
  }
  stageTimings.highlights = Date.now() - hlStart

  // ── Stage 4: Hydrate ────────────────────────────────────────────────────
  const hydrateStart = Date.now()
  let products: MLProduct[] = []
  let failedCount = 0

  if (productIds.length > 0) {
    // Limit how many we hydrate to avoid excessive API calls
    const idsToHydrate = productIds.slice(0, Math.min(limit * 2, 40))

    try {
      const { products: hydrated, failed } = await batchHydrateItems(idsToHydrate)
      products = hydrated
      failedCount = failed.length

      log('hydrate', `${idsToHydrate.length} IDs → ${products.length} products (${failed.length} failed)`)
      stages.push({
        stage: 'hydrate',
        status: failed.length === 0 ? 'success' : 'partial',
        itemsIn: idsToHydrate.length,
        itemsOut: products.length,
        durationMs: Date.now() - hydrateStart,
      })
    } catch (err) {
      log('hydrate', 'failed', { error: String(err) })
      stages.push({ stage: 'hydrate', status: 'failure', itemsIn: idsToHydrate.length, itemsOut: 0, durationMs: Date.now() - hydrateStart, error: String(err) })
    }
  } else {
    stages.push({ stage: 'hydrate', status: 'skipped', itemsIn: 0, itemsOut: 0, durationMs: 0 })
  }
  stageTimings.hydrate = Date.now() - hydrateStart

  // ── Stage 4b: Search Fallback (if hydrate returned too few products) ────
  if (products.length < 5 && categoryIds.length > 0) {
    const searchStart = Date.now()
    log('search-fallback', `Hydrate returned ${products.length} products — falling back to ML Search API`)

    const ML_API = 'https://api.mercadolibre.com'
    const SEARCH_KEYWORDS: Record<string, string> = {
      'MLB1055': 'celular smartphone',
      'MLB1652': 'notebook laptop',
      'MLB1676': 'fone bluetooth',
      'MLB1002': 'smart tv 4k',
      'MLB186456': 'console playstation xbox',
      'MLB1659': 'tablet ipad',
      'MLB352679': 'smartwatch relogio inteligente',
      'MLB1670': 'monitor gamer',
      'MLB1039': 'camera digital',
      'MLB1672': 'impressora multifuncional',
      'MLB1648': 'pc gamer desktop',
      'MLB1596': 'ar condicionado split',
      'MLB1576': 'geladeira frost free',
    }

    try {
      // Search top categories via public search API (no auth needed)
      const catsToSearch = categoryIds.slice(0, 6) // Max 6 to avoid rate limits
      const searchResults = await Promise.allSettled(
        catsToSearch.map(async (catId) => {
          const keyword = SEARCH_KEYWORDS[catId] || ''
          const url = new URL(`${ML_API}/sites/MLB/search`)
          url.searchParams.set('category', catId)
          if (keyword) url.searchParams.set('q', keyword)
          url.searchParams.set('limit', '10')
          url.searchParams.set('sort', 'relevance')

          const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
          if (!res.ok) {
            log('search-fallback', `search ${catId} failed: ${res.status}`)
            return []
          }
          const data = await res.json()
          return (data.results || []).map((item: any) => normalizeSearchResult(item))
        })
      )

      const searchProducts: MLProduct[] = []
      for (const result of searchResults) {
        if (result.status === 'fulfilled') {
          searchProducts.push(...result.value)
        }
      }

      // Merge with any hydrated products (hydrated take priority)
      const existingIds = new Set(products.map(p => p.externalId))
      for (const sp of searchProducts) {
        if (!existingIds.has(sp.externalId) && sp.currentPrice > 0) {
          products.push(sp)
          existingIds.add(sp.externalId)
        }
      }

      log('search-fallback', `Search API added ${searchProducts.length} products (total now: ${products.length})`)
      stages.push({
        stage: 'hydrate', // logged as hydrate continuation
        status: searchProducts.length > 0 ? 'success' : 'failure',
        itemsIn: catsToSearch.length,
        itemsOut: searchProducts.length,
        durationMs: Date.now() - searchStart,
      })
    } catch (err) {
      log('search-fallback', 'failed', { error: String(err) })
    }
    stageTimings.searchFallback = Date.now() - searchStart
  }

  // ── Stage 5: Normalize + Deduplicate ────────────────────────────────────
  const normStart = Date.now()
  const preDedup = products.length
  products = deduplicateProducts(products)
  const dupsSkipped = preDedup - products.length
  stages.push({ stage: 'normalize', status: 'success', itemsIn: preDedup, itemsOut: products.length, durationMs: Date.now() - normStart })
  stageTimings.normalize = Date.now() - normStart

  // ── Stage 6: Rank ───────────────────────────────────────────────────────
  const rankStart = Date.now()
  products = rankDiscoveryResults(products).slice(0, limit)
  stages.push({ stage: 'rank', status: 'success', itemsIn: products.length, itemsOut: products.length, durationMs: Date.now() - rankStart })
  stageTimings.rank = Date.now() - rankStart

  // ── Build result ────────────────────────────────────────────────────────
  const meta: DiscoveryMeta = {
    mode: options.mode,
    inputQuery: options.query,
    resolvedCategories,
    trendsUsed: trendsUsed.slice(0, 10),
    pipeline: stages,
    timing: { totalMs: Date.now() - start, stageTimings },
    stats: {
      highlightsFetched: productIds.length,
      itemsHydrated: products.length,
      itemsFailed: failedCount,
      duplicatesSkipped: dupsSkipped,
    },
  }

  log('complete', `${products.length} products in ${meta.timing.totalMs}ms`, {
    mode: options.mode,
    categories: resolvedCategories.map((c) => c.name),
  })

  return { products, meta }
}

// ============================================================================
// Normalize ML search result to MLProduct
// ============================================================================

function normalizeSearchResult(item: any): MLProduct {
  const thumbnail = item.thumbnail || ''
  const mainImage = thumbnail.replace(/-I\.jpg$/, '-O.jpg')

  return {
    externalId: item.id || '',
    catalogProductId: item.catalog_product_id ?? undefined,
    title: item.title || '',
    currentPrice: item.price || 0,
    originalPrice: item.original_price ?? undefined,
    currency: item.currency_id || 'BRL',
    productUrl: item.permalink || '',
    imageUrl: mainImage || undefined,
    isFreeShipping: item.shipping?.free_shipping ?? false,
    availability: (item.available_quantity ?? 0) > 0 ? 'in_stock' : 'out_of_stock',
    availableQuantity: item.available_quantity,
    soldQuantity: item.sold_quantity,
    condition: item.condition,
    categoryId: item.category_id,
    officialStoreName: item.official_store_name ?? undefined,
  }
}
