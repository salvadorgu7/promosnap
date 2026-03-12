// Source Routing Types

export type RoutingMode = 'cheapest' | 'balanced' | 'revenue' | 'trust-first'

export interface RoutedOffer {
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
  routingScore: number
  routingRank: number
  routingReason: string
}

export interface SourceProfile {
  slug: string
  name: string
  quality: number
  revenueRate: number
  avgDeliveryDays?: number
  returnPolicy?: 'easy' | 'standard' | 'hard'
  trustLevel: 'high' | 'medium' | 'low'
}

export interface RoutingContext {
  mode: RoutingMode
  preferFreeShipping?: boolean
  preferredSources?: string[]
  maxPrice?: number
}
