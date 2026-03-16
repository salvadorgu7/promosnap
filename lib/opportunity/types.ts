// ============================================================================
// Opportunity Types — used by cockpit dashboard
// ============================================================================

export type OpportunityPriority = 'critical' | 'high' | 'medium' | 'low'
export type OpportunityType =
  | 'missing_affiliate'
  | 'stale_offer'
  | 'low_score'
  | 'no_category'
  | 'no_image'
  | 'high_demand_low_supply'
  | 'price_drop'
  | 'trending_no_product'
  | 'catalog-weak'
  | 'high-potential-product'
  | 'category-gap'
  | 'low-monetization-page'
  | 'low-trust-relevant'
  | 'highlight-candidate'
  | 'content-missing'
  | 'distribution-recommended'
  | 'campaign-recommended'
  | 'needs-review'

export interface Opportunity {
  id: string
  type: OpportunityType
  priority: OpportunityPriority
  title: string
  description: string
  impact: string
  actionUrl?: string
  adminUrl?: string
  metadata?: Record<string, unknown>
  meta?: Record<string, any>
  impactScore: number
  confidenceScore: number
  createdAt: Date
}

export interface OpportunitySummary {
  total: number
  critical: number
  high: number
  medium: number
  low: number
  byCritical: number
  averageImpact: number
  topTypes: { type: OpportunityType; count: number }[]
}
