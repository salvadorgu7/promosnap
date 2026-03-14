import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import prisma from '@/lib/db/prisma'
import { cache } from '@/lib/cache'
import { getAllFlags } from '@/lib/config/feature-flags'

const CACHE_KEY = 'admin:status'
const CACHE_TTL = 60 // 60 seconds

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const cached = await cache.get<Record<string, unknown>>(CACHE_KEY)
    if (cached) return NextResponse.json(cached)
    // Service configuration checks
    const services = {
      database: 'ok' as const,
      email: !!process.env.RESEND_API_KEY ? 'configured' : 'missing',
      cron: !!process.env.CRON_SECRET ? 'configured' : 'open_mode',
      ml: !!(
        (process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID) &&
        (process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET)
      ) ? 'configured' : 'missing',
      analytics: !!process.env.NEXT_PUBLIC_GA_ID ? 'configured' : 'missing',
      sentry: !!process.env.SENTRY_DSN ? 'configured' : 'missing',
      redis: !!process.env.REDIS_URL ? 'configured' : 'in_memory_fallback',
      admin: process.env.ADMIN_SECRET && process.env.ADMIN_SECRET !== 'change-me-in-production'
        ? 'configured' : 'weak',
    }

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // Catalog stats
    const [
      productCount,
      offerCount,
      listingCount,
      alertCount,
      activeAlertCount,
      triggeredAlertCount,
      subscriberCount,
      clickoutCount,
      searchLogCount,
      brandCount,
      categoryCount,
      couponCount,
    ] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.offer.count({ where: { isActive: true } }),
      prisma.listing.count({ where: { status: 'ACTIVE' } }),
      prisma.priceAlert.count(),
      prisma.priceAlert.count({ where: { isActive: true, triggeredAt: null } }),
      prisma.priceAlert.count({ where: { triggeredAt: { not: null } } }),
      prisma.subscriber.count({ where: { status: 'ACTIVE' } }),
      prisma.clickout.count(),
      prisma.searchLog.count(),
      prisma.brand.count(),
      prisma.category.count(),
      prisma.coupon.count({ where: { status: 'ACTIVE' } }),
    ])

    // ── Catalog origin stats (defensive) ─────────────────────────────────
    let realImported = 0
    let seedProducts = productCount
    let importedLast7d = 0
    try {
      const [imp, imp7d] = await Promise.all([
        prisma.product.count({ where: { status: 'ACTIVE', originType: 'imported' } }),
        prisma.product.count({ where: { status: 'ACTIVE', originType: 'imported', importedAt: { gte: sevenDaysAgo } } }),
      ])
      realImported = imp
      seedProducts = productCount - realImported
      importedLast7d = imp7d
    } catch {
      // originType column doesn't exist
    }

    // ── Top brands by product count ──────────────────────────────────────
    let topBrands: { name: string; count: number }[] = []
    try {
      const brands = await prisma.brand.findMany({
        select: { name: true, _count: { select: { products: true } } },
        orderBy: { products: { _count: 'desc' } },
        take: 5,
      })
      topBrands = brands.map(b => ({ name: b.name, count: b._count.products }))
    } catch { /* non-critical */ }

    // Last job runs
    const recentJobs = await prisma.jobRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 30,
      select: {
        jobName: true,
        status: true,
        startedAt: true,
        endedAt: true,
        durationMs: true,
        itemsTotal: true,
        itemsDone: true,
        errorLog: true,
      },
    })

    // Group by job name to get latest run per job
    const lastJobs: Record<string, {
      status: string
      startedAt: string
      endedAt: string | null
      durationMs: number | null
      itemsTotal: number | null
      itemsDone: number | null
      error: string | null
    }> = {}
    for (const job of recentJobs) {
      if (!lastJobs[job.jobName]) {
        lastJobs[job.jobName] = {
          status: job.status,
          startedAt: job.startedAt.toISOString(),
          endedAt: job.endedAt?.toISOString() || null,
          durationMs: job.durationMs,
          itemsTotal: job.itemsTotal,
          itemsDone: job.itemsDone,
          error: job.errorLog ? job.errorLog.slice(0, 200) : null,
        }
      }
    }

    // Trending status
    const trendingCount = await prisma.trendingKeyword.count().catch(() => 0)
    const latestTrend = await prisma.trendingKeyword.findFirst({
      orderBy: { fetchedAt: 'desc' },
      select: { fetchedAt: true },
    }).catch(() => null)

    // Search intelligence
    const [searchTotal7d, searchZero7d] = await Promise.all([
      prisma.searchLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.searchLog.count({ where: { createdAt: { gte: sevenDaysAgo }, resultsCount: 0 } }),
    ])

    // Email status
    const emailsSent = await prisma.emailLog.count({ where: { status: 'sent' } }).catch(() => 0)
    const emailsFailed = await prisma.emailLog.count({ where: { status: 'failed' } }).catch(() => 0)

    // Expected jobs vs actual runs
    const expectedJobs = ['ingest-ml-trends', 'update-prices', 'compute-scores', 'discover-import', 'cleanup-data', 'check-alerts', 'generate-sitemap']
    const jobCoverage = expectedJobs.map(name => ({
      job: name,
      hasRun: !!lastJobs[name],
      lastStatus: lastJobs[name]?.status || 'never',
    }))

    // Recommendations
    const recommendations: string[] = []
    if (services.email === 'missing') recommendations.push('Configurar RESEND_API_KEY para envio de emails')
    if (services.ml === 'missing') recommendations.push('Configurar MERCADOLIVRE_APP_ID + SECRET para discovery automatico')
    if (services.analytics === 'missing') recommendations.push('Configurar NEXT_PUBLIC_GA_ID para analytics')
    if (services.admin === 'weak') recommendations.push('ADMIN_SECRET esta com valor padrao — trocar em producao')
    if (services.cron === 'open_mode') recommendations.push('CRON_SECRET nao configurado — cron acessivel sem auth')
    if (subscriberCount === 0) recommendations.push('Nenhum subscriber ativo — rodar seed ou captar assinantes')
    if (activeAlertCount === 0) recommendations.push('Nenhum alerta ativo — promover funcionalidade para usuarios')
    if (clickoutCount === 0) recommendations.push('Nenhum clickout registrado — verificar tracking de affiliate links')
    if (Object.keys(lastJobs).length === 0) recommendations.push('Nenhum job executado — rodar cron manualmente')
    if (searchTotal7d > 0 && searchZero7d / searchTotal7d > 0.2) {
      recommendations.push(`Taxa de zero-result alta (${Math.round(searchZero7d / searchTotal7d * 100)}%) — expandir catalogo`)
    }
    if (trendingCount === 0) recommendations.push('Nenhuma keyword trending — rodar job ingest ou configurar ML')
    if (emailsFailed > emailsSent && emailsSent > 0) {
      recommendations.push('Taxa de falha de email superior a enviados — verificar RESEND_API_KEY')
    }

    // ── New catalog-health recommendations ───────────────────────────────
    if (realImported === 0) {
      recommendations.push("Nenhum produto real importado. Rode 'npm run import:real' ou o job discover-import.")
    }
    if (importedLast7d === 0 && realImported > 0) {
      recommendations.push('Nenhum produto novo importado nos ultimos 7 dias.')
    }

    // ── ML discovery pipeline status ─────────────────────────────────────
    let pipeline: Record<string, unknown> = {
      method: 'highlights -> products -> products/{id}/items -> import',
      searchApiBlocked: true,
      highlightsWorking: false,
      productsApiWorking: false,
      productItemsWorking: false,
      lastDiscoveryRun: null as string | null,
      lastDiscoveryProducts: 0,
    }
    try {
      const lastDiscovery = await prisma.jobRun.findFirst({
        where: { jobName: 'discover-import' },
        orderBy: { startedAt: 'desc' },
        select: { startedAt: true, status: true, metadata: true, itemsDone: true },
      })
      if (lastDiscovery) {
        pipeline.lastDiscoveryRun = lastDiscovery.startedAt.toISOString()
        pipeline.lastDiscoveryProducts = lastDiscovery.itemsDone ?? 0
        // Infer API status from metadata if available
        const meta = lastDiscovery.metadata as Record<string, unknown> | null
        if (meta) {
          const discoveryMs = meta.discoveryMs as number | undefined
          const productsDiscovered = (meta.created as number ?? 0) + (meta.updated as number ?? 0) + (meta.skipped as number ?? 0)
          // If discovery ran and found products, the pipeline APIs are working
          if (discoveryMs && discoveryMs > 0) {
            pipeline.highlightsWorking = true
            pipeline.productsApiWorking = true
          }
          if (productsDiscovered > 0 || (lastDiscovery.itemsDone ?? 0) > 0) {
            pipeline.productItemsWorking = true
          }
        }
        // If last run succeeded with items, all stages worked
        if (lastDiscovery.status === 'SUCCESS' && (lastDiscovery.itemsDone ?? 0) > 0) {
          pipeline.highlightsWorking = true
          pipeline.productsApiWorking = true
          pipeline.productItemsWorking = true
        }
      }
    } catch { /* non-critical */ }

    // ── Feature flags ─────────────────────────────────────────────────────
    const features = getAllFlags()

    // ── Environment info ──────────────────────────────────────────────────
    const environment = {
      nodeEnv: process.env.NODE_ENV ?? 'unknown',
      vercelEnv: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
      deploymentUrl: process.env.VERCEL_URL ?? null,
    }

    const responseData = {
      environment,
      services,
      features,
      pipeline,
      catalog: {
        products: productCount,
        offers: offerCount,
        listings: listingCount,
        brands: brandCount,
        categories: categoryCount,
        coupons: couponCount,
        alerts: alertCount,
        activeAlerts: activeAlertCount,
        triggeredAlerts: triggeredAlertCount,
        subscribers: subscriberCount,
        clickouts: clickoutCount,
        searchLogs: searchLogCount,
        realImported,
        seedProducts,
        importedLast7d,
        topBrands,
      },
      trending: {
        keywords: trendingCount,
        lastFetchedAt: latestTrend?.fetchedAt?.toISOString() || null,
      },
      search: {
        totalSearches7d: searchTotal7d,
        zeroResultSearches7d: searchZero7d,
        zeroResultRate: searchTotal7d > 0 ? Math.round(searchZero7d / searchTotal7d * 100) : 0,
      },
      email: {
        configured: services.email === 'configured',
        sent: emailsSent,
        failed: emailsFailed,
      },
      lastJobs,
      jobCoverage,
      recommendations,
      timestamp: new Date().toISOString(),
    }

    await cache.set(CACHE_KEY, responseData, CACHE_TTL)
    return NextResponse.json(responseData)
  } catch (error) {
    console.error('[admin/status] Error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
