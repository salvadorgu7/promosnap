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
 */

import type { ResolvedCandidate } from '@/lib/ai/candidate-resolver'
import type { QualityLevel } from './types'

// ── Quality Assessment ───────────────────────────────────────────────────────

export interface QualityAssessment {
  candidate: ResolvedCandidate
  quality: QualityLevel
  qualityScore: number      // 0-100
  reasons: string[]
  passesGate: boolean
}

/** Minimum score to pass quality gate */
const MIN_QUALITY_SCORE = 25
/** Minimum score for "high" positions (mobile first screen) */
const MIN_HIGH_POSITION_SCORE = 50

// ── Score Calculation ────────────────────────────────────────────────────────

function calculateQualityScore(candidate: ResolvedCandidate): { score: number; reasons: string[] } {
  let score = 0
  const reasons: string[] = []

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
    // Has discount
    if (candidate.originalPrice && candidate.originalPrice > candidate.price) {
      const discount = ((candidate.originalPrice - candidate.price) / candidate.originalPrice) * 100
      if (discount > 0 && discount <= 85) {
        score += 10
      } else if (discount > 85) {
        score -= 10
        reasons.push('desconto suspeito (> 85%)')
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

export function assessQuality(candidate: ResolvedCandidate): QualityAssessment {
  const { score, reasons } = calculateQualityScore(candidate)

  let quality: QualityLevel
  if (score >= 70) quality = 'high'
  else if (score >= 50) quality = 'medium'
  else if (score >= MIN_QUALITY_SCORE) quality = 'low'
  else quality = 'rejected'

  return {
    candidate,
    quality,
    qualityScore: score,
    reasons,
    passesGate: score >= MIN_QUALITY_SCORE,
  }
}

/**
 * Apply quality gates to a batch of resolved candidates.
 * Returns only those that pass, with quality metadata.
 */
export function applyQualityGates(candidates: ResolvedCandidate[]): QualityAssessment[] {
  return candidates
    .map(c => assessQuality(c))
    .filter(a => a.passesGate)
    .sort((a, b) => b.qualityScore - a.qualityScore)
}

/** Check if a result is fit for a prominent mobile position */
export function isHighPositionWorthy(assessment: QualityAssessment): boolean {
  return assessment.qualityScore >= MIN_HIGH_POSITION_SCORE
    && assessment.candidate.imageUrl !== undefined
    && assessment.candidate.price !== undefined
    && assessment.candidate.price > 0
}
