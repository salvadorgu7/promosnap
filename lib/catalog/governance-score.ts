// ============================================
// CATALOG GOVERNANCE SCORE — holistic health 0-100
// ============================================

import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GovernanceScoreBreakdown {
  imageHealth: number;
  brandHealth: number;
  categoryHealth: number;
  matchHealth: number;
  trustHealth: number;
  attributeHealth: number;
  deliveryHealth: number;
}

export interface GovernanceScore {
  overall: number;
  breakdown: GovernanceScoreBreakdown;
  totalProducts: number;
  generatedAt: Date;
}

export interface GovernanceBreakdownDetail {
  dimension: string;
  label: string;
  score: number;
  total: number;
  passing: number;
  description: string;
}

export interface GovernanceTrend {
  current: GovernanceScore;
  previous: {
    totalProducts: number;
    withImage: number;
    withBrand: number;
    withCategory: number;
    withMatch: number;
  } | null;
  delta: number;
}

// ─── Main Score ─────────────────────────────────────────────────────────────

/**
 * Returns overall catalog health score 0-100 with per-dimension breakdown.
 */
export async function getCatalogGovernanceScore(): Promise<GovernanceScore> {
  try {
    const totalProducts = await prisma.product.count({
      where: { status: "ACTIVE" },
    });

    if (totalProducts === 0) {
      return {
        overall: 0,
        breakdown: {
          imageHealth: 0,
          brandHealth: 0,
          categoryHealth: 0,
          matchHealth: 0,
          trustHealth: 0,
          attributeHealth: 0,
          deliveryHealth: 0,
        },
        totalProducts: 0,
        generatedAt: new Date(),
      };
    }

    const [
      withImage,
      withBrand,
      withCategory,
      strongMatchCount,
      totalListings,
      highTrustCount,
      withSpecsCount,
      offersWithShipping,
      totalOffers,
    ] = await Promise.all([
      // imageHealth: % products with valid image
      prisma.product.count({
        where: {
          status: "ACTIVE",
          imageUrl: { not: null },
          NOT: { imageUrl: "" },
        },
      }),
      // brandHealth: % products with brand
      prisma.product.count({
        where: { status: "ACTIVE", brandId: { not: null } },
      }),
      // categoryHealth: % products with category
      prisma.product.count({
        where: { status: "ACTIVE", categoryId: { not: null } },
      }),
      // matchHealth: listings with strong canonical match (confidence >= 0.6)
      prisma.listing.count({
        where: {
          status: "ACTIVE",
          productId: { not: null },
          matchConfidence: { gte: 0.6 },
        },
      }),
      prisma.listing.count({
        where: {
          status: "ACTIVE",
          productId: { not: null },
        },
      }),
      // trustHealth: products with popularity >= 60 (proxy for trust score)
      prisma.product.count({
        where: {
          status: "ACTIVE",
          popularityScore: { gte: 60 },
        },
      }),
      // attributeHealth: products with specsJson not null
      prisma.product.count({
        where: {
          status: "ACTIVE",
          specsJson: { not: Prisma.DbNull },
        },
      }),
      // deliveryHealth: offers with shipping info
      prisma.offer.count({
        where: {
          isActive: true,
          OR: [
            { isFreeShipping: true },
            { shippingPrice: { not: null } },
          ],
        },
      }),
      prisma.offer.count({
        where: { isActive: true },
      }),
    ]);

    const imageHealth = Math.round((withImage / totalProducts) * 100);
    const brandHealth = Math.round((withBrand / totalProducts) * 100);
    const categoryHealth = Math.round((withCategory / totalProducts) * 100);
    const matchHealth =
      totalListings > 0
        ? Math.round((strongMatchCount / totalListings) * 100)
        : 0;
    const trustHealth = Math.round((highTrustCount / totalProducts) * 100);
    const attributeHealth = Math.round((withSpecsCount / totalProducts) * 100);
    const deliveryHealth =
      totalOffers > 0
        ? Math.round((offersWithShipping / totalOffers) * 100)
        : 0;

    const breakdown: GovernanceScoreBreakdown = {
      imageHealth,
      brandHealth,
      categoryHealth,
      matchHealth,
      trustHealth,
      attributeHealth,
      deliveryHealth,
    };

    // Weighted average for overall score
    const weights = {
      imageHealth: 20,
      brandHealth: 15,
      categoryHealth: 15,
      matchHealth: 15,
      trustHealth: 10,
      attributeHealth: 10,
      deliveryHealth: 15,
    };

    const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
    const weightedSum =
      imageHealth * weights.imageHealth +
      brandHealth * weights.brandHealth +
      categoryHealth * weights.categoryHealth +
      matchHealth * weights.matchHealth +
      trustHealth * weights.trustHealth +
      attributeHealth * weights.attributeHealth +
      deliveryHealth * weights.deliveryHealth;

    const overall = Math.round(weightedSum / totalWeight);

    return {
      overall,
      breakdown,
      totalProducts,
      generatedAt: new Date(),
    };
  } catch (e) {
    console.error("[governance-score] getCatalogGovernanceScore error:", e);
    return {
      overall: 0,
      breakdown: {
        imageHealth: 0,
        brandHealth: 0,
        categoryHealth: 0,
        matchHealth: 0,
        trustHealth: 0,
        attributeHealth: 0,
        deliveryHealth: 0,
      },
      totalProducts: 0,
      generatedAt: new Date(),
    };
  }
}

// ─── Detailed Breakdown ─────────────────────────────────────────────────────

/**
 * Returns detailed stats per governance dimension.
 */
