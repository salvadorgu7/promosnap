// ============================================================================
// ML Highlights — fetch best-seller product IDs per category
// ============================================================================

import type { MLHighlightEntry } from './types'
import { mlFetch } from './items'

const ML_API = 'https://api.mercadolibre.com'

/**
 * Fetch best-seller product/item IDs for a given ML category.
 * Uses /highlights/MLB/category/{id} which works from any IP.
 */
export async function fetchHighlightsForCategory(categoryId: string): Promise<MLHighlightEntry[]> {
  const res = await mlFetch(`${ML_API}/highlights/MLB/category/${categoryId}`)

  if (!res.ok) {
    console.error(`[ml-discovery] highlights/${categoryId}: ${res.status}`)
    return []
  }

  const data = await res.json()
  return (data.content || []) as MLHighlightEntry[]
}

/**
 * Fetch highlights for multiple categories in parallel.
 * Returns a flat list of all highlight entries with source category.
 */
export async function fetchHighlightsForCategories(
  categoryIds: string[]
): Promise<{ categoryId: string; entries: MLHighlightEntry[] }[]> {
  const results = await Promise.allSettled(
    categoryIds.map(async (catId) => ({
      categoryId: catId,
      entries: await fetchHighlightsForCategory(catId),
    }))
  )

  return results
    .filter((r): r is PromiseFulfilledResult<{ categoryId: string; entries: MLHighlightEntry[] }> =>
      r.status === 'fulfilled'
    )
    .map((r) => r.value)
    .filter((r) => r.entries.length > 0)
}
