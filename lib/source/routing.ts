import type { RoutingMode, RoutedOffer, SourceProfile, RoutingContext } from './types'

// ============================================
// SOURCE QUALITY & REVENUE RATINGS
// ============================================

export const SOURCE_QUALITY: Record<string, number> = {
  'amazon-br': 0.95,
  'mercadolivre': 0.85,
  'shopee': 0.70,
  'shein': 0.60,
}

export const REVENUE_RATES: Record<string, number> = {
  'amazon-br': 0.04,
  'mercadolivre': 0.03,
  'shopee': 0.025,
  'shein': 0.03,
}

export const SOURCE_PROFILES: Record<string, SourceProfile> = {
  'amazon-br': {
    slug: 'amazon-br',
    name: 'Amazon Brasil',
    quality: 0.95,
    revenueRate: 0.04,
    avgDeliveryDays: 3,
    returnPolicy: 'easy',
    trustLevel: 'high',
  },
  'mercadolivre': {
    slug: 'mercadolivre',
    name: 'Mercado Livre',
    quality: 0.85,
    revenueRate: 0.03,
    avgDeliveryDays: 5,
    returnPolicy: 'standard',
    trustLevel: 'high',
  },
  'shopee': {
    slug: 'shopee',
    name: 'Shopee',
    quality: 0.70,
    revenueRate: 0.025,
    avgDeliveryDays: 10,
    returnPolicy: 'standard',
    trustLevel: 'medium',
  },
  'shein': {
    slug: 'shein',
    name: 'Shein',
    quality: 0.60,
    revenueRate: 0.03,
    avgDeliveryDays: 15,
    returnPolicy: 'hard',
    trustLevel: 'low',
  },
}

// ============================================
// SOURCE ROUTING ENGINE
// ============================================

interface OfferInput {
  id: string
  currentPrice: number
  originalPrice?: number
  offerScore: number
  sourceSlug: string
  sourceName: string
  affiliateUrl: string
  isFreeShipping: boolean
  shippingPrice?: number
  couponText?: string
  updatedAt?: Date
}

export function routeSource(
  offers: OfferInput[],
  mode: RoutingMode = 'balanced',
  context?: Partial<RoutingContext>,
): RoutedOffer[] {
  if (offers.length === 0) return []

  // Apply max price filter
  let filtered = offers
  if (context?.maxPrice) {
    filtered = filtered.filter(o => o.currentPrice <= context.maxPrice!)
  }

  if (filtered.length === 0) return []

  // Compute routing scores
  const minPrice = Math.min(...filtered.map(o => o.currentPrice))
  const maxPrice = Math.max(...filtered.map(o => o.currentPrice))
  const priceRange = maxPrice - minPrice || 1

  const scored = filtered.map(offer => {
    const weights = getModeWeights(mode)

    // Price factor (lower = better)
    const priceNorm = 1 - (offer.currentPrice - minPrice) / priceRange
    const priceFactor = priceNorm * weights.price

    // Source reliability
    const reliability = SOURCE_QUALITY[offer.sourceSlug] ?? 0.5
    const reliabilityFactor = reliability * weights.reliability

    // Data quality (freshness + has original price + has score)
    let dataQuality = 0.5
    if (offer.originalPrice && offer.originalPrice > offer.currentPrice) dataQuality += 0.2
    if (offer.offerScore > 50) dataQuality += 0.2
    if (offer.updatedAt) {
      const hoursSince = (Date.now() - new Date(offer.updatedAt).getTime()) / (1000 * 60 * 60)
      if (hoursSince < 24) dataQuality += 0.1
    }
    dataQuality = Math.min(1, dataQuality)
    const dataQualityFactor = dataQuality * weights.dataQuality

    // CTR proxy (offerScore as proxy)
    const ctrProxy = Math.min(1, offer.offerScore / 100)
    const ctrFactor = ctrProxy * weights.ctr

    // Estimated revenue
    const rate = REVENUE_RATES[offer.sourceSlug] ?? 0.03
    const revNorm = Math.min(1, (offer.currentPrice * rate) / 20)
    const revFactor = revNorm * weights.revenue

    // Shipping bonus
    const shipValue = offer.isFreeShipping ? 1 : (offer.shippingPrice === 0 ? 0.8 : 0)
    const shipFactor = shipValue * weights.shipping

    // Offer score direct
    const scoreNorm = Math.min(1, offer.offerScore / 100)
    const scoreFactor = scoreNorm * weights.offerScore

    // Preferred source bonus
    let preferredBonus = 0
    if (context?.preferredSources?.includes(offer.sourceSlug)) {
      preferredBonus = 0.05
    }

    // Free shipping preference bonus
    let shippingBonus = 0
    if (context?.preferFreeShipping && offer.isFreeShipping) {
      shippingBonus = 0.05
    }

    const routingScore =
      priceFactor + reliabilityFactor + dataQualityFactor +
      ctrFactor + revFactor + shipFactor + scoreFactor +
      preferredBonus + shippingBonus

    return {
      ...offer,
      routingScore: Math.round(routingScore * 1000) / 1000,
      routingRank: 0, // set after sort
      routingReason: buildReason(mode, offer, routingScore),
    }
  })

  // Sort by routing score descending
  scored.sort((a, b) => b.routingScore - a.routingScore)

  // Assign ranks
  scored.forEach((s, i) => { s.routingRank = i + 1 })

  return scored
}

