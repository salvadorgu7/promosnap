import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    // Products with highest revenue potential:
    // - Has affiliate URL
    // - Has real discount
    // - Imported product
    // - High offer score
    const products = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        originType: string;
        offerScore: number;
        currentPrice: number;
        originalPrice: number | null;
        affiliateUrl: string | null;
        discount: number;
        isFreeShipping: boolean;
        sourceName: string | null;
        clickouts7d: number;
      }>
    >`
      SELECT
        p.id,
        p.name,
        p.slug,
        p."imageUrl",
        p."originType",
        o."offerScore" as "offerScore",
        o."currentPrice" as "currentPrice",
        o."originalPrice" as "originalPrice",
        o."affiliateUrl" as "affiliateUrl",
        CASE
          WHEN o."originalPrice" IS NOT NULL AND o."originalPrice" > 0 AND o."originalPrice" > o."currentPrice"
          THEN ROUND(((o."originalPrice" - o."currentPrice") / o."originalPrice") * 100)
          ELSE 0
        END as discount,
        o."isFreeShipping" as "isFreeShipping",
        s.name as "sourceName",
        COALESCE(click_counts.clicks, 0)::int as "clickouts7d"
      FROM products p
      JOIN listings l ON l."productId" = p.id AND l.status = 'ACTIVE'
      JOIN offers o ON o."listingId" = l.id AND o."isActive" = true
      JOIN sources s ON s.id = l."sourceId"
      LEFT JOIN (
        SELECT o2.id as "offerId", COUNT(c.id)::int as clicks
        FROM clickouts c
        JOIN offers o2 ON c."offerId" = o2.id
        WHERE c."clickedAt" > NOW() - INTERVAL '7 days'
        GROUP BY o2.id
      ) click_counts ON click_counts."offerId" = o.id
      WHERE p.status = 'ACTIVE'
        AND p."originType" = 'imported'
        AND o."affiliateUrl" IS NOT NULL
        AND o."affiliateUrl" != '#'
        AND o."originalPrice" IS NOT NULL
        AND o."originalPrice" > o."currentPrice"
      ORDER BY
        o."offerScore" DESC,
        click_counts.clicks DESC NULLS LAST,
        o."currentPrice" DESC
      LIMIT 20
    `;

    // Calculate a potential score for each product
    const withPotentialScore = (products as any[]).map((p) => {
      let potentialScore = 0;

      // Offer score contribution (0-40)
      potentialScore += Math.min((p.offerScore || 0) * 0.4, 40);

      // Discount contribution (0-25)
      potentialScore += Math.min((p.discount || 0) * 0.5, 25);

      // Price contribution — higher price = more revenue (0-20)
      if (p.currentPrice) {
        potentialScore += Math.min(Math.log10(p.currentPrice + 1) * 7, 20);
      }

      // Clickout history contribution (0-15)
      if (p.clickouts7d > 0) {
        potentialScore += Math.min(Math.log10(p.clickouts7d + 1) * 10, 15);
      }

      return {
        ...p,
        potentialScore: Math.round(Math.min(potentialScore, 100)),
      };
    });

    // Sort by potential score
    withPotentialScore.sort((a, b) => b.potentialScore - a.potentialScore);

    return NextResponse.json({
      products: withPotentialScore,
      count: withPotentialScore.length,
    });
  } catch (error) {
    console.error("[revenue/potential] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch revenue potential data" },
      { status: 500 }
    );
  }
}
