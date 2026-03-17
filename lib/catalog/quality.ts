/**
 * Catalog Quality Scores
 *
 * Scoring system for product completeness, offer health,
 * category maturity, and overall catalog quality.
 */

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

// ── Types ──

interface ProductLike {
  name?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  listings?: Array<{
    offers?: Array<{
      currentPrice?: number | null;
      originalPrice?: number | null;
      affiliateUrl?: string | null;
    }>;
  }>;
}

interface OfferLike {
  currentPrice?: number | null;
  originalPrice?: number | null;
  affiliateUrl?: string | null;
  isFreeShipping?: boolean | null;
  lastSeenAt?: Date | null;
  isActive?: boolean | null;
}

interface CategoryMaturityResult {
  categoryId: string;
  categoryName: string;
  productCount: number;
  importedRatio: number;
  brandCoverage: number;
  priceRange: { min: number; max: number } | null;
  score: number;
}

interface CatalogOverallResult {
  totalProducts: number;
  activeProducts: number;
  avgCompleteness: number;
  avgOfferHealth: number;
  categoriesWithProducts: number;
  brandsWithProducts: number;
  score: number;
}

// ── Product Completeness ──

/**
 * Score 0-100 based on key product fields being populated.
 * Weights: name(15), image(15), description(15), brand(10),
 * category(10), price(15), originalPrice(10), affiliateUrl(10)
 */
export function productCompleteness(product: ProductLike): number {
  let score = 0;

  if (product.name && product.name.trim().length > 0) score += 15;
  if (product.imageUrl && product.imageUrl.trim().length > 0) score += 15;
  if (product.description && product.description.trim().length > 0) score += 15;
  if (product.brandId) score += 10;
  if (product.categoryId) score += 10;

  // Check price from listings/offers
  const offers = product.listings?.flatMap((l) => l.offers ?? []) ?? [];
  const hasPrice = offers.some((o) => o.currentPrice && o.currentPrice > 0);
  const hasOriginalPrice = offers.some(
    (o) => o.originalPrice && o.originalPrice > 0
  );
  const hasAffiliateUrl = offers.some(
    (o) => o.affiliateUrl && o.affiliateUrl.trim().length > 0
  );

  if (hasPrice) score += 15;
  if (hasOriginalPrice) score += 10;
  if (hasAffiliateUrl) score += 10;

  return Math.min(100, score);
}

// ── Offer Health ──

/**
 * Score 0-100 based on offer quality signals.
 * Weights: price>0(20), originalPrice(15), discount>0(20),
 * affiliateUrl(15), freeShipping(10), lastSeen<7d(20)
 */
export function offerHealth(offer: OfferLike): number {
  let score = 0;

  if (offer.currentPrice && offer.currentPrice > 0) score += 20;
  if (offer.originalPrice && offer.originalPrice > 0) score += 15;

  // Discount check
  if (
    offer.currentPrice &&
    offer.originalPrice &&
    offer.originalPrice > offer.currentPrice
  ) {
    score += 20;
  }

  if (offer.affiliateUrl && offer.affiliateUrl.trim().length > 0) score += 15;
  if (offer.isFreeShipping) score += 10;

  // Freshness: last seen within 7 days
  if (offer.lastSeenAt) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (offer.lastSeenAt >= sevenDaysAgo) score += 20;
  }

  return Math.min(100, score);
}

// ── Category Maturity ──

/**
 * Maturity score for a category based on product count,
 * imported ratio, brand coverage, and price range diversity.
 */
