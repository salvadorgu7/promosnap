// Decision Engine Types

export interface DecisionFactor {
  name: string
  value: number
  weight: number
  contribution: number // value * weight
}

export interface DecisionResult<T> {
  result: T
  reason: string
  factors: DecisionFactor[]
  totalScore: number
}

export interface DecisionContext {
  mode?: 'homepage' | 'category' | 'search' | 'deal-of-day' | 'editorial'
  userPreferences?: {
    prefersFreeShipping?: boolean
    preferredSources?: string[]
    maxPrice?: number
  }
  timestamp?: Date
}

export interface ScoringWeights {
  offerScore: number
  revenueOpportunity: number
  ctrEstimate: number
  favoritesCount: number
  alertsCount: number
  sourceQuality: number
  dataFreshness: number
  matchConfidence: number
}

export const DEFAULT_SCORING_WEIGHTS: ScoringWeights = {
  offerScore: 0.25,
  revenueOpportunity: 0.15,
  ctrEstimate: 0.15,
  favoritesCount: 0.10,
  alertsCount: 0.05,
  sourceQuality: 0.10,
  dataFreshness: 0.10,
  matchConfidence: 0.10,
}

export interface ProductScoringInput {
  id: string
  name: string
  slug: string
  offerScore: number
  currentPrice: number
  originalPrice?: number
  sourceSlug: string
  clickouts?: number
  impressions?: number
  favoritesCount?: number
  alertsCount?: number
  updatedAt?: Date
  isFreeShipping?: boolean
  popularityScore?: number
}

export interface OfferForDecision {
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

export interface EditorialBlockDecision {
  type: 'hot_deals' | 'lowest_prices' | 'best_sellers' | 'trending' | 'deal_of_day' | 'coupon_picks'
  priority: number
  reason: string
}
