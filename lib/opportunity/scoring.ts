import prisma from "@/lib/db/prisma";
import type { OpportunityType } from "./types";

// ============================================
// Opportunity Scoring — Real Prisma Signals
// ============================================

/**
 * Calculate impact score (0-100) based on opportunity type and real data.
 */
export function calculateImpact(
  type: OpportunityType,
  data: ScoringData
): number {
  switch (type) {
    case "catalog-weak":
      // Products with few offers = high impact to fix (more coverage = more revenue)
      return clamp(80 - (data.offerCount ?? 0) * 15);

    case "high-potential-product":
      // High clickouts + high search freq = very high impact
      return clamp(
        Math.round(
          ((data.clickoutCount ?? 0) / Math.max(data.avgClickouts ?? 1, 1)) * 50 +
          ((data.searchFrequency ?? 0) / Math.max(data.avgSearches ?? 1, 1)) * 30 +
          (data.favoriteCount ?? 0) * 5
        )
      );

    case "category-gap":
      // Categories with search demand but few products
      return clamp(
        Math.round(
          ((data.searchFrequency ?? 0) / Math.max(data.avgSearches ?? 1, 1)) * 60 +
          Math.max(0, 40 - (data.productCount ?? 0) * 4)
        )
      );

    case "low-monetization-page":
      // Pages with views but few clickouts — high potential
      return clamp(
        Math.round(
          ((data.searchFrequency ?? 0) / Math.max(data.avgSearches ?? 1, 1)) * 40 +
          Math.max(0, 60 - (data.clickoutCount ?? 0) * 5)
        )
      );

    case "low-trust-relevant":
      // Low trust scores on products people are buying
      return clamp(
        Math.round(
          (1 - (data.trustScore ?? 0.5)) * 60 +
          ((data.clickoutCount ?? 0) / Math.max(data.avgClickouts ?? 1, 1)) * 40
        )
      );

    case "highlight-candidate":
      // Great products not yet featured
      return clamp(
        Math.round(
          ((data.clickoutCount ?? 0) / Math.max(data.avgClickouts ?? 1, 1)) * 40 +
          (data.trustScore ?? 0.5) * 30 +
          (data.priceDropPercent ?? 0) * 0.3
        )
      );

    case "content-missing":
      // Products/categories without editorial content
      return clamp(
        Math.round(
          ((data.clickoutCount ?? 0) / Math.max(data.avgClickouts ?? 1, 1)) * 50 +
          ((data.searchFrequency ?? 0) / Math.max(data.avgSearches ?? 1, 1)) * 30 +
          20
        )
      );

    case "distribution-recommended":
      return clamp(
        Math.round(
          ((data.clickoutCount ?? 0) / Math.max(data.avgClickouts ?? 1, 1)) * 50 +
          (data.priceDropPercent ?? 0) * 0.5
        )
      );

    case "campaign-recommended":
      return clamp(
        Math.round(
          (data.priceDropPercent ?? 0) * 0.6 +
          ((data.searchFrequency ?? 0) / Math.max(data.avgSearches ?? 1, 1)) * 40
        )
      );

    case "needs-review":
      return clamp(60 + (data.clickoutCount ?? 0) * 2);

    default:
      return 50;
  }
}

/**
 * Calculate effort score (0-100). Lower = easier.
 */
export function calculateEffort(type: OpportunityType): number {
  const effortMap: Record<OpportunityType, number> = {
    "catalog-weak": 40,
    "high-potential-product": 20,
    "category-gap": 70,
    "low-monetization-page": 30,
    "low-trust-relevant": 50,
    "highlight-candidate": 15,
    "content-missing": 55,
    "distribution-recommended": 25,
    "campaign-recommended": 35,
    "needs-review": 20,
  };
  return effortMap[type] ?? 50;
}

/**
 * Calculate confidence score (0-100) based on data quality.
 */
export function calculateConfidence(
  type: OpportunityType,
  data: ScoringData
): number {
  let base = 50;

  // More clickout data = higher confidence
  if ((data.clickoutCount ?? 0) > 10) base += 15;
  else if ((data.clickoutCount ?? 0) > 3) base += 8;

  // More offer data = higher confidence
  if ((data.offerCount ?? 0) > 3) base += 10;
  else if ((data.offerCount ?? 0) > 0) base += 5;

  // Search signal boosts confidence
  if ((data.searchFrequency ?? 0) > 5) base += 10;

  // Trust data available
  if (data.trustScore !== undefined) base += 10;

  // Type-specific confidence adjustments
  if (type === "high-potential-product" && (data.clickoutCount ?? 0) > 5) base += 10;
  if (type === "catalog-weak" && (data.offerCount ?? 0) === 0) base += 15;
  if (type === "needs-review") base += 10; // always confident about review needs

  return clamp(base);
}

// ============================================
// Scoring Data Fetchers
// ============================================

export interface ScoringData {
  clickoutCount?: number;
  avgClickouts?: number;
  offerCount?: number;
  sourceDiversity?: number;
  trustScore?: number;
  priceDropPercent?: number;
  searchFrequency?: number;
  avgSearches?: number;
  favoriteCount?: number;
  productCount?: number;
}

/** Fetch global averages for normalizing scores */
export async function fetchGlobalAverages(): Promise<{
  avgClickouts: number;
  avgSearches: number;
}> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [clickoutAgg, searchAgg] = await Promise.all([
    prisma.clickout.count({
      where: { clickedAt: { gte: thirtyDaysAgo } },
    }),
    prisma.searchLog.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    }),
  ]);

  const productCount = await prisma.product.count({
    where: { status: "ACTIVE" },
  });

  return {
    avgClickouts: productCount > 0 ? clickoutAgg / productCount : 1,
    avgSearches: productCount > 0 ? searchAgg / productCount : 1,
  };
}

/** Fetch clickout counts per product in the last 30 days */
export async function fetchProductClickouts(
  limit = 100
): Promise<Map<string, number>> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  );

  const results = await prisma.clickout.groupBy({
    by: ["offerId"],
    _count: { id: true },
    where: { clickedAt: { gte: thirtyDaysAgo } },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  // Map offerId -> count. We'll resolve to productId later.
  const map = new Map<string, number>();
  for (const r of results) {
    map.set(r.offerId, r._count.id);
  }
  return map;
}

/** Fetch search frequency by normalized query */
export async function fetchSearchFrequency(
  limit = 50
): Promise<{ query: string; count: number }[]> {
  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  );

  const results = await prisma.searchLog.groupBy({
    by: ["normalizedQuery"],
    _count: { id: true },
    where: {
      createdAt: { gte: thirtyDaysAgo },
      normalizedQuery: { not: null },
    },
    orderBy: { _count: { id: "desc" } },
    take: limit,
  });

  return results
    .filter((r) => r.normalizedQuery !== null)
    .map((r) => ({
      query: r.normalizedQuery as string,
      count: r._count.id,
    }));
}

// ============================================
// Helpers
// ============================================

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}
