/**
 * Revenue Tracker — estimates revenue from clickout data with real per-source rates.
 * Uses shared source profiles from lib/config/source-profiles.ts.
 */
import prisma from "@/lib/db/prisma";
import { getSourceProfile } from "@/lib/config/source-profiles";

export interface RevenueEstimate {
  period: string;
  clickouts: number;
  estimatedConversions: number;
  estimatedGMV: number;
  estimatedRevenue: number;
  bySource: {
    source: string;
    clickouts: number;
    estimatedConversions: number;
    estimatedGMV: number;
    estimatedRevenue: number;
  }[];
}

export async function estimateRevenue(days: number = 30): Promise<RevenueEstimate> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const bySource = await prisma.$queryRaw<Array<{
      source_slug: string;
      clicks: bigint;
    }>>`
      SELECT "sourceSlug" as source_slug, COUNT(*) as clicks
      FROM "clickouts"
      WHERE "clickedAt" >= ${since}
      GROUP BY "sourceSlug"
    `;

    let totalClickouts = 0;
    let totalConversions = 0;
    let totalGMV = 0;
    let totalRevenue = 0;

    const sourceBreakdown = bySource.map(s => {
      const profile = getSourceProfile(s.source_slug);
      const clicks = Number(s.clicks);
      const conversions = Math.round(clicks * profile.conversionRate);
      const gmv = conversions * profile.avgTicket;
      const revenue = gmv * profile.commissionRate;

      totalClickouts += clicks;
      totalConversions += conversions;
      totalGMV += gmv;
      totalRevenue += revenue;

      return {
        source: s.source_slug,
        clickouts: clicks,
        estimatedConversions: conversions,
        estimatedGMV: Math.round(gmv * 100) / 100,
        estimatedRevenue: Math.round(revenue * 100) / 100,
      };
    });

    return {
      period: `${days}d`,
      clickouts: totalClickouts,
      estimatedConversions: totalConversions,
      estimatedGMV: Math.round(totalGMV * 100) / 100,
      estimatedRevenue: Math.round(totalRevenue * 100) / 100,
      bySource: sourceBreakdown,
    };
  } catch {
    return {
      period: `${days}d`,
      clickouts: 0,
      estimatedConversions: 0,
      estimatedGMV: 0,
      estimatedRevenue: 0,
      bySource: [],
    };
  }
}

/**
 * Quick revenue check for dashboards.
 */
export async function getRevenueQuickStats(): Promise<{
  todayClickouts: number;
  weekClickouts: number;
  monthClickouts: number;
  estimatedRevenueToday: number;
  estimatedRevenueWeek: number;
  estimatedRevenueMonth: number;
}> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date();
  monthStart.setDate(monthStart.getDate() - 30);

  try {
    const [today, week, month] = await Promise.all([
      estimateRevenue(1),
      estimateRevenue(7),
      estimateRevenue(30),
    ]);

    return {
      todayClickouts: today.clickouts,
      weekClickouts: week.clickouts,
      monthClickouts: month.clickouts,
      estimatedRevenueToday: today.estimatedRevenue,
      estimatedRevenueWeek: week.estimatedRevenue,
      estimatedRevenueMonth: month.estimatedRevenue,
    };
  } catch {
    return {
      todayClickouts: 0,
      weekClickouts: 0,
      monthClickouts: 0,
      estimatedRevenueToday: 0,
      estimatedRevenueWeek: 0,
      estimatedRevenueMonth: 0,
    };
  }
}
