import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";
import prisma from "@/lib/db/prisma";
import { getHotOffers, getBestSellers } from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  // Rate limit: 60 req/min (public)
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const limit = Math.min(parseInt(new URL(request.url).searchParams.get("limit") || "20"), 50);

    // Fetch trending keywords from DB
    const keywords = await prisma.trendingKeyword.findMany({
      orderBy: [{ fetchedAt: "desc" }, { position: "asc" }],
      take: 15,
      select: { keyword: true, position: true, url: true, fetchedAt: true },
    }).catch(() => []);

    // Fetch trending products (hot offers + best sellers combined)
    const [hotOffers, bestSellers] = await Promise.all([
      getHotOffers(Math.ceil(limit / 2)).catch(() => []),
      getBestSellers(Math.ceil(limit / 2)).catch(() => []),
    ]);

    // Merge and deduplicate
    const seen = new Set<string>();
    const products = [...hotOffers, ...bestSellers].filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    }).slice(0, limit);

    const response = NextResponse.json({
      keywords: keywords.map(k => ({ keyword: k.keyword, position: k.position, url: k.url })),
      products,
      count: products.length,
      source: products.length > 0 ? "database" : "empty",
      message: products.length === 0
        ? "Nenhum produto trending encontrado. Importe produtos via ML Discovery para popular o catalogo."
        : undefined,
    });
    return withRateLimitHeaders(response, rl);
  } catch (error) {
    console.error("[api/trending] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Erro ao buscar trending. Tente novamente." },
      { status: 500 }
    );
  }
}