// ============================================
// MODE WEIGHTS
// ============================================

interface ModeWeights {
  price: number
  reliability: number
  dataQuality: number
  ctr: number
  revenue: number
  shipping: number
  offerScore: number
}

function getModeWeights(mode: RoutingMode): ModeWeights {
  switch (mode) {
    case 'cheapest':
      return { price: 0.45, reliability: 0.10, dataQuality: 0.05, ctr: 0.05, revenue: 0.05, shipping: 0.15, offerScore: 0.15 }
    case 'revenue':
      return { price: 0.10, reliability: 0.10, dataQuality: 0.05, ctr: 0.10, revenue: 0.40, shipping: 0.05, offerScore: 0.20 }
    case 'trust-first':
      return { price: 0.10, reliability: 0.40, dataQuality: 0.15, ctr: 0.05, revenue: 0.05, shipping: 0.10, offerScore: 0.15 }
    case 'balanced':
    default:
      return { price: 0.25, reliability: 0.15, dataQuality: 0.10, ctr: 0.10, revenue: 0.10, shipping: 0.10, offerScore: 0.20 }
  }
}

// ============================================
// HELPERS
// ============================================

function buildReason(mode: RoutingMode, offer: OfferInput, score: number): string {
  const profile = SOURCE_PROFILES[offer.sourceSlug]
  const sourceName = profile?.name || offer.sourceName
  const scoreStr = (score * 100).toFixed(1)

  switch (mode) {
    case 'cheapest':
      return `R$${offer.currentPrice.toFixed(2)} via ${sourceName} (routing ${scoreStr})`
    case 'revenue':
      const rate = REVENUE_RATES[offer.sourceSlug] ?? 0.03
      const est = (offer.currentPrice * rate).toFixed(2)
      return `Est. R$${est} comissao via ${sourceName} (routing ${scoreStr})`
    case 'trust-first':
      const trust = profile?.trustLevel || 'unknown'
      return `${sourceName} (confianca: ${trust}, routing ${scoreStr})`
    case 'balanced':
    default:
      return `${sourceName} — R$${offer.currentPrice.toFixed(2)} (routing ${scoreStr})`
  }
}

// ============================================
// UTILITY: get source profile
// ============================================

export function getSourceProfile(slug: string): SourceProfile | null {
  return SOURCE_PROFILES[slug] ?? null
}

export function getAllSourceProfiles(): SourceProfile[] {
  return Object.values(SOURCE_PROFILES)
}
