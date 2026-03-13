// ============================================================================
// ML Trends — fetch trending keywords and resolve to categories
// ============================================================================

import type { MLTrend } from './types'
import { resolveIntentToCategories } from './categories'
import { mlFetch } from './items'

/**
 * Fetch trending keywords from ML /trends/MLB endpoint.
 * Each trend is resolved to a category when possible.
 */
export async function fetchTrendingSignals(): Promise<MLTrend[]> {
  const res = await mlFetch('https://api.mercadolibre.com/trends/MLB')

  if (!res.ok) {
    console.error(`[ml-discovery] trends failed: ${res.status}`)
    return []
  }

  const raw: { keyword: string; url: string }[] = await res.json()

  return raw.map((t) => {
    const cats = resolveIntentToCategories(t.keyword)
    return {
      keyword: t.keyword,
      url: t.url,
      resolvedCategory: cats[0] ?? undefined,
    }
  })
}

/**
 * Get unique category IDs from current trends.
 * Useful for discovering categories beyond the static registry.
 */
export async function getTrendCategories(): Promise<string[]> {
  const trends = await fetchTrendingSignals()
  const catIds = new Set<string>()

  for (const t of trends) {
    if (t.resolvedCategory) {
      catIds.add(t.resolvedCategory.id)
    }
  }

  return Array.from(catIds)
}
