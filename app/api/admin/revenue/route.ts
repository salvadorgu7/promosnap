import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateAdmin } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

const REVENUE_RATES: Record<string, number> = {
  "amazon-br": 0.04,
  mercadolivre: 0.03,
  shopee: 0.025,
  shein: 0.03,
};

const DEFAULT_RATE = 0.03;

function getRate(sourceSlug: string | null): number {
  if (!sourceSlug) return DEFAULT_RATE;
  return REVENUE_RATES[sourceSlug] ?? DEFAULT_RATE;
}

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

    // --- Clickout counts ---
    const clickoutsToday = await prisma.clickout.count({
      where: { clickedAt: { gte: today } },
    });

    // --- Revenue by source (30d) with avg price ---
    const bySourceRaw: Array<{
      sourceSlug: string | null;
      clickouts: bigint;
      avgPrice: number | null;
    }> = await prisma.$queryRaw`
      SELECT
        c."sourceSlug",
        COUNT(c.id) as clickouts,
        AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${thirtyDaysAgo}
      GROUP BY c."sourceSlug"
      ORDER BY clickouts DESC
    `;

    // --- Revenue by source for different periods ---
    const bySourceTodayRaw: Array<{
      sourceSlug: string | null;
      clickouts: bigint;
      avgPrice: number | null;
    }> = await prisma.$queryRaw`
      SELECT
        c."sourceSlug",
        COUNT(c.id) as clickouts,
        AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${today}
      GROUP BY c."sourceSlug"
    `;

    const bySource7dRaw: Array<{
      sourceSlug: string | null;
      clickouts: bigint;
      avgPrice: number | null;
    }> = await prisma.$queryRaw`
      SELECT
        c."sourceSlug",
        COUNT(c.id) as clickouts,
        AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${sevenDaysAgo}
      GROUP BY c."sourceSlug"
    `;

    // Calculate revenue totals
    const calcRevenue = (
      rows: Array<{ sourceSlug: string | null; clickouts: bigint; avgPrice: number | null }>
    ) =>
      rows.reduce((sum, r) => {
        const rate = getRate(r.sourceSlug);
        const avg = r.avgPrice ?? 0;
        return sum + Number(r.clickouts) * avg * rate;
      }, 0);

    const revenueToday = calcRevenue(bySourceTodayRaw);
    const revenue7d = calcRevenue(bySource7dRaw);
    const revenue30d = calcRevenue(bySourceRaw);

    // Format bySource for response (30d)
    const bySource = bySourceRaw.map((r) => ({
      source: r.sourceSlug ?? "unknown",
      clickouts: Number(r.clickouts),
      estimatedRevenue:
        Number(r.clickouts) * (r.avgPrice ?? 0) * getRate(r.sourceSlug),
    }));

    // --- Revenue by category (30d) ---
    const byCategoryRaw: Array<{
      category: string | null;
      clickouts: bigint;
      avgPrice: number | null;
      sourceSlug: string | null;
    }> = await prisma.$queryRaw`
      SELECT
        c."categorySlug" as category,
        c."sourceSlug",
        COUNT(c.id) as clickouts,
        AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${thirtyDaysAgo}
      GROUP BY c."categorySlug", c."sourceSlug"
      ORDER BY clickouts DESC
    `;

    // Aggregate by category
    const categoryMap = new Map<string, { clickouts: number; estimatedRevenue: number }>();
    for (const r of byCategoryRaw) {
      const cat = r.category ?? "sem-categoria";
      const existing = categoryMap.get(cat) ?? { clickouts: 0, estimatedRevenue: 0 };
      const clicks = Number(r.clickouts);
      existing.clickouts += clicks;
      existing.estimatedRevenue += clicks * (r.avgPrice ?? 0) * getRate(r.sourceSlug);
      categoryMap.set(cat, existing);
    }
    const byCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({ category, ...data }))
      .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

    // --- Top 10 products by revenue (30d) ---
    const topProductsRaw: Array<{
      name: string;
      slug: string;
      clickouts: bigint;
      avgPrice: number | null;
      sourceSlug: string | null;
    }> = await prisma.$queryRaw`
      SELECT
        p.name,
        p.slug,
        COUNT(c.id) as clickouts,
        AVG(o."currentPrice") as "avgPrice",
        MAX(c."sourceSlug") as "sourceSlug"
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      JOIN listings l ON o."listingId" = l.id
      LEFT JOIN products p ON l."productId" = p.id
      WHERE c."clickedAt" >= ${thirtyDaysAgo}
      GROUP BY p.name, p.slug
      ORDER BY clickouts DESC
      LIMIT 10
    `;

    const topProducts = topProductsRaw.map((r) => ({
      name: r.name ?? "Produto sem nome",
      slug: r.slug ?? "",
      clickouts: Number(r.clickouts),
      estimatedRevenue:
        Number(r.clickouts) * (r.avgPrice ?? 0) * getRate(r.sourceSlug),
    }));

    return NextResponse.json({
      revenueToday,
      revenue7d,
      revenue30d,
      clickoutsToday,
      bySource,
      byCategory,
      topProducts,
    });
  } catch (error) {
    console.error("Revenue API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue data" },
      { status: 500 }
    );
  }
}
