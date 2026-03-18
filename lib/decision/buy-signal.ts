// ============================================================================
// Buy Signal — Consumer-facing purchase timing recommendations
// ============================================================================
//
// Translates internal price analytics into simple, trustworthy buy signals.
// Conservative thresholds to maintain user confidence.

import type { PriceStats } from '@/types'
import {
  isHistoricalLow,
  computeTrend,
  type PriceSnapshot,
  type BuyTimingResult,
} from '@/lib/price/analytics'

// ── Types ───────────────────────────────────────────────────────────────────

export type BuySignalLevel = 'excelente' | 'bom' | 'neutro' | 'aguarde'

export interface BuySignal {
  level: BuySignalLevel
  /** Short headline (e.g., "Excelente momento para comprar") */
  headline: string
  /** Detailed explanation */
  detail: string
  /** CSS-safe color class */
  color: 'green' | 'blue' | 'gray' | 'orange'
  /** Confidence of the signal */
  confidence: 'high' | 'medium' | 'low'
  /** Supporting data points */
  factors: BuySignalFactor[]
}

export interface BuySignalFactor {
  label: string
  positive: boolean
}

// ── Main Function ───────────────────────────────────────────────────────────

/**
 * Generate a consumer-facing buy signal from price stats.
 *
 * Rules (conservative):
 * - "Excelente": price is at or near historical low
 * - "Bom": price is below 30-day average
 * - "Aguarde": trend is falling but price is still above average
 * - "Neutro": otherwise (don't confuse the user)
 */
export function generateBuySignal(
  currentPrice: number,
  priceStats: PriceStats,
  options?: {
    offersCount?: number
    isFreeShipping?: boolean
    discount?: number | null
  }
): BuySignal {
  const factors: BuySignalFactor[] = []

  // Factor: historical low
  const atHistLow = isHistoricalLow(currentPrice, priceStats.allTimeMin)
  if (atHistLow) {
    factors.push({ label: 'Proximo do menor preco historico', positive: true })
  }

  // Factor: below average
  const belowAvg = currentPrice < priceStats.avg30d
  const pctBelow = priceStats.avg30d > 0
    ? Math.round(((priceStats.avg30d - currentPrice) / priceStats.avg30d) * 100)
    : 0
  if (belowAvg && pctBelow >= 3) {
    factors.push({ label: `${pctBelow}% abaixo da media de 30 dias`, positive: true })
  }

  // Factor: trend
  if (priceStats.trend === 'down') {
    factors.push({ label: 'Tendencia de queda', positive: true })
  } else if (priceStats.trend === 'up') {
    factors.push({ label: 'Preco subindo recentemente', positive: false })
  }

  // Factor: discount
  if (options?.discount && options.discount >= 20) {
    factors.push({ label: `${options.discount}% de desconto`, positive: true })
  }

  // Factor: multi-source
  if (options?.offersCount && options.offersCount > 1) {
    factors.push({ label: `Comparado em ${options.offersCount} lojas`, positive: true })
  }

  // Factor: free shipping
  if (options?.isFreeShipping) {
    factors.push({ label: 'Frete gratis', positive: true })
  }

  // ── Decision logic ──

  // Case 1: At historical low → Excellent
  if (atHistLow) {
    return {
      level: 'excelente',
      headline: 'Excelente momento para comprar',
      detail: 'Este produto esta proximo do menor preco ja registrado.',
      color: 'green',
      confidence: 'high',
      factors,
    }
  }

  // Case 2: Below average with falling trend → Good
  if (belowAvg && pctBelow >= 5 && priceStats.trend === 'down') {
    return {
      level: 'bom',
      headline: 'Bom preco — tendencia de queda',
      detail: `${pctBelow}% abaixo da media e com tendencia de queda.`,
      color: 'blue',
      confidence: 'high',
      factors,
    }
  }

  // Case 3: Below average → Good
  if (belowAvg && pctBelow >= 3) {
    return {
      level: 'bom',
      headline: 'Bom preco',
      detail: `${pctBelow}% abaixo da media dos ultimos 30 dias.`,
      color: 'blue',
      confidence: 'medium',
      factors,
    }
  }

  // Case 4: Trend is falling, wait
  if (priceStats.trend === 'down' && !belowAvg) {
    return {
      level: 'aguarde',
      headline: 'Preco pode cair mais',
      detail: 'Tendencia de queda detectada. Pode valer a pena aguardar.',
      color: 'orange',
      confidence: 'low',
      factors,
    }
  }

  // Case 5: Trend is up → Neutral (don't alarm user)
  if (priceStats.trend === 'up') {
    return {
      level: 'neutro',
      headline: 'Preco acima da media',
      detail: 'O preco atual esta acima da media recente.',
      color: 'gray',
      confidence: 'medium',
      factors,
    }
  }

  // Default: neutral
  return {
    level: 'neutro',
    headline: 'Preco estavel',
    detail: 'O preco esta dentro da faixa normal dos ultimos 30 dias.',
    color: 'gray',
    confidence: 'low',
    factors,
  }
}

/**
 * Generate buy signal from raw snapshots (convenience function).
 * Use when you don't have pre-computed PriceStats.
 */
export function generateBuySignalFromSnapshots(
  currentPrice: number,
  snapshots: PriceSnapshot[],
  options?: {
    offersCount?: number
    isFreeShipping?: boolean
    discount?: number | null
  }
): BuySignal {
  const { computePriceStats } = require('@/lib/price/analytics')
  const stats = computePriceStats(snapshots, currentPrice)
  return generateBuySignal(currentPrice, stats, options)
}
