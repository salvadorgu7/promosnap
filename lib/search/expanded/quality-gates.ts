/**
 * Quality Gates — Filtra resultados externos antes de apresentar.
 *
 * Regras:
 * - Sem título = rejeitado
 * - Sem preço = rebaixado
 * - Preço suspeito = rejeitado
 * - Sem imagem = penalizado (nunca em posição nobre)
 * - Fora do budget = rebaixado
 * - Fora da intenção = rebaixado
 * - Fonte desconhecida = penalizado
 * - Sem monetização = penalizado (nunca em posição nobre no mobile)
 *
 * Category-aware thresholds: stricter minQualityScore and maxTrustDiscount
 * per vertical via category-personalization profiles.
 */

import type { ResolvedCandidate } from '@/lib/ai/candidate-resolver'
import type { QualityLevel } from './types'
import { getCategoryProfile, type CategoryProfile } from './category-personalization'

// ── Quality Assessment ───────────────────────────────────────────────────────

export interface QualityAssessment {
  candidate: ResolvedCandidate
  quality: QualityLevel
  qualityScore: number      // 0-100
  reasons: string[]
  passesGate: boolean
}

/** Default minimum score to pass quality gate (overridden by category profile) */
const DEFAULT_MIN_QUALITY_SCORE = 25
/** Minimum score for "high" positions (mobile first screen) */
const MIN_HIGH_POSITION_SCORE = 50

// ── Category-Aware Options ──────────────────────────────────────────────────

export interface QualityGateOptions {
  /** Category slug — used to look up stricter thresholds per vertical */
  categorySlug?: string
  /** Override minimum quality score (ignores category profile) */
  minQualityScore?: number
  /** Override max trusted discount (ignores category profile) */
  maxTrustDiscount?: number
}

// ── Score Calculation ────────────────────────────────────────────────────────

function calculateQualityScore(
  candidate: ResolvedCandidate,
  profile?: CategoryProfile,
): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []
  const maxTrustDiscount = profile?.maxTrustDiscount ?? 85

  // Title quality (0-20)
  if (candidate.normalizedTitle.length >= 15) {
    score += 15
  } else if (candidate.normalizedTitle.length >= 8) {
    score += 8
    reasons.push('título curto')
  } else {
    reasons.push('título muito curto')
  }
  if (candidate.brand) {
    score += 5 // Has brand = better title quality
  }

  // Price quality (0-25)
  if (candidate.price && candidate.price > 0) {
    score += 15
    // Suspicious price check
    if (candidate.price < 5) {
      score -= 20
      reasons.push('preço suspeito (< R$5)')
    }
    if (candidate.price > 50000) {
      score -= 5
      reasons.push('preço muito alto')
    }
    // Has discount — use category-aware maxTrustDiscount
    if (candidate.originalPrice && candidate.originalPrice > candidate.price) {
      const discount = ((candidate.originalPrice - candidate.price) / candidate.originalPrice) * 100
      if (discount > 0 && discount <= maxTrustDiscount) {
        score += 10
      } else if (discount > maxTrustDiscount) {
        score -= 10
        reasons.push(`desconto suspeito (> ${maxTrustDiscount}%)`)
      }
    }
  } else {
    reasons.push('sem preço')
  }

  // Image quality (0-15)
  if (candidate.imageUrl) {
    score += 15
  } else {
    reasons.push('sem imagem')
  }

  // Source trust (0-20)
  const trustedSources = ['amazon-br', 'mercadolivre', 'shopee', 'magalu', 'kabum', 'casasbahia']
  const sourceSlug = detectSourceSlug(candidate.sourceDomain)
  if (trustedSources.includes(sourceSlug)) {
    score += 20
  } else if (candidate.sourceDomain !== 'unknown') {
    score += 10
    reasons.push('fonte não-prioritária')
  } else {
    reasons.push('fonte desconhecida')
  }

  // Monetization (0-20)
  if (candidate.monetization === 'verified') {
    score += 20
  } else if (candidate.monetization === 'best_effort') {
    score += 10
    reasons.push('monetização best-effort')
  } else {
    reasons.push('sem monetização')
  }

  return { score: Math.max(0, Math.min(100, score)), reasons }
}

function detectSourceSlug(domain: string): string {
  const mapping: Record<string, string> = {
    'amazon.com.br': 'amazon-br',
    'mercadolivre.com.br': 'mercadolivre',
    'shopee.com.br': 'shopee',
    'shein.com': 'shein',
    'magazineluiza.com.br': 'magalu',
    'magalu.com': 'magalu',
    'kabum.com.br': 'kabum',
    'casasbahia.com.br': 'casasbahia',
    'americanas.com.br': 'americanas',
    'carrefour.com.br': 'carrefour',
  }
  for (const [d, slug] of Object.entries(mapping)) {
    if (domain.includes(d)) return slug
  }
  return 'unknown'
}

// ── Gate Application ─────────────────────────────────────────────────────────

/**
 * Assess quality for a single candidate.
 * When categorySlug is provided, uses stricter category-specific thresholds.
 */
export function assessQuality(
  candidate: ResolvedCandidate,
  options?: QualityGateOptions,
): QualityAssessment {
  const profile = options?.categorySlug ? getCategoryProfile(options.categorySlug) : undefined
  const minScore = options?.minQualityScore ?? profile?.minQualityScore ?? DEFAULT_MIN_QUALITY_SCORE

  const { score, reasons } = calculateQualityScore(candidate, profile)

  let quality: QualityLevel
  if (score >= 70) quality = 'high'
  else if (score >= 50) quality = 'medium'
  else if (score >= minScore) quality = 'low'
  else quality = 'rejected'

  return {
    candidate,
    quality,
    qualityScore: score,
    reasons,
    passesGate: score >= minScore,
  }
}

/**
 * Apply quality gates to a batch of resolved candidates.
 * Returns only those that pass, with quality metadata.
 *
 * @param candidates - Resolved candidates to filter
 * @param options - Optional category-aware thresholds
 */
export function applyQualityGates(
  candidates: ResolvedCandidate[],
  options?: QualityGateOptions,
): QualityAssessment[] {
  return candidates
    .map(c => assessQuality(c, options))
    .filter(a => a.passesGate)
    .sort((a, b) => b.qualityScore - a.qualityScore)
}

/** Check if a result is fit for a prominent mobile position */
export function isHighPositionWorthy(assessment: QualityAssessment): boolean {
  return assessment.qualityScore >= MIN_HIGH_POSITION_SCORE
    && !!assessment.candidate.imageUrl // truthy: not undefined, null, or empty string
    && assessment.candidate.price !== undefined
    && assessment.candidate.price > 0
    && assessment.candidate.monetization !== 'none' // non-monetizable results excluded from premium positions
}
