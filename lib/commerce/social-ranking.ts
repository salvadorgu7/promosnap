// ============================================
// SOCIAL RANKING — engagement-based offer ranking
// ============================================

import prisma from "@/lib/db/prisma";
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries";
import type { ProductCard } from "@/types";

export type SocialRankingType =
  | "most_clicked"
  | "most_monitored"
  | "most_popular";

export interface SocialRankedOffer {
  product: ProductCard;
  rankingType: SocialRankingType;
  signal: number; // the raw count/score
  badge: string;
}

// ============================================
// Most clicked — by clickout count
// ============================================

async function getMostClicked(limit = 6): Promise<SocialRankedOffer[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get top offers by clickout count
    const topClickouts = await prisma.clickout.groupBy({
      by: ["offerId"],
      where: {
        clickedAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit * 2, // fetch extra in case some products are inactive
    });

    if (topClickouts.length === 0) return [];

    const offerIds = topClickouts.map((c) => c.offerId);
    const clickCounts = new Map(
      topClickouts.map((c) => [c.offerId, c._count.id])
    );

    // Fetch full product data through offers
    const offers = await prisma.offer.findMany({
      where: {
        id: { in: offerIds },
        isActive: true,
        listing: {
          status: "ACTIVE",
          product: { status: "ACTIVE", hidden: false },
        },
      },
      include: {
        listing: {
          include: {
            product: { include: PRODUCT_INCLUDE },
          },
        },
      },
    });

    const seenProducts = new Set<string>();
    const results: SocialRankedOffer[] = [];

    // Sort by click count
    const sorted = offers.sort(
      (a, b) => (clickCounts.get(b.id) || 0) - (clickCounts.get(a.id) || 0)
    );

    for (const offer of sorted) {
      const product = offer.listing.product;
      if (!product || seenProducts.has(product.id)) continue;
      seenProducts.add(product.id);

      const card = buildProductCard(product);
      if (!card) continue;

      results.push({
        product: card,
        rankingType: "most_clicked",
        signal: clickCounts.get(offer.id) || 0,
        badge: "Mais clicado",
      });

      if (results.length >= limit) break;
    }

    return results;
  } catch {
    return [];
  }
}

// ============================================
// Most monitored — by active price alert count
// ============================================

async function getMostMonitored(limit = 6): Promise<SocialRankedOffer[]> {
  try {
    const topAlerts = await prisma.priceAlert.groupBy({
      by: ["listingId"],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit * 2,
    });

    if (topAlerts.length === 0) return [];

    const listingIds = topAlerts.map((a) => a.listingId);
    const alertCounts = new Map(
      topAlerts.map((a) => [a.listingId, a._count.id])
    );

    const listings = await prisma.listing.findMany({
      where: {
        id: { in: listingIds },
        status: "ACTIVE",
        product: { status: "ACTIVE", hidden: false },
      },
      include: {
        product: { include: PRODUCT_INCLUDE },
      },
    });

    const seenProducts = new Set<string>();
    const results: SocialRankedOffer[] = [];

    const sorted = listings.sort(
      (a, b) =>
        (alertCounts.get(b.id) || 0) - (alertCounts.get(a.id) || 0)
    );

    for (const listing of sorted) {
      const product = listing.product;
      if (!product || seenProducts.has(product.id)) continue;
      seenProducts.add(product.id);

      const card = buildProductCard(product);
      if (!card) continue;

      results.push({
        product: card,
        rankingType: "most_monitored",
        signal: alertCounts.get(listing.id) || 0,
        badge: "Mais monitorado",
      });

      if (results.length >= limit) break;
    }

    return results;
  } catch {
    return [];
  }
}

// ============================================
// Most popular — by popularity score + sales
// ============================================

async function getMostPopular(limit = 6): Promise<SocialRankedOffer[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        hidden: false,
        popularityScore: { gt: 0 },
      },
      orderBy: { popularityScore: "desc" },
      take: limit,
      include: PRODUCT_INCLUDE,
    });

    const results: SocialRankedOffer[] = [];

    for (const product of products) {
      const card = buildProductCard(product);
      if (!card) continue;

      results.push({
        product: card,
        rankingType: "most_popular",
        signal: Math.round(product.popularityScore),
        badge: "Mais popular",
      });
    }

    return results;
  } catch {
    return [];
  }
}

// ============================================
// Public API — get full social ranking
// ============================================

export interface SocialRanking {
  mostClicked: SocialRankedOffer[];
  mostMonitored: SocialRankedOffer[];
  mostPopular: SocialRankedOffer[];
}

export async function getSocialRanking(
  limit = 6
): Promise<SocialRanking> {
  const [mostClicked, mostMonitored, mostPopular] = await Promise.all([
    getMostClicked(limit),
    getMostMonitored(limit),
    getMostPopular(limit),
  ]);

  return { mostClicked, mostMonitored, mostPopular };
}
