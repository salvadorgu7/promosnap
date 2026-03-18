import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger"

// ─── Types ───────────────────────────────────────────────────────────────────

export type TrendGapType =
  | "import-opportunity"    // trending keyword with no matching products
  | "page-opportunity"      // trending keyword with products but no SEO page
  | "content-opportunity"   // trending keyword with products but no guide/article
  | "distribution-opportunity"; // trending keyword strong enough for distribution

export type TrendGapPriority = "high" | "medium" | "low";

export interface TrendCatalogGap {
  type: TrendGapType;
  keyword: string;
  priority: TrendGapPriority;
  suggestion: string;
  matchingProducts: number;
  hasArticle: boolean;
  hasSeoPage: boolean;
  trendPosition: number;
}

export interface TrendCatalogGaps {
  importOpportunities: TrendCatalogGap[];
  pageOpportunities: TrendCatalogGap[];
  contentOpportunities: TrendCatalogGap[];
  distributionOpportunities: TrendCatalogGap[];
  totalGaps: number;
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * Cross-reference TrendingKeyword with Product catalog, Article, and Category
 * to find actionable gaps across import, SEO, content, and distribution.
 */
export async function getTrendCatalogGaps(): Promise<TrendCatalogGaps> {
  const importOpportunities: TrendCatalogGap[] = [];
  const pageOpportunities: TrendCatalogGap[] = [];
  const contentOpportunities: TrendCatalogGap[] = [];
  const distributionOpportunities: TrendCatalogGap[] = [];

  try {
    // Get recent trending keywords (deduplicated)
    const keywords = await prisma.trendingKeyword.findMany({
      orderBy: { fetchedAt: "desc" },
      take: 100,
    });

    if (keywords.length === 0) {
      return { importOpportunities, pageOpportunities, contentOpportunities, distributionOpportunities, totalGaps: 0 };
    }

    // Deduplicate by keyword (keep most recent)
    const uniqueKeywords = Array.from(
      new Map(keywords.map((k) => [k.keyword.toLowerCase().trim(), k])).values(),
    ).slice(0, 30);

    // Batch-fetch all articles and categories for cross-reference
    const [allArticles, allCategories] = await Promise.all([
      prisma.article.findMany({
        select: { slug: true, title: true, tags: true },
        where: { status: "PUBLISHED" },
      }).catch(() => []),
      prisma.category.findMany({
        select: { slug: true, name: true, seoTitle: true, seoDescription: true },
      }).catch(() => []),
    ]);

    // Build lookup sets for fast matching
    const articleKeywords = new Set<string>();
    for (const article of allArticles) {
      articleKeywords.add(article.slug.toLowerCase());
      articleKeywords.add(article.title.toLowerCase());
      for (const tag of article.tags) {
        articleKeywords.add(tag.toLowerCase());
      }
    }

    const categoryKeywords = new Set<string>();
    const categoriesWithSeo = new Set<string>();
    for (const cat of allCategories) {
      categoryKeywords.add(cat.slug.toLowerCase());
      categoryKeywords.add(cat.name.toLowerCase());
      if (cat.seoTitle || cat.seoDescription) {
        categoriesWithSeo.add(cat.slug.toLowerCase());
        categoriesWithSeo.add(cat.name.toLowerCase());
      }
    }

    // Analyze each trending keyword
    for (const kw of uniqueKeywords) {
      const kwLower = kw.keyword.toLowerCase().trim();
      const kwSlug = kwLower.replace(/\s+/g, "-");

      // Count matching products
      const matchingProducts = await prisma.product.count({
        where: {
          name: { contains: kw.keyword, mode: "insensitive" },
          status: "ACTIVE",
        },
      }).catch(() => 0);

      // Check if there's an article covering this keyword
      const hasArticle = articleKeywords.has(kwLower) ||
        articleKeywords.has(kwSlug) ||
        allArticles.some((a) =>
          a.title.toLowerCase().includes(kwLower) ||
          a.tags.some((t) => t.toLowerCase().includes(kwLower)),
        );

      // Check if there's a category page with SEO
      const hasSeoPage = categoriesWithSeo.has(kwLower) ||
        categoriesWithSeo.has(kwSlug) ||
        allCategories.some((c) =>
          (c.seoTitle && c.seoTitle.toLowerCase().includes(kwLower)) ||
          c.name.toLowerCase().includes(kwLower) && (c.seoTitle || c.seoDescription),
        );

      const base: TrendCatalogGap = {
        type: "import-opportunity",
        keyword: kw.keyword,
        priority: "medium",
        suggestion: "",
        matchingProducts,
        hasArticle,
        hasSeoPage,
        trendPosition: kw.position,
      };

      // 1. Import opportunity: no matching products
      if (matchingProducts === 0) {
        importOpportunities.push({
          ...base,
          type: "import-opportunity",
          priority: "high",
          suggestion: `Importar produtos para a keyword "${kw.keyword}" — em alta sem cobertura no catalogo`,
        });
      }

      // 2. Page opportunity: has products but no SEO page
      if (matchingProducts > 0 && !hasSeoPage) {
        pageOpportunities.push({
          ...base,
          type: "page-opportunity",
          priority: matchingProducts >= 5 ? "high" : "medium",
          suggestion: `Criar pagina SEO para "${kw.keyword}" — ${matchingProducts} produtos sem pagina otimizada`,
        });
      }

      // 3. Content opportunity: has products but no article/guide
      if (matchingProducts > 0 && !hasArticle) {
        contentOpportunities.push({
          ...base,
          type: "content-opportunity",
          priority: matchingProducts >= 5 ? "high" : "medium",
          suggestion: `Criar guia/artigo para "${kw.keyword}" — ${matchingProducts} produtos sem conteudo editorial`,
        });
      }

      // 4. Distribution opportunity: has enough products and good offers
      if (matchingProducts >= 3) {
        const readyOffers = await prisma.offer.count({
          where: {
            isActive: true,
            offerScore: { gte: 50 },
            listing: {
              status: "ACTIVE",
              product: {
                name: { contains: kw.keyword, mode: "insensitive" },
                status: "ACTIVE",
              },
            },
          },
        }).catch(() => 0);

        if (readyOffers >= 1) {
          distributionOpportunities.push({
            ...base,
            type: "distribution-opportunity",
            priority: readyOffers >= 3 ? "high" : "medium",
            suggestion: `Distribuir ofertas de "${kw.keyword}" — ${readyOffers} ofertas com score alto prontas para canais`,
          });
        }
      }
    }
  } catch (err) { logger.warn("trend-links.query-failed", { error: err }) }

  // Sort each group by priority
  const sortByPriority = (a: TrendCatalogGap, b: TrendCatalogGap) => {
    const order: Record<TrendGapPriority, number> = { high: 0, medium: 1, low: 2 };
    return order[a.priority] - order[b.priority];
  };

  importOpportunities.sort(sortByPriority);
  pageOpportunities.sort(sortByPriority);
  contentOpportunities.sort(sortByPriority);
  distributionOpportunities.sort(sortByPriority);

  return {
    importOpportunities,
    pageOpportunities,
    contentOpportunities,
    distributionOpportunities,
    totalGaps:
      importOpportunities.length +
      pageOpportunities.length +
      contentOpportunities.length +
      distributionOpportunities.length,
  };
}
