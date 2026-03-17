// ============================================================================
// ML Highlights — fetch best-seller product IDs per category
// ============================================================================

import type { MLHighlightEntry } from './types'
import { mlFetch } from './items'
import { FALLBACK_CATEGORIES } from './categories'
import { logger } from '@/lib/logger'

const ML_API = 'https://api.mercadolibre.com'

/** Per-category fetch stats tracked during highlights retrieval */
export interface CategoryFetchStats {
  categoryId: string
  status: 'success' | 'fallback' | 'failed'
  highlightCount: number
  fallbackUsed?: string  // fallback category ID that succeeded
  httpStatus?: number
}

/**
 * Fetch best-seller product/item IDs for a given ML category.
 * Uses /highlights/MLB/category/{id} which works from any IP.
 * On 404/empty, tries FALLBACK_CATEGORIES if available.
 */
export async function fetchHighlightsForCategory(
  categoryId: string
): Promise<{ entries: MLHighlightEntry[]; stats: CategoryFetchStats }> {
  const res = await mlFetch(`${ML_API}/highlights/MLB/category/${categoryId}`)

  if (res.ok) {
    const data = await res.json()
    const entries = (data.content || []) as MLHighlightEntry[]
    if (entries.length > 0) {
      return {
        entries,
        stats: { categoryId, status: 'success', highlightCount: entries.length },
      }
    }
  }

  const httpStatus = res.status
  // Try fallback categories
  const fallbacks = FALLBACK_CATEGORIES[categoryId]
  if (fallbacks && fallbacks.length > 0) {
    logger.debug("ml-discovery.highlights-fallback-attempt", { categoryId, httpStatus, fallbackCount: fallbacks.length })
    for (const fbId of fallbacks) {
      const fbRes = await mlFetch(`${ML_API}/highlights/MLB/category/${fbId}`)
      if (fbRes.ok) {
        const fbData = await fbRes.json()
        const fbEntries = (fbData.content || []) as MLHighlightEntry[]
        if (fbEntries.length > 0) {
          logger.debug("ml-discovery.highlights-fallback-success", { categoryId, fallbackId: fbId, entries: fbEntries.length })
          return {
            entries: fbEntries,
            stats: { categoryId, status: 'fallback', highlightCount: fbEntries.length, fallbackUsed: fbId, httpStatus },
          }
        }
      }
    }
  }

  logger.warn("ml-discovery.highlights-failed", { categoryId, httpStatus })
  return {
    entries: [],
    stats: { categoryId, status: 'failed', highlightCount: 0, httpStatus },
  }
}

/**
 * Fetch highlights for multiple categories in parallel.
 * Returns a flat list of all highlight entries with source category + aggregate stats.
 */
export async function fetchHighlightsForCategories(
  categoryIds: string[]
): Promise<{ categoryId: string; entries: MLHighlightEntry[] }[]>
export async function fetchHighlightsForCategories(
  categoryIds: string[],
  opts: { withStats: true }
): Promise<{ results: { categoryId: string; entries: MLHighlightEntry[] }[]; categoryStats: CategoryFetchStats[] }>
export async function fetchHighlightsForCategories(
  categoryIds: string[],
  opts?: { withStats?: boolean }
): Promise<any> {
  const settled = await Promise.allSettled(
    categoryIds.map(async (catId) => {
      const { entries, stats } = await fetchHighlightsForCategory(catId)
      return { categoryId: catId, entries, stats }
    })
  )

  const fulfilled = settled
    .filter((r): r is PromiseFulfilledResult<{ categoryId: string; entries: MLHighlightEntry[]; stats: CategoryFetchStats }> =>
      r.status === 'fulfilled'
    )
    .map((r) => r.value)

  const results = fulfilled
    .filter((r) => r.entries.length > 0)
    .map(({ stats: _s, ...rest }) => rest)

  if (opts?.withStats) {
    const categoryStats = fulfilled.map((r) => r.stats)
    return { results, categoryStats }
  }

  return results
}
