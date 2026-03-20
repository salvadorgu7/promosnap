// ============================================================================
// Wait Score — "Vale esperar?" predictive purchase timing
// ============================================================================
//
// Computes a data-driven recommendation on whether the user should wait
// for a price drop or buy now. Combines velocity, momentum, support level,
// seasonal events, and volatility.

import {
  type PriceSnapshot,
  computeExtendedPriceStats,
  computeVelocity,
  computeMomentum,
  findSupportLevel,
  getNextSeasonalEvent,
} from '@/lib/price/analytics'

// ── Types ───────────────────────────────────────────────────────────────────

export interface WaitScore {
  /** Should the user wait? */
  shouldWait: boolean
  /** 0-100 score: 0 = buy now, 100 = definitely wait */
  score: number
  /** Estimated days to wait for a better price */
  daysToWait: number
  /** Expected savings in BRL (conservative estimate) */
  expectedSavings: number
  /** Confidence of the prediction */
  confidence: 'high' | 'medium' | 'low'
  /** Human-readable reason */
  reason: string
  /** Detailed factors */
  factors: WaitFactor[]
}

export interface WaitFactor {
  label: string
  /** Positive = suggests waiting, negative = suggests buying */
  impact: number
  type: 'velocity' | 'momentum' | 'support' | 'seasonal' | 'volatility' | 'historical'
}

// ── Constants ───────────────────────────────────────────────────────────────

const WAIT_THRESHOLD = 45 // Score >= 45 → recommend waiting

// ── Main Function ───────────────────────────────────────────────────────────

/**
 * Compute a wait score for a product based on price history.
 * Returns a recommendation on whether to wait or buy now.
 */
