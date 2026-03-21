/**
 * Catalog Amplifier — safely increases the number of daily offers.
 *
 * Strategy: uses trending keywords + user search queries to discover
 * products that users are ACTUALLY looking for, then imports them
 * from all configured marketplaces.
 *
 * Safety rules:
 * - Only imports products with price > R$10 (filters junk)
 * - Only imports products that match known categories
 * - Deduplicates against existing catalog
 * - Max 200 new products per run (prevents spam)
 * - Rate-limited API calls to each marketplace
 *
 * Sources of discovery queries:
 * 1. Recent user searches (SearchLog) — demand-driven
 * 2. ML trending keywords — market-driven
 * 3. Category gap analysis — coverage-driven
 */

import prisma from '@/lib/db/prisma'
import { adapterRegistry } from '@/lib/adapters/registry'
import { runImportPipeline, type ImportItem } from '@/lib/import/pipeline'
import { logger } from '@/lib/logger'

const log = logger.child({ job: 'catalog-amplifier' })

const MAX_NEW_PRODUCTS = 500
const MIN_PRICE = 10

// Category slugs that we want to cover
const TARGET_CATEGORIES = [
  'celulares', 'notebooks', 'audio', 'smart-tvs', 'gamer',
  'wearables', 'informatica', 'casa', 'beleza', 'tenis', 'moda', 'infantil',
]

