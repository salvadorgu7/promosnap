import prisma from "@/lib/db/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type OpportunityType =
  | "empty-category"
  | "sparse-brand"
  | "unmatched-search"
  | "trending-without-products";

export type OpportunityPriority = "high" | "medium" | "low";

export interface CatalogOpportunity {
  type: OpportunityType;
  title: string;
  description: string;
  priority: OpportunityPriority;
  metric: number;
  metricLabel: string;
}

export interface CatalogOpportunities {
  emptyCategories: CatalogOpportunity[];
  sparseBrands: CatalogOpportunity[];
  unmatchedSearches: CatalogOpportunity[];
  trendingWithoutProducts: CatalogOpportunity[];
  totalOpportunities: number;
}

// ─── Priority helper ─────────────────────────────────────────────────────────

function priorityFromCount(count: number, highThreshold: number, medThreshold: number): OpportunityPriority {
  if (count >= highThreshold) return "high";
  if (count >= medThreshold) return "medium";
  return "low";
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Analyze catalog gaps and return structured opportunities with priority.
 * Uses real data from Category, Brand, Product, SearchLog, TrendingKeyword.
 */
export async function getCatalogOpportunities(): Promise<CatalogOpportunities> {
  const [
    emptyCategories,
    sparseBrands,
    unmatchedSearches,
    trendingWithoutProducts,
  ] = await Promise.all([
    getEmptyCategories(),
    getSparseBrands(),
    getUnmatchedSearches(),
    getTrendingWithoutProducts(),
  ]);

  return {
    emptyCategories,
    sparseBrands,
    unmatchedSearches,
    trendingWithoutProducts,
    totalOpportunities:
      emptyCategories.length +
      sparseBrands.length +
      unmatchedSearches.length +
      trendingWithoutProducts.length,
  };
}

// ─── Categories with < 5 products ────────────────────────────────────────────

async function getEmptyCategories(): Promise<CatalogOpportunity[]> {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return categories
      .filter((c) => c._count.products < 5)
      .map((c) => ({
        type: "empty-category" as OpportunityType,
        title: c.name,
        description: c._count.products === 0
          ? `Categoria "${c.name}" sem produtos — oportunidade de expansao`
          : `Categoria "${c.name}" com apenas ${c._count.products} produtos — abaixo do minimo de 5`,
        priority: c._count.products === 0 ? "high" as OpportunityPriority : "medium" as OpportunityPriority,
        metric: c._count.products,
        metricLabel: "produtos",
      }));
  } catch {
    return [];
  }
}

// ─── Brands with < 3 products ────────────────────────────────────────────────

async function getSparseBrands(): Promise<CatalogOpportunity[]> {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    return brands
      .filter((b) => b._count.products < 3)
      .map((b) => ({
        type: "sparse-brand" as OpportunityType,
        title: b.name,
        description: b._count.products === 0
          ? `Marca "${b.name}" sem produtos cadastrados`
          : `Marca "${b.name}" com apenas ${b._count.products} produtos — pode crescer`,
        priority: b._count.products === 0 ? "high" as OpportunityPriority : "low" as OpportunityPriority,
        metric: b._count.products,
        metricLabel: "produtos",
      }));
  } catch {
    return [];
  }
}

// ─── Top searches without matching products ──────────────────────────────────

async function getUnmatchedSearches(): Promise<CatalogOpportunity[]> {
  try {
    // Get top search queries from last 30 days that had 0 results
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        COALESCE("normalizedQuery", "query") AS search_query,
        COUNT(*)::int AS search_count,
        MIN("resultsCount") AS min_results
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY COALESCE("normalizedQuery", "query")
      HAVING MIN("resultsCount") = 0 OR MIN("resultsCount") IS NULL
      ORDER BY search_count DESC
      LIMIT 20
    `;

    return rows.map((r) => ({
      type: "unmatched-search" as OpportunityType,
      title: r.search_query,
      description: `"${r.search_query}" buscado ${r.search_count}x sem resultados — demanda nao atendida`,
      priority: priorityFromCount(r.search_count, 10, 3),
      metric: r.search_count,
      metricLabel: "buscas",
    }));
  } catch {
    return [];
  }
}

// ─── Trending keywords without associated products ───────────────────────────

async function getTrendingWithoutProducts(): Promise<CatalogOpportunity[]> {
  try {
    // Get recent trending keywords
    const keywords = await prisma.trendingKeyword.findMany({
      orderBy: { fetchedAt: "desc" },
      take: 50,
    });

    if (keywords.length === 0) return [];

    // Deduplicate by keyword
    const uniqueKeywords = Array.from(
      new Map(keywords.map((k) => [k.keyword.toLowerCase(), k])).values(),
    );

    const opportunities: CatalogOpportunity[] = [];

    for (const kw of uniqueKeywords.slice(0, 20)) {
      // Check if any product name contains this keyword
      const matchCount = await prisma.product.count({
        where: {
          name: { contains: kw.keyword, mode: "insensitive" },
          status: "ACTIVE",
        },
      });

      if (matchCount < 3) {
        opportunities.push({
          type: "trending-without-products",
          title: kw.keyword,
          description: matchCount === 0
            ? `Keyword em alta "${kw.keyword}" sem produtos no catalogo`
            : `Keyword em alta "${kw.keyword}" com apenas ${matchCount} produtos`,
          priority: matchCount === 0 ? "high" : "medium",
          metric: matchCount,
          metricLabel: "produtos",
        });
      }
    }

    return opportunities;
  } catch {
    return [];
  }
}
