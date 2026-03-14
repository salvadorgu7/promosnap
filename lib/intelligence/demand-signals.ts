import prisma from "@/lib/db/prisma"
import { Prisma } from "@prisma/client"

export interface DemandSignal {
  category: string
  clickouts7d: number
  alerts: number
  searches7d: number
  score: number // composite demand score
}

export interface DemandIntelligence {
  hotCategories: DemandSignal[]
  risingProducts: Array<{ name: string; slug: string; clickouts: number; alerts: number }>
  underservedQueries: Array<{ query: string; searches: number; resultsCount: number }>
}

export async function getDemandIntelligence(): Promise<DemandIntelligence> {
  const since7d = new Date(Date.now() - 7 * 86400000)

  try {
    // Hot categories by clickout volume
    const categoryClickouts = await prisma.$queryRaw<Array<{ category: string; count: bigint }>>(
      Prisma.sql`
        SELECT "categorySlug" as category, COUNT(*) as count
        FROM "ClickoutLog"
        WHERE "clickedAt" > ${since7d} AND "categorySlug" IS NOT NULL
        GROUP BY "categorySlug"
        ORDER BY count DESC
        LIMIT 10
      `
    )

    // Category alerts
    const categoryAlerts = await prisma.$queryRaw<Array<{ category: string; count: bigint }>>(
      Prisma.sql`
        SELECT c."slug" as category, COUNT(*) as count
        FROM "PriceAlert" pa
        JOIN "Listing" l ON l.id = pa."listingId"
        JOIN "Product" p ON p.id = l."productId"
        JOIN "Category" c ON c.id = p."categoryId"
        WHERE pa."isActive" = true
        GROUP BY c."slug"
        ORDER BY count DESC
        LIMIT 10
      `
    )

    // Build hot categories
    const catMap = new Map<string, DemandSignal>()
    for (const c of categoryClickouts) {
      catMap.set(c.category, {
        category: c.category,
        clickouts7d: Number(c.count),
        alerts: 0,
        searches7d: 0,
        score: 0,
      })
    }
    for (const c of categoryAlerts) {
      const existing = catMap.get(c.category)
      if (existing) {
        existing.alerts = Number(c.count)
      } else {
        catMap.set(c.category, {
          category: c.category,
          clickouts7d: 0,
          alerts: Number(c.count),
          searches7d: 0,
          score: 0,
        })
      }
    }

    const hotCategories = Array.from(catMap.values()).map(c => ({
      ...c,
      score: c.clickouts7d * 2 + c.alerts * 5 + c.searches7d,
    })).sort((a, b) => b.score - a.score)

    // Rising products (most clicked this week)
    const risingProducts = await prisma.$queryRaw<Array<{ name: string; slug: string; clickouts: bigint; alerts: bigint }>>(
      Prisma.sql`
        SELECT p."name", p."slug",
          COUNT(DISTINCT cl.id) as clickouts,
          COUNT(DISTINCT pa.id) as alerts
        FROM "Product" p
        JOIN "Listing" l ON l."productId" = p.id
        JOIN "Offer" o ON o."listingId" = l.id
        LEFT JOIN "ClickoutLog" cl ON cl."offerId" = o.id AND cl."clickedAt" > ${since7d}
        LEFT JOIN "PriceAlert" pa ON pa."listingId" = l.id AND pa."isActive" = true
        WHERE p."status" = 'ACTIVE'
        GROUP BY p.id, p."name", p."slug"
        HAVING COUNT(DISTINCT cl.id) > 0
        ORDER BY clickouts DESC
        LIMIT 10
      `
    )

    // Underserved queries (searched but few results)
    const underserved = await prisma.$queryRaw<Array<{ query: string; searches: bigint; avg_results: number }>>(
      Prisma.sql`
        SELECT "normalizedQuery" as query, COUNT(*) as searches, AVG("resultsCount")::int as avg_results
        FROM "SearchLog"
        WHERE "createdAt" > ${since7d}
        GROUP BY "normalizedQuery"
        HAVING AVG("resultsCount") < 5 AND COUNT(*) >= 2
        ORDER BY searches DESC
        LIMIT 15
      `
    )

    return {
      hotCategories,
      risingProducts: risingProducts.map(p => ({
        name: p.name, slug: p.slug,
        clickouts: Number(p.clickouts), alerts: Number(p.alerts),
      })),
      underservedQueries: underserved.map(q => ({
        query: q.query, searches: Number(q.searches),
        resultsCount: q.avg_results,
      })),
    }
  } catch {
    return { hotCategories: [], risingProducts: [], underservedQueries: [] }
  }
}
