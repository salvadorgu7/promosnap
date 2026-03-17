// ============================================
// CATALOG EXPANSION RECOMMENDATIONS
// Suggests next imports, categories, brands, groupings
// ============================================

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ExpansionType =
  | "next-import"
  | "strengthen-category"
  | "add-brand"
  | "create-grouping";

export interface ExpansionRecommendation {
  type: ExpansionType;
  title: string;
  reason: string;
  priority: number; // 0-100
  estimatedImpact: string;
}

// ─── Main Export ────────────────────────────────────────────────────────────

/**
 * Suggest catalog expansion actions based on real data from
 * TrendingKeyword, SearchLog, Product, Category, Brand.
 */
export async function getExpansionRecommendations(
  limit: number = 20
): Promise<ExpansionRecommendation[]> {
  const recommendations: ExpansionRecommendation[] = [];

  const [nextImports, weakCategories, missingBrands, ungroupedListings] =
    await Promise.all([
      getNextImportRecommendations(),
      getCategoryStrengthRecommendations(),
      getMissingBrandRecommendations(),
      getGroupingRecommendations(),
    ]);

  recommendations.push(
    ...nextImports,
    ...weakCategories,
    ...missingBrands,
    ...ungroupedListings
  );

  // Sort by priority descending
  recommendations.sort((a, b) => b.priority - a.priority);

  return recommendations.slice(0, limit);
}

// ─── Next Imports — based on trends + search gaps ───────────────────────────

async function getNextImportRecommendations(): Promise<
  ExpansionRecommendation[]