export function computeWaitScore(
  snapshots: PriceSnapshot[],
  currentPrice: number,
  categorySlug?: string
): WaitScore {
  const factors: WaitFactor[] = []
  let score = 50 // Start neutral

  // Insufficient data guard
  if (snapshots.length < 3) {
    return {
      shouldWait: false,
      score: 0,
      daysToWait: 0,
      expectedSavings: 0,
      confidence: 'low',
      reason: 'Dados insuficientes para previsao.',
      factors: [],
    }
  }

  const stats = computeExtendedPriceStats(snapshots, currentPrice)
  const velocity = computeVelocity(snapshots, 7)
  const momentum = computeMomentum(snapshots)
  const support = findSupportLevel(snapshots)
  const seasonalEvent = getNextSeasonalEvent(categorySlug)

  // ── Factor 1: Velocity (is price currently falling?) ──

  if (velocity.direction === 'down') {
    const impact = Math.min(20, Math.abs(velocity.dailyChangePct) * 10)
    score += impact
    factors.push({
      label: `Preco caindo ${Math.abs(velocity.dailyChangePct).toFixed(1)}%/dia`,
      impact,
      type: 'velocity',
    })
  } else if (velocity.direction === 'up') {
    const impact = -Math.min(15, velocity.dailyChangePct * 8)
    score += impact
    factors.push({
      label: `Preco subindo ${velocity.dailyChangePct.toFixed(1)}%/dia`,
      impact,
      type: 'velocity',
    })
  }

  // ── Factor 2: Momentum (is the drop accelerating?) ──

  if (momentum === 'accelerating' && velocity.direction === 'down') {
    score += 12
    factors.push({
      label: 'Queda acelerando — preco pode cair mais rapido',
      impact: 12,
      type: 'momentum',
    })
  } else if (momentum === 'decelerating' && velocity.direction === 'down') {
    score -= 5
    factors.push({
      label: 'Queda desacelerando — pode estar perto do fundo',
      impact: -5,
      type: 'momentum',
    })
  }

  // ── Factor 3: Distance from support ──

  if (support > 0 && currentPrice > support) {
    const distancePct = ((currentPrice - support) / currentPrice) * 100
    if (distancePct > 15) {
      score += 15
      factors.push({
        label: `${distancePct.toFixed(0)}% acima do suporte (R$${support.toFixed(2)})`,
        impact: 15,
        type: 'support',
      })
    } else if (distancePct > 5) {
      score += 8
      factors.push({
        label: `${distancePct.toFixed(0)}% acima do suporte (R$${support.toFixed(2)})`,
        impact: 8,
        type: 'support',
      })
    } else {
      // Near support — good time to buy
      score -= 10
      factors.push({
        label: `Proximo do suporte de R$${support.toFixed(2)}`,
        impact: -10,
        type: 'support',
      })
    }
  }

  // ── Factor 4: Seasonal event proximity ──

  if (seasonalEvent) {
    const expectedDiscount = seasonalEvent.discountExpected
    if (expectedDiscount >= 20) {
      score += 18
      factors.push({
        label: `${seasonalEvent.name} em breve (ate ${expectedDiscount}% de desconto)`,
        impact: 18,
        type: 'seasonal',
      })
    } else {
      score += 8
      factors.push({
        label: `${seasonalEvent.name} proximo (ate ${expectedDiscount}% de desconto)`,
        impact: 8,
        type: 'seasonal',
      })
    }
  }

  // ── Factor 5: Volatility ──

  if (stats.volatility > 30) {
    score += 10
    factors.push({
      label: `Alta volatilidade (${stats.volatility}%) — precos oscilam muito`,
      impact: 10,
      type: 'volatility',
    })
  } else if (stats.volatility < 5) {
    score -= 8
    factors.push({
      label: 'Preco muito estavel — improvavel grande queda',
      impact: -8,
      type: 'volatility',
    })
  }

  // ── Factor 6: Historical position ──

  if (stats.isHistoricalLow) {
    score -= 25
    factors.push({
      label: 'Proximo do menor preco historico — compre agora',
      impact: -25,
      type: 'historical',
    })
  } else if (currentPrice > stats.avg30d * 1.1) {
    score += 10
    factors.push({
      label: `${Math.round(((currentPrice - stats.avg30d) / stats.avg30d) * 100)}% acima da media de 30 dias`,
      impact: 10,
      type: 'historical',
    })
  }

  // ── Clamp and compute result ──

  score = Math.max(0, Math.min(100, Math.round(score)))

  const shouldWait = score >= WAIT_THRESHOLD

  // Estimate days to wait and expected savings
  let daysToWait = 0
  let expectedSavings = 0

  if (shouldWait) {
    if (velocity.direction === 'down' && velocity.dailyChangePct !== 0) {
      // Estimate days until price hits support or 10% below current
      const targetDrop = Math.min(
        currentPrice - support,
        currentPrice * 0.1
      )
      const dailyDrop = Math.abs(velocity.dailyChangeBRL)
      daysToWait = dailyDrop > 0 ? Math.min(30, Math.ceil(targetDrop / dailyDrop)) : 7
      expectedSavings = Math.round(dailyDrop * daysToWait * 100) / 100
    } else if (seasonalEvent) {
      // Wait for seasonal event
      const now = new Date()
      const eventDate = new Date(now.getFullYear(), seasonalEvent.month - 1, seasonalEvent.day)
      if (eventDate < now) eventDate.setFullYear(now.getFullYear() + 1)
      daysToWait = Math.round((eventDate.getTime() - now.getTime()) / 86_400_000)
      expectedSavings = Math.round(currentPrice * (seasonalEvent.discountExpected / 100) * 100) / 100
    } else {
      daysToWait = 7
      expectedSavings = Math.round(currentPrice * 0.05 * 100) / 100
    }
  }

  // Confidence based on data quality
  const confidence = snapshots.length >= 30 ? 'high' : snapshots.length >= 10 ? 'medium' : 'low'

  // Build reason string
  let reason: string
  if (!shouldWait) {
    if (stats.isHistoricalLow) {
      reason = 'Preco proximo do minimo historico — bom momento para comprar.'
    } else if (velocity.direction === 'up') {
      reason = 'Preco subindo — comprar agora evita pagar mais.'
    } else {
      reason = 'Preco estavel e proximo do suporte — boa oportunidade.'
    }
  } else {
    const reasons: string[] = []
    if (velocity.direction === 'down') reasons.push('preco em queda')
    if (seasonalEvent) reasons.push(`${seasonalEvent.name} proximo`)
    if (stats.volatility > 30) reasons.push('alta volatilidade')
    if (currentPrice > stats.avg30d) reasons.push('acima da media')
    reason = `Vale esperar: ${reasons.join(', ')}.`
  }

  return {
    shouldWait,
    score,
    daysToWait,
    expectedSavings,
    confidence,
    reason,
    factors,
  }
}
