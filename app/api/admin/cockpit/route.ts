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
    });
  } catch (error) {
    console.error("[cockpit] Error:", error);
    return NextResponse.json(
      { error: "Failed to load cockpit data" },
      { status: 500 }
    );
  }
}