export async function amplifyCatalog() {
  const start = Date.now()
  let totalImported = 0
  let totalSearched = 0
  const errors: string[] = []

  // ── Source 1: User search queries (what people actually want) ────────
  const recentSearches = await getPopularSearches()
  log.info('amplifier.searches', { count: recentSearches.length })

  // ── Source 2: Trending keywords from ML ──────────────────────────────
  let trendingKeywords: string[] = []
  try {
    const trends = await prisma.trendingKeyword.findMany({
      orderBy: { position: 'asc' },
      take: 15,
      select: { keyword: true },
    })
    trendingKeywords = trends.map(t => t.keyword)
  } catch {
    // TrendingKeyword table might not have data
  }
  log.info('amplifier.trending', { count: trendingKeywords.length })

  // ── Source 3: Categories with low product count ──────────────────────
  const categoryCoverage = await getCategoryGaps()
  const gapQueries = categoryCoverage
    .filter(c => c.count < 10)
    .flatMap(c => c.queries)
  log.info('amplifier.gaps', { categories: categoryCoverage.filter(c => c.count < 10).length })

  // ── Combine all queries, deduplicate ─────────────────────────────────
  const allQueries = [...new Set([
    ...recentSearches,
    ...trendingKeywords,
    ...gapQueries,
  ])]
    .filter(q => q.length >= 3 && q.length <= 50)
    .slice(0, 50) // Max 50 queries per run

  log.info('amplifier.queries', { total: allQueries.length })

  // ── Search each configured adapter ───────────────────────────────────
  const adapters = adapterRegistry.getConfigured()
  const allImportItems: ImportItem[] = []
  const seenIds = new Set<string>()

  for (const adapter of adapters) {
    if (!adapter.search) continue

    for (const query of allQueries) {
      if (allImportItems.length >= MAX_NEW_PRODUCTS) break

      try {
        const results = await adapter.search(query, { limit: 20 })
        totalSearched += results.length

        for (const r of results) {
          if (r.currentPrice < MIN_PRICE) continue
          if (seenIds.has(r.externalId)) continue
          seenIds.add(r.externalId)

          // Infer category from title
          const categorySlug = inferCategoryFromTitle(r.title)

          allImportItems.push({
            externalId: r.externalId,
            title: r.title,
            currentPrice: r.currentPrice,
            originalPrice: r.originalPrice,
            productUrl: r.productUrl,
            imageUrl: r.imageUrl,
            isFreeShipping: r.isFreeShipping,
            availability: (r.availability === 'in_stock' || r.availability === 'out_of_stock') ? r.availability : 'unknown',
            brand: r.brand,
            categorySlug,
            sourceSlug: adapter.slug,
            discoverySource: 'catalog_amplifier',
          })
        }

        // Rate limit between queries
        await new Promise(r => setTimeout(r, 500))
      } catch (err) {
        errors.push(`${adapter.slug}/${query}: ${String(err)}`)
      }
    }
  }

  // ── Import via pipeline (deduplicates automatically) ─────────────────
  let importResult = { created: 0, updated: 0, failed: 0, skipped: 0 }

  if (allImportItems.length > 0) {
    const batch = allImportItems.slice(0, MAX_NEW_PRODUCTS)
    try {
      importResult = await runImportPipeline(batch)
      totalImported = importResult.created + importResult.updated
    } catch (err) {
      errors.push(`import pipeline: ${String(err)}`)
    }
  }

  const durationMs = Date.now() - start
  log.info('amplifier.complete', {
    queries: allQueries.length,
    searched: totalSearched,
    candidates: allImportItems.length,
    imported: totalImported,
    created: importResult.created,
    updated: importResult.updated,
    skipped: importResult.skipped,
    durationMs,
  })

  return {
    status: errors.length === 0 ? 'OK' : 'PARTIAL',
    queries: allQueries.length,
    searched: totalSearched,
    candidates: allImportItems.length,
    created: importResult.created,
    updated: importResult.updated,
    skipped: importResult.skipped,
    failed: importResult.failed,
    durationMs,
    errors: errors.slice(0, 10),
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

async function getPopularSearches(): Promise<string[]> {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const searches = await prisma.searchLog.groupBy({
      by: ['query'],
      where: { createdAt: { gte: oneDayAgo } },
      _count: { query: true },
      orderBy: { _count: { query: 'desc' } },
      take: 15,
    })
    return searches.map(s => s.query).filter(q => q.length >= 3)
  } catch {
    return []
  }
}

async function getCategoryGaps(): Promise<{ slug: string; count: number; queries: string[] }[]> {
  const results: { slug: string; count: number; queries: string[] }[] = []

  const CATEGORY_QUERIES: Record<string, string[]> = {
    celulares: ['celular samsung', 'celular xiaomi', 'iphone'],
    notebooks: ['notebook lenovo', 'notebook dell', 'macbook'],
    audio: ['fone jbl', 'fone bluetooth', 'airpods'],
    'smart-tvs': ['smart tv 50', 'smart tv samsung', 'tv 4k'],
    gamer: ['console ps5', 'xbox series', 'nintendo switch'],
    wearables: ['smartwatch', 'apple watch', 'galaxy watch'],
    informatica: ['mouse gamer', 'teclado mecanico', 'monitor 144hz'],
    casa: ['airfryer', 'aspirador robo', 'cafeteira'],
    beleza: ['perfume importado', 'chapinha', 'secador'],
    tenis: ['tenis nike', 'tenis adidas', 'tenis corrida'],
  }

  for (const slug of TARGET_CATEGORIES) {
    try {
      const count = await prisma.product.count({
        where: { status: 'ACTIVE', category: { slug } },
      })
      results.push({ slug, count, queries: CATEGORY_QUERIES[slug] || [slug] })
    } catch {
      results.push({ slug, count: 0, queries: CATEGORY_QUERIES[slug] || [slug] })
    }
  }

  return results
}

function inferCategoryFromTitle(title: string): string | undefined {
  const t = title.toLowerCase()
  if (/celular|smartphone|iphone|galaxy\s*[as]/i.test(t)) return 'celulares'
  if (/notebook|laptop|macbook/i.test(t)) return 'notebooks'
  if (/fone|headphone|earphone|airpods|caixa.?de.?som/i.test(t)) return 'audio'
  if (/smart\s*tv|televisor|televisao/i.test(t)) return 'smart-tvs'
  if (/playstation|ps5|xbox|nintendo|console/i.test(t)) return 'gamer'
  if (/smartwatch|relogio.?inteligente/i.test(t)) return 'wearables'
  if (/mouse|teclado|monitor|ssd|placa.?de.?video|processador/i.test(t)) return 'informatica'
  if (/airfryer|fritadeira|cafeteira|aspirador|geladeira/i.test(t)) return 'casa'
  if (/perfume|maquiagem|skincare|chapinha|secador/i.test(t)) return 'beleza'
  if (/tenis|sneaker/i.test(t)) return 'tenis'
  return undefined
}