> {
  try {
    // Find trending keywords that don't match any existing product names
    const recentTrending = await prisma.trendingKeyword.findMany({
      orderBy: { fetchedAt: "desc" },
      take: 50,
      select: { keyword: true },
    });

    if (recentTrending.length === 0) return [];

    const uniqueKeywords = [
      ...new Set(recentTrending.map((t) => t.keyword.toLowerCase())),
    ].slice(0, 30);

    const recommendations: ExpansionRecommendation[] = [];

    // Check which trending keywords have no matching products
    for (const keyword of uniqueKeywords) {
      const matchCount = await prisma.product.count({
        where: {
          status: "ACTIVE",
          name: { contains: keyword, mode: "insensitive" },
        },
      });

      if (matchCount === 0) {
        // Check search demand for this keyword
        const searchCount = await prisma.searchLog.count({
          where: {
            normalizedQuery: { contains: keyword, mode: "insensitive" },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        });

        const priority = Math.min(
          100,
          40 + Math.min(30, searchCount * 3) + 20
        ); // trending bonus = 20

        recommendations.push({
          type: "next-import",
          title: `Importar "${keyword}"`,
          reason:
            searchCount > 0
              ? `Trending + ${searchCount} buscas recentes, sem produtos no catalogo`
              : `Keyword em alta sem representacao no catalogo`,
          priority,
          estimatedImpact: `Novo segmento de produtos — potencial de ${searchCount > 0 ? searchCount * 5 : 10}+ visualizacoes/mes`,
        });
      }

      if (recommendations.length >= 5) break;
    }

    // Also check searches with zero results
    const zeroResultSearches: { query: string; count: number }[] =
      await prisma.$queryRaw<{ query: string; count: number }[]>`
        SELECT
          COALESCE("normalizedQuery", "query") AS query,
          COUNT(*)::int AS count
        FROM search_logs
        WHERE "resultsCount" = 0
        AND "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY COALESCE("normalizedQuery", "query")
        HAVING COUNT(*) >= 2
        ORDER BY count DESC
        LIMIT 10
      `.catch(() => [] as { query: string; count: number }[]);

    for (const search of zeroResultSearches) {
      // Avoid duplicates
      if (
        recommendations.some((r) =>
          r.title.toLowerCase().includes(search.query.toLowerCase())
        )
      ) {
        continue;
      }

      recommendations.push({
        type: "next-import",
        title: `Importar "${search.query}"`,
        reason: `${search.count} buscas sem resultado nos ultimos 30 dias`,
        priority: Math.min(95, 50 + search.count * 5),
        estimatedImpact: `Atender ${search.count} buscas/mes que hoje retornam vazio`,
      });

      if (recommendations.length >= 8) break;
    }

    return recommendations;
  } catch (e) {
    logger.error("expansion-recommendations.next-imports.error", { error: e });
    return [];
  }
}

// ─── Categories to Strengthen — low coverage + high demand ──────────────────

async function getCategoryStrengthRecommendations(): Promise<
  ExpansionRecommendation[]
> {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
    });

    // Get search demand per category
    const categorySearches: { category: string; count: number }[] =
      await prisma.$queryRaw<{ category: string; count: number }[]>`
        SELECT
          COALESCE("normalizedQuery", "query") AS category,
          COUNT(*)::int AS count
        FROM search_logs
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY COALESCE("normalizedQuery", "query")
        HAVING COUNT(*) >= 2
        ORDER BY count DESC
        LIMIT 100
      `.catch(() => [] as { category: string; count: number }[]);

    const searchMap = new Map(
      categorySearches.map((s) => [s.category.toLowerCase(), s.count])
    );

    const recommendations: ExpansionRecommendation[] = [];

    for (const cat of categories) {
      if (cat._count.products >= 10) continue; // already well-covered

      // Check if category name appears in searches
      const searchDemand = searchMap.get(cat.name.toLowerCase()) ?? 0;
      const hasProducts = cat._count.products > 0;

      if (searchDemand > 0 || cat._count.products < 3) {
        const priority = Math.min(
          100,
          (searchDemand > 0 ? 30 + Math.min(30, searchDemand * 3) : 20) +
            (hasProducts ? 0 : 25) +
            (cat._count.products < 3 ? 15 : 0)
        );

        recommendations.push({
          type: "strengthen-category",
          title: `Fortalecer "${cat.name}"`,
          reason:
            cat._count.products === 0
              ? `Categoria vazia${searchDemand > 0 ? ` com ${searchDemand} buscas` : ""}`
              : `Apenas ${cat._count.products} produtos${searchDemand > 0 ? `, ${searchDemand} buscas recentes` : ""}`,
          priority,
          estimatedImpact:
            cat._count.products === 0
              ? `Ativar categoria que hoje nao gera valor`
              : `Aumentar profundidade do catalogo e melhorar SEO`,
        });
      }
    }

    // Sort and limit
    recommendations.sort((a, b) => b.priority - a.priority);
    return recommendations.slice(0, 5);
  } catch (e) {
    logger.error("expansion-recommendations.category-strength.error", { error: e });
    return [];
  }
}

// ─── Missing Brands — searched but not in catalog ───────────────────────────

async function getMissingBrandRecommendations(): Promise<
  ExpansionRecommendation[]
> {
  try {
    // Get brand names we already have
    const existingBrands = await prisma.brand.findMany({
      select: { name: true },
    });
    const brandNames = new Set(
      existingBrands.map((b) => b.name.toLowerCase())
    );

    // Find searches that look like brand names (capitalized, short)
    const recentSearches: { query: string; count: number }[] =
      await prisma.$queryRaw<{ query: string; count: number }[]>`
        SELECT
          COALESCE("normalizedQuery", "query") AS query,
          COUNT(*)::int AS count
        FROM search_logs
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        AND LENGTH(COALESCE("normalizedQuery", "query")) BETWEEN 2 AND 30
        GROUP BY COALESCE("normalizedQuery", "query")
        HAVING COUNT(*) >= 3
        ORDER BY count DESC
        LIMIT 50
      `.catch(() => [] as { query: string; count: number }[]);

    const recommendations: ExpansionRecommendation[] = [];

    for (const search of recentSearches) {
      const query = search.query.toLowerCase().trim();

      // Skip if it's already a known brand
      if (brandNames.has(query)) continue;

      // Check if this query matches any products
      const productMatches = await prisma.product.count({
        where: {
          status: "ACTIVE",
          name: { contains: query, mode: "insensitive" },
        },
      });

      // If there are no products but there are searches, this might be a brand gap
      if (productMatches === 0 && search.count >= 3) {
        // Check if it's mentioned in raw listing data
        const listingMentions = await prisma.listing.count({
          where: {
            OR: [
              { rawBrand: { contains: query, mode: "insensitive" } },
              { rawTitle: { contains: query, mode: "insensitive" } },
            ],
          },
        });

        if (listingMentions > 0 || search.count >= 5) {
          recommendations.push({
            type: "add-brand",
            title: `Adicionar marca "${search.query}"`,
            reason: `${search.count} buscas${listingMentions > 0 ? `, ${listingMentions} mencoes em listings` : ""} — marca nao cadastrada`,
            priority: Math.min(
              90,
              35 + Math.min(30, search.count * 3) + (listingMentions > 0 ? 20 : 0)
            ),
            estimatedImpact: `Capturar demanda de ${search.count}+ buscas/mes para marca`,
          });
        }
      }

      if (recommendations.length >= 5) break;
    }

    return recommendations;
  } catch (e) {
    logger.error("expansion-recommendations.missing-brands.error", { error: e });
    return [];
  }
}

