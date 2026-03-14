import prisma from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"

export interface SearchIntelligence {
  topQueries: Array<{ query: string; count: number }>
  zeroResultQueries: Array<{ query: string; count: number; lastSearched: string }>
  risingQueries: Array<{ query: string; count7d: number; count30d: number; growth: number }>
  conversionRate: number // searches with clicks / total searches
}

export async function getSearchIntelligence(days = 30): Promise<SearchIntelligence> {
  const since = new Date(Date.now() - days * 86400000)
  const since7d = new Date(Date.now() - 7 * 86400000)

  try {
    // Top queries
    const topQueries = await prisma.$queryRaw<Array<{ query: string; count: bigint }>>(
      Prisma.sql`
        SELECT "normalizedQuery" as query, COUNT(*) as count
        FROM "SearchLog"
        WHERE "createdAt" > ${since}
        GROUP BY "normalizedQuery"
        ORDER BY count DESC
        LIMIT 20
      `
    )

    // Zero-result queries
    const zeroResults = await prisma.$queryRaw<Array<{ query: string; count: bigint; last_searched: Date }>>(
      Prisma.sql`
        SELECT "normalizedQuery" as query, COUNT(*) as count, MAX("createdAt") as last_searched
        FROM "SearchLog"
        WHERE "createdAt" > ${since} AND "resultsCount" = 0
        GROUP BY "normalizedQuery"
        ORDER BY count DESC
        LIMIT 20
      `
    )

    // Rising queries (7d vs 30d growth)
    const rising = await prisma.$queryRaw<Array<{ query: string; count_7d: bigint; count_30d: bigint }>>(
      Prisma.sql`
        SELECT
          "normalizedQuery" as query,
          COUNT(*) FILTER (WHERE "createdAt" > ${since7d}) as count_7d,
          COUNT(*) as count_30d
        FROM "SearchLog"
        WHERE "createdAt" > ${since}
        GROUP BY "normalizedQuery"
        HAVING COUNT(*) >= 3
        ORDER BY COUNT(*) FILTER (WHERE "createdAt" > ${since7d}) DESC
        LIMIT 20
      `
    )

    // Conversion rate
    const conversionResult = await prisma.$queryRaw<[{ total: bigint; with_click: bigint }]>(
      Prisma.sql`
        SELECT
          COUNT(*) as total,
          COUNT("clickedProductId") as with_click
        FROM "SearchLog"
        WHERE "createdAt" > ${since}
      `
    )

    const total = Number(conversionResult[0]?.total || 0)
    const withClick = Number(conversionResult[0]?.with_click || 0)

    return {
      topQueries: topQueries.map(q => ({ query: q.query, count: Number(q.count) })),
      zeroResultQueries: zeroResults.map(q => ({
        query: q.query,
        count: Number(q.count),
        lastSearched: q.last_searched.toISOString(),
      })),
      risingQueries: rising.map(q => {
        const count7d = Number(q.count_7d)
        const count30d = Number(q.count_30d)
        const growth = count30d > count7d ? Math.round(((count7d * 4.3) / count30d - 1) * 100) : 0
        return { query: q.query, count7d, count30d, growth }
      }).filter(q => q.growth > 0).sort((a, b) => b.growth - a.growth),
      conversionRate: total > 0 ? Math.round((withClick / total) * 100) : 0,
    }
  } catch {
    return { topQueries: [], zeroResultQueries: [], risingQueries: [], conversionRate: 0 }
  }
}
