import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import prisma from "@/lib/db/prisma";
import { getTopOpportunities, summarizeOpportunities } from "@/lib/opportunity/engine";
import { findZeroResultSearches } from "@/lib/discovery";

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch opportunities
    const opportunities = await getTopOpportunities(10);
    const summary = summarizeOpportunities(opportunities);

    // Weekly stats — all in parallel
    const [
      clickoutsThisWeek,
      clickoutsLastWeek,
      newProductsThisWeek,
      newListingsThisWeek,
      totalActiveProducts,
      totalActiveOffers,
      totalSubscribers,
      failedJobs,
      lowTrustOffers,
      staleOffers,
      needsReviewProducts,
      topCategories,
    ] = await Promise.all([
      // Clickouts this week
      prisma.clickout.count({
        where: { clickedAt: { gte: sevenDaysAgo } },
      }),
      // Clickouts last week
      prisma.clickout.count({
        where: { clickedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
      }),
      // New products this week
      prisma.product.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      // New listings this week
      prisma.listing.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      // Total active products
      prisma.product.count({
        where: { status: "ACTIVE" },
      }),
      // Total active offers
      prisma.offer.count({
        where: { isActive: true },
      }),
      // Total subscribers
      prisma.subscriber.count({
        where: { status: "ACTIVE" },
      }),
      // Failed jobs in last 7 days
      prisma.jobRun.findMany({
        where: { status: "FAILED", startedAt: { gte: sevenDaysAgo } },
        select: { id: true, jobName: true, startedAt: true, errorLog: true },
        orderBy: { startedAt: "desc" },
        take: 5,
      }),
      // Low trust offers being clicked
      prisma.offer.count({
        where: { isActive: true, offerScore: { lt: 20 } },
      }),
      // Stale offers (not seen in 7 days)
      prisma.offer.count({
        where: { isActive: true, lastSeenAt: { lt: sevenDaysAgo } },
      }),
      // Products needing review
      prisma.product.count({
        where: { needsReview: true, status: "ACTIVE" },
      }),
      // Top performing categories by clickouts
      prisma.clickout.groupBy({
        by: ["categorySlug"],
        _count: { id: true },
        where: { clickedAt: { gte: sevenDaysAgo }, categorySlug: { not: null } },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
    ]);

    // Zero-result searches (catalog gaps)
    const zeroResultSearches = await findZeroResultSearches(10).catch(() => [])

    // Search metrics summary
    const [totalSearches7d, zeroResultCount7d] = await Promise.all([
      prisma.searchLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.searchLog.count({ where: { createdAt: { gte: sevenDaysAgo }, resultsCount: 0 } }),
    ])

    const clickoutsDelta =
      clickoutsLastWeek > 0
        ? Math.round(((clickoutsThisWeek - clickoutsLastWeek) / clickoutsLastWeek) * 100)
        : clickoutsThisWeek > 0
        ? 100
        : 0;

    // ── catalog_health (defensive for originType) ────────────────────────
    let realImported = 0;
    let seedProducts = totalActiveProducts;
    let importedLast24h = 0;
    let importedLast7d = 0;
    let categoriesWithRealProducts = 0;
    let categoriesWithoutRealProducts = 0;

    try {
      const importStats = await Promise.all([
        prisma.product.count({ where: { status: 'ACTIVE', originType: 'imported' } }),
        prisma.product.count({ where: { status: 'ACTIVE', originType: 'imported', importedAt: { gte: oneDayAgo } } }),
        prisma.product.count({ where: { status: 'ACTIVE', originType: 'imported', importedAt: { gte: sevenDaysAgo } } }),
      ]);
      realImported = importStats[0];
      seedProducts = totalActiveProducts - realImported;
      importedLast24h = importStats[1];
      importedLast7d = importStats[2];

      // Categories with/without real products
      const catsWithImported = await prisma.$queryRaw<{ count: number }[]>`
        SELECT COUNT(DISTINCT "categoryId")::int as count FROM products
        WHERE status = 'ACTIVE' AND "originType" = 'imported' AND "categoryId" IS NOT NULL
      `;
      categoriesWithRealProducts = (catsWithImported as any[])[0]?.count || 0;

      const totalCategories = await prisma.category.count();
      categoriesWithoutRealProducts = Math.max(0, totalCategories - categoriesWithRealProducts);
    } catch {
      // originType column doesn't exist — all products are seed
      seedProducts = totalActiveProducts;
    }

    // Average discount and free shipping count
    let avgDiscount = 0;
    let productsWithFreeShipping = 0;
    try {
      const discountResult = await prisma.$queryRaw<{ avg_discount: number; free_shipping: number }[]>`
        SELECT
          COALESCE(AVG(
            CASE WHEN o."originalPrice" > 0 AND o."originalPrice" > o."currentPrice"
            THEN ((o."originalPrice" - o."currentPrice") / o."originalPrice") * 100
            ELSE NULL END
          ), 0) as avg_discount,
          COUNT(DISTINCT CASE WHEN o."isFreeShipping" = true THEN l."productId" END)::int as free_shipping
        FROM offers o
        JOIN listings l ON o."listingId" = l.id
        WHERE o."isActive" = true AND l."productId" IS NOT NULL
      `;
      avgDiscount = Math.round(((discountResult as any[])[0]?.avg_discount || 0) * 10) / 10;
      productsWithFreeShipping = (discountResult as any[])[0]?.free_shipping || 0;
    } catch { /* non-critical */ }

    const catalogHealth = {
      totalProducts: totalActiveProducts,
      realImported,
      seedProducts,
      importedLast24h,
      importedLast7d,
      categoriesWithRealProducts,
      categoriesWithoutRealProducts,
      avgDiscount,
      productsWithFreeShipping,
    };

    // ── revenue_potential ─────────────────────────────────────────────────
    let highDiscountProducts = 0;
    let productsWithAffiliateLinks = 0;
    let topClickedProducts: any[] = [];
    try {
      const [hd, aff, topClicked] = await Promise.all([
        prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(DISTINCT l."productId")::int as count FROM offers o
          JOIN listings l ON o."listingId" = l.id
          WHERE o."isActive" = true AND o."originalPrice" IS NOT NULL
          AND o."originalPrice" > 0
          AND ((o."originalPrice" - o."currentPrice") / o."originalPrice") > 0.3
        `,
        prisma.$queryRaw<{ count: number }[]>`
          SELECT COUNT(DISTINCT l."productId")::int as count FROM offers o
          JOIN listings l ON o."listingId" = l.id
          WHERE o."isActive" = true AND o."affiliateUrl" IS NOT NULL AND o."affiliateUrl" != '#'
        `,
        prisma.$queryRaw`
          SELECT p.id, p.name, p.slug, COUNT(c.id)::int as clicks
          FROM clickouts c
          JOIN offers o ON c."offerId" = o.id
          JOIN listings l ON o."listingId" = l.id
          JOIN products p ON l."productId" = p.id
          WHERE c."clickedAt" > NOW() - INTERVAL '7 days'
          GROUP BY p.id, p.name, p.slug
          ORDER BY clicks DESC
          LIMIT 5
        `.catch(() => []),
      ]);
      highDiscountProducts = (hd as any[])[0]?.count || 0;
      productsWithAffiliateLinks = (aff as any[])[0]?.count || 0;
      topClickedProducts = (topClicked as any[]) || [];
    } catch { /* non-critical */ }

    // Estimate monthly clickouts based on this week's rate
    const estimatedMonthlyClickouts = Math.round(clickoutsThisWeek * (30 / 7));

    const revenuePotential = {
      highDiscountProducts,
      productsWithAffiliateLinks,
      clickoutsThisWeek,
      estimatedMonthlyClickouts,
      topClickedProducts,
    };

    // ── import_health ────────────────────────────────────────────────────
    let lastImportAt: string | null = null;
    let lastImportCount = 0;
    let consecutiveZeroImports = 0;
    let discoverySuccess = false;

    try {
      const lastImportJob = await prisma.jobRun.findFirst({
        where: { jobName: 'discover-import' },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true, status: true, itemsDone: true, endedAt: true },
      });

      if (lastImportJob) {
        lastImportAt = (lastImportJob.endedAt || lastImportJob.startedAt).toISOString();
        lastImportCount = lastImportJob.itemsDone || 0;
        discoverySuccess = lastImportJob.status === 'SUCCESS';
      }

      // Count consecutive zero-import runs
      const recentImportJobs = await prisma.jobRun.findMany({
        where: { jobName: 'discover-import' },
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: { itemsDone: true },
      });
      for (const j of recentImportJobs) {
        if ((j.itemsDone || 0) === 0) consecutiveZeroImports++;
        else break;
      }
    } catch { /* non-critical */ }

    const importHealth = {
      lastImportAt,
      lastImportCount,
      consecutiveZeroImports,
      discoverySuccess,
    };

    return NextResponse.json({
      opportunities,
      summary,
      weeklyStats: {
        clickoutsThisWeek,
        clickoutsLastWeek,
        clickoutsDelta,
        newProductsThisWeek,
        newListingsThisWeek,
        totalActiveProducts,
        totalActiveOffers,
        totalSubscribers,
        topCategories: topCategories.map((c) => ({
          category: c.categorySlug,
          clickouts: c._count.id,
        })),
      },
      risks: {
        failedJobs: failedJobs.map((j) => ({
          id: j.id,
          jobName: j.jobName,
          startedAt: j.startedAt,
          errorSnippet: j.errorLog ? j.errorLog.slice(0, 120) : null,
        })),
        lowTrustOffers,
        staleOffers,
        needsReviewProducts,
      },
      searchIntelligence: {
        totalSearches7d,
        zeroResultCount7d,
        zeroResultRate: totalSearches7d > 0 ? Math.round((zeroResultCount7d / totalSearches7d) * 100) : 0,
        topZeroResultQueries: zeroResultSearches.map(z => ({
          query: z.query,
          count: z.count,
          lastSearched: z.lastSearched,
        })),
      },
      catalogHealth,
      revenuePotential,
      importHealth,
    });
  } catch (error) {
    console.error("[cockpit] Error:", error);
    return NextResponse.json(
      { error: "Failed to load cockpit data" },
      { status: 500 }
    );
  }
}