// ─── Grouping Recommendations — unmatched listings ──────────────────────────

async function getGroupingRecommendations(): Promise<
  ExpansionRecommendation[]
> {
  try {
    // Find clusters of unmatched listings that could form new products
    const unmatchedCount = await prisma.listing.count({
      where: { productId: null, status: "ACTIVE" },
    });

    if (unmatchedCount === 0) return [];

    // Get samples of unmatched listings grouped by rawBrand
    const brandClusters: { brand: string; count: number }[] =
      await prisma.$queryRaw<{ brand: string; count: number }[]>`
        SELECT
          "rawBrand" AS brand,
          COUNT(*)::int AS count
        FROM listings
        WHERE "productId" IS NULL
        AND status = 'ACTIVE'
        AND "rawBrand" IS NOT NULL
        AND "rawBrand" != ''
        GROUP BY "rawBrand"
        HAVING COUNT(*) >= 2
        ORDER BY count DESC
        LIMIT 10
      `.catch(() => [] as { brand: string; count: number }[]);

    const recommendations: ExpansionRecommendation[] = [];

    for (const cluster of brandClusters) {
      recommendations.push({
        type: "create-grouping",
        title: `Agrupar listings "${cluster.brand}"`,
        reason: `${cluster.count} listings orfaos da marca ${cluster.brand} — podem formar novos produtos canonicos`,
        priority: Math.min(85, 30 + Math.min(40, cluster.count * 5)),
        estimatedImpact: `Criar ate ${Math.ceil(cluster.count / 2)} novos produtos canonicos`,
      });
    }

    // Also suggest grouping by category
    const categoryClusters: { category: string; count: number }[] =
      await prisma.$queryRaw<{ category: string; count: number }[]>`
        SELECT
          "rawCategory" AS category,
          COUNT(*)::int AS count
        FROM listings
        WHERE "productId" IS NULL
        AND status = 'ACTIVE'
        AND "rawCategory" IS NOT NULL
        AND "rawCategory" != ''
        GROUP BY "rawCategory"
        HAVING COUNT(*) >= 3
        ORDER BY count DESC
        LIMIT 5
      `.catch(() => [] as { category: string; count: number }[]);

    for (const cluster of categoryClusters) {
      // Avoid duplicates with brand clusters
      if (
        recommendations.some((r) =>
          r.title.toLowerCase().includes(cluster.category.toLowerCase())
        )
      ) {
        continue;
      }

      recommendations.push({
        type: "create-grouping",
        title: `Agrupar listings da categoria "${cluster.category}"`,
        reason: `${cluster.count} listings sem produto na categoria ${cluster.category}`,
        priority: Math.min(75, 25 + Math.min(35, cluster.count * 4)),
        estimatedImpact: `Organizar ${cluster.count} listings em produtos canonicos`,
      });
    }

    return recommendations.slice(0, 5);
  } catch (e) {
    logger.error("expansion-recommendations.grouping.error", { error: e });
    return [];
  }
}
