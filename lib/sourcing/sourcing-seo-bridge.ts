import prisma from "@/lib/db/prisma";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SuggestionAction =
  | "feature-homepage"
  | "distribute-channels"
  | "associate-article"
  | "create-category-page";

export interface CanonicalSuggestion {
  action: SuggestionAction;
  productId: string;
  productName: string;
  productSlug: string;
  reason: string;
  priority: "high" | "medium" | "low";
  target: string; // what to associate / where to feature
}

// ─── Main function ───────────────────────────────────────────────────────────

/**
 * For recently enriched canonical products (good data, multiple sources, decent scores),
 * suggest actions to maximize their visibility across the platform.
 */
export async function getNewCanonicalSuggestions(): Promise<CanonicalSuggestion[]> {
  const [
    featureSuggestions,
    distributionSuggestions,
    articleSuggestions,
    categorySuggestions,
  ] = await Promise.all([
    getFeatureSuggestions(),
    getDistributionSuggestions(),
    getArticleAssociations(),
    getCategoryPageSuggestions(),
  ]);

  const all = [
    ...featureSuggestions,
    ...distributionSuggestions,
    ...articleSuggestions,
    ...categorySuggestions,
  ];

  // Sort by priority
  const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
  all.sort((a, b) => order[a.priority] - order[b.priority]);

  return all.slice(0, 30);
}

// ─── Feature on front-end ─────────────────────────────────────────────────────

async function getFeatureSuggestions(): Promise<CanonicalSuggestion[]> {
  try {
    // Products with multiple sources, good scores, but not featured
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        featured: false,
        hidden: false,
        listings: {
          some: {
            status: "ACTIVE",
            offers: {
              some: {
                isActive: true,
                offerScore: { gte: 60 },
              },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            listings: { where: { status: "ACTIVE" } },
          },
        },
      },
      orderBy: { popularityScore: "desc" },
      take: 15,
    });

    return products
      .filter((p) => p._count.listings >= 2)
      .map((p) => ({
        action: "feature-homepage" as SuggestionAction,
        productId: p.id,
        productName: p.name,
        productSlug: p.slug,
        reason: `${p._count.listings} fontes, score alto, nao destacado ainda`,
        priority: p._count.listings >= 3 ? ("high" as const) : ("medium" as const),
        target: "Homepage / Featured Section",
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

// ─── Distribute to channels ──────────────────────────────────────────────────

async function getDistributionSuggestions(): Promise<CanonicalSuggestion[]> {
  try {
    // Products with recent price drops or high discount
    const rows: {
      productId: string;
      productName: string;
      productSlug: string;
      discount: number;
      offerScore: number;
    }[] = await prisma.$queryRaw`
      SELECT DISTINCT ON (p.id)
        p.id AS "productId",
        p.name AS "productName",
        p.slug AS "productSlug",
        CASE
          WHEN o."originalPrice" IS NOT NULL AND o."originalPrice" > o."currentPrice"
          THEN ROUND(((o."originalPrice" - o."currentPrice") / o."originalPrice") * 100)
          ELSE 0
        END AS discount,
        o."offerScore" AS "offerScore"
      FROM products p
      JOIN listings l ON l."productId" = p.id AND l.status = 'ACTIVE'
      JOIN offers o ON o."listingId" = l.id AND o."isActive" = true AND o."offerScore" >= 50
      WHERE p.status = 'ACTIVE' AND p.hidden = false
        AND o."originalPrice" IS NOT NULL
        AND o."originalPrice" > o."currentPrice"
        AND ((o."originalPrice" - o."currentPrice") / o."originalPrice") > 0.15
      ORDER BY p.id, o."offerScore" DESC
      LIMIT 10
    `;

    return rows.map((r) => ({
      action: "distribute-channels" as SuggestionAction,
      productId: r.productId,
      productName: r.productName,
      productSlug: r.productSlug,
      reason: `Desconto de ${r.discount}%, score ${Math.round(r.offerScore)} — ideal para Telegram/WhatsApp`,
      priority: r.discount >= 30 ? ("high" as const) : ("medium" as const),
      target: "Telegram, WhatsApp, Newsletter",
    }));
  } catch {
    return [];
  }
}

// ─── Associate with article/guide ─────────────────────────────────────────────

async function getArticleAssociations(): Promise<CanonicalSuggestion[]> {
  try {
    // Products with good data but not mentioned in any article
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        hidden: false,
        listings: {
          some: { status: "ACTIVE", offers: { some: { isActive: true } } },
        },
      },
      select: { id: true, name: true, slug: true },
      orderBy: { popularityScore: "desc" },
      take: 30,
    });

    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { title: true, tags: true, slug: true, content: true },
    }).catch(() => []);

    if (articles.length === 0) return [];

    const suggestions: CanonicalSuggestion[] = [];

    for (const product of products) {
      const nameLower = product.name.toLowerCase();
      const nameWords = nameLower.split(/\s+/).filter((w) => w.length > 3);

      // Check if any article mentions this product
      const mentioned = articles.some(
        (a) =>
          a.title.toLowerCase().includes(nameLower) ||
          a.tags.some((t) => nameLower.includes(t.toLowerCase())) ||
          a.content.toLowerCase().includes(nameLower)
      );

      if (!mentioned) {
        // Find best matching article by keyword overlap
        let bestArticle: { title: string; slug: string } | null = null;
        let bestOverlap = 0;

        for (const article of articles) {
          const articleText = `${article.title} ${article.tags.join(" ")}`.toLowerCase();
          const overlap = nameWords.filter((w) => articleText.includes(w)).length;
          if (overlap > bestOverlap) {
            bestOverlap = overlap;
            bestArticle = article;
          }
        }

        if (bestArticle && bestOverlap >= 1) {
          suggestions.push({
            action: "associate-article",
            productId: product.id,
            productName: product.name,
            productSlug: product.slug,
            reason: `Produto nao mencionado em artigos — artigo relacionado: "${bestArticle.title}"`,
            priority: bestOverlap >= 2 ? ("high" as const) : ("medium" as const),
            target: `/artigo/${bestArticle.slug}`,
          });
        }
      }
    }

    return suggestions.slice(0, 8);
  } catch {
    return [];
  }
}

// ─── Create relevant category page ───────────────────────────────────────────

async function getCategoryPageSuggestions(): Promise<CanonicalSuggestion[]> {
  try {
    // Products in categories without SEO metadata
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { seoTitle: null },
          { seoTitle: "" },
          { seoDescription: null },
          { seoDescription: "" },
        ],
      },
      include: {
        _count: { select: { products: { where: { status: "ACTIVE" } } } },
      },
    });

    return categories
      .filter((c) => c._count.products >= 3)
      .map((c) => ({
        action: "create-category-page" as SuggestionAction,
        productId: c.id,
        productName: c.name,
        productSlug: c.slug,
        reason: `Categoria "${c.name}" com ${c._count.products} produtos mas sem SEO configurado`,
        priority: c._count.products >= 10 ? ("high" as const) : ("medium" as const),
        target: `/categoria/${c.slug}`,
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}
