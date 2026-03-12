import type { ShippingSignal, FulfillmentType, ShippingConfidence } from "./types";

// ─── Source Reputation ───────────────────────────────────────────────────────

/** Sources known for fast delivery */
const FAST_DELIVERY_SOURCES = new Set([
  "amazon",
  "mercadolivre", // ML Full items
  "magazineluiza",
  "kabum",
]);

/** Sources with fulfillment programs */
const FULFILLMENT_SOURCES: Record<string, string> = {
  amazon: "FBA",
  mercadolivre: "ML Full",
};

// ─── Offer Shape (minimal interface to avoid tight coupling) ─────────────────

interface OfferInput {
  isFreeShipping: boolean;
  shippingPrice?: number | null;
  currentPrice: number;
  sourceSlug: string;
  /** Optional: raw metadata from listing that might contain shipping info */
  metadata?: Record<string, unknown> | null;
}

// ─── Main API ────────────────────────────────────────────────────────────────

/**
 * Analyze an offer for shipping signals.
 * Returns honest signals — if data is not available, says "unknown".
 * Does NOT call external APIs.
 */
export function getShippingSignals(offer: OfferInput): ShippingSignal {
  const notes: string[] = [];

  // Free shipping detection
  const freeShipping = detectFreeShipping(offer, notes);

  // Fast delivery detection
  const fastDelivery = detectFastDelivery(offer, notes);

  // Fulfillment type detection
  const fulfillmentType = detectFulfillmentType(offer, notes);

  // Shipping price
  const shippingPrice = offer.shippingPrice ?? null;
  if (shippingPrice !== null && shippingPrice > 0) {
    notes.push(`Frete: R$ ${shippingPrice.toFixed(2)}`);
  }

  // Confidence
  const confidence = determineConfidence(offer, freeShipping, fastDelivery);

  return {
    freeShipping,
    fastDelivery,
    fulfillmentType,
    shippingPrice,
    confidence,
    notes,
  };
}

// ─── Detection Logic ─────────────────────────────────────────────────────────

function detectFreeShipping(offer: OfferInput, notes: string[]): boolean {
  // Explicit flag from offer
  if (offer.isFreeShipping) {
    notes.push("Frete gratis confirmado pela oferta");
    return true;
  }

  // Shipping price explicitly zero
  if (offer.shippingPrice === 0) {
    notes.push("Frete gratis (preco de envio = 0)");
    return true;
  }

  // Check metadata for free shipping indicators
  if (offer.metadata) {
    const meta = offer.metadata;
    if (meta.free_shipping === true || meta.freeShipping === true) {
      notes.push("Frete gratis indicado nos metadados");
      return true;
    }
    if (typeof meta.shipping === "string" && meta.shipping.toLowerCase().includes("grat")) {
      notes.push("Frete gratis detectado no campo shipping");
      return true;
    }
  }

  // Heuristic: ML and Amazon often offer free shipping on items over R$ 79
  if (
    (offer.sourceSlug === "mercadolivre" || offer.sourceSlug === "amazon") &&
    offer.currentPrice >= 79
  ) {
    // Don't confirm — just note the possibility
    notes.push("Frete gratis provavel (acima de R$ 79 nesta loja)");
    // Don't return true — we're not sure
  }

  return false;
}

function detectFastDelivery(offer: OfferInput, notes: string[]): boolean {
  // Check metadata
  if (offer.metadata) {
    const meta = offer.metadata;

    // Look for delivery estimate in metadata
    if (typeof meta.deliveryDays === "number" && meta.deliveryDays <= 3) {
      notes.push(`Entrega rapida: ${meta.deliveryDays} dias uteis`);
      return true;
    }

    // ML Full or Prime indicator
    if (meta.fulfillment === "full" || meta.fulfillment === "FBA" || meta.isPrime === true) {
      notes.push("Entrega rapida via programa de fulfillment");
      return true;
    }
  }

  // Source reputation for fast delivery
  if (FAST_DELIVERY_SOURCES.has(offer.sourceSlug)) {
    // Only if we have some positive signal, not just source reputation alone
    // Being honest: source alone is not enough to confirm fast delivery
    return false;
  }

  return false;
}

function detectFulfillmentType(
  offer: OfferInput,
  notes: string[],
): FulfillmentType {
  // Check metadata for explicit fulfillment info
  if (offer.metadata) {
    const meta = offer.metadata;
    const fulfillment = meta.fulfillment || meta.fulfillmentType;

    if (fulfillment === "full" || fulfillment === "FBA" || fulfillment === "marketplace") {
      const label = FULFILLMENT_SOURCES[offer.sourceSlug] || "Fulfillment";
      notes.push(`Envio ${label} (estoque do marketplace)`);
      return "full";
    }

    if (fulfillment === "seller" || fulfillment === "merchant") {
      notes.push("Envio pelo vendedor");
      return "seller";
    }
  }

  // We don't guess — if we don't know, we say so
  return "unknown";
}

function determineConfidence(
  offer: OfferInput,
  freeShipping: boolean,
  fastDelivery: boolean,
): ShippingConfidence {
  // Confirmed if we have explicit data
  if (offer.isFreeShipping || offer.shippingPrice !== undefined) {
    return "confirmed";
  }

  // Likely if metadata had some info
  if (offer.metadata && Object.keys(offer.metadata).length > 0) {
    return "likely";
  }

  // Unknown otherwise
  return "unknown";
}
