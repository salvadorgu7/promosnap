import type { OfferScoreInput, OfferScoreResult } from '@/types'

const WEIGHTS = { discount: 0.35, popularity: 0.25, reliability: 0.15, freshness: 0.15, bonus: 0.10 }

export function calculateOfferScore(input: OfferScoreInput): OfferScoreResult {
  const d = calcDiscount(input), p = calcPopularity(input), r = Math.min(100, Math.max(0, input.sourceReliability ?? 70))
  const f = calcFreshness(input.freshness ?? 24), b = calcBonus(input)
  const total = Math.min(100, Math.max(0, Math.round(d*WEIGHTS.discount + p*WEIGHTS.popularity + r*WEIGHTS.reliability + f*WEIGHTS.freshness + b*WEIGHTS.bonus)))
  return { total, breakdown: { discountScore: d, popularityScore: p, reliabilityScore: r, freshnessScore: f, bonusScore: b } }
}

function calcDiscount(i: OfferScoreInput): number {
  let s = 0
  if (i.originalPrice && i.originalPrice > i.currentPrice) s += Math.min(40, ((i.originalPrice - i.currentPrice) / i.originalPrice) * 150)
  if (i.avgPrice30d && i.avgPrice30d > i.currentPrice) s += Math.min(35, ((i.avgPrice30d - i.currentPrice) / i.avgPrice30d) * 200)
  if (i.avgPrice90d && i.avgPrice90d > i.currentPrice) s += Math.min(15, ((i.avgPrice90d - i.currentPrice) / i.avgPrice90d) * 100)
  if (i.minPrice90d && i.currentPrice <= i.minPrice90d) s += 10
  return Math.min(100, s)
}

function calcPopularity(i: OfferScoreInput): number {
  let s = 0
  const rc = i.reviewsCount ?? 0
  if (rc > 1000) s += 30; else if (rc > 500) s += 25; else if (rc > 100) s += 20; else if (rc > 10) s += 10
  const r = i.rating ?? 0
  if (r >= 4.5) s += 30; else if (r >= 4) s += 25; else if (r >= 3.5) s += 15
  const sc = i.salesEstimate ?? 0
  if (sc > 10000) s += 40; else if (sc > 5000) s += 30; else if (sc > 1000) s += 20; else if (sc > 100) s += 10
  return Math.min(100, s)
}

function calcFreshness(hours: number): number {
  if (hours <= 1) return 100; if (hours <= 6) return 80; if (hours <= 24) return 50; if (hours <= 48) return 30; return 5
}

function calcBonus(i: OfferScoreInput): number {
  let s = 0
  if (i.isFreeShipping) s += 40
  if (i.hasCoupon) s += 40
  if (i.isFreeShipping && i.hasCoupon) s += 20
  return Math.min(100, s)
}

export function generateBadges(score: number, currentPrice: number, minPrice90d?: number, avgPrice30d?: number, salesEstimate?: number, isFreeShipping?: boolean, hasCoupon?: boolean) {
  const badges: { type: string; label: string; color: string }[] = []
  if (score >= 80) badges.push({ type: 'hot_deal', label: '🔥 Oferta Quente', color: 'red' })
  if (minPrice90d && currentPrice <= minPrice90d) badges.push({ type: 'lowest_price', label: '📉 Menor Preço 90d', color: 'green' })
  if (avgPrice30d && currentPrice < avgPrice30d * 0.85) badges.push({ type: 'price_drop', label: '⬇️ Caiu Agora', color: 'cyan' })
  if (salesEstimate && salesEstimate > 5000) badges.push({ type: 'best_seller', label: '⭐ Mais Vendido', color: 'yellow' })
  if (isFreeShipping) badges.push({ type: 'free_shipping', label: '🚚 Frete Grátis', color: 'purple' })
  if (hasCoupon) badges.push({ type: 'coupon', label: '🏷️ Cupom', color: 'orange' })
  return badges
}
