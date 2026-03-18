// ============================================================================
// Price Analytics — Reusable price trend, stats, and buy-timing utilities
// ============================================================================

import type { PriceStats } from '@/types'

// ── Types ───────────────────────────────────────────────────────────────────

export interface PriceSnapshot {
  price: number
  originalPrice?: number | null
  capturedAt: Date
}

export type TrendDirection = 'up' | 'down' | 'stable'

export interface PriceTrend {
  direction: TrendDirection
  /** Percentage change vs period average (positive = above, negative = below) */
  changePct: number
}

export type BuyTiming = 'excelente' | 'bom' | 'aguarde' | 'acima_media'

export interface BuyTimingResult {
  timing: BuyTiming
  label: string
  description: string
  confidence: 'high' | 'medium' | 'low'
}

export interface ExtendedPriceStats extends PriceStats {
  /** Whether current price is within 5% of the all-time minimum */
  isHistoricalLow: boolean
  /** 7-day trend */
  trend7d: PriceTrend
  /** 30-day trend */
  trend30d: PriceTrend
  /** Price volatility (0-100 scale) */
  volatility: number
  /** Buy timing suggestion */
  buyTiming: BuyTimingResult
}

// ── Constants ───────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000
const TREND_THRESHOLD = 0.05 // 5% threshold for trend classification
const HISTORICAL_LOW_TOLERANCE = 0.05 // Within 5% of all-time min

// ── Core Stats Computation ──────────────────────────────────────────────────

/**
 * Compute basic price statistics from snapshots.
 * This is the shared version of what was inline in produto/[slug]/page.tsx.
 */
export function computePriceStats(
  snapshots: PriceSnapshot[],
  currentPrice: number
): PriceStats {
  const now = Date.now()

  const prices = snapshots.map(s => s.price)
  const prices30d = snapshots
    .filter(s => now - s.capturedAt.getTime() < 30 * MS_PER_DAY)
    .map(s => s.price)
  const prices90d = snapshots
    .filter(s => now - s.capturedAt.getTime() < 90 * MS_PER_DAY)
    .map(s => s.price)

  const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : currentPrice
  const min = (arr: number[]) => arr.length > 0 ? Math.min(...arr) : currentPrice
  const max = (arr: number[]) => arr.length > 0 ? Math.max(...arr) : currentPrice

  const avg30 = avg(prices30d)
  let trend: TrendDirection = 'stable'
  if (currentPrice < avg30 * (1 - TREND_THRESHOLD)) trend = 'down'
  else if (currentPrice > avg30 * (1 + TREND_THRESHOLD)) trend = 'up'

  return {
    current: currentPrice,
    min30d: min(prices30d),
    max30d: max(prices30d),
    avg30d: Math.round(avg30 * 100) / 100,
    min90d: min(prices90d),
    max90d: max(prices90d),
    avg90d: Math.round(avg(prices90d) * 100) / 100,
    allTimeMin: min(prices),
    trend,
  }
}

// ── Trend Analysis ──────────────────────────────────────────────────────────

/**
 * Compute trend for a specific time window.
 */
export function computeTrend(
  snapshots: PriceSnapshot[],
  currentPrice: number,
  windowDays: number
): PriceTrend {
  const now = Date.now()
  const windowMs = windowDays * MS_PER_DAY
  const windowPrices = snapshots
    .filter(s => now - s.capturedAt.getTime() < windowMs)
    .map(s => s.price)

  if (windowPrices.length === 0) {
    return { direction: 'stable', changePct: 0 }
  }

  const avg = windowPrices.reduce((a, b) => a + b, 0) / windowPrices.length
  const changePct = avg > 0 ? ((currentPrice - avg) / avg) * 100 : 0

  let direction: TrendDirection = 'stable'
  if (changePct < -TREND_THRESHOLD * 100) direction = 'down'
  else if (changePct > TREND_THRESHOLD * 100) direction = 'up'

  return {
    direction,
    changePct: Math.round(changePct * 10) / 10,
  }
}

