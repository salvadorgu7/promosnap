import prisma from "@/lib/db/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type RecommendationReason =
  | "trending-no-products"
  | "popular-search-few-results"
  | "category-gap"
  | "article-mention"
  | "single-source-popular";

export interface ImportRecommendation {
  reason: RecommendationReason;
  title: string;
  description: string;
  priority: number; // 0-100
  estimatedImpact: "high" | "medium" | "low";
  suggestedQuery: string;
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Generate smart import recommendations based on multiple signals:
 * trending keywords, popular searches, category gaps, article mentions.
 */
export async function getRecommendedImports(): Promise<ImportRecommendation[]> {
  const [
    trendingRecs,
    searchRecs,
    categoryRecs,
    articleRecs,
    singleSourceRecs,
  ] = await Promise.all([
    getTrendingWithoutProducts(),
    getPopularSearchesFewResults(),
    getCategoryGapRecs(),
    getArticleMentionRecs(),
    getSingleSourcePopularRecs(),
  ]);

  // Combine, deduplicate by suggestedQuery, and sort by priority
  const all = [
    ...trendingRecs,
    ...searchRecs,
    ...categoryRecs,
    ...articleRecs,
    ...singleSourceRecs,
  ];

  const seen = new Set<string>();
  const deduped: ImportRecommendation[] = [];

  for (const rec of all) {
    const key = rec.suggestedQuery.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(rec);
    }
  }

  deduped.sort((a, b) => b.priority - a.priority);

  return deduped.slice(0, 25);
}

// ─── Trending keywords without products ──────────────────────────────────────

async function getTrendingWithoutProducts(): Promise<ImportRecommendation[]> {
  try {
    const keywords = await prisma.trendingKeyword.findMany({
      orderBy: { fetchedAt: "desc" },
      take: 50,
    });

    const unique = Array.from(
      new Map(keywords.map((k) => [k.keyword.toLowerCase(), k])).values()
    ).slice(0, 20);

    const recs: ImportRecommendation[] = [];

    for (const kw of unique) {
      const matchCount = await prisma.product.count({
        where: {
          name: { contains: kw.keyword, mode: "insensitive" },
          status: "ACTIVE",
        },
      });

      if (matchCount === 0) {
        recs.push({
          reason: "trending-no-products",
          title: kw.keyword,
          description: `Keyword em alta "${kw.keyword}" (posicao #${kw.position}) sem nenhum produto no catalogo`,
          priority: 85 - kw.position,
          estimatedImpact: kw.position <= 5 ? "high" : "medium",
          suggestedQuery: kw.keyword,
        });
      }
    }

    return recs;
  } catch {
    return [];
  }
}

// ─── Popular searches with few results ────────────────────────────────────────

async function getPopularSearchesFewResults(): Promise<ImportRecommendation[]> {
  try {
    const rows: { query: string; count: number; minResults: number }[] =
      await prisma.$queryRaw`
        SELECT
          COALESCE("normalizedQuery", "query") AS query,
          COUNT(*)::int AS count,
          MIN("resultsCount")::int AS "minResults"
        FROM search_logs
        WHERE "createdAt" > NOW() - INTERVAL '30 days'
        GROUP BY COALESCE("normalizedQuery", "query")
        HAVING MIN("resultsCount") < 3 OR MIN("resultsCount") IS NULL
        ORDER BY count DESC
        LIMIT 15
      `;

    return rows.map((r) => ({
      reason: "popular-search-few-results" as RecommendationReason,
      title: r.query,
      description: `"${r.query}" buscado ${r.count}x com apenas ${r.minResults ?? 0} resultados`,
      priority: Math.min(90, 50 + r.count * 3),
      estimatedImpact:
        r.count >= 10 ? ("high" as const) : r.count >= 3 ? ("medium" as const) : ("low" as const),
      suggestedQuery: r.query,
    }));
  } catch {
    return [];
  }
}

// ─── Category gaps ────────────────────────────────────────────────────────────

async function getCategoryGapRecs(): Promise<ImportRecommendation[]> {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });

    return categories
      .filter((c) => c._count.products < 3)
      .map((c) => ({
        reason: "category-gap" as RecommendationReason,
        title: c.name,
        description:
          c._count.products === 0
            ? `Categoria "${c.name}" vazia — importar produtos para preencher`
            : `Categoria "${c.name}" com apenas ${c._count.products} produtos — abaixo do minimo`,
        priority: c._count.products === 0 ? 70 : 40,
        estimatedImpact: c._count.products === 0 ? ("high" as const) : ("medium" as const),
        suggestedQuery: c.name,
      }))
      .slice(0, 10);
  } catch {
    return [];
  }
}

// ─── Articles mentioning products not in catalog ──────────────────────────────

async function getArticleMentionRecs(): Promise<ImportRecommendation[]> {
  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { title: true, tags: true },
      orderBy: { publishedAt: "desc" },
      take: 20,
    });

    const recs: ImportRecommendation[] = [];

    for (const article of articles) {
      for (const tag of article.tags) {
        const matchCount = await prisma.product.count({
          where: {
            name: { contains: tag, mode: "insensitive" },
            status: "ACTIVE",
          },
        });

        if (matchCount === 0) {
          recs.push({
            reason: "article-mention",
            title: tag,
            description: `Tag "${tag}" de artigo "${article.title}" sem produtos correspondentes no catalogo`,
            priority: 55,
            estimatedImpact: "medium",
            suggestedQuery: tag,
          });
        }
      }
    }

    // Deduplicate by query
    const seen = new Set<string>();
    return recs.filter((r) => {
      const key = r.suggestedQuery.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 10);
  } catch {
    return [];
  }
}

// ─── Single-source popular products that need more sources ────────────────────

async function getSingleSourcePopularRecs(): Promise<ImportRecommendation[]> {
  try {
    const rows: { productName: string; clickouts: number }[] =
      await prisma.$queryRaw`
        SELECT
          p.name AS "productName",
          COUNT(c.id)::int AS clickouts
        FROM products p
        JOIN listings l ON l."productId" = p.id AND l.status = 'ACTIVE'
        JOIN offers o ON o."listingId" = l.id AND o."isActive" = true
        JOIN clickouts c ON c."offerId" = o.id AND c."clickedAt" > NOW() - INTERVAL '30 days'
        WHERE p.status = 'ACTIVE'
        GROUP BY p.id, p.name
        HAVING COUNT(DISTINCT l."sourceId") = 1 AND COUNT(c.id) >= 3
        ORDER BY COUNT(c.id) DESC
        LIMIT 10
      `;

    return rows.map((r) => ({
      reason: "single-source-popular" as RecommendationReason,
      title: r.productName,
      description: `"${r.productName}" popular (${r.clickouts} cliques) mas com fonte unica — importar de mais lojas`,
      priority: Math.min(80, 50 + r.clickouts * 2),
      estimatedImpact: r.clickouts >= 10 ? ("high" as const) : ("medium" as const),
      suggestedQuery: r.productName,
    }));
  } catch {
    return [];
  }
}