export async function getGovernanceBreakdown(): Promise<
  GovernanceBreakdownDetail[]
> {
  try {
    const totalProducts = await prisma.product.count({
      where: { status: "ACTIVE" },
    });

    if (totalProducts === 0) return [];

    const [
      withImage,
      withBrand,
      withCategory,
      strongMatch,
      totalListingsMatched,
      highTrust,
      withSpecs,
      offersShipping,
      totalOffers,
    ] = await Promise.all([
      prisma.product.count({
        where: {
          status: "ACTIVE",
          imageUrl: { not: null },
          NOT: { imageUrl: "" },
        },
      }),
      prisma.product.count({
        where: { status: "ACTIVE", brandId: { not: null } },
      }),
      prisma.product.count({
        where: { status: "ACTIVE", categoryId: { not: null } },
      }),
      prisma.listing.count({
        where: {
          status: "ACTIVE",
          productId: { not: null },
          matchConfidence: { gte: 0.6 },
        },
      }),
      prisma.listing.count({
        where: { status: "ACTIVE", productId: { not: null } },
      }),
      prisma.product.count({
        where: { status: "ACTIVE", popularityScore: { gte: 60 } },
      }),
      prisma.product.count({
        where: { status: "ACTIVE", specsJson: { not: Prisma.DbNull } },
      }),
      prisma.offer.count({
        where: {
          isActive: true,
          OR: [{ isFreeShipping: true }, { shippingPrice: { not: null } }],
        },
      }),
      prisma.offer.count({ where: { isActive: true } }),
    ]);

    return [
      {
        dimension: "imageHealth",
        label: "Imagens",
        score: Math.round((withImage / totalProducts) * 100),
        total: totalProducts,
        passing: withImage,
        description: "Produtos com imagem principal valida",
      },
      {
        dimension: "brandHealth",
        label: "Marcas",
        score: Math.round((withBrand / totalProducts) * 100),
        total: totalProducts,
        passing: withBrand,
        description: "Produtos com marca normalizada",
      },
      {
        dimension: "categoryHealth",
        label: "Categorias",
        score: Math.round((withCategory / totalProducts) * 100),
        total: totalProducts,
        passing: withCategory,
        description: "Produtos com categoria atribuida",
      },
      {
        dimension: "matchHealth",
        label: "Match Canonico",
        score:
          totalListingsMatched > 0
            ? Math.round((strongMatch / totalListingsMatched) * 100)
            : 0,
        total: totalListingsMatched,
        passing: strongMatch,
        description: "Listings com match forte (>= 60%)",
      },
      {
        dimension: "trustHealth",
        label: "Confianca",
        score: Math.round((highTrust / totalProducts) * 100),
        total: totalProducts,
        passing: highTrust,
        description: "Produtos com score de confianca >= 60",
      },
      {
        dimension: "attributeHealth",
        label: "Atributos",
        score: Math.round((withSpecs / totalProducts) * 100),
        total: totalProducts,
        passing: withSpecs,
        description: "Produtos com especificacoes (specsJson)",
      },
      {
        dimension: "deliveryHealth",
        label: "Entrega",
        score:
          totalOffers > 0
            ? Math.round((offersShipping / totalOffers) * 100)
            : 0,
        total: totalOffers,
        passing: offersShipping,
        description: "Ofertas com informacao de frete",
      },
    ];
  } catch (e) {
    console.error("[governance-score] getGovernanceBreakdown error:", e);
    return [];
  }
}

// ─── Trend Comparison ───────────────────────────────────────────────────────

/**
 * Compare current governance counts vs 7 days ago using product timestamps.
 */
export async function getGovernanceTrend(): Promise<GovernanceTrend> {
  const current = await getCatalogGovernanceScore();

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Count products that existed 7 days ago (created before cutoff)
    const [prevTotal, prevImage, prevBrand, prevCategory, prevMatch] =
      await Promise.all([
        prisma.product.count({
          where: { status: "ACTIVE", createdAt: { lt: sevenDaysAgo } },
        }),
        prisma.product.count({
          where: {
            status: "ACTIVE",
            createdAt: { lt: sevenDaysAgo },
            imageUrl: { not: null },
            NOT: { imageUrl: "" },
          },
        }),
        prisma.product.count({
          where: {
            status: "ACTIVE",
            createdAt: { lt: sevenDaysAgo },
            brandId: { not: null },
          },
        }),
        prisma.product.count({
          where: {
            status: "ACTIVE",
            createdAt: { lt: sevenDaysAgo },
            categoryId: { not: null },
          },
        }),
        prisma.listing.count({
          where: {
            status: "ACTIVE",
            productId: { not: null },
            matchConfidence: { gte: 0.6 },
            createdAt: { lt: sevenDaysAgo },
          },
        }),
      ]);

    // Calculate previous overall (simplified)
    let prevOverall = 0;
    if (prevTotal > 0) {
      prevOverall = Math.round(
        ((prevImage / prevTotal) * 20 +
          (prevBrand / prevTotal) * 15 +
          (prevCategory / prevTotal) * 15 +
          50) / // estimate for other dimensions
          100 *
          100
      );
    }

    return {
      current,
      previous: {
        totalProducts: prevTotal,
        withImage: prevImage,
        withBrand: prevBrand,
        withCategory: prevCategory,
        withMatch: prevMatch,
      },
      delta: current.overall - prevOverall,
    };
  } catch (e) {
    console.error("[governance-score] getGovernanceTrend error:", e);
    return {
      current,
      previous: null,
      delta: 0,
    };
  }
}
