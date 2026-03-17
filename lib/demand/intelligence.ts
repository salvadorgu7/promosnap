/**
 * Demand Intelligence
 *
 * Analyzes search logs to identify demand patterns, gaps,
 * opportunities, and growth loops for the catalog.
 */

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

// ── Types ──

interface DemandQuery {
  query: string;
  normalizedQuery: string;
  count: number;
  recencyScore: number;
  demandScore: number;
  lastSearched: Date;
}

interface DemandGap {
  query: string;
  searchCount: number;
  avgResultsCount: number;
  lastSearched: Date;
}

interface DemandOpportunity {
  query: string;
  searchCount: number;
  avgResultsCount: number;
  clickoutCount: number;
  conversionRate: number;
}

type QueryIntent = "brand" | "category" | "promotion" | "comparison" | "product";

interface QueryClassification {
  query: string;
  intent: QueryIntent;
  confidence: number;
}

interface GrowthLoop {
  query: string;
  searchCount: number;
  intent: QueryIntent;
  potentialSlug: string;
  hasExistingPage: boolean;
}

// ── Intent keywords ──

const PROMO_KEYWORDS = [
  "desconto",
  "promo",
  "cupom",
  "oferta",
  "black friday",
  "sale",
  "barato",
  "liquidacao",
  "promocao",
  "cashback",
  "frete gratis",
  "outlet",
];

const COMPARISON_KEYWORDS = [
  "vs",
  "versus",
  "comparar",
  "melhor",
  "diferenca",
  "ou",
  "qual",
  "compare",
  "review",
];

// ── Top Demand Queries ──

/**
 * Queries ranked by frequency x recency.
 * More recent searches get a higher recency boost.
 */
export async function getTopDemandQueries(
  limit: number = 20
): Promise<DemandQuery[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await prisma.searchLog.groupBy({
      by: ["normalizedQuery"],
      where: {
        normalizedQuery: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
      _max: { createdAt: true },
      orderBy: { _count: { id: "desc" } },
      take: limit * 2, // fetch extra for re-ranking
    });

    const now = Date.now();
    const scored = results
      .filter((r) => r.normalizedQuery != null)
      .map((r) => {
        const lastSearched = r._max.createdAt ?? new Date();
        const daysSinceLast =
          (now - lastSearched.getTime()) / (1000 * 60 * 60 * 24);
        // Recency decay: 1.0 for today, ~0.5 at 7 days, ~0.1 at 30 days
        const recencyScore = Math.exp(-daysSinceLast / 10);
        const count = r._count.id;
        const demandScore = Math.round(count * recencyScore * 100) / 100;

        return {
          query: r.normalizedQuery!,
          normalizedQuery: r.normalizedQuery!,
          count,
          recencyScore: Math.round(recencyScore * 100) / 100,
          demandScore,
          lastSearched,
        };
      });

    scored.sort((a, b) => b.demandScore - a.demandScore);
    return scored.slice(0, limit);
  } catch (error) {
    logger.error("demand.intelligence.top-queries.error", { error });
    return [];
  }
}

// ── Demand Gaps ──

/**
 * High-frequency queries that returned low or zero results.
 * These represent unmet user demand.
 */
export async function getDemandGaps(limit: number = 20): Promise<DemandGap[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const results = await prisma.searchLog.groupBy({
      by: ["normalizedQuery"],
      where: {
        normalizedQuery: { not: null },
        createdAt: { gte: thirtyDaysAgo },
        resultsCount: { not: null },
      },
      _count: { id: true },
      _avg: { resultsCount: true },
      _max: { createdAt: true },
      having: {
        id: { _count: { gte: 3 } },
      },
      orderBy: { _count: { id: "desc" } },
      take: limit * 3,
    });

    return results
      .filter(
        (r) =>
          r.normalizedQuery != null &&
          r._avg.resultsCount != null &&
          r._avg.resultsCount <= 2
      )
      .map((r) => ({
        query: r.normalizedQuery!,
        searchCount: r._count.id,
        avgResultsCount: Math.round((r._avg.resultsCount ?? 0) * 10) / 10,
        lastSearched: r._max.createdAt ?? new Date(),
      }))
      .slice(0, limit);
  } catch (error) {
    logger.error("demand.intelligence.demand-gaps.error", { error });
    return [];
  }
}

// ── Demand Opportunities ──

/**
 * Queries where we have products (results > 0) but low clickout rates.
 * Indicates potential UX or merchandising issues.
 */
