// Campaign layer types — foundation for promotional campaigns.
// No implementation yet, just type definitions.

export interface Campaign {
  id: string
  name: string
  slug: string
  startDate: Date
  endDate: Date
  isActive: boolean
  rules: CampaignRule[]
}

export interface CampaignRule {
  type: 'category' | 'brand' | 'price_range' | 'keyword'
  value: string
}

export interface CampaignMatch {
  campaignId: string
  productId: string
  matchedRule: CampaignRule
}
