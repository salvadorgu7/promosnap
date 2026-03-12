// ─── Shipping Intelligence Types ─────────────────────────────────────────────

/** Confidence level for shipping signals */
export type ShippingConfidence = "confirmed" | "likely" | "unknown";

/** Fulfillment type */
export type FulfillmentType = "full" | "seller" | "unknown";

/** Individual shipping signal */
export interface ShippingSignal {
  /** Whether shipping is free */
  freeShipping: boolean;
  /** Whether delivery is expected to be fast (<3 business days) */
  fastDelivery: boolean;
  /** Fulfillment type: full (marketplace warehouse), seller, or unknown */
  fulfillmentType: FulfillmentType;
  /** Shipping price if known */
  shippingPrice: number | null;
  /** Confidence in the signals */
  confidence: ShippingConfidence;
  /** Human-readable notes about how signals were determined */
  notes: string[];
}

/** Shipping score for cost-benefit analysis */
export interface ShippingScore {
  /** Score from 0-100 (higher = better shipping) */
  score: number;
  /** Breakdown of scoring factors */
  breakdown: {
    freeShippingBonus: number;
    fastDeliveryBonus: number;
    fulfillmentBonus: number;
  };
}

/** Delivery estimate (when determinable) */
export interface DeliveryEstimate {
  /** Min business days */
  minDays: number;
  /** Max business days */
  maxDays: number;
  /** Confidence level */
  confidence: ShippingConfidence;
}

/** Badge types for shipping display */
export type ShippingBadgeType = "free-shipping" | "fast-delivery" | "full-fulfillment";
