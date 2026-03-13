import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import prisma from '@/lib/db/prisma'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
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
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
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

    return NextResponse.json({
      services,
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
    })
  } catch (error) {
    console.error('[admin/status] Error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
