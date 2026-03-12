// ============================================
// COMMERCE AUTOMATION — Types
// ============================================

export interface CommerceDecision {
  entityId: string;
  entityType: "product" | "category" | "brand" | "campaign";
  score: number;
  reasons: string[];
  metadata?: Record<string, unknown>;
}

export interface HomeBlock {
  id: string;
  type:
    | "hero_banner"
    | "deal_of_day"
    | "trending_category"
    | "top_offers"
    | "coupon_wall"
    | "editorial"
    | "best_sellers"
    | "price_drops";
  title: string;
  subtitle?: string;
  position: number;
  score: number;
  payload: Record<string, unknown>;
}

export interface CampaignPriority {
  campaignId: string;
  title: string;
  score: number;
  reasons: string[];
  recommendedPlacement: "hero" | "rail" | "newsletter" | "sidebar";
}

export interface OfertaDoDia {
  productId: string;
  productName: string;
  offerId: string;
  currentPrice: number;
  originalPrice?: number;
  discount: number;
  offerScore: number;
  sourceSlug: string;
  affiliateUrl?: string;
  imageUrl?: string;
  reasons: string[];
}

export interface TrendingCategoryResult {
  categoryId: string;
  categoryName: string;
  slug: string;
  score: number;
  reasons: string[];
}

// ============================================
// Decision Value (V15)
// ============================================

export interface DecisionBreakdown {
  /** 0-30: how competitive the price is vs category average */
  priceCompetitiveness: number;
  /** 0-25: quality of reviews (rating + volume) */
  reviewQuality: number;
  /** 0-20: source reliability + offer score */
  trustScore: number;
  /** 0-15: shipping cost/speed advantage */
  shippingQuality: number;
  /** 0-10: CPC/commission revenue potential */
  revenueOpportunity: number;
}

export interface DecisionValue {
  productId: string;
  productName: string;
  /** Composite score 0-100 */
  score: number;
  breakdown: DecisionBreakdown;
}