export async function getDemandOpportunities(
  limit: number = 20
): Promise<DemandOpportunity[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get queries with results
    const searchGroups = await prisma.searchLog.groupBy({
      by: ["normalizedQuery"],
      where: {
        normalizedQuery: { not: null },
        createdAt: { gte: thirtyDaysAgo },
        resultsCount: { gt: 0 },
      },
      _count: { id: true },
      _avg: { resultsCount: true },
      having: {
        id: { _count: { gte: 5 } },
      },
      orderBy: { _count: { id: "desc" } },
      take: 50,
    });

    // Get clickout counts by query
    const clickoutGroups = await prisma.clickout.groupBy({
      by: ["query"],
      where: {
        query: { not: null },
        clickedAt: { gte: thirtyDaysAgo },
      },
      _count: { id: true },
    });

    const clickoutMap = new Map(
      clickoutGroups
        .filter((c) => c.query != null)
        .map((c) => [c.query!.toLowerCase().trim(), c._count.id])
    );

    const opportunities = searchGroups
      .filter((s) => s.normalizedQuery != null)
      .map((s) => {
        const query = s.normalizedQuery!;
        const searchCount = s._count.id;
        const clickoutCount = clickoutMap.get(query.toLowerCase().trim()) ?? 0;
        const conversionRate =
          searchCount > 0
            ? Math.round((clickoutCount / searchCount) * 10000) / 10000
            : 0;

        return {
          query,
          searchCount,
          avgResultsCount:
            Math.round((s._avg.resultsCount ?? 0) * 10) / 10,
          clickoutCount,
          conversionRate,
        };
      })
      .filter((o) => o.conversionRate < 0.1) // Less than 10% conversion
      .sort((a, b) => b.searchCount - a.searchCount);

    return opportunities.slice(0, limit);
  } catch (error) {
    logger.error("demand.intelligence.demand-opportunities.error", { error });
    return [];
  }
}

// ── Query Intent Classification ──

/**
 * Classify a search query's intent using keyword heuristics.
 */
export function getQueryIntentClassification(
  query: string
): QueryClassification {
  const q = query.toLowerCase().trim();

  // Check promotion intent
  if (PROMO_KEYWORDS.some((kw) => q.includes(kw))) {
    return { query, intent: "promotion", confidence: 0.8 };
  }

  // Check comparison intent
  if (COMPARISON_KEYWORDS.some((kw) => q.includes(kw))) {
    return { query, intent: "comparison", confidence: 0.8 };
  }

  // Check brand intent: typically single/two words, capitalized, no generic terms
  const words = q.split(/\s+/);
  if (words.length <= 2) {
    // Could be a brand name — check if it matches known brands
    // For now, use heuristic: short queries without category words
    const CATEGORY_WORDS = [
      "celular",
      "notebook",
      "tv",
      "fone",
      "monitor",
      "teclado",
      "mouse",
      "camera",
      "tablet",
      "geladeira",
      "fogao",
      "microondas",
      "ar condicionado",
      "ventilador",
      "aspirador",
      "cafeteira",
      "smartphone",
      "headphone",
      "smartwatch",
      "caixa de som",
    ];
    const isCategoryWord = CATEGORY_WORDS.some(
      (cw) => q === cw || q.includes(cw)
    );
    if (!isCategoryWord && words.length === 1 && words[0].length > 2) {
      return { query, intent: "brand", confidence: 0.5 };
    }
    if (isCategoryWord) {
      return { query, intent: "category", confidence: 0.7 };
    }
  }

  // Multi-word queries are likely product searches
  if (words.length >= 2) {
    return { query, intent: "product", confidence: 0.6 };
  }

  // Default to category for very short queries
  return { query, intent: "category", confidence: 0.4 };
}

// ── Growth Loops ──

/**
 * High-frequency queries with commercial intent that could
 * become dedicated landing pages for SEO/conversion.
 */
export async function getGrowthLoops(
  limit: number = 15
): Promise<GrowthLoop[]> {
  try {
    const topQueries = await getTopDemandQueries(50);
    const commercialIntents: QueryIntent[] = [
      "product",
      "category",
      "promotion",
    ];

    const loops: GrowthLoop[] = [];

    for (const dq of topQueries) {
      const classification = getQueryIntentClassification(dq.query);
      if (!commercialIntents.includes(classification.intent)) continue;
      if (dq.count < 3) continue;

      const potentialSlug = dq.query
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .substring(0, 60);

      // Check if a category page already exists with this slug
      const existingCategory = await prisma.category.findUnique({
        where: { slug: potentialSlug },
        select: { id: true },
      });

      loops.push({
        query: dq.query,
        searchCount: dq.count,
        intent: classification.intent,
        potentialSlug,
        hasExistingPage: !!existingCategory,
      });

      if (loops.length >= limit) break;
    }

    return loops;
  } catch (error) {
    logger.error("demand.intelligence.growth-loops.error", { error });
    return [];
  }
}
