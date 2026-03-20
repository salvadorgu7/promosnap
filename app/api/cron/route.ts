import { NextRequest, NextResponse } from 'next/server'
import { captureError, captureEvent, logInfo, logWarn } from '@/lib/monitoring'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { timingSafeEqual } from 'crypto'

const CRON_SECRET = process.env.CRON_SECRET

/** Constant-time string comparison to prevent timing attacks */
function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8')
    const bufB = Buffer.from(b, 'utf-8')
    if (bufA.length !== bufB.length) {
      // Compare against itself to maintain constant time
      timingSafeEqual(bufA, bufA)
      return false
    }
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  // Auth: if CRON_SECRET is configured, enforce it. Otherwise allow (dev/preview mode).
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET) {
    if (!authHeader || !safeCompare(authHeader, `Bearer ${CRON_SECRET}`)) {
      logWarn('cron', 'Unauthorized cron request rejected')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  } else {
    // In production/preview: block cron without secret (fail-closed)
    const env = process.env.VERCEL_ENV || process.env.NODE_ENV;
    if (env === 'production' || env === 'preview') {
      logWarn('cron', 'CRON_SECRET not configured in production — blocking request')
      return NextResponse.json({ error: 'CRON_SECRET required in production' }, { status: 503 })
    }
    logWarn('cron', 'CRON_SECRET not configured — running in open mode (dev only)')
    const rl = rateLimit(req, 'admin')
    if (!rl.success) return rateLimitResponse(rl)
  }

  // Support running a subset of jobs via ?jobs=compute-scores,check-alerts
  const jobsParam = req.nextUrl.searchParams.get('jobs')

  const results: Record<string, any> = {}
  const startTime = Date.now()

  captureEvent('cron:start')

  const allJobs: [string, () => Promise<any>][] = [
    // ingest: VALUE — ingests ML trending keywords for discovery
    ['ingest', () => import('@/lib/jobs/ingest-ml').then(m => m.ingestMLTrends())],
    // update-prices: VALUE — refreshes prices for tracked listings
    ['update-prices', () => import('@/lib/jobs/update-prices').then(m => m.updatePrices())],
    // compute-scores: SUPPORT — recalculates offer and popularity scores
    ['compute-scores', () => import('@/lib/jobs/compute-scores').then(m => m.computeScores())],
    // discover-import: VALUE — discovers and imports new real products
    ['discover-import', () => import('@/lib/jobs/discover-import').then(m => m.discoverAndImport())],
    // cleanup: HYGIENE — removes stale data
    ['cleanup', () => import('@/lib/jobs/cleanup').then(m => m.cleanupData())],
    // check-alerts: VALUE — triggers price alerts and sends emails
    ['check-alerts', () => import('@/lib/jobs/check-alerts').then(m => m.checkAlerts())],
    // backfill-images: HYGIENE — heals products missing images from listings/ML API
    ['backfill-images', () => import('@/lib/jobs/backfill-images').then(m => m.backfillImages())],
    // sitemap: SUPPORT — regenerates XML sitemap
    ['sitemap', () => import('@/lib/jobs/generate-sitemap').then(m => m.generateSitemap())],
    // process-promosapp: VALUE — processes approved PromosApp candidates into import pipeline (behind feature flag)
    ['process-promosapp', () => import('@/lib/jobs/process-promosapp').then(m => m.processPromosApp())],
    // seo-audit: SUPPORT — daily SEO health audit with regression detection
    ['seo-audit', () => import('@/lib/jobs/seo-audit').then(m => m.seoAudit())],
    // category-fill: HYGIENE — auto-categorizes uncategorized products by title keywords
    ['category-fill', async () => {
      const { inferCategory } = await import('@/lib/catalog/normalize')
      const pMod = await import('@/lib/db/prisma')
      const db = pMod.default

      const uncategorized = await db.product.findMany({
        where: { status: 'ACTIVE', categoryId: null },
        select: { id: true, name: true },
        take: 500,
      })

      let categorized = 0
      for (const p of uncategorized) {
        const slug = inferCategory(p.name)
        if (!slug) continue
        const cat = await db.category.upsert({
          where: { slug },
          create: { name: slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), slug },
          update: {},
        })
        await db.product.update({ where: { id: p.id }, data: { categoryId: cat.id } })
        categorized++
      }

      return { itemsTotal: uncategorized.length, itemsDone: categorized, metadata: { categorized } }
    }],
    // auto-pages: GROWTH — auto-generates landing pages from popular search queries
    ['auto-pages', () => import('@/lib/jobs/auto-pages').then(m => m.autoGeneratePages())],
    // generate-content: GROWTH — auto-generates article drafts from content recommendations
    ['generate-content', () => import('@/lib/jobs/generate-content').then(m => m.generateContentJob())],
    // personalized-digest: RETENTION — sends weekly personalized digest emails
    ['personalized-digest', () => import('@/lib/jobs/personalized-digest-job').then(m => m.runPersonalizedDigest())],
    // price-drop-radar: RETENTION — detects price drops and notifies subscribers
    ['price-drop-radar', () => import('@/lib/jobs/price-drop-radar').then(m => m.runPriceDropRadar())],
  ]

  // Filter to requested subset if ?jobs= is provided
  const requestedJobs = jobsParam
    ? jobsParam.split(',').map(j => j.trim()).filter(Boolean)
    : null
  const jobs = requestedJobs
    ? allJobs.filter(([name]) => requestedJobs.includes(name))
    : allJobs

  if (requestedJobs && jobs.length === 0) {
    return NextResponse.json({
      error: `No matching jobs. Available: ${allJobs.map(j => j[0]).join(', ')}`,
    }, { status: 400 })
  }

  let failedCount = 0

  for (const [name, fn] of jobs) {
    const jobStart = Date.now()
    try {
      results[name] = await fn()
      logInfo('cron', `Job ${name} completed in ${Date.now() - jobStart}ms`)
    } catch (error) {
      failedCount++
      await captureError(error, { route: '/api/cron', job: name })
      results[name] = { status: 'FAILED', error: 'Job execution failed' }
    }
  }

  const totalDuration = Date.now() - startTime

  captureEvent('cron:complete', {
    durationMs: totalDuration,
    jobCount: jobs.length,
    failedCount,
  })

  if (failedCount > 0) {
    logWarn('cron', `Cron cycle completed with ${failedCount} failure(s) in ${totalDuration}ms`)
  } else {
    logInfo('cron', `Cron cycle completed successfully in ${totalDuration}ms`)
  }

  // Health check & alerting after all jobs complete
  let healthReport: any = null
  try {
    const { checkAndAlert } = await import('@/lib/jobs/health')
    healthReport = await checkAndAlert()
  } catch (err) {
    logWarn('cron', `Health check failed: ${String(err)}`)
  }

  // Build recommendations based on job results
  const recommendations: string[] = []
  const discoverResult = results['discover-import']
  if (discoverResult) {
    const itemsDone = discoverResult?.itemsDone ?? discoverResult?.status === 'FAILED' ? -1 : 0
    if (itemsDone === 0 || (discoverResult?.metadata?.created === 0 && discoverResult?.metadata?.updated === 0)) {
      recommendations.push('discover-import returned 0 products — check ML API credentials and rate limits')
    }
  }
  const alertResult = results['check-alerts']
  if (alertResult && alertResult?.metadata?.checked === 0 && alertResult?.status !== 'FAILED') {
    recommendations.push('check-alerts found 0 active alerts — add price alerts for imported products')
  }
  const scoresResult = results['compute-scores']
  if (scoresResult && (scoresResult?.itemsTotal === 0 || scoresResult?.itemsDone === 0) && scoresResult?.status !== 'FAILED') {
    recommendations.push('compute-scores found 0 active offers — import real products first')
  }

  return NextResponse.json({
    ok: failedCount === 0,
    totalDurationMs: totalDuration,
    jobCount: jobs.length,
    failedCount,
    results,
    ...(recommendations.length > 0 ? { recommendations } : {}),
    ...(healthReport ? { health: { healthy: healthReport.healthy, summary: healthReport.summary, criticalIssues: healthReport.criticalIssues, warningIssues: healthReport.warningIssues } } : {}),
  })
}