// ── Historical Low Detection ────────────────────────────────────────────────

/**
 * Check if the current price is within tolerance of the all-time minimum.
 */
export function isHistoricalLow(
  currentPrice: number,
  allTimeMin: number
): boolean {
  if (allTimeMin <= 0 || currentPrice <= 0) return false
  return currentPrice <= allTimeMin * (1 + HISTORICAL_LOW_TOLERANCE)
}

// ── Volatility ──────────────────────────────────────────────────────────────

/**
 * Compute price volatility as percentage of avg.
 * Returns 0-100 scale.
 */
export function computeVolatility(
  min: number,
  max: number,
  avg: number
): number {
  if (avg <= 0) return 0
  return Math.round(((max - min) / avg) * 100)
}

// ── Buy Timing ──────────────────────────────────────────────────────────────

/**
 * Suggest buy timing based on price analytics.
 * Conservative thresholds to maintain user trust.
 */
export function suggestBuyTiming(
  currentPrice: number,
  stats: PriceStats,
  trend30d?: PriceTrend
): BuyTimingResult {
  const atHistoricalLow = isHistoricalLow(currentPrice, stats.allTimeMin)
  const belowAvg30d = currentPrice < stats.avg30d
  const trendDown = trend30d?.direction === 'down' || stats.trend === 'down'

  // Best case: at historical low
  if (atHistoricalLow) {
    return {
      timing: 'excelente',
      label: 'Excelente momento para comprar',
      description: 'Este produto esta proximo do menor preco ja registrado.',
      confidence: 'high',
    }
  }

  // Good: below 30d average
  if (belowAvg30d) {
    const pctBelow = Math.round(((stats.avg30d - currentPrice) / stats.avg30d) * 100)
    return {
      timing: 'bom',
      label: 'Bom preco',
      description: `${pctBelow}% abaixo da media dos ultimos 30 dias.`,
      confidence: pctBelow > 10 ? 'high' : 'medium',
    }
  }

  // Wait: trend is down but not at minimum yet
  if (trendDown && !belowAvg30d) {
    return {
      timing: 'aguarde',
      label: 'Preco pode cair',
      description: 'Tendencia de queda detectada. Pode valer a pena aguardar.',
      confidence: 'low',
    }
  }

  // Above average
  return {
    timing: 'acima_media',
    label: 'Preco acima da media',
    description: 'O preco atual esta acima da media recente.',
    confidence: 'medium',
  }
}

// ── Extended Stats (All-in-one) ─────────────────────────────────────────────

/**
 * Compute extended price stats with trend, volatility, and buy timing.
 * This is the main entry point for rich price analytics.
 */
export function computeExtendedPriceStats(
  snapshots: PriceSnapshot[],
  currentPrice: number
): ExtendedPriceStats {
  const base = computePriceStats(snapshots, currentPrice)
  const trend7d = computeTrend(snapshots, currentPrice, 7)
  const trend30d = computeTrend(snapshots, currentPrice, 30)
  const historicalLow = isHistoricalLow(currentPrice, base.allTimeMin)
  const volatility = computeVolatility(base.min30d, base.max30d, base.avg30d)
  const buyTiming = suggestBuyTiming(currentPrice, base, trend30d)

  return {
    ...base,
    isHistoricalLow: historicalLow,
    trend7d,
    trend30d,
    volatility,
    buyTiming,
  }
}

// ── Price Position ──────────────────────────────────────────────────────────

/**
 * Calculate where the current price sits in the 90d range (0 = min, 100 = max).
 * Useful for visual indicators (gauges, progress bars).
 */
export function pricePosition90d(
  currentPrice: number,
  min90d: number,
  max90d: number
): number {
  if (max90d <= min90d) return 50 // No range = mid
  const position = ((currentPrice - min90d) / (max90d - min90d)) * 100
  return Math.max(0, Math.min(100, Math.round(position)))
}
