/**
 * Clickout Attribution Views
 *
 * Analytics functions for clickout attribution by rail, category,
 * product, query, and conversion analysis.
 */

import prisma from "@/lib/db/prisma";

// ── Types ──

interface ClickoutByRail {
  railSource: string;
  count: number;
  percentage: number;
}

interface ClickoutByCategory {
  categorySlug: string;
  count: number;
  percentage: number;
}

interface ClickoutByProduct {
  productId: string;
  productName: string;
  productSlug: string;
  clickouts: number;
}

interface ClickoutByQuery {
  query: string;
  clickouts: number;
}

interface ConversionRate {
  totalSearches: number;
  searchesWithClickout: number;
  conversionRate: number;
  period: number;
}

interface UnderperformingProduct {
  productId: string;
  productName: string;
  productSlug: string;
  searchAppearances: number;
  clickouts: number;
  conversionRate: number;
}

interface RevenueOpportunity {
  offerId: string;
  productName: string;
  currentPrice: number;
  originalPrice: number;
  discountPct: number;
  affiliateUrl: string;
  clickouts: number;
}

// ── Helper ──

function daysAgoDate(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ── Clickouts by Rail ──

/**
 * Clickouts grouped by railSource (e.g., hot_offers, best_sellers, search).
 */
export async function getClickoutsByRail(
  days: number = 7
): Promise<ClickoutByRail[]> {
  try {
    const since = daysAgoDate(days);

    const results = await prisma.clickout.groupBy({
      by: ["railSource"],
      where: { clickedAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const total = results.reduce((sum, r) => sum + r._count.id, 0);

    return results.map((r) => ({
      railSource: r.railSource ?? "unknown",
      count: r._count.id,
      percentage: total > 0 ? Math.round((r._count.id / total) * 10000) / 100 : 0,
    }));
  } catch (error) {
    console.error("[analytics/attribution] getClickoutsByRail error:", error);
    return [];
  }
}

// ── Clickouts by Category ──

/**
 * Clickouts grouped by categorySlug.
 */
export async function getClickoutsByCategory(
  days: number = 7
): Promise<ClickoutByCategory[]> {
  try {
    const since = daysAgoDate(days);

    const results = await prisma.clickout.groupBy({
      by: ["categorySlug"],
      where: { clickedAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const total = results.reduce((sum, r) => sum + r._count.id, 0);

    return results.map((r) => ({
      categorySlug: r.categorySlug ?? "uncategorized",
      count: r._count.id,
      percentage: total > 0 ? Math.round((r._count.id / total) * 10000) / 100 : 0,
    }));
  } catch (error) {
    console.error(
      "[analytics/attribution] getClickoutsByCategory error:",
      error
    );
    return [];
  }
}

// ── Clickouts by Product ──

/**
 * Top products by clickout count.
 */
export async function getClickoutsByProduct(
  days: number = 7,
  limit: number = 20
): Promise<ClickoutByProduct[]> {
  try {
    const since = daysAgoDate(days);

    const clickouts = await prisma.clickout.findMany({
      where: { clickedAt: { gte: since } },
      select: {
        offer: {
          select: {
            listing: {
              select: {
                productId: true,
                product: {
                  select: { name: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    // Aggregate by product
    const productMap = new Map<
      string,
      { name: string; slug: string; count: number }
    >();

    for (const c of clickouts) {
      const productId = c.offer?.listing?.productId;
      const product = c.offer?.listing?.product;
      if (!productId || !product) continue;

      const existing = productMap.get(productId);
      if (existing) {
        existing.count++;
      } else {
        productMap.set(productId, {
          name: product.name,
          slug: product.slug,
          count: 1,
        });
      }
    }

    return Array.from(productMap.entries())
      .map(([productId, data]) => ({
        productId,
        productName: data.name,
        productSlug: data.slug,
        clickouts: data.count,
      }))
      .sort((a, b) => b.clickouts - a.clickouts)
      .slice(0, limit);
  } catch (error) {
    console.error(
      "[analytics/attribution] getClickoutsByProduct error:",
      error
    );
    return [];
  }
}

// ── Clickouts by Query ──

/**
 * Top search queries that led to clickouts.
 */
export async function getClickoutsByQuery(
  days: number = 7,
  limit: number = 20
): Promise<ClickoutByQuery[]> {
  try {
    const since = daysAgoDate(days);

    const results = await prisma.clickout.groupBy({
      by: ["query"],
      where: {
        clickedAt: { gte: since },
        query: { not: null },
      },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: limit,
    });

    return results.map((r) => ({
      query: r.query ?? "",
      clickouts: r._count.id,
    }));
  } catch (error) {
    console.error("[analytics/attribution] getClickoutsByQuery error:", error);
    return [];
  }
}

// ── Conversion Rate ──

/**
 * Searches that led to clickouts / total searches.
 */
export async function getClickoutConversionRate(
  days: number = 7
): Promise<ConversionRate> {
  try {
    const since = daysAgoDate(days);

    const [totalSearches, searchesWithClickout] = await Promise.all([
      prisma.searchLog.count({
        where: { createdAt: { gte: since } },
      }),
      prisma.clickout.groupBy({
        by: ["query"],
        where: {
          clickedAt: { gte: since },
          query: { not: null },
        },
      }),
    ]);

    const uniqueClickoutQueries = searchesWithClickout.length;
    const rate =
      totalSearches > 0
        ? Math.round((uniqueClickoutQueries / totalSearches) * 10000) / 10000
        : 0;

    return {
      totalSearches,
      searchesWithClickout: uniqueClickoutQueries,
      conversionRate: rate,
      period: days,
    };
  } catch (error) {
    console.error(
      "[analytics/attribution] getClickoutConversionRate error:",
      error
    );
    return {
      totalSearches: 0,
      searchesWithClickout: 0,
      conversionRate: 0,
      period: days,
    };
  }
}

// ── Underperforming Products ──

/**
 * Products that appear in search results but have low clickout rates.
 */
export async function getUnderperformingProducts(
  days: number = 7,
  limit: number = 20
): Promise<UnderperformingProduct[]> {
  try {
    const since = daysAgoDate(days);

    // Products that appeared in search results (via clickedProductId)
    const searchAppearances = await prisma.searchLog.groupBy({
      by: ["clickedProductId"],
      where: {
        createdAt: { gte: since },
        clickedProductId: { not: null },
      },
      _count: { id: true },
    });

    if (searchAppearances.length === 0) return [];

    const productIds = searchAppearances
      .filter((s) => s.clickedProductId != null)
      .map((s) => s.clickedProductId!);

    // Get clickout counts per product
    const clickouts = await prisma.clickout.findMany({
      where: {
        clickedAt: { gte: since },
        offer: {
          listing: {
            productId: { in: productIds },
          },
        },
      },
      select: {
        offer: {
          select: {
            listing: { select: { productId: true } },
          },
        },
      },
    });

    const clickoutCounts = new Map<string, number>();
    for (const c of clickouts) {
      const pid = c.offer?.listing?.productId;
      if (pid) {
        clickoutCounts.set(pid, (clickoutCounts.get(pid) ?? 0) + 1);
      }
    }

    // Get product details
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, slug: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    const searchMap = new Map(
      searchAppearances
        .filter((s) => s.clickedProductId != null)
        .map((s) => [s.clickedProductId!, s._count.id])
    );

    const results: UnderperformingProduct[] = [];
    for (const [productId, appearances] of searchMap) {
      const product = productMap.get(productId);
      if (!product) continue;

      const clicks = clickoutCounts.get(productId) ?? 0;
      const conversionRate =
        appearances > 0
          ? Math.round((clicks / appearances) * 10000) / 10000
          : 0;

      if (conversionRate < 0.05 && appearances >= 3) {
        results.push({
          productId,
          productName: product.name,
          productSlug: product.slug,
          searchAppearances: appearances,
          clickouts: clicks,
          conversionRate,
        });
      }
    }

    return results
      .sort((a, b) => b.searchAppearances - a.searchAppearances)
      .slice(0, limit);
  } catch (error) {
    console.error(
      "[analytics/attribution] getUnderperformingProducts error:",
      error
    );
    return [];
  }
}

// ── Revenue Opportunities ──

/**
 * High-discount products with affiliate URLs but few clickouts.
 * These represent missed monetization.
 */
export async function getRevenueOpportunities(
  limit: number = 20
): Promise<RevenueOpportunity[]> {
  try {
    const sevenDaysAgo = daysAgoDate(7);

    // Get active offers with good discounts and affiliate URLs
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        affiliateUrl: { not: null },
        originalPrice: { not: null, gt: 0 },
        currentPrice: { gt: 0 },
      },
      select: {
        id: true,
        currentPrice: true,
        originalPrice: true,
        affiliateUrl: true,
        listing: {
          select: {
            product: { select: { name: true } },
          },
        },
        _count: {
          select: {
            clickouts: {
              where: { clickedAt: { gte: sevenDaysAgo } },
            },
          },
        },
      },
      take: 200,
      orderBy: { offerScore: "desc" },
    });

    const opportunities: RevenueOpportunity[] = [];

    for (const offer of offers) {
      if (!offer.originalPrice || !offer.affiliateUrl) continue;

      const discountPct =
        ((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100;

      if (discountPct < 15) continue; // Only significant discounts
      if (offer._count.clickouts > 5) continue; // Already getting clicks

      opportunities.push({
        offerId: offer.id,
        productName: offer.listing?.product?.name ?? "Unknown",
        currentPrice: offer.currentPrice,
        originalPrice: offer.originalPrice,
        discountPct: Math.round(discountPct * 10) / 10,
        affiliateUrl: offer.affiliateUrl,
        clickouts: offer._count.clickouts,
      });
    }

    return opportunities
      .sort((a, b) => b.discountPct - a.discountPct)
      .slice(0, limit);
  } catch (error) {
    console.error(
      "[analytics/attribution] getRevenueOpportunities error:",
      error
    );
    return [];
  }
}
