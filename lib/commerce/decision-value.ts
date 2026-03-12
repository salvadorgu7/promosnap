// ============================================
// DECISION VALUE SCORE — composite product value
// ============================================

import type { DecisionValue, DecisionBreakdown } from "./types";

interface DecisionValueInput {
  productId: string;
  productName: string;
  /** Current lowest price for this product */
  currentPrice: number;
  /** Average price in the same category */
  categoryAvgPrice: number | null;
  /** Consolidated rating (0-5) */
  rating: number | null;
  /** Number of reviews */
  reviewsCount: number | null;
  /** Offer trust/quality score (0-100) */
  offerScore: number;
  /** Source reliability (0-100) */
  sourceReliability: number | null;
  /** Whether free shipping is available */
  isFreeShipping: boolean;
  /** Estimated shipping price (null = unknown) */
  shippingPrice: number | null;
  /** Estimated CPC or commission rate (0-1) */
  commissionRate: number | null;
  /** Number of active offers for this product */
  activeOfferCount: number;
}

/**
 * Calculates a composite "decision value" score (0-100) that combines
 * price competitiveness, review quality, trust, shipping, and revenue potential.
 */
export function calculateDecisionValue(
  input: DecisionValueInput
): DecisionValue {
  const breakdown: DecisionBreakdown = {
    priceCompetitiveness: 0,
    reviewQuality: 0,
    trustScore: 0,
    shippingQuality: 0,
    revenueOpportunity: 0,
  };

  // --- Price competitiveness (0-30) ---
  if (input.categoryAvgPrice && input.categoryAvgPrice > 0) {
    const ratio = input.currentPrice / input.categoryAvgPrice;
    if (ratio <= 0.6) {
      breakdown.priceCompetitiveness = 30;
    } else if (ratio <= 0.75) {
      breakdown.priceCompetitiveness = 25;
    } else if (ratio <= 0.9) {
      breakdown.priceCompetitiveness = 18;
    } else if (ratio <= 1.0) {
      breakdown.priceCompetitiveness = 12;
    } else if (ratio <= 1.1) {
      breakdown.priceCompetitiveness = 6;
    } else {
      breakdown.priceCompetitiveness = 0;
    }
  } else {
    // No category average — give moderate default if offer score is decent
    breakdown.priceCompetitiveness = input.offerScore >= 50 ? 12 : 5;
  }

  // --- Review quality (0-25) ---
  const rating = input.rating ?? 0;
  const reviews = input.reviewsCount ?? 0;

  if (rating >= 4.5 && reviews >= 200) {
    breakdown.reviewQuality = 25;
  } else if (rating >= 4.5 && reviews >= 50) {
    breakdown.reviewQuality = 22;
  } else if (rating >= 4.0 && reviews >= 100) {
    breakdown.reviewQuality = 20;
  } else if (rating >= 4.0 && reviews >= 20) {
    breakdown.reviewQuality = 15;
  } else if (rating >= 3.5 && reviews >= 10) {
    breakdown.reviewQuality = 10;
  } else if (rating >= 3.0) {
    breakdown.reviewQuality = 5;
  } else {
    breakdown.reviewQuality = 0;
  }

  // --- Trust score (0-20) ---
  const reliability = input.sourceReliability ?? 60;
  if (reliability >= 90) {
    breakdown.trustScore = 20;
  } else if (reliability >= 80) {
    breakdown.trustScore = 16;
  } else if (reliability >= 65) {
    breakdown.trustScore = 12;
  } else if (reliability >= 50) {
    breakdown.trustScore = 7;
  } else {
    breakdown.trustScore = 2;
  }

  // Bonus for high offer score
  if (input.offerScore >= 80) {
    breakdown.trustScore = Math.min(20, breakdown.trustScore + 3);
  }

  // --- Shipping quality (0-15) ---
  if (input.isFreeShipping) {
    breakdown.shippingQuality = 15;
  } else if (input.shippingPrice !== null) {
    if (input.shippingPrice <= 10) {
      breakdown.shippingQuality = 10;
    } else if (input.shippingPrice <= 25) {
      breakdown.shippingQuality = 6;
    } else {
      breakdown.shippingQuality = 2;
    }
  } else {
    // Unknown shipping — neutral
    breakdown.shippingQuality = 4;
  }

  // --- Revenue opportunity (0-10) ---
  const commission = input.commissionRate ?? 0.03;
  const estimatedRevenue = input.currentPrice * commission;

  if (estimatedRevenue >= 20) {
    breakdown.revenueOpportunity = 10;
  } else if (estimatedRevenue >= 10) {
    breakdown.revenueOpportunity = 8;
  } else if (estimatedRevenue >= 5) {
    breakdown.revenueOpportunity = 5;
  } else if (estimatedRevenue >= 1) {
    breakdown.revenueOpportunity = 3;
  } else {
    breakdown.revenueOpportunity = 1;
  }

  // Bonus: more offers = more comparison value
  if (input.activeOfferCount >= 3) {
    breakdown.revenueOpportunity = Math.min(
      10,
      breakdown.revenueOpportunity + 2
    );
  }

  // --- Total ---
  const total = Math.min(
    100,
    breakdown.priceCompetitiveness +
      breakdown.reviewQuality +
      breakdown.trustScore +
      breakdown.shippingQuality +
      breakdown.revenueOpportunity
  );

  return {
    productId: input.productId,
    productName: input.productName,
    score: total,
    breakdown,
  };
}
