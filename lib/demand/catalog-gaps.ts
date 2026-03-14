/**
 * Catalog Gap Analysis — compares demand (searches) against supply (products) to find expansion opportunities.
 */
import prisma from "@/lib/db/prisma";

export interface CatalogGap {
  query: string;
  searchCount: number;
  currentProducts: number;
  gapScore: number; // higher = more opportunity
  suggestedAction: "import" | "expand_category" | "add_source" | "create_page";
  category?: string;
}

export interface CatalogHealth {
  totalProducts: number;
  activeOffers: number;
  sourceCoverage: { source: string; products: number; offers: number }[];
  categoryCoverage: { category: string; products: number; avgOffersPerProduct: number }[];
  gaps: CatalogGap[];
  healthScore: number; // 0-100
}

export async function analyzeCatalogGaps(): Promise<CatalogHealth> {
  try {
    const [productCount, offerCount] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE" } }),
      prisma.offer.count({ where: { isActive: true } }),
    ]);

    // Source coverage
    const sourceCoverage = await prisma.$queryRaw<Array<{
      source: string;
      products: bigint;
      offers: bigint;
    }>>`
      SELECT
        s.slug as source,
        COUNT(DISTINCT l."productId") as products,
        COUNT(DISTINCT o.id) as offers
      FROM "sources" s
      LEFT JOIN "listings" l ON l."sourceId" = s.id AND l.status = 'ACTIVE'
      LEFT JOIN "offers" o ON o."listingId" = l.id AND o."isActive" = true
      GROUP BY s.slug
      ORDER BY products DESC
    `;

    // Category coverage
    const categoryCoverage = await prisma.$queryRaw<Array<{
      category: string;
      products: bigint;
      avg_offers: number;
    }>>`
      SELECT
        c.slug as category,
        COUNT(DISTINCT p.id) as products,
        COALESCE(AVG(offer_counts.cnt), 0)::float as avg_offers
      FROM "categories" c
      LEFT JOIN "products" p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
      LEFT JOIN LATERAL (
        SELECT COUNT(*) as cnt
        FROM "listings" l
        JOIN "offers" o ON o."listingId" = l.id AND o."isActive" = true
        WHERE l."productId" = p.id
      ) offer_counts ON true
      GROUP BY c.slug
      ORDER BY products DESC
    `;

    // Find gaps: queries with high search volume but low product count
    const gaps = await prisma.$queryRaw<Array<{
      query: string;
      search_count: bigint;
      result_count: number;
    }>>`
      SELECT
        query,
        COUNT(*) as search_count,
        AVG("resultsCount")::int as result_count
      FROM "search_logs"
      WHERE "createdAt" >= NOW() - INTERVAL '30 days'
        AND query IS NOT NULL AND query != ''
      GROUP BY query
      HAVING AVG("resultsCount") < 5
      ORDER BY search_count DESC
      LIMIT 30
    `;

    const catalogGaps: CatalogGap[] = gaps.map(g => {
      const searchCount = Number(g.search_count);
      const currentProducts = g.result_count || 0;
      const gapScore = Math.round((searchCount * (1 - currentProducts / 10)) * 10) / 10;

      let suggestedAction: CatalogGap["suggestedAction"] = "import";
      if (currentProducts === 0) suggestedAction = "import";
      else if (currentProducts < 3) suggestedAction = "expand_category";
      else suggestedAction = "create_page";

      return {
        query: g.query,
        searchCount,
        currentProducts,
        gapScore,
        suggestedAction,
      };
    });

    // Health score: product count, offer density, source diversity
    const sourceCount = sourceCoverage.filter(s => Number(s.products) > 0).length;
    const avgOffersPerProduct = productCount > 0 ? offerCount / productCount : 0;
    const healthScore = Math.min(100, Math.round(
      (Math.min(productCount, 500) / 500) * 30 +
      (Math.min(avgOffersPerProduct, 3) / 3) * 30 +
      (Math.min(sourceCount, 4) / 4) * 20 +
      (catalogGaps.length === 0 ? 20 : Math.max(0, 20 - catalogGaps.length))
    ));

    return {
      totalProducts: productCount,
      activeOffers: offerCount,
      sourceCoverage: sourceCoverage.map(s => ({
        source: s.source,
        products: Number(s.products),
        offers: Number(s.offers),
      })),
      categoryCoverage: categoryCoverage.map(c => ({
        category: c.category,
        products: Number(c.products),
        avgOffersPerProduct: Math.round(c.avg_offers * 10) / 10,
      })),
      gaps: catalogGaps,
      healthScore,
    };
  } catch {
    return {
      totalProducts: 0,
      activeOffers: 0,
      sourceCoverage: [],
      categoryCoverage: [],
      gaps: [],
      healthScore: 0,
    };
  }
}
