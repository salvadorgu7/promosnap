// ============================================
// HIGHLIGHT SELECTION — best offers for display
// ============================================

import prisma from "@/lib/db/prisma";
import { calculateDecisionValue } from "./decision-value";
import type { DecisionValue } from "./types";

export type HighlightPurpose =
  | "deal_of_day"
  | "carousel"
  | "banner"
  | "distribution";

interface HighlightOffer {
  offerId: string;
  productId: string;
  productName: string;
  productSlug: string;
  currentPrice: number;
  originalPrice: number | null;
  discount: number;
  offerScore: number;
  sourceSlug: string;
  sourceName: string;
  affiliateUrl: string | null;
  imageUrl: string | null;
  isFreeShipping: boolean;
  rating: number | null;
  reviewsCount: number | null;
  decisionValue: DecisionValue;
}

/**
 * Get the best offers for highlighting, ranked by decision value.
 * Filters out low-trust, hidden, and poor-quality offers.
 */
export async function getHighlightOffers(
  limit = 10,
  _purpose?: HighlightPurpose
): Promise<HighlightOffer[]> {
  // Fetch candidate offers with all needed relations
  const candidates = await prisma.offer.findMany({
    where: {
      isActive: true,
      offerScore: { gte: 25 },
      listing: {
        status: "ACTIVE",
        product: {
          status: "ACTIVE",
          hidden: false,
        },
      },
    },
    orderBy: [{ offerScore: "desc" }],
    take: limit * 3, // Fetch extra for filtering
    include: {
      listing: {
        include: {
          product: {
            include: { category: true },
          },
          source: true,
        },
      },
    },
  });

  // Calculate decision value for each
  const scored: HighlightOffer[] = candidates
    .filter((o) => o.listing.product !== null)
    .map((o) => {
      const product = o.listing.product!;
      const source = o.listing.source;
      const originalPrice = o.originalPrice ?? null;
      const discount =
        originalPrice && originalPrice > o.currentPrice
          ? Math.round(
              ((originalPrice - o.currentPrice) / originalPrice) * 100
            )
          : 0;

      const dv = calculateDecisionValue({
        productId: product.id,
        productName: product.name,
        currentPrice: o.currentPrice,
        categoryAvgPrice: null, // Could be enriched with category avg query
        rating: o.listing.rating,
        reviewsCount: o.listing.reviewsCount,
        offerScore: o.offerScore,
        sourceReliability: null, // Could be enriched
        isFreeShipping: o.isFreeShipping,
        shippingPrice: o.shippingPrice,
        commissionRate: null,
        activeOfferCount: 1,
      });

      return {
        offerId: o.id,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        currentPrice: o.currentPrice,
        originalPrice,
        discount,
        offerScore: o.offerScore,
        sourceSlug: source.slug,
        sourceName: source.name,
        affiliateUrl: o.affiliateUrl,
        imageUrl: product.imageUrl,
        isFreeShipping: o.isFreeShipping,
        rating: o.listing.rating,
        reviewsCount: o.listing.reviewsCount,
        decisionValue: dv,
      };
    });

  // Sort by decision value score
  scored.sort((a, b) => b.decisionValue.score - a.decisionValue.score);

  // Deduplicate by product (keep best offer per product)
  const seenProducts = new Set<string>();
  const unique = scored.filter((o) => {
    if (seenProducts.has(o.productId)) return false;
    seenProducts.add(o.productId);
    return true;
  });

  return unique.slice(0, limit);
}
