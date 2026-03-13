import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import prisma from '@/lib/db/prisma'
import { getCatalogHealth, findZeroResultSearches } from '@/lib/discovery'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const [
      catalogHealth,
      zeroResultSearches,
      recentJobs,
      searchStats,
      trendCount,
    ] = await Promise.all([
      getCatalogHealth(),
      findZeroResultSearches(15),
      // Recent job runs
      prisma.jobRun.findMany({
        where: { startedAt: { gte: sevenDaysAgo } },
        select: {
          id: true, jobName: true, status: true,
          startedAt: true, endedAt: true, durationMs: true,
          itemsTotal: true, itemsDone: true,
          errorLog: true,
        },
        orderBy: { startedAt: 'desc' },
        take: 30,
      }),
      // Search metrics
      prisma.$queryRaw<{ total: number; zeroResults: number; avgResults: number }[]>`
        SELECT
          COUNT(*)::int as total,
          SUM(CASE WHEN "resultsCount" = 0 THEN 1 ELSE 0 END)::int as "zeroResults",
          COALESCE(AVG("resultsCount"), 0)::float as "avgResults"
        FROM search_logs
        WHERE "createdAt" > ${sevenDaysAgo}
      `.catch(() => [{ total: 0, zeroResults: 0, avgResults: 0 }]),
      // Trending keywords count
      prisma.trendingKeyword.count({
        where: { fetchedAt: { gte: oneDayAgo } },
      }),
    ])

    // Job health summary
    const jobHealthMap = new Map<string, { total: number; success: number; failed: number; avgDurationMs: number }>()
    for (const job of recentJobs) {
      const entry = jobHealthMap.get(job.jobName) || { total: 0, success: 0, failed: 0, avgDurationMs: 0 }
      entry.total++
      if (job.status === 'SUCCESS') entry.success++
      if (job.status === 'FAILED') entry.failed++
      entry.avgDurationMs += (job.durationMs || 0)
      jobHealthMap.set(job.jobName, entry)
    }
    const jobHealth = Array.from(jobHealthMap.entries()).map(([name, stats]) => ({
      name,
      ...stats,
      avgDurationMs: stats.total > 0 ? Math.round(stats.avgDurationMs / stats.total) : 0,
      successRate: stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0,
    }))

    const ss = searchStats[0] || { total: 0, zeroResults: 0, avgResults: 0 }

    return NextResponse.json({
      ok: true,
      timestamp: now.toISOString(),
      catalog: {
        totalProducts: catalogHealth.totalProducts,
        activeProducts: catalogHealth.activeProducts,
        withOffers: catalogHealth.productsWithOffers,
        stale7d: catalogHealth.productsStale7d,
        noPrice: catalogHealth.productsNoPrice,
        categoriesHealth: catalogHealth.categoryCoverage.map(c => ({
          name: c.name,
          products: c.productCount,
          offers: c.activeOfferCount,
          avgScore: c.avgOfferScore,
          status: c.healthStatus,
        })),
        sourceHealth: catalogHealth.sourceBreakdown.map(s => ({
          name: s.name,
          listings: s.totalListings,
          activeOffers: s.activeOffers,
          avgPrice: s.avgPrice,
        })),
      },
      search: {
        total7d: ss.total,
        zeroResult7d: ss.zeroResults,
        zeroResultRate: ss.total > 0 ? Math.round((ss.zeroResults / ss.total) * 100) : 0,
        avgResults: Math.round(ss.avgResults * 10) / 10,
        topGaps: zeroResultSearches.map(z => ({
          query: z.query,
          count: z.count,
          last: z.lastSearched,
        })),
      },
      jobs: {
        recentRuns: recentJobs.slice(0, 10).map(j => ({
          id: j.id,
          name: j.jobName,
          status: j.status,
          startedAt: j.startedAt,
          durationMs: j.durationMs,
          items: `${j.itemsDone || 0}/${j.itemsTotal || 0}`,
          error: j.status === 'FAILED' ? (j.errorLog?.slice(0, 100) || null) : null,
        })),
        health: jobHealth,
      },
      trends: {
        recentCount24h: trendCount,
      },
    })
  } catch (err) {
    console.error('[admin/observability] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Erro ao gerar observabilidade' }, { status: 500 })
  }
}
