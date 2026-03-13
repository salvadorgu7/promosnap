import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";
// import prisma from "@/lib/db/prisma";

export async function GET(request: NextRequest) {
  // Rate limit: 60 req/min (public)
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);
  // TODO: Replace with real Prisma trending products query

  const response = NextResponse.json({
    products: [],
    message: "Trending endpoint ready — connect to database to enable",
  });
  return withRateLimitHeaders(response, rl);
}
