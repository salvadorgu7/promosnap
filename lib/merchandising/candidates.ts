// ============================================
// MERCHANDISING CANDIDATES — ranked candidates per slot
// ============================================

import prisma from "@/lib/db/prisma";
import { calculateDecisionValue } from "@/lib/commerce/decision-value";

// ─── Types ──────────────────────────────────────────────────────────────────

export type MerchandisingSlotType =
  | "hero"
  | "carousel"
  | "banner"
  | "deal-of-day"
  | "promo-strip";

export interface MerchandisingCandidate {
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    categorySlug: string | null;
  };
  offer: {
    id: string;
    currentPrice: number;
    originalPrice: number | null;
    discount: number;
    offerScore: number;
    isFreeShipping: boolean;
    sourceSlug: string;
    affiliateUrl: string | null;
  };
  score: number;
  reasons: string[];
}

export interface CandidateSummary {
  hero: number;
  carousel: number;
  banner: number;
  "deal-of-day": number;
  "promo-strip": number;
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function fetchCandidatePool(minScore: number, limit: number) {
  return prisma.offer.findMany({
    where: {
      isActive: true,
      offerScore: { gte: minScore },
      listing: {
        status: "ACTIVE",
        product: { status: "ACTIVE", hidden: false },
      },
    },
    orderBy: { offerScore: "desc" },
    take: limit,
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
}

function computeDiscount(current: number, original: number | null): number {
  if (!original || original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}

function buildReasons(
  discount: number,
  offerScore: number,
  isFreeShipping: boolean,
  dvScore: number,
  clickouts30d: number
): string[] {
  const reasons: string[] = [];
  if (discount >= 30) reasons.push("Alto desconto");
  else if (discount >= 15) reasons.push("Bom desconto");
  if (offerScore >= 80) reasons.push("Trust elevado");
  else if (offerScore >= 60) reasons.push("Trust bom");
  if (isFreeShipping) reasons.push("Entrega rapida");
  if (dvScore >= 75) reasons.push("Decision value alto");
  if (clickouts30d >= 5) reasons.push("Community heat");
  return reasons;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get ranked merchandising candidates for a specific slot.
 */
export async function getMerchandisingCandidates(
  slot: MerchandisingSlotType,
  limit = 10
): Promise<MerchandisingCandidate[]> {
  try {
    const minScore = slot === "hero" ? 60 : slot === "deal-of-day" ? 50 : 30;
    const poolSize = limit * 4;
    const pool = await fetchCandidatePool(minScore, poolSize);

    // Get clickout data for ranking
    const productIds = pool
      .map((o) => o.listing.product?.id)
      .filter((id): id is string => !!id);

    let clickoutMap = new Map<string, number>();
    if (productIds.length > 0) {
      try {
        const clickRows: { product_id: string; co: number }[] = await prisma.$queryRaw`
          SELECT "productId" AS product_id, COUNT(*)::int AS co
          FROM clickouts
          WHERE "clickedAt" > NOW() - INTERVAL '30 days'
            AND "productId" = ANY(${productIds}::text[])
          GROUP BY "productId"
        `;
        clickoutMap = new Map(clickRows.map((r) => [r.product_id, r.co]));
      } catch {
        // clickouts table may not have productId column in all setups
      }
    }

    const candidates: MerchandisingCandidate[] = [];
    const seenProducts = new Set<string>();

    for (const offer of pool) {
      const product = offer.listing.product;
      if (!product || seenProducts.has(product.id)) continue;

      // Slot-specific filters
      const discount = computeDiscount(offer.currentPrice, offer.originalPrice);

      if (slot === "hero" && !product.imageUrl) continue;
      if (slot === "banner" && !product.imageUrl) continue;
      if (slot === "deal-of-day" && discount < 15) continue;
      if (slot === "promo-strip" && discount < 10) continue;

      seenProducts.add(product.id);

      const dv = calculateDecisionValue({
        productId: product.id,
        productName: product.name,
        currentPrice: offer.currentPrice,
        categoryAvgPrice: null,
        rating: offer.listing.rating,
        reviewsCount: offer.listing.reviewsCount,
        offerScore: offer.offerScore,
        sourceReliability: null,
        isFreeShipping: offer.isFreeShipping,
        shippingPrice: offer.shippingPrice,
        commissionRate: null,
        activeOfferCount: 1,
      });

      const clickouts30d = clickoutMap.get(product.id) ?? 0;

      // Compute slot-specific composite score
      let compositeScore: number;
      switch (slot) {
        case "hero":
          compositeScore = dv.score * 0.3 + offer.offerScore * 0.25 + discount * 0.25 + Math.min(clickouts30d, 20) * 1;
          break;
        case "carousel":
          compositeScore = dv.score * 0.4 + offer.offerScore * 0.3 + discount * 0.2 + Math.min(clickouts30d, 10) * 1;
          break;
        case "deal-of-day":
          compositeScore = discount * 0.4 + offer.offerScore * 0.3 + dv.score * 0.2 + Math.min(clickouts30d, 10) * 1;
          break;
        case "banner":
          compositeScore = discount * 0.35 + offer.offerScore * 0.25 + dv.score * 0.25 + (product.imageUrl ? 15 : 0);
          break;
        case "promo-strip":
          compositeScore = discount * 0.5 + offer.offerScore * 0.3 + dv.score * 0.2;
          break;
        default:
          compositeScore = dv.score;
      }

      const reasons = buildReasons(
        discount,
        offer.offerScore,
        offer.isFreeShipping,
        dv.score,
        clickouts30d
      );

      candidates.push({
        product: {
          id: product.id,
          name: product.name,
          slug: product.slug,
          imageUrl: product.imageUrl,
          categorySlug: product.category?.slug ?? null,
        },
        offer: {
          id: offer.id,
          currentPrice: offer.currentPrice,
          originalPrice: offer.originalPrice,
          discount,
          offerScore: offer.offerScore,
          isFreeShipping: offer.isFreeShipping,
          sourceSlug: offer.listing.source.slug,
          affiliateUrl: offer.affiliateUrl,
        },
        score: Math.round(compositeScore * 10) / 10,
        reasons,
      });
    }

    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/**
 * Get a summary of how many candidates are available per slot.
 */
export async function getCandidateSummary(): Promise<CandidateSummary> {
  const [hero, carousel, banner, dealOfDay, promoStrip] = await Promise.all([
    getMerchandisingCandidates("hero", 20).then((c) => c.length),
    getMerchandisingCandidates("carousel", 20).then((c) => c.length),
    getMerchandisingCandidates("banner", 20).then((c) => c.length),
    getMerchandisingCandidates("deal-of-day", 20).then((c) => c.length),
    getMerchandisingCandidates("promo-strip", 20).then((c) => c.length),
  ]);

  return {
    hero,
    carousel,
    banner,
    "deal-of-day": dealOfDay,
    "promo-strip": promoStrip,
  };
}
