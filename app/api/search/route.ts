import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";
import { searchProducts } from "@/lib/search/engine";

/** Check if request has valid admin secret */
function isAdminRequest(request: NextRequest): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;
  return request.headers.get("x-admin-secret") === secret;
}

export async function GET(request: NextRequest) {
  // Rate limit: 30 req/min for search
  const rl = rateLimit(request, "search");
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").slice(0, 200); // Max 200 chars
    const rawPage = parseInt(searchParams.get("page") || "1", 10);
    const page = Math.max(1, Math.min(isNaN(rawPage) ? 1 : rawPage, 100));
    const rawLimit = parseInt(searchParams.get("limit") || "20", 10);
    const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 20 : rawLimit, 100));
    const validSorts = ["relevance", "price_asc", "price_desc", "popularity", "score"] as const;
    const rawSort = searchParams.get("sort") || "relevance";
    const sortBy = validSorts.includes(rawSort as typeof validSorts[number])
      ? (rawSort as typeof validSorts[number])
      : "relevance";
    const category = searchParams.get("category")?.slice(0, 100) || undefined;
    const brand = searchParams.get("brand")?.slice(0, 100) || undefined;
    const source = searchParams.get("source")?.slice(0, 100) || undefined;
    const rawMin = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const rawMax = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const minPrice = rawMin !== undefined && isFinite(rawMin) && rawMin >= 0 ? rawMin : undefined;
    const maxPrice = rawMax !== undefined && isFinite(rawMax) && rawMax >= 0 ? rawMax : undefined;

    const isAdmin = isAdminRequest(request);

    if (!q.trim()) {
      return withRateLimitHeaders(
        NextResponse.json({ products: [], total: 0, page, hasMore: false }),
        rl
      );
    }

    const result = await searchProducts({
      query: q.trim(),
      page,
      limit,
      sortBy,
      category,
      brand,
      source,
      minPrice,
      maxPrice,
      isAdmin,
    });

    const response = NextResponse.json({
      products: result.products,
      total: result.totalCount,
      page,
      hasMore: page * limit < result.totalCount,
      query: q,
      filters: result.filters,
      suggestions: result.suggestions,
      // Zero-result helpers (always included when applicable)
      ...(result.didYouMean ? { didYouMean: result.didYouMean } : {}),
      ...(result.relatedCategories ? { relatedCategories: result.relatedCategories } : {}),
      ...(result.bestSellersFallback ? { bestSellersFallback: result.bestSellersFallback } : {}),
      // Admin-only debug info — hidden from public responses
      ...(isAdmin && result.debug ? { debug: result.debug } : {}),
      // Legacy debug fields for backward compat (admin-only)
      ...(isAdmin && result.understanding ? {
        _intelligence: {
          intent: result.understanding.intent,
          confidence: result.understanding.confidence,
          commercialIntent: result.understanding.commercialIntent ?? null,
          entities: result.understanding.entities,
          expansions: result.understanding.expansions,
          corrections: result.understanding.corrections,
          fallbackUsed: result.understanding.fallbackUsed,
          processingMs: result.understanding.processingMs,
        },
      } : {}),
      ...(isAdmin && result.metrics ? {
        _metrics: result.metrics,
      } : {}),
    });
    return withRateLimitHeaders(response, rl);
  } catch (error) {
    console.error("[api/search] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Erro ao processar busca. Tente novamente." },
      { status: 500 }
    );
  }
}
