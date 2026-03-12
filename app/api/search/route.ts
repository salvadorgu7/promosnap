import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";
// import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  // Rate limit: 30 req/min for search
  const rl = rateLimit(request, "search");
  if (!rl.success) return rateLimitResponse(rl);

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const sort = searchParams.get("sort") || "score";

  if (!q.trim()) {
    return NextResponse.json({ products: [], total: 0, page, hasMore: false });
  }

  // TODO: Replace with real Prisma query using full-text search
  // const products = await prisma.product.findMany({
  //   where: {
  //     OR: [
  //       { name: { contains: q, mode: 'insensitive' } },
  //       { description: { contains: q, mode: 'insensitive' } },
  //     ],
  //     status: 'ACTIVE',
  //   },
  //   include: {
  //     brand: true,
  //     category: true,
  //     listings: {
  //       include: {
  //         offers: { where: { isActive: true }, orderBy: { offerScore: 'desc' } },
  //         source: true,
  //       },
  //     },
  //   },
  //   orderBy: sort === 'price' ? { listings: { _count: 'asc' } } : { popularityScore: 'desc' },
  //   skip: (page - 1) * limit,
  //   take: limit,
  // });

  // Log search for analytics
  // await prisma.searchLog.create({
  //   data: { query: q, normalizedQuery: q.toLowerCase().trim(), resultsCount: 0 },
  // });

  const response = NextResponse.json({
    products: [],
    total: 0,
    page,
    hasMore: false,
    query: q,
    message: "Search endpoint ready — connect to database to enable",
  });
  return withRateLimitHeaders(response, rl);
}
