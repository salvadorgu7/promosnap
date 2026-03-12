import prisma from "@/lib/db/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type GapType =
  | "low-coverage-category"
  | "sparse-brand"
  | "single-source"
  | "needs-comparison";

export type GapPriority = "critical" | "high" | "medium" | "low";

export interface CatalogGap {
  type: GapType;
  title: string;
  description: string;
  priority: GapPriority;
  metric: number;
  metricLabel: string;
  actionSuggestion: string;
}

export interface CatalogGapReport {
  lowCoverageCategories: CatalogGap[];
  sparseBrands: CatalogGap[];
  singleSourceProducts: CatalogGap[];
  needsComparisonProducts: CatalogGap[];
  totalGaps: number;
}

// ─── Priority scoring ─────────────────────────────────────────────────────────

/**
 * Calculate a priority score (0-100) for a gap based on demand signal and coverage.
 */
export function getGapPriority(gap: CatalogGap): number {
  const basePriority: Record<GapPriority, number> = {
    critical: 90,
    high: 70,
    medium: 45,
    low: 20,
  };
  return basePriority[gap.priority] + Math.min(10, gap.metric);
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Analyze catalog gaps to identify sourcing priorities.
 */
export async function getCatalogGaps(): Promise<CatalogGapReport> {
  const [
    lowCoverageCategories,
    sparseBrands,
    singleSourceProducts,
    needsComparisonProducts,
  ] = await Promise.all([
    getLowCoverageCategories(),
    getSparseBrands(),
    getSingleSourceProducts(),
    getNeedsComparisonProducts(),
  ]);

  return {
    lowCoverageCategories,
    sparseBrands,
    singleSourceProducts,
    needsComparisonProducts,
    totalGaps:
      lowCoverageCategories.length +
      sparseBrands.length +
      singleSourceProducts.length +
      needsComparisonProducts.length,
  };
}

// ─── Categories with demand but low coverage ────────────────────────────────

async function getLowCoverageCategories(): Promise<CatalogGap[]> {
  try {
    // Find categories that have search demand but few products
    const rows: {
      categoryName: string;
      categorySlug: string;
      productCount: number;
      searchCount: number;
    }[] = await prisma.$queryRaw`
      SELECT
        c.name AS "categoryName",
        c.slug AS "categorySlug",
        COUNT(DISTINCT p.id)::int AS "productCount",
        COALESCE(sl.search_count, 0)::int AS "searchCount"
      FROM categories c
      LEFT JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
      LEFT JOIN (
        SELECT
          COALESCE("normalizedQuery", "query") AS q,
          COUNT(*)::int AS search_count
        FROM search_logs
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY COALESCE("normalizedQuery", "query")
      ) sl ON LOWER(c.name) ILIKE '%' || sl.q || '%'
      GROUP BY c.id, c.name, c.slug, sl.search_count
      HAVING COUNT(DISTINCT p.id) < 5
      ORDER BY COALESCE(sl.search_count, 0) DESC, COUNT(DISTINCT p.id) ASC
      LIMIT 15
    `;

    return rows.map((r) => ({
      type: "low-coverage-category" as GapType,
      title: r.categoryName,
      description:
        r.productCount === 0
          ? `Categoria "${r.categoryName}" sem produtos${r.searchCount > 0 ? ` (${r.searchCount} buscas recentes)` : ""}`
          : `Categoria "${r.categoryName}" com apenas ${r.productCount} produtos${r.searchCount > 0 ? ` e ${r.searchCount} buscas` : ""}`,
      priority:
        r.productCount === 0 && r.searchCount > 5
          ? ("critical" as GapPriority)
          : r.productCount === 0
            ? ("high" as GapPriority)
            : r.searchCount > 3
              ? ("medium" as GapPriority)
              : ("low" as GapPriority),
      metric: r.searchCount,
      metricLabel: "buscas",
      actionSuggestion: `Importar produtos para a categoria "${r.categoryName}"`,
    }));
  } catch {
    return [];
  }
}

// ─── Strong brands with few products ──────────────────────────────────────────

async function getSparseBrands(): Promise<CatalogGap[]> {
  try {
    const brands = await prisma.brand.findMany({
      include: {
        _count: { select: { products: true } },
      },
      orderBy: { name: "asc" },
    });

    // Also check if any of these brands appear in search logs
    const brandSearches = await prisma.$queryRaw<{ brand: string; count: number }[]>`
      SELECT
        COALESCE("normalizedQuery", "query") AS brand,
        COUNT(*)::int AS count
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
      GROUP BY COALESCE("normalizedQuery", "query")
      HAVING COUNT(*) >= 2
      ORDER BY count DESC
      LIMIT 100
    `.catch(() => [] as { brand: string; count: number }[]);

    const searchMap = new Map(brandSearches.map((s) => [s.brand.toLowerCase(), s.count]));

    return brands
      .filter((b) => b._count.products < 3)
      .map((b) => {
        const searchCount = searchMap.get(b.name.toLowerCase()) ?? 0;
        return {
          type: "sparse-brand" as GapType,
          title: b.name,
          description:
            b._count.products === 0
              ? `Marca "${b.name}" sem produtos${searchCount > 0 ? ` (${searchCount} buscas)` : ""}`
              : `Marca "${b.name}" com apenas ${b._count.products} produtos`,
          priority:
            searchCount > 5
              ? ("high" as GapPriority)
              : b._count.products === 0
                ? ("medium" as GapPriority)
                : ("low" as GapPriority),
          metric: b._count.products,
          metricLabel: "produtos",
          actionSuggestion: `Expandir catalogo da marca "${b.name}"`,
        };
      })
      .sort((a, b) => {
        const order: Record<GapPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      })
      .slice(0, 15);
  } catch {
    return [];
  }
}

// ─── Products with only one source (single-source risk) ──────────────────────

async function getSingleSourceProducts(): Promise<CatalogGap[]> {
  try {
    const rows: {
      productName: string;
      productSlug: string;
      sourceName: string;
      offerCount: number;
    }[] = await prisma.$queryRaw`
      SELECT
        p.name AS "productName",
        p.slug AS "productSlug",
        s.name AS "sourceName",
        COUNT(o.id)::int AS "offerCount"
      FROM products p
      JOIN listings l ON l."productId" = p.id AND l.status = 'ACTIVE'
      JOIN sources s ON l."sourceId" = s.id
      LEFT JOIN offers o ON o."listingId" = l.id AND o."isActive" = true
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name, p.slug, s.name
      HAVING COUNT(DISTINCT s.id) = 1
      ORDER BY COUNT(o.id) DESC
      LIMIT 20
    `;

    return rows.map((r) => ({
      type: "single-source" as GapType,
      title: r.productName,
      description: `"${r.productName}" disponivel apenas em ${r.sourceName} — risco de fonte unica`,
      priority: r.offerCount > 0 ? ("medium" as GapPriority) : ("low" as GapPriority),
      metric: 1,
      metricLabel: "fonte",
      actionSuggestion: `Buscar "${r.productName}" em outras fontes alem de ${r.sourceName}`,
    }));
  } catch {
    return [];
  }
}

// ─── Products that need more listings for real comparison ────────────────────

async function getNeedsComparisonProducts(): Promise<CatalogGap[]> {
  try {
    const rows: {
      productName: string;
      productSlug: string;
      listingCount: number;
      clickouts: number;
    }[] = await prisma.$queryRaw`
      SELECT
        p.name AS "productName",
        p.slug AS "productSlug",
        COUNT(DISTINCT l.id)::int AS "listingCount",
        COALESCE(co.clicks, 0)::int AS clickouts
      FROM products p
      JOIN listings l ON l."productId" = p.id AND l.status = 'ACTIVE'
      LEFT JOIN (
        SELECT o."listingId", COUNT(c.id)::int AS clicks
        FROM clickouts c
        JOIN offers o ON c."offerId" = o.id
        WHERE c."clickedAt" > NOW() - INTERVAL '30 days'
        GROUP BY o."listingId"
      ) co ON co."listingId" = l.id
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name, p.slug, co.clicks
      HAVING COUNT(DISTINCT l.id) = 1
      ORDER BY COALESCE(co.clicks, 0) DESC
      LIMIT 15
    `;

    return rows
      .filter((r) => r.clickouts > 0)
      .map((r) => ({
        type: "needs-comparison" as GapType,
        title: r.productName,
        description: `"${r.productName}" tem demanda (${r.clickouts} cliques) mas apenas ${r.listingCount} listing — precisa de mais fontes para comparacao`,
        priority: r.clickouts > 10 ? ("high" as GapPriority) : ("medium" as GapPriority),
        metric: r.clickouts,
        metricLabel: "cliques",
        actionSuggestion: `Importar mais listings para "${r.productName}"`,
      }));
  } catch {
    return [];
  }
}
