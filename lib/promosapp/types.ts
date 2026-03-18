// ============================================================================
// PromosApp Integration — Type Definitions
// ============================================================================

/**
 * Raw event captured from PromosApp (groups, channels, monitors).
 * This is the unprocessed input — may contain noise, duplicates, incomplete data.
 */
export interface PromosAppRawEvent {
  /** When the promo was captured by PromosApp */
  capturedAt?: string | Date
  /** Source channel/group (e.g., "telegram-promos-tech", "whatsapp-ofertas") */
  sourceChannel?: string
  /** Raw message text as captured */
  rawText?: string
  /** Raw title extracted by PromosApp (may be noisy) */
  rawTitle?: string
  /** Raw URL(s) found in the message */
  rawUrl?: string
  /** Affiliate URL already converted by PromosApp */
  affiliateUrlConverted?: string
  /** PromosApp's guess of the marketplace */
  marketplaceGuess?: string
  /** SHA256 hash of normalized text — for idempotent dedup */
  messageHash?: string
  /** Full raw payload from PromosApp (preserved for debugging) */
  rawPayload?: Record<string, unknown>
  /** Type of promotion: "deal", "coupon", "flash_sale", "price_drop", "unknown" */
  promoType?: string
  /** Raw price string from message (e.g., "R$ 1.299,00") */
  rawPrice?: string
  /** Raw original price string (e.g., "De R$ 2.499,00") */
  rawOriginalPrice?: string
  /** Coupon code found in message */
  rawCoupon?: string
}

/**
 * Normalized item after parsing and URL canonicalization.
 * Ready for enrichment and scoring.
 */
export interface PromosAppNormalizedItem {
  /** Unique external ID extracted from marketplace URL (MLB123, B0ASIN, etc.) */
  externalId: string
  /** Cleaned title */
  title: string
  /** Current price in BRL (0 if unknown) */
  currentPrice: number
  /** Original price in BRL (before discount) */
  originalPrice?: number
  /** Clean product URL (canonical, no tracking params) */
  productUrl: string
  /** Affiliate URL (from PromosApp or built by us) */
  affiliateUrl?: string
  /** Product image URL */
  imageUrl?: string
  /** Detected marketplace slug (mercadolivre, amazon-br, shopee, etc.) */
  sourceSlug: string
  /** Marketplace display name */
  marketplace: string
  /** Canonical URL for dedup */
  canonicalUrl: string
  /** Deduplication key: "{marketplace}:{externalId}" or URL hash */
  dedupeKey: string
  /** Coupon code if found */
  couponCode?: string
  /** Discount percentage (0-100) */
  discount: number
  /** Free shipping detected */
  isFreeShipping: boolean
  /** Seller name if available */
  sellerName?: string
  /** Rating from adapter enrichment (0-5) */
  rating?: number
  /** Review count from adapter enrichment */
  reviewsCount?: number
  /** Estimated sales count from adapter enrichment */
  salesCount?: number
  /** Original raw event (preserved for traceability) */
  rawEvent: PromosAppRawEvent
  /** Errors during parsing/canonicalization */
  parseErrors: string[]
}

/**
 * Score breakdown for transparency and debugging.
 */
export interface PromosAppScoreFactors {
  /** Link resolved and valid */
  linkValid: number
  /** Matched existing product in catalog */
  catalogMatch: number
  /** Price confirmed via adapter lookup */
  priceConfirmed: number
  /** Real discount (price < originalPrice) */
  realDiscount: number
  /** Seller has good rating */
  sellerTrusted: number
  /** High sales volume */
  volumeSold: number
  /** Seen in multiple sources/channels */
  multiSourceRepetition: number
  /** No spam signals detected */
  noSpamSignals: number
  /** Image present */
  hasImage: number
  /** Coupon confirmed valid */
  couponConfirmed: number
  /** Product in stock */
  available: number
  /** Price sanity check — penalty for absurd prices (parse errors) */
  priceSanity: number
}

/** Score result with total and breakdown */
export interface PromosAppScore {
  total: number
  factors: PromosAppScoreFactors
  tier: 'high' | 'medium' | 'low'
}

/** Decision on what to do with a scored item */
export type PromosAppDecision = 'auto_approve' | 'pending_review' | 'rejected'

/** Single item result from pipeline processing */
export interface PromosAppItemResult {
  dedupeKey: string
  title: string
  sourceSlug: string
  currentPrice: number
  score: PromosAppScore
  decision: PromosAppDecision
  /** CatalogCandidate ID if persisted */
  candidateId?: string
  /** Product ID if auto-imported */
  importedProductId?: string
  errors: string[]
}

/** Aggregate result from processing a batch */
export interface PromosAppPipelineResult {
  received: number
  parsed: number
  duplicatesSkipped: number
  enriched: number
  scored: number
  autoApproved: number
  pendingReview: number
  rejected: number
  imported: number
  failed: number
  errors: string[]
  items: PromosAppItemResult[]
  durationMs: number
}

/** Configuration for pipeline behavior */
export interface PromosAppPipelineConfig {
  /** Score threshold for auto-approval (default: 70) */
  autoApproveThreshold: number
  /** Score threshold below which items are rejected (default: 40) */
  rejectThreshold: number
  /** Max items per batch (default: 200) */
  maxBatchSize: number
  /** Whether to actually import auto-approved items (requires FF_PROMOSAPP_AUTO_PUBLISH) */
  autoPublish: boolean
  /** Whether to attempt adapter enrichment (may be slow) */
  enrichViaAdapters: boolean
  /** Timeout for URL expansion in ms (default: 5000) */
  urlExpansionTimeout: number
}

export const DEFAULT_PIPELINE_CONFIG: PromosAppPipelineConfig = {
  autoApproveThreshold: 70,
  rejectThreshold: 40,
  maxBatchSize: 200,
  autoPublish: false,
  enrichViaAdapters: true,
  urlExpansionTimeout: 5000,
}