export async function categoryMaturity(
  categoryId: string
): Promise<CategoryMaturityResult> {
  try {
    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { name: true },
    });

    const products = await prisma.product.findMany({
      where: { categoryId, status: "ACTIVE" },
      select: {
        originType: true,
        brandId: true,
        listings: {
          where: { status: "ACTIVE" },
          select: {
            offers: {
              where: { isActive: true },
              select: { currentPrice: true },
              take: 1,
            },
          },
          take: 1,
        },
      },
    });

    const productCount = products.length;
    const importedCount = products.filter(
      (p) => p.originType === "imported"
    ).length;
    const importedRatio = productCount > 0 ? importedCount / productCount : 0;

    const uniqueBrands = new Set(
      products.filter((p) => p.brandId).map((p) => p.brandId)
    );
    const brandCoverage = productCount > 0 ? uniqueBrands.size / productCount : 0;

    // Price range
    const prices = products
      .flatMap((p) => p.listings.flatMap((l) => l.offers.map((o) => o.currentPrice)))
      .filter((p): p is number => p != null && p > 0);

    const priceRange =
      prices.length > 0
        ? { min: Math.min(...prices), max: Math.max(...prices) }
        : null;

    // Score calculation
    let score = 0;
    // Product count: up to 30 points (30+ products = full score)
    score += Math.min(30, productCount);
    // Imported ratio: up to 20 points
    score += Math.round(importedRatio * 20);
    // Brand coverage: up to 25 points (variety)
    score += Math.min(25, uniqueBrands.size * 5);
    // Price range diversity: up to 25 points
    if (priceRange && priceRange.max > 0) {
      const spread = (priceRange.max - priceRange.min) / priceRange.max;
      score += Math.round(spread * 25);
    }

    return {
      categoryId,
      categoryName: category?.name ?? "Unknown",
      productCount,
      importedRatio: Math.round(importedRatio * 100) / 100,
      brandCoverage: Math.round(brandCoverage * 100) / 100,
      priceRange,
      score: Math.min(100, score),
    };
  } catch (error) {
    logger.error("catalog.quality.category-maturity.error", { error });
    return {
      categoryId,
      categoryName: "Unknown",
      productCount: 0,
      importedRatio: 0,
      brandCoverage: 0,
      priceRange: null,
      score: 0,
    };
  }
}

// ── Catalog Overall Score ──

/**
 * Aggregate quality score across all active products and offers.
 */
export async function catalogOverallScore(): Promise<CatalogOverallResult> {
  try {
    const [totalProducts, activeProducts, categoriesCount, brandsCount] =
      await Promise.all([
        prisma.product.count(),
        prisma.product.count({ where: { status: "ACTIVE" } }),
        prisma.product.groupBy({
          by: ["categoryId"],
          where: { status: "ACTIVE", categoryId: { not: null } },
        }),
        prisma.product.groupBy({
          by: ["brandId"],
          where: { status: "ACTIVE", brandId: { not: null } },
        }),
      ]);

    // Sample products for completeness scoring (limit for performance)
    const sampleProducts = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        name: true,
        imageUrl: true,
        description: true,
        brandId: true,
        categoryId: true,
        listings: {
          where: { status: "ACTIVE" },
          take: 1,
          select: {
            offers: {
              where: { isActive: true },
              take: 1,
              select: {
                currentPrice: true,
                originalPrice: true,
                affiliateUrl: true,
              },
            },
          },
        },
      },
      take: 200,
      orderBy: { popularityScore: "desc" },
    });

    const completenessScores = sampleProducts.map((p) =>
      productCompleteness(p)
    );
    const avgCompleteness =
      completenessScores.length > 0
        ? Math.round(
            completenessScores.reduce((a, b) => a + b, 0) /
              completenessScores.length
          )
        : 0;

    // Sample offers for health scoring
    const sampleOffers = await prisma.offer.findMany({
      where: { isActive: true },
      select: {
        currentPrice: true,
        originalPrice: true,
        affiliateUrl: true,
        isFreeShipping: true,
        lastSeenAt: true,
      },
      take: 200,
      orderBy: { offerScore: "desc" },
    });

    const healthScores = sampleOffers.map((o) => offerHealth(o));
    const avgOfferHealth =
      healthScores.length > 0
        ? Math.round(
            healthScores.reduce((a, b) => a + b, 0) / healthScores.length
          )
        : 0;

    // Overall score: weighted aggregate
    const activeRatio =
      totalProducts > 0 ? activeProducts / totalProducts : 0;
    const score = Math.round(
      avgCompleteness * 0.35 +
        avgOfferHealth * 0.35 +
        Math.min(100, categoriesCount.length * 5) * 0.15 +
        activeRatio * 100 * 0.15
    );

    return {
      totalProducts,
      activeProducts,
      avgCompleteness,
      avgOfferHealth,
      categoriesWithProducts: categoriesCount.length,
      brandsWithProducts: brandsCount.length,
      score: Math.min(100, score),
    };
  } catch (error) {
    logger.error("catalog.quality.overall-score.error", { error });
    return {
      totalProducts: 0,
      activeProducts: 0,
      avgCompleteness: 0,
      avgOfferHealth: 0,
      categoriesWithProducts: 0,
      brandsWithProducts: 0,
      score: 0,
    };
  }
}
