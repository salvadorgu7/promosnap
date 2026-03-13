import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";
// import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  // Rate limit: 30 req/min for search
  const rl = rateLimit(request, "search");
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    if (!q.trim()) {
      return NextResponse.json({ products: [], total: 0, page, hasMore: false });
    }

    // TODO: Replace with real Prisma full-text search query and search analytics logging

    const response = NextResponse.json({
      products: [],
      total: 0,
      page,
      hasMore: false,
      query: q,
      message: "Search endpoint ready — connect to database to enable",
    });
    return withRateLimitHeaders(response, rl);
  } catch {
    return NextResponse.json(
      { error: "Erro ao processar busca. Tente novamente." },
      { status: 500 }
    );
  }
}
