/**
 * Demand Graph — analyzes search patterns to find high-demand products/categories.
 * Queries SearchLog to build demand signals: what users search for, what converts, what has zero results.
 */
import prisma from "@/lib/db/prisma";

export interface DemandSignal {
  query: string;
  count: number;
  hasResults: boolean;
  avgResultCount: number;
  lastSearched: Date;
  clickthroughRate: number; // clicks / searches
  category?: string;
}

export interface DemandSummary {
  topQueries: DemandSignal[];
  zeroResultQueries: DemandSignal[];
  highDemandLowSupply: DemandSignal[];
  trendingUp: DemandSignal[];
  totalSearches: number;
  uniqueQueries: number;
  zeroResultRate: number;
}

export async function getDemandGraph(days: number = 30): Promise<DemandSummary> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    // Get search logs grouped by query
    const searchLogs = await prisma.$queryRaw<Array<{
      query: string;
      count: bigint;
      has_results: boolean;
      avg_results: number;
      last_searched: Date;
    }>>`
      SELECT
        query,
        COUNT(*) as count,
        BOOL_OR("resultsCount" > 0) as has_results,
        AVG("resultsCount")::float as avg_results,
        MAX("createdAt") as last_searched
      FROM "search_logs"
      WHERE "createdAt" >= ${since}
        AND query IS NOT NULL
        AND query != ''
      GROUP BY query
      ORDER BY count DESC
      LIMIT 200
    `;

    // Get clickout counts per query for CTR calculation
    const clickouts = await prisma.$queryRaw<Array<{
      query: string;
      clicks: bigint;
    }>>`
      SELECT
        query,
        COUNT(*) as clicks
      FROM "clickouts"
      WHERE "clickedAt" >= ${since}
        AND query IS NOT NULL
      GROUP BY query
    `;

    const clickMap = new Map<string, number>();
    for (const c of clickouts) {
      clickMap.set(c.query, Number(c.clicks));
    }

    const signals: DemandSignal[] = searchLogs.map(s => ({
      query: s.query,
      count: Number(s.count),
      hasResults: s.has_results,
      avgResultCount: Math.round(s.avg_results || 0),
      lastSearched: s.last_searched,
      clickthroughRate: clickMap.get(s.query)
        ? (clickMap.get(s.query)! / Number(s.count))
        : 0,
    }));

    const totalSearches = signals.reduce((sum, s) => sum + s.count, 0);
    const zeroResults = signals.filter(s => !s.hasResults);

    // Get recent 7-day data for trending detection
    const recentSince = new Date();
    recentSince.setDate(recentSince.getDate() - 7);

    const recentSearches = await prisma.$queryRaw<Array<{
      query: string;
      count: bigint;
    }>>`
      SELECT query, COUNT(*) as count
      FROM "search_logs"
      WHERE "createdAt" >= ${recentSince}
        AND query IS NOT NULL AND query != ''
      GROUP BY query
      ORDER BY count DESC
      LIMIT 50
    `;

    const recentMap = new Map<string, number>();
    for (const r of recentSearches) {
      recentMap.set(r.query, Number(r.count));
    }

    // Trending = recent velocity higher than average
    const trendingUp = signals
      .filter(s => {
        const recent = recentMap.get(s.query) || 0;
        const avgWeekly = (s.count / Math.max(days / 7, 1));
        return recent > avgWeekly * 1.5 && recent >= 3;
      })
      .slice(0, 20);

    // High demand, low supply = searched often but few results
    const highDemandLowSupply = signals
      .filter(s => s.count >= 3 && s.avgResultCount < 5 && s.hasResults)
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      topQueries: signals.slice(0, 50),
      zeroResultQueries: zeroResults.slice(0, 30),
      highDemandLowSupply,
      trendingUp,
      totalSearches,
      uniqueQueries: signals.length,
      zeroResultRate: totalSearches > 0 ? zeroResults.reduce((s, z) => s + z.count, 0) / totalSearches : 0,
    };
  } catch {
    return {
      topQueries: [],
      zeroResultQueries: [],
      highDemandLowSupply: [],
      trendingUp: [],
      totalSearches: 0,
      uniqueQueries: 0,
      zeroResultRate: 0,
    };
  }
}

/**
 * Get demand signals for a specific category.
 */
export async function getCategoryDemand(categorySlug: string, days: number = 30): Promise<DemandSignal[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  try {
    const logs = await prisma.$queryRaw<Array<{
      query: string;
      count: bigint;
      avg_results: number;
      last_searched: Date;
    }>>`
      SELECT
        query,
        COUNT(*) as count,
        AVG("resultsCount")::float as avg_results,
        MAX("createdAt") as last_searched
      FROM "search_logs"
      WHERE "createdAt" >= ${since}
        AND query IS NOT NULL
        AND LOWER(query) LIKE '%' || LOWER(${categorySlug}) || '%'
      GROUP BY query
      ORDER BY count DESC
      LIMIT 30
    `;

    return logs.map(l => ({
      query: l.query,
      count: Number(l.count),
      hasResults: (l.avg_results || 0) > 0,
      avgResultCount: Math.round(l.avg_results || 0),
      lastSearched: l.last_searched,
      clickthroughRate: 0,
    }));
  } catch {
    return [];
  }
}
