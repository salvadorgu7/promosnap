import type { ShippingSignal, ShippingScore } from "./types";

/**
 * Calculate a shipping score (0-100) from shipping signals.
 * Higher score = better shipping experience.
 * Integrates into cost-benefit analysis.
 */
export function calculateShippingScore(signals: ShippingSignal): ShippingScore {
  let freeShippingBonus = 0;
  let fastDeliveryBonus = 0;
  let fulfillmentBonus = 0;

  // Free shipping is worth up to 50 points
  if (signals.freeShipping) {
    freeShippingBonus = 50;
  } else if (signals.shippingPrice !== null) {
    // Partial credit for low shipping costs
    if (signals.shippingPrice <= 10) freeShippingBonus = 30;
    else if (signals.shippingPrice <= 20) freeShippingBonus = 15;
    else if (signals.shippingPrice <= 30) freeShippingBonus = 5;
  }
  // If shipping price is unknown, no bonus (honest approach)

  // Fast delivery is worth up to 30 points
  if (signals.fastDelivery) {
    fastDeliveryBonus = 30;
  }

  // Fulfillment type is worth up to 20 points
  if (signals.fulfillmentType === "full") {
    fulfillmentBonus = 20;
  } else if (signals.fulfillmentType === "seller") {
    fulfillmentBonus = 5; // Still gets some credit for known status
  }
  // "unknown" gets 0

  // Apply confidence discount
  const confidenceMultiplier =
    signals.confidence === "confirmed" ? 1.0
    : signals.confidence === "likely" ? 0.8
    : 0.5;

  const rawScore = freeShippingBonus + fastDeliveryBonus + fulfillmentBonus;
  const score = Math.round(rawScore * confidenceMultiplier);

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      freeShippingBonus: Math.round(freeShippingBonus * confidenceMultiplier),
      fastDeliveryBonus: Math.round(fastDeliveryBonus * confidenceMultiplier),
      fulfillmentBonus: Math.round(fulfillmentBonus * confidenceMultiplier),
    },
  };
}
