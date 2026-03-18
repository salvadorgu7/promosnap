import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { computeExtendedPriceStats } from "@/lib/price/analytics";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const rl = rateLimit(request, "public");
  if (!rl.success) {
    return rateLimitResponse(rl);
  }

  try {
    const { productId } = await params;
    const daysParam = request.nextUrl.searchParams.get("days");
    const days = Math.min(Math.max(parseInt(daysParam || "90", 10) || 90, 1), 365);

    const since = new Date();
    since.setDate(since.getDate() - days);

    const snapshots = await prisma.priceSnapshot.findMany({
      where: {
        offer: {
          listing: {
            productId,
          },
        },
        capturedAt: { gte: since },
      },
      select: {
        price: true,
        originalPrice: true,
        capturedAt: true,
      },
      orderBy: { capturedAt: "asc" },
    });

    // Compute current price from latest snapshot or offer
    const currentPriceSnap = snapshots.length > 0 ? snapshots[snapshots.length - 1].price : null
    let currentPrice = currentPriceSnap

    if (!currentPrice) {
      const bestOffer = await prisma.offer.findFirst({
        where: { listing: { productId }, isActive: true },
        orderBy: { currentPrice: 'asc' },
        select: { currentPrice: true },
      })
      currentPrice = bestOffer?.currentPrice ?? 0
    }

    // Compute extended analytics if we have data
    const analytics = currentPrice > 0 && snapshots.length > 0
      ? computeExtendedPriceStats(
          snapshots.map(s => ({ ...s, capturedAt: new Date(s.capturedAt) })),
          currentPrice
        )
      : null

    const response = NextResponse.json({
      productId,
      days,
      snapshots,
      analytics,
    });

    return withRateLimitHeaders(response, rl);
  } catch (err) {
    logger.error("price-history.failed", { error: err });
    return NextResponse.json(
      { error: "Falha ao buscar historico de precos" },
      { status: 500 }
    );
  }
}
