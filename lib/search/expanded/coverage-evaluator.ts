/**
 * Coverage Evaluator — Avalia se os resultados internos são suficientes.
 *
 * Não usa só quantidade. Avalia:
 * - Relevância média dos top-N resultados
 * - Aderência ao budget do usuário
 * - Qualidade (imagem, afiliado, score)
 * - Diversidade de fontes
 * - Monetizabilidade
 *
 * Output: CoverageEvaluation com shouldExpand + expansionLevel.
 */

import type { ProductCard } from '@/types'
import type { QueryUnderstanding } from '@/lib/query/types'
import type { CoverageEvaluation } from './types'

// ── Thresholds ───────────────────────────────────────────────────────────────

/** Minimum results to consider "good" coverage (varies by intent) */
const MIN_RESULTS: Record<string, number> = {
  product: 1,          // Specific product — 1 good match is enough
  brand: 3,            // Brand search — need variety
  category: 5,         // Category browse — need selection
  deal: 3,             // Deal hunting — need options
  comparison: 2,       // Comparing — need at least 2
  attribute: 3,        // Attribute filter — need matches
  exploratory: 4,      // Browsing — need discovery
}

/** Coverage score thresholds for expansion levels */
const THRESHOLDS = {
  none: 70,            // ≥70 = don't expand
  light: 50,           // 50-69 = add a few external results
  moderate: 30,        // 30-49 = actively expand
  aggressive: 0,       // <30 = expand aggressively
}

// ── Core Evaluation ──────────────────────────────────────────────────────────

export function evaluateCoverage(
  internalResults: ProductCard[],
  understanding: QueryUnderstanding,
  params: { maxPrice?: number; minPrice?: number }
): CoverageEvaluation {
  const reasons: string[] = []

  // 1. Quantity score (0-30)
  const minRequired = MIN_RESULTS[understanding.intent] || 3
  const quantityRatio = Math.min(internalResults.length / minRequired, 1)
  const quantityScore = Math.round(quantityRatio * 30)

  if (internalResults.length === 0) {
    reasons.push('zero resultados internos')
  } else if (internalResults.length < minRequired) {
    reasons.push(`apenas ${internalResults.length}/${minRequired} resultados necessários`)
  }

  // 2. Quality score (0-25) — image, affiliate, offer score
  let qualityCount = 0
  let qualityTotal = 0
  for (const r of internalResults.slice(0, 10)) {
    let q = 0
    if (r.imageUrl) q += 30
    if (r.bestOffer.affiliateUrl && r.bestOffer.affiliateUrl !== '#') q += 30
    if (r.bestOffer.offerScore >= 50) q += 20
    if (r.bestOffer.offerScore >= 70) q += 10
    if (r.bestOffer.isFreeShipping) q += 10
    qualityTotal += q
    if (q >= 60) qualityCount++
  }
  const avgQuality = internalResults.length > 0
    ? qualityTotal / Math.min(internalResults.length, 10)
    : 0
  const qualityScore = Math.round((avgQuality / 100) * 25)

  if (avgQuality < 40) {
    reasons.push('qualidade média baixa dos resultados')
  }

  // 3. Budget adherence score (0-20)
  let budgetScore = 20 // Full score if no budget constraint
  if (params.maxPrice) {
    const withinBudget = internalResults.filter(
      r => r.bestOffer.price <= params.maxPrice!
    )
    const budgetRatio = internalResults.length > 0
      ? withinBudget.length / internalResults.length
      : 0
    budgetScore = Math.round(budgetRatio * 20)

    if (budgetRatio < 0.5) {
      reasons.push(`${Math.round((1 - budgetRatio) * 100)}% dos resultados acima do orçamento`)
    }
  }

  // 4. Monetization score (0-15)
  const monetizable = internalResults.filter(
    r => r.bestOffer.affiliateUrl && r.bestOffer.affiliateUrl !== '#'
  )
  const monetizationRatio = internalResults.length > 0
    ? monetizable.length / internalResults.length
    : 0
  const monetizationScore = Math.round(monetizationRatio * 15)

  if (monetizationRatio < 0.5 && internalResults.length > 0) {
    reasons.push('baixa cobertura de monetização afiliada')
  }

  // 5. Source diversity score (0-10)
  const sources = new Set(internalResults.map(r => r.bestOffer.sourceSlug))
  const diversityRatio = Math.min(sources.size / 3, 1) // 3+ sources = max
  const diversityScore = Math.round(diversityRatio * 10)

  if (sources.size <= 1 && internalResults.length > 2) {
    reasons.push('resultados de uma única loja')
  }

  // Total coverage score
  const coverageScore = quantityScore + qualityScore + budgetScore + monetizationScore + diversityScore

  // Determine expansion level
  let expansionLevel: CoverageEvaluation['expansionLevel']
  let shouldExpand: boolean

  if (coverageScore >= THRESHOLDS.none) {
    expansionLevel = 'none'
    shouldExpand = false
  } else if (coverageScore >= THRESHOLDS.light) {
    expansionLevel = 'light'
    shouldExpand = true
    reasons.push(`cobertura moderada (${coverageScore}/100) — expansão leve`)
  } else if (coverageScore >= THRESHOLDS.moderate) {
    expansionLevel = 'moderate'
    shouldExpand = true
    reasons.push(`cobertura fraca (${coverageScore}/100) — expansão moderada`)
  } else {
    expansionLevel = 'aggressive'
    shouldExpand = true
    reasons.push(`cobertura insuficiente (${coverageScore}/100) — expansão agressiva`)
  }

  // Override: specific product with 1+ good match = don't expand
  if (understanding.intent === 'product' && qualityCount >= 1 && internalResults.length >= 1) {
    if (expansionLevel !== 'aggressive') {
      expansionLevel = 'none'
      shouldExpand = false
      reasons.push('produto específico com match de qualidade — não expandir')
    }
  }

  return {
    coverageScore,
    relevanceScore: quantityScore + qualityScore,
    monetizationScore,
    diversityScore,
    qualityCount,
    totalCount: internalResults.length,
    shouldExpand,
    expansionLevel,
    reasons,
  }
}
