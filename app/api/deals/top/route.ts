import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries";
import { memoryCache } from "@/lib/cache/memory";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";

const CACHE_KEY = "api:deals:top";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes — short so banner rotates fresh

/**
 * GET /api/deals/top?limit=6
 *
 * Returns top deals ranked by offerScore (highest scoring offers first).
 * Used by the DealOfTheDay banner for dynamic, real-time rotation.
 */
export async function GET(request: NextRequest) {
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(Math.max(parseInt(limitParam || "6", 10), 1), 12);

  const cacheKey = `${CACHE_KEY}:${limit}`;
  const cached = memoryCache.get<any[]>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  }

  // Query products with active offers, ordered by the best offer's score
  // We fetch more than needed to filter and re-rank properly
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      listings: {
        some: {
          status: "ACTIVE",
          offers: {
            some: {
              isActive: true,
              offerScore: { gte: 40 }, // Minimum quality threshold
              currentPrice: { gt: 10 }, // Skip parse-error prices (R$6 tigelas, etc.)
              affiliateUrl: { not: null },
            },
          },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      popularityScore: true,
      originType: true,
      ...PRODUCT_INCLUDE,
    },
    orderBy: { popularityScore: "desc" },
    take: limit * 4, // Over-fetch to rank client-side by offerScore
  });

  const cards = products
    .map(buildProductCard)
    .filter(Boolean)
    .filter((c) => c!.imageUrl) // Must have image for banner
    .filter((c) => c!.bestOffer.offerScore >= 40 && c!.bestOffer.affiliateUrl !== "#" && (c!.bestOffer.discount ?? 0) < 80)
    // Sort by offerScore (highest first) — this is the key difference from getHotOffers
    .sort((a, b) => b!.bestOffer.offerScore - a!.bestOffer.offerScore)
    .slice(0, limit)
    .map((c) => ({
      id: c!.id,
      name: c!.name,
      slug: c!.slug,
      imageUrl: c!.imageUrl,
      price: c!.bestOffer.price,
      originalPrice: c!.bestOffer.originalPrice,
      discount: c!.bestOffer.discount,
      sourceName: c!.bestOffer.sourceName,
      offerScore: c!.bestOffer.offerScore,
      isFreeShipping: c!.bestOffer.isFreeShipping,
      offerId: c!.bestOffer.offerId,
    }));

  memoryCache.set(cacheKey, cards, CACHE_TTL_MS);

  return NextResponse.json(cards, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}
