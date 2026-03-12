// ============================================
// SMART COMPARISON — canonical product comparisons
// ============================================

import prisma from "@/lib/db/prisma";
import { calculateDecisionValue } from "@/lib/commerce/decision-value";
import { getShippingSignals } from "@/lib/shipping/intelligence";
import { calculateShippingScore } from "@/lib/shipping/score";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ComparisonEntry {
  offerId: string;
  listingId: string;
  sourceName: string;
  sourceSlug: string;
  price: number;
  originalPrice: number | null;
  discount: number;
  offerScore: number;
  rating: number | null;
  reviewsCount: number | null;
  isFreeShipping: boolean;
  shippingPrice: number | null;
  fastDelivery: boolean;
  shippingScoreValue: number;
  affiliateUrl: string | null;
  couponText: string | null;
  decisionScore: number;
}

export interface ComparisonResult {
  productId: string;
  productName: string;
  bestPrice: ComparisonEntry | null;
  bestTrust: ComparisonEntry | null;
  bestShipping: ComparisonEntry | null;
  bestRated: ComparisonEntry | null;
  bestValue: ComparisonEntry | null;
  matrix: ComparisonEntry[];
}

export interface BestChoiceResult {
  entry: ComparisonEntry;
  reasons: string[];
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get a canonical comparison for all listings/offers of a product.
 * Compares across price, trust, shipping, rating, and decision value.
 */
export async function getCanonicalComparison(
  productId: string
): Promise<ComparisonResult | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      category: { select: { slug: true } },
      listings: {
        where: { status: "ACTIVE" },
        include: {
          source: { select: { name: true, slug: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: "asc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!product || product.listings.length === 0) return null;

  // Build comparison entries from all active listings with offers
  const entries: ComparisonEntry[] = [];

  for (const listing of product.listings) {
    const offer = listing.offers[0];
    if (!offer) continue;

    const originalPrice = offer.originalPrice ?? null;
    const discount =
      originalPrice && originalPrice > offer.currentPrice
        ? Math.round(
            ((originalPrice - offer.currentPrice) / originalPrice) * 100
          )
        : 0;

    // Shipping intelligence
    const shippingSignals = getShippingSignals({
      isFreeShipping: offer.isFreeShipping,
      shippingPrice: offer.shippingPrice,
      currentPrice: offer.currentPrice,
      sourceSlug: listing.source.slug,
      metadata: listing.rawPayloadJson as Record<string, unknown> | null,
    });
    const shippingScore = calculateShippingScore(shippingSignals);

    // Decision value
    const dv = calculateDecisionValue({
      productId: product.id,
      productName: product.name,
      currentPrice: offer.currentPrice,
      categoryAvgPrice: null,
      rating: listing.rating,
      reviewsCount: listing.reviewsCount,
      offerScore: offer.offerScore,
      sourceReliability: null,
      isFreeShipping: offer.isFreeShipping,
      shippingPrice: offer.shippingPrice,
      commissionRate: null,
      activeOfferCount: product.listings.length,
    });

    entries.push({
      offerId: offer.id,
      listingId: listing.id,
      sourceName: listing.source.name,
      sourceSlug: listing.source.slug,
      price: offer.currentPrice,
      originalPrice,
      discount,
      offerScore: offer.offerScore,
      rating: listing.rating,
      reviewsCount: listing.reviewsCount,
      isFreeShipping: offer.isFreeShipping,
      shippingPrice: offer.shippingPrice,
      fastDelivery: shippingSignals.fastDelivery,
      shippingScoreValue: shippingScore.score,
      affiliateUrl: offer.affiliateUrl,
      couponText: offer.couponText,
      decisionScore: dv.score,
    });
  }

  if (entries.length === 0) return null;

  // Sort matrix by decision score
  entries.sort((a, b) => b.decisionScore - a.decisionScore);

  return {
    productId: product.id,
    productName: product.name,
    bestPrice: findBest(entries, (e) => -e.price),
    bestTrust: findBest(entries, (e) => e.offerScore),
    bestShipping: findBest(entries, (e) => e.shippingScoreValue),
    bestRated: findBest(
      entries.filter((e) => e.rating !== null),
      (e) => e.rating ?? 0
    ),
    bestValue: findBest(entries, (e) => e.decisionScore),
    matrix: entries,
  };
}

/**
 * Get the single best offer with reasoning.
 */
export function getBestChoice(
  entries: ComparisonEntry[]
): BestChoiceResult | null {
  if (entries.length === 0) return null;

  // The best value is the one with the highest decision score
  const sorted = [...entries].sort(
    (a, b) => b.decisionScore - a.decisionScore
  );
  const best = sorted[0];
  const reasons: string[] = [];

  // Build reasons
  const isCheapest = best.price <= Math.min(...entries.map((e) => e.price));
  const isHighestTrust =
    best.offerScore >= Math.max(...entries.map((e) => e.offerScore));
  const isBestShipping =
    best.shippingScoreValue >=
    Math.max(...entries.map((e) => e.shippingScoreValue));
  const isBestRated =
    best.rating !== null &&
    best.rating >= Math.max(...entries.filter((e) => e.rating !== null).map((e) => e.rating!));

  if (isCheapest) reasons.push("Menor preco");
  if (isHighestTrust) reasons.push("Maior confiabilidade");
  if (isBestShipping && best.isFreeShipping) reasons.push("Frete gratis");
  else if (isBestShipping && best.fastDelivery) reasons.push("Entrega rapida");
  if (isBestRated) reasons.push("Melhor avaliacao");
  if (best.discount >= 30) reasons.push(`${best.discount}% de desconto`);

  if (reasons.length === 0) {
    reasons.push("Melhor combinacao de preco, confiabilidade e frete");
  }

  return { entry: best, reasons };
}

/**
 * Get a structured comparison matrix for display.
 */
export async function getComparisonMatrix(
  productId: string
): Promise<ComparisonResult | null> {
  return getCanonicalComparison(productId);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function findBest(
  entries: ComparisonEntry[],
  scorer: (e: ComparisonEntry) => number
): ComparisonEntry | null {
  if (entries.length === 0) return null;
  return entries.reduce((best, e) =>
    scorer(e) > scorer(best) ? e : best
  );
}
