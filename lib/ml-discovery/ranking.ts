// ============================================================================
// ML Discovery Ranking — score and sort discovered products
// ============================================================================

import type { MLProduct } from './types'

interface ScoredProduct extends MLProduct {
  _score: number
}

/**
 * Rank discovery results by relevance and deal quality.
 * Higher score = better product for PromoSnap's catalog.
 *
 * Scoring factors:
 * - Has price (required)
 * - Discount percentage (higher = better deal)
 * - Free shipping bonus
 * - In stock bonus
 * - Sold quantity signals demand
 * - Official store trust bonus
 * - Has image (visual appeal)
 */
export function rankDiscoveryResults(products: MLProduct[]): MLProduct[] {
  const scored: ScoredProduct[] = products
    .filter((p) => p.currentPrice > 0)
    .map((p) => ({
      ...p,
      _score: computeScore(p),
    }))

  scored.sort((a, b) => b._score - a._score)

  return scored.map(({ _score: _, ...p }) => p)
}

function computeScore(p: MLProduct): number {
  let score = 50 // base

  // Discount (0-30 points)
  if (p.originalPrice && p.originalPrice > p.currentPrice) {
    const discountPct = ((p.originalPrice - p.currentPrice) / p.originalPrice) * 100
    score += Math.min(discountPct * 0.6, 30)
  }

  // Free shipping (+10)
  if (p.isFreeShipping) score += 10

  // In stock (+5)
  if (p.availability === 'in_stock') score += 5

  // Sold quantity signals demand (0-15 points, log scale)
  if (p.soldQuantity && p.soldQuantity > 0) {
    score += Math.min(Math.log10(p.soldQuantity) * 5, 15)
  }

  // Official store trust (+5)
  if (p.officialStoreName) score += 5

  // Has image (+3)
  if (p.imageUrl) score += 3

  // Has catalog product ID (+2, indicates verified product)
  if (p.catalogProductId) score += 2

  return score
}

/**
 * Deduplicate products by externalId (keep highest scored).
 */
export function deduplicateProducts(products: MLProduct[]): MLProduct[] {
  const seen = new Map<string, MLProduct>()

  for (const p of products) {
    const existing = seen.get(p.externalId)
    if (!existing || (p.currentPrice > 0 && (!existing.currentPrice || p.currentPrice < existing.currentPrice))) {
      seen.set(p.externalId, p)
    }
  }

  return Array.from(seen.values())
}
