/**
 * Clickout Intelligence — understands conversion patterns to prioritize catalog and merchandising.
 * Uses shared source profiles from lib/config/source-profiles.ts.
 */
import prisma from "@/lib/db/prisma";
import { getSourceProfile, getWeightedAvgTicket, getWeightedAvgCommission } from "@/lib/config/source-profiles";

export interface ClickoutIntelligence {
  topConverting: { sourceSlug: string; offerId: string; productName: string; clicks: number }[];
  conversionBySource: { source: string; clicks: number; share: number }[];
  conversionByCategory: { category: string; clicks: number; share: number }[];
  conversionByHour: { hour: number; clicks: number }[];
  conversionByDay: { day: number; clicks: number }[];
  totalClickouts: number;
  todayClickouts: number;
  weekClickouts: number;
  estimatedRevenue: {
    today: number;
    week: number;
    month: number;
    avgTicket: number;
    avgCommission: number;
  };
}

export async function getClickoutIntelligence(days: number = 30): Promise<ClickoutIntelligence> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);

  try {
    // Total counts
    const [totalResult, todayResult, weekResult] = await Promise.all([
      prisma.clickout.count({ where: { clickedAt: { gte: since } } }),
      prisma.clickout.count({ where: { clickedAt: { gte: todayStart } } }),
      prisma.clickout.count({ where: { clickedAt: { gte: weekStart } } }),
    ]);

    // By source
    const bySource = await prisma.$queryRaw<Array<{
      source_slug: string;
      clicks: bigint;
    }>>`
      SELECT "sourceSlug" as source_slug, COUNT(*) as clicks
      FROM "clickouts"
      WHERE "clickedAt" >= ${since}
      GROUP BY "sourceSlug"
      ORDER BY clicks DESC
    `;

    // By category
    const byCategory = await prisma.$queryRaw<Array<{
      category: string;
      clicks: bigint;
    }>>`
      SELECT COALESCE("categorySlug", 'uncategorized') as category, COUNT(*) as clicks
      FROM "clickouts"
      WHERE "clickedAt" >= ${since}
      GROUP BY "categorySlug"
      ORDER BY clicks DESC
      LIMIT 20
    `;

    // By hour
    const byHour = await prisma.$queryRaw<Array<{
      hour: number;
      clicks: bigint;
    }>>`
      SELECT EXTRACT(HOUR FROM "clickedAt")::int as hour, COUNT(*) as clicks
      FROM "clickouts"
      WHERE "clickedAt" >= ${since}
      GROUP BY hour
      ORDER BY hour
    `;

    // By day of week
    const byDay = await prisma.$queryRaw<Array<{
      day: number;
      clicks: bigint;
    }>>`
      SELECT EXTRACT(DOW FROM "clickedAt")::int as day, COUNT(*) as clicks
      FROM "clickouts"
      WHERE "clickedAt" >= ${since}
      GROUP BY day
      ORDER BY day
    `;

    // Top converting offers
    const topOffers = await prisma.$queryRaw<Array<{
      offer_id: string;
      source_slug: string;
      clicks: bigint;
    }>>`
      SELECT "offerId" as offer_id, "sourceSlug" as source_slug, COUNT(*) as clicks
      FROM "clickouts"
      WHERE "clickedAt" >= ${since}
      GROUP BY "offerId", "sourceSlug"
      ORDER BY clicks DESC
      LIMIT 10
    `;

    // Enrich top offers with product names
    const offerIds = topOffers.map(o => o.offer_id);
    const offers = offerIds.length > 0 ? await prisma.offer.findMany({
      where: { id: { in: offerIds } },
      select: {
        id: true,
        listing: {
          select: { product: { select: { name: true } } },
        },
      },
    }) : [];

    const offerNameMap = new Map<string, string>();
    for (const o of offers) {
      offerNameMap.set(o.id, o.listing.product?.name || "Unknown");
    }

    const total = totalResult || 1;
    const conversionBySource = bySource.map(s => ({
      source: s.source_slug,
      clicks: Number(s.clicks),
      share: Number(s.clicks) / total,
    }));

    // Estimate revenue based on clickouts x avg ticket x commission rate
    let estimatedToday = 0;
    let estimatedWeek = 0;
    let estimatedMonth = 0;

    for (const s of conversionBySource) {
      const profile = getSourceProfile(s.source);
      const rate = profile.commissionRate;
      const ticket = profile.avgTicket;
      const monthlyClicks = s.clicks;
      const dailyAvg = monthlyClicks / Math.max(days, 1);
      estimatedMonth += monthlyClicks * ticket * rate;
      estimatedWeek += dailyAvg * 7 * ticket * rate;
      estimatedToday += dailyAvg * ticket * rate;
    }

    return {
      topConverting: topOffers.map(o => ({
        sourceSlug: o.source_slug,
        offerId: o.offer_id,
        productName: offerNameMap.get(o.offer_id) || "\u2014",
        clicks: Number(o.clicks),
      })),
      conversionBySource,
      conversionByCategory: byCategory.map(c => ({
        category: c.category,
        clicks: Number(c.clicks),
        share: Number(c.clicks) / total,
      })),
      conversionByHour: byHour.map(h => ({
        hour: h.hour,
        clicks: Number(h.clicks),
      })),
      conversionByDay: byDay.map(d => ({
        day: d.day,
        clicks: Number(d.clicks),
      })),
      totalClickouts: totalResult,
      todayClickouts: todayResult,
      weekClickouts: weekResult,
      estimatedRevenue: {
        today: Math.round(estimatedToday * 100) / 100,
        week: Math.round(estimatedWeek * 100) / 100,
        month: Math.round(estimatedMonth * 100) / 100,
        avgTicket: getWeightedAvgTicket(),
        avgCommission: getWeightedAvgCommission(),
      },
    };
  } catch {
    return {
      topConverting: [],
      conversionBySource: [],
      conversionByCategory: [],
      conversionByHour: [],
      conversionByDay: [],
      totalClickouts: 0,
      todayClickouts: 0,
      weekClickouts: 0,
      estimatedRevenue: { today: 0, week: 0, month: 0, avgTicket: 0, avgCommission: 0 },
    };
  }
}
