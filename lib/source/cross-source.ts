import { SOURCE_PROFILES } from './routing'

export interface CrossSourceOffer {
  offerId: string
  sourceSlug: string
  sourceName: string
  price: number
  originalPrice?: number
  discount: number
  isFreeShipping: boolean
  shippingPrice?: number
  offerScore: number
  affiliateUrl: string
  trustLevel: 'high' | 'medium' | 'low'
  quality: number
  avgDeliveryDays: number
  returnPolicy: string
}

export interface CrossSourceAnalysis {
  cheapest: CrossSourceOffer | null
  bestValue: CrossSourceOffer | null
  mostTrusted: CrossSourceOffer | null
  fastestDelivery: CrossSourceOffer | null
  bestOverall: CrossSourceOffer | null
  sourceCount: number
  priceRange: { min: number; max: number; spread: number; spreadPercent: number }
  recommendation: string
}

export function analyzeCrossSource(offers: CrossSourceOffer[]): CrossSourceAnalysis {
  if (offers.length === 0) {
    return {
      cheapest: null, bestValue: null, mostTrusted: null,
      fastestDelivery: null, bestOverall: null, sourceCount: 0,
      priceRange: { min: 0, max: 0, spread: 0, spreadPercent: 0 },
      recommendation: "Sem ofertas disponíveis",
    }
  }

  const sourceCount = new Set(offers.map(o => o.sourceSlug)).size

  // Cheapest
  const cheapest = [...offers].sort((a, b) => a.price - b.price)[0]

  // Most trusted
  const mostTrusted = [...offers].sort((a, b) => b.quality - a.quality)[0]

  // Fastest delivery
  const fastestDelivery = [...offers].sort((a, b) => a.avgDeliveryDays - b.avgDeliveryDays)[0]

  // Best value: weighted (price 40%, quality 30%, shipping 15%, score 15%)
  const minPrice = Math.min(...offers.map(o => o.price))
  const maxPrice = Math.max(...offers.map(o => o.price))
  const priceRange = maxPrice - minPrice || 1

  const scored = offers.map(o => {
    const priceNorm = 1 - (o.price - minPrice) / priceRange
    const qualityNorm = o.quality
    const shipNorm = o.isFreeShipping ? 1 : 0.3
    const scoreNorm = Math.min(1, o.offerScore / 100)
    const value = priceNorm * 0.4 + qualityNorm * 0.3 + shipNorm * 0.15 + scoreNorm * 0.15
    return { ...o, _valueScore: value }
  })
  const bestValue = [...scored].sort((a, b) => b._valueScore - a._valueScore)[0]

  // Best overall: balanced (value 50%, trust 25%, delivery 25%)
  const bestOverall = [...scored].sort((a, b) => {
    const aScore = a._valueScore * 0.5 + a.quality * 0.25 + (1 - a.avgDeliveryDays / 20) * 0.25
    const bScore = b._valueScore * 0.5 + b.quality * 0.25 + (1 - b.avgDeliveryDays / 20) * 0.25
    return bScore - aScore
  })[0]

  const spread = maxPrice - minPrice
  const spreadPercent = minPrice > 0 ? Math.round((spread / minPrice) * 100) : 0

  // Build recommendation
  let recommendation = ""
  if (sourceCount === 1) {
    recommendation = `Disponível apenas em ${cheapest.sourceName}`
  } else if (spreadPercent > 15) {
    recommendation = `Diferença de ${spreadPercent}% entre fontes — vale comparar`
  } else if (cheapest.sourceSlug === mostTrusted.sourceSlug) {
    recommendation = `${cheapest.sourceName} tem o melhor preço e maior confiança`
  } else {
    recommendation = `Melhor preço em ${cheapest.sourceName}, mais confiável em ${mostTrusted.sourceName}`
  }

  return {
    cheapest, bestValue, mostTrusted, fastestDelivery, bestOverall,
    sourceCount,
    priceRange: { min: minPrice, max: maxPrice, spread, spreadPercent },
    recommendation,
  }
}

// Build CrossSourceOffer from raw offer data
export function buildCrossSourceOffer(offer: {
  id: string
  currentPrice: number
  originalPrice?: number
  offerScore: number
  sourceSlug: string
  sourceName: string
  affiliateUrl: string
  isFreeShipping: boolean
  shippingPrice?: number
}): CrossSourceOffer {
  const profile = SOURCE_PROFILES[offer.sourceSlug]
  const discount = offer.originalPrice && offer.originalPrice > offer.currentPrice
    ? Math.round(((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100)
    : 0

  return {
    offerId: offer.id,
    sourceSlug: offer.sourceSlug,
    sourceName: offer.sourceName,
    price: offer.currentPrice,
    originalPrice: offer.originalPrice,
    discount,
    isFreeShipping: offer.isFreeShipping,
    shippingPrice: offer.shippingPrice,
    offerScore: offer.offerScore,
    affiliateUrl: offer.affiliateUrl,
    trustLevel: profile?.trustLevel || 'medium',
    quality: profile?.quality || 0.5,
    avgDeliveryDays: profile?.avgDeliveryDays || 7,
    returnPolicy: profile?.returnPolicy || 'standard',
  }
}
