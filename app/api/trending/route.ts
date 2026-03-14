import { NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from "@/lib/security/rate-limit";
import prisma from "@/lib/db/prisma";
import { getHotOffers, getBestSellers } from "@/lib/db/queries";
import { cache } from "@/lib/cache";

const TRENDING_CACHE_TTL = 180; // 3 minutes

// ── Noise filters ────────────────────────────────────────────────────────

const SPAM_PATTERNS = [
  /^[\d\s.,]+$/,          // purely numeric / punctuation
  /^.{0,2}$/,             // < 3 chars
  /^https?:\/\//i,        // raw URLs
  /^\W+$/,                // only symbols
  /teste|asdf|qwer/i,     // obvious test/spam
];

function isNoisyKeyword(kw: string): boolean {
  return SPAM_PATTERNS.some(p => p.test(kw.trim()));
}

// ── Category inference ───────────────────────────────────────────────────

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Celulares e Smartphones": ["iphone", "samsung", "galaxy", "celular", "smartphone", "xiaomi", "motorola", "redmi"],
  "Computadores": ["notebook", "laptop", "pc", "computador", "desktop", "macbook", "chromebook"],
  "Audio e Video": ["fone", "headset", "caixa de som", "tv", "televisao", "soundbar", "airpods", "jbl"],
  "Games": ["ps5", "playstation", "xbox", "nintendo", "switch", "controle", "jogo", "game"],
  "Eletrodomesticos": ["air fryer", "airfryer", "geladeira", "microondas", "aspirador", "lavadora", "maquina de lavar"],
  "Casa e Decoracao": ["sofa", "colchao", "mesa", "cadeira", "luminaria", "cortina"],
  "Beleza e Saude": ["perfume", "maquiagem", "creme", "shampoo", "protetor solar", "skincare"],
  "Moda": ["tenis", "sapato", "roupa", "camisa", "jaqueta", "vestido", "calca"],
  "Esportes": ["bicicleta", "esteira", "halter", "academia", "corrida", "futebol"],
};

function inferCategory(keyword: string): string | null {
  const kw = keyword.toLowerCase();
  for (const [cat, terms] of Object.entries(CATEGORY_KEYWORDS)) {
    if (terms.some(t => kw.includes(t))) return cat;
  }
  return null;
}

export async function GET(request: NextRequest) {
  // Rate limit: 60 req/min (public)
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

  try {
    const rawLimit = parseInt(new URL(request.url).searchParams.get("limit") || "20");
    const limit = Math.max(1, Math.min(isNaN(rawLimit) ? 20 : rawLimit, 50));

    // Sanitize category param: alphanumeric + dash only
    const rawCategory = new URL(request.url).searchParams.get("category") || "";
    const category = rawCategory.replace(/[^a-zA-Z0-9\-]/g, "").slice(0, 100) || undefined;

    // Check cache
    const cacheKey = `trending:${limit}`;
    const cached = await cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      const response = NextResponse.json(cached);
      return withRateLimitHeaders(response, rl);
    }

    // Fetch trending keywords from DB
    const rawKeywords = await prisma.trendingKeyword.findMany({
      orderBy: [{ fetchedAt: "desc" }, { position: "asc" }],
      take: 30, // fetch more to filter
      select: { keyword: true, position: true, url: true, fetchedAt: true },
    }).catch(() => []);

    // Filter noise
    const cleanKeywords = rawKeywords.filter(k => !isNoisyKeyword(k.keyword));

    // Check catalog coverage for each keyword (batch)
    const keywordNames = cleanKeywords.map(k => k.keyword);
    const coverageCounts = await Promise.all(
      keywordNames.map(kw =>
        prisma.product.count({
          where: {
            status: "ACTIVE",
            OR: [
              { name: { contains: kw, mode: "insensitive" } },
              { listings: { some: { rawTitle: { contains: kw, mode: "insensitive" } } } },
            ],
          },
        }).catch(() => 0)
      )
    );

    // Check if trend matches categories with imported products (defensive)
    let importedCategories: Set<string> = new Set();
    try {
      const catResults = await prisma.$queryRaw<{ name: string }[]>`
        SELECT DISTINCT c.name FROM categories c
        JOIN products p ON p."categoryId" = c.id
        WHERE p."originType" = 'imported' AND p.status = 'ACTIVE'
      `;
      importedCategories = new Set((catResults as any[]).map(r => r.name?.toLowerCase()).filter(Boolean));
    } catch {
      // originType column may not exist — skip
    }

    // Build enriched keywords
    const enrichedKeywords = cleanKeywords.slice(0, 15).map((k, i) => {
      const category = inferCategory(k.keyword);
      const catalogCount = coverageCounts[i] || 0;
      const catalogCoverage = catalogCount > 0;

      // Monetization potential: higher if matching imported categories or existing products
      let monetizationPotential = 0;
      if (catalogCoverage) monetizationPotential += 40;
      if (catalogCount >= 3) monetizationPotential += 20;
      if (catalogCount >= 10) monetizationPotential += 15;
      if (category && importedCategories.has(category.toLowerCase())) monetizationPotential += 25;
      // Position bonus: top trends get a boost
      if (k.position <= 3) monetizationPotential = Math.min(monetizationPotential + 10, 100);

      return {
        keyword: k.keyword,
        position: k.position,
        url: k.url,
        category,
        catalogCoverage,
        catalogCount,
        monetizationPotential: Math.min(monetizationPotential, 100),
      };
    });

    // Group by category
    const grouped: Record<string, typeof enrichedKeywords> = {};
    for (const kw of enrichedKeywords) {
      const cat = kw.category || "Outros";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(kw);
    }

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

    const responseData = {
      keywords: enrichedKeywords,
      keywordsByCategory: grouped,
      products,
      count: products.length,
      source: products.length > 0 ? "database" : "empty",
      message: products.length === 0
        ? "Nenhum produto trending encontrado. Importe produtos via ML Discovery para popular o catalogo."
        : undefined,
    };

    await cache.set(cacheKey, responseData, TRENDING_CACHE_TTL);
    const response = NextResponse.json(responseData);
    return withRateLimitHeaders(response, rl);
  } catch (error) {
    console.error("[api/trending] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Erro ao buscar trending. Tente novamente." },
      { status: 500 }
    );
  }
}
