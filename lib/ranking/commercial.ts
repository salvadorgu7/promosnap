// ============================================================================
// Commercial Ranking — unified multi-signal scoring for all surfaces
// ============================================================================

import type { QueryIntent } from '@/lib/query/types'

/**
 * Input signals for commercial ranking.
 * All fields are optional — the scorer uses what's available.
 */
export interface CommercialSignals {
  // Price signals
  currentPrice?: number
  originalPrice?: number
  priceAvg30d?: number
  priceMin90d?: number

  // Quality signals
  offerScore?: number       // 0-100 from scoring engine
  rating?: number           // 0-5
  reviewsCount?: number
  soldQuantity?: number

  // Trust signals
  sourceTrust?: number      // 0-100
  isOfficialStore?: boolean
  hasAffiliate?: boolean

  // Demand signals
  clickouts7d?: number
  searchFrequency?: number
  alertsCount?: number
  favoritesCount?: number

  // Trend signals
  isTrending?: boolean
  trendPosition?: number    // 1-20
  priceTrend?: 'dropping' | 'stable' | 'rising'

  // Content signals
  hasImage?: boolean
  hasDescription?: boolean
  isFreeShipping?: boolean
  hasCoupon?: boolean

  // Origin signals
  originType?: 'imported' | 'seed' | string

  // Commercial potential
  commissionRate?: number   // 0-1
  estimatedRevenue?: number
}

/**
 * Scored result with breakdown for observability.
 */
export interface CommercialScore {
  total: number         // 0-100 final score
  breakdown: {
    relevance: number   // 0-25
    dealQuality: number // 0-25
    demand: number      // 0-20
    trust: number       // 0-15
    commercial: number  // 0-15
  }
  boosts: string[]      // applied boost labels for debug
}

// ── Weight presets by context ─────────────────────────────────────────────

interface WeightPreset {
  relevance: number
  dealQuality: number
  demand: number
  trust: number
  commercial: number
}

const WEIGHT_PRESETS: Record<string, WeightPreset> = {
  // Default balanced
  default:     { relevance: 25, dealQuality: 25, demand: 20, trust: 15, commercial: 15 },
  // Search results — relevance matters most
  search:      { relevance: 35, dealQuality: 20, demand: 20, trust: 15, commercial: 10 },
  // Deal/offer pages — discount/price matters most
  deal:        { relevance: 10, dealQuality: 40, demand: 15, trust: 15, commercial: 20 },
  // Trending/popular — demand signals matter most
  trending:    { relevance: 15, dealQuality: 15, demand: 35, trust: 15, commercial: 20 },
  // Discovery/import — commercial potential matters most
  discovery:   { relevance: 10, dealQuality: 20, demand: 20, trust: 15, commercial: 35 },
  // Homepage rails — balanced but demand-heavy
  homepage:    { relevance: 15, dealQuality: 25, demand: 25, trust: 15, commercial: 20 },
  // Category browsing
  category:    { relevance: 20, dealQuality: 25, demand: 25, trust: 15, commercial: 15 },
  // Brand browsing
  brand:       { relevance: 20, dealQuality: 20, demand: 25, trust: 20, commercial: 15 },
  // Exploratory
  exploratory: { relevance: 10, dealQuality: 20, demand: 30, trust: 15, commercial: 25 },
}

/**
 * Map a QueryIntent to a ranking preset.
 */
export function presetForIntent(intent: QueryIntent): string {
  const map: Record<QueryIntent, string> = {
    product: 'search',
    category: 'category',
    brand: 'brand',
    attribute: 'search',
    deal: 'deal',
    comparison: 'search',
    exploratory: 'exploratory',
  }
  return map[intent] || 'default'
}

// ── Scoring Functions ──────────────────────────────────────────────────────

function scoreRelevance(s: CommercialSignals): number {
  let score = 50 // base

  if (s.hasImage) score += 10
  if (s.hasDescription) score += 5
  if (s.rating && s.rating >= 4) score += 15
  if (s.reviewsCount && s.reviewsCount > 10) score += 10
  if (s.isOfficialStore) score += 10

  return Math.min(score, 100)
}

function scoreDealQuality(s: CommercialSignals): number {
  let score = 0

  // Discount from original price
  if (s.originalPrice && s.currentPrice && s.originalPrice > s.currentPrice) {
    const discountPct = ((s.originalPrice - s.currentPrice) / s.originalPrice) * 100
    score += Math.min(discountPct * 1.5, 50)
  }

  // Discount from 30d average
  if (s.priceAvg30d && s.currentPrice && s.priceAvg30d > s.currentPrice) {
    const belowAvg = ((s.priceAvg30d - s.currentPrice) / s.priceAvg30d) * 100
    score += Math.min(belowAvg, 20)
  }

  // At historical low?
  if (s.priceMin90d && s.currentPrice && s.currentPrice <= s.priceMin90d * 1.05) {
    score += 15
  }

  // Price trend
  if (s.priceTrend === 'dropping') score += 10
  if (s.priceTrend === 'rising') score -= 5

  // Shipping and coupon bonuses
  if (s.isFreeShipping) score += 10
  if (s.hasCoupon) score += 5

  return Math.min(Math.max(score, 0), 100)
}

