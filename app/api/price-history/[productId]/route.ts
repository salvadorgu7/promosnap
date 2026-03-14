import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";

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

    const response = NextResponse.json({
      productId,
      days,
      snapshots,
    });

    return withRateLimitHeaders(response, rl);
  } catch {
    return NextResponse.json(
      { error: "Falha ao buscar historico de precos" },
      { status: 500 }
    );
  }
}
