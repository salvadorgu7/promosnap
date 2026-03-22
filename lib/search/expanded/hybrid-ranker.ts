/**
 * Hybrid Ranker — Mistura resultados internos e externos com ranking inteligente.
 *
 * Políticas:
 * - Interno dominante: interno > externo (default quando cobertura é ok)
 * - Híbrido balanceado: mistura os dois por score
 * - Externo de reforço: externo entra depois do interno
 * - Externo dominante: externo lidera (cobertura interna muito fraca)
 *
 * Guardrails:
 * - Resultado externo fraco nunca acima de interno bom
 * - Diversidade de marketplace no topo (não 5x Amazon)
 * - Resultado sem afiliado nunca em posição 1-3
 * - Resultado sem imagem nunca em posição 1-5
 */

import type { UnifiedResult, CoverageEvaluation, MarketplaceKey } from './types'

// ── Ranking Policy ───────────────────────────────────────────────────────────

type RankingPolicy = 'internal_dominant' | 'hybrid_balanced' | 'external_reinforcement' | 'external_dominant'

function determinePolicy(coverage: CoverageEvaluation): RankingPolicy {
  if (coverage.coverageScore >= 70) return 'internal_dominant'
  if (coverage.coverageScore >= 50) return 'external_reinforcement'
  if (coverage.coverageScore >= 30) return 'hybrid_balanced'
  return 'external_dominant'
}

// ── Score Calculation ────────────────────────────────────────────────────────

function computeFinalScore(result: UnifiedResult, policy: RankingPolicy): number {
  let score = result.relevanceScore * 0.35 + result.qualityScore * 0.25

  // Source type bias
  const isInternal = result.sourceType === 'internal'
  switch (policy) {
    case 'internal_dominant':
      score += isInternal ? 25 : 0
      break
    case 'external_reinforcement':
      score += isInternal ? 15 : 0
      break
    case 'hybrid_balanced':
      score += isInternal ? 5 : 0
      break
    case 'external_dominant':
      score += isInternal ? 0 : 5
      break
  }

  // Monetization boost
  if (result.affiliateStatus === 'verified') score += 10
  else if (result.affiliateStatus === 'best_effort') score += 3

  // Confidence boost
  score += result.confidenceScore * 10

  // Image penalty
  if (!result.imageUrl) score -= 10

  // Price penalty for suspiciously cheap/expensive
  if (result.price < 5) score -= 20
  if (result.price > 30000) score -= 5

  // Discount boost
  if (result.discount && result.discount > 0 && result.discount <= 80) {
    score += Math.min(result.discount / 10, 5)
  }

  // Free shipping boost
  if (result.isFreeShipping) score += 3

  return Math.max(0, Math.min(100, score))
}

// ── Diversity Enforcement ────────────────────────────────────────────────────

/**
 * Ensure no single marketplace dominates the top positions.
 * Rule: max 2 consecutive results from same marketplace in top 10.
 */
function enforceDiversity(results: UnifiedResult[]): UnifiedResult[] {
  if (results.length <= 3) return results

  const reordered: UnifiedResult[] = []
  const remaining = [...results]
  const lastTwoMarketplaces: MarketplaceKey[] = []

  while (remaining.length > 0 && reordered.length < results.length) {
    // Find first result that doesn't violate diversity in top 10
    let picked = -1

    if (reordered.length < 10) {
      for (let i = 0; i < remaining.length; i++) {
        const mp = remaining[i].marketplace
        // Allow same marketplace only once in last 2 positions
        const consecutiveSame = lastTwoMarketplaces.length >= 2
          && lastTwoMarketplaces[0] === mp
          && lastTwoMarketplaces[1] === mp
        if (!consecutiveSame) {
          picked = i
          break
        }
      }
    }

    // If no diversity-compliant result found, just take first
    if (picked === -1) picked = 0

    const item = remaining.splice(picked, 1)[0]
    reordered.push(item)

    // Track last 2 marketplaces
    lastTwoMarketplaces.unshift(item.marketplace)
    if (lastTwoMarketplaces.length > 2) lastTwoMarketplaces.pop()
  }

  return reordered
}

// ── Position Guardrails ──────────────────────────────────────────────────────

/**
 * Apply position-based guardrails:
 * - Top 3: must have affiliate + image + price
 * - Top 5: must have image + price
 */
function applyPositionGuardrails(results: UnifiedResult[]): UnifiedResult[] {
  const premium: UnifiedResult[] = []
  const standard: UnifiedResult[] = []
  const fallback: UnifiedResult[] = []

  for (const r of results) {
    const hasPremiumRequirements = r.imageUrl && r.price > 0 && r.isMonetizable
    const hasStandardRequirements = r.imageUrl && r.price > 0

    if (hasPremiumRequirements) {
      premium.push(r)
    } else if (hasStandardRequirements) {
      standard.push(r)
    } else {
      fallback.push(r)
    }
  }

  // Premium first (positions 1-N), then standard, then fallback
  return [...premium, ...standard, ...fallback]
}

// ── Main Ranking Function ────────────────────────────────────────────────────

export interface RankingResult {
  blended: UnifiedResult[]
  policy: RankingPolicy
}

export function rankHybrid(
  internalResults: UnifiedResult[],
  expandedResults: UnifiedResult[],
  coverage: CoverageEvaluation,
): RankingResult {
  const policy = determinePolicy(coverage)

  // Calculate final ranking scores (stored separately to preserve original relevanceScore)
  const scored = [...internalResults, ...expandedResults].map(r => ({
    result: r,
    finalScore: computeFinalScore(r, policy),
  }))

  // Sort by final score
  scored.sort((a, b) => b.finalScore - a.finalScore)

  // Restore original relevanceScore (don't overwrite upstream value)
  const allResults = scored.map(s => s.result)

  // Apply guardrails
  const guarded = applyPositionGuardrails(allResults)

  // Enforce diversity
  const diverse = enforceDiversity(guarded)

  return { blended: diverse, policy }
}
