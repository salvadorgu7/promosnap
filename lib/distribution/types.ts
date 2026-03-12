// ============================================
// DISTRIBUTION ENGINE — Types
// ============================================

export type DistributionChannel = "homepage" | "email" | "telegram" | "whatsapp";

export type DistributionSegment =
  | "geral"
  | "eletronicos"
  | "moda"
  | "casa"
  | "games"
  | "cupons"
  | "ofertas-quentes";

export type DistributionStatus = "pending" | "sent" | "failed" | "previewed";

export interface DistributionPost {
  id: string;
  channel: DistributionChannel;
  title: string;
  body: string;
  offerIds: string[];
  status: DistributionStatus;
  sentAt: Date | null;
  error: string | null;
}

export interface ChannelConfig {
  channel: DistributionChannel;
  configured: boolean;
  lastSent: Date | null;
  totalSent: number;
  description: string;
}

/**
 * Offer data ready for distribution formatting.
 * Combines offer, listing, product and source data.
 */
export interface DistributableOffer {
  offerId: string;
  productName: string;
  productSlug: string;
  currentPrice: number;
  originalPrice: number | null;
  discount: number;
  offerScore: number;
  sourceSlug: string;
  sourceName: string;
  affiliateUrl: string | null;
  productUrl: string;
  imageUrl: string | null;
  isFreeShipping: boolean;
  rating: number | null;
  reviewsCount: number | null;
  couponText: string | null;
}