function scoreDemand(s: CommercialSignals): number {
  let score = 0

  // Clickouts (real demand signal)
  if (s.clickouts7d) {
    score += Math.min(Math.log10(s.clickouts7d + 1) * 20, 30)
  }

  // Search frequency
  if (s.searchFrequency) {
    score += Math.min(Math.log10(s.searchFrequency + 1) * 15, 25)
  }

  // Alerts (high-intent signal)
  if (s.alertsCount) {
    score += Math.min(s.alertsCount * 5, 15)
  }

  // Favorites
  if (s.favoritesCount) {
    score += Math.min(s.favoritesCount * 3, 10)
  }

  // Sales volume
  if (s.soldQuantity && s.soldQuantity > 0) {
    score += Math.min(Math.log10(s.soldQuantity) * 5, 15)
  }

  // Trending bonus
  if (s.isTrending) {
    score += 15
    if (s.trendPosition && s.trendPosition <= 5) score += 5
  }

  return Math.min(score, 100)
}

function scoreTrust(s: CommercialSignals): number {
  let score = 30 // base trust

  if (s.sourceTrust) {
    score += s.sourceTrust * 0.3
  }

  if (s.isOfficialStore) score += 20
  if (s.hasAffiliate) score += 10
  if (s.rating && s.rating >= 4.5) score += 10
  if (s.reviewsCount && s.reviewsCount > 50) score += 10

  return Math.min(score, 100)
}

function scoreCommercial(s: CommercialSignals): number {
  let score = 0

  // Revenue potential
  if (s.estimatedRevenue) {
    score += Math.min(s.estimatedRevenue * 10, 40)
  } else if (s.currentPrice && s.commissionRate) {
    const estRev = s.currentPrice * s.commissionRate
    score += Math.min(estRev * 0.5, 40)
  } else if (s.currentPrice) {
    // Higher price items have more commercial potential
    score += Math.min(Math.log10(s.currentPrice + 1) * 10, 25)
  }

  // Has monetization path
  if (s.hasAffiliate) score += 20
  if (s.hasCoupon) score += 5
  if (s.isFreeShipping) score += 5

  // Demand signals boost commercial value
  if (s.clickouts7d && s.clickouts7d > 5) score += 15
  if (s.alertsCount && s.alertsCount > 0) score += 10

  return Math.min(score, 100)
}

// ============================================================================
// Main Scoring Function
// ============================================================================

/**
 * Calculate a unified commercial score for a product/offer.
 *
 * @param signals - Available data signals
 * @param preset - Weight preset name (default: 'default')
 * @returns CommercialScore with total and breakdown
 */
export function calculateCommercialScore(
  signals: CommercialSignals,
  preset: string = 'default'
): CommercialScore {
  const weights = WEIGHT_PRESETS[preset] || WEIGHT_PRESETS.default

  const raw = {
    relevance: scoreRelevance(signals),
    dealQuality: scoreDealQuality(signals),
    demand: scoreDemand(signals),
    trust: scoreTrust(signals),
    commercial: scoreCommercial(signals),
  }

  // Apply weights and normalize to 0-100
  let total = Math.round(
    (raw.relevance * weights.relevance / 100) +
    (raw.dealQuality * weights.dealQuality / 100) +
    (raw.demand * weights.demand / 100) +
    (raw.trust * weights.trust / 100) +
    (raw.commercial * weights.commercial / 100)
  )

  // ── Origin boost: favor real imported products over seed data ──────────
  // Defensive: only boost when originType field exists and equals 'imported'
  const boosts: string[] = []
  const isRealProduct = (signals as any).originType === 'imported'
  if (isRealProduct) {
    total = Math.round(total * 1.15) // +15% multiplier for imported products
    boosts.push('originType_imported')
  }
  if (signals.isFreeShipping) boosts.push('free_shipping')
  if (signals.hasCoupon) boosts.push('coupon')

  return {
    total: Math.min(Math.max(total, 0), 100),
    breakdown: {
      relevance: Math.round(raw.relevance * weights.relevance / 100),
      dealQuality: Math.round(raw.dealQuality * weights.dealQuality / 100),
      demand: Math.round(raw.demand * weights.demand / 100),
      trust: Math.round(raw.trust * weights.trust / 100),
      commercial: Math.round(raw.commercial * weights.commercial / 100),
    },
    boosts,
  }
}

/**
 * Sort items by commercial score.
 */
export function rankByCommercialScore<T>(
  items: T[],
  getSignals: (item: T) => CommercialSignals,
  preset: string = 'default'
): (T & { _commercialScore: CommercialScore })[] {
  return items
    .map(item => ({
      ...item,
      _commercialScore: calculateCommercialScore(getSignals(item), preset),
    }))
    .sort((a, b) => b._commercialScore.total - a._commercialScore.total)
}
