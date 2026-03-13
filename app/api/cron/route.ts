import { NextRequest, NextResponse } from 'next/server'
import { captureError, captureEvent, logInfo, logWarn } from '@/lib/monitoring'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  if (!CRON_SECRET) {
    logWarn('cron', 'CRON_SECRET is not configured')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  // Vercel Cron sends Authorization header
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    logWarn('cron', 'Unauthorized cron request rejected')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, any> = {}
  const startTime = Date.now()

  captureEvent('cron:start')

  const jobs = [
    ['ingest', () => import('@/lib/jobs/ingest-ml').then(m => m.ingestMLTrends())],
    ['update-prices', () => import('@/lib/jobs/update-prices').then(m => m.updatePrices())],
    ['compute-scores', () => import('@/lib/jobs/compute-scores').then(m => m.computeScores())],
    ['cleanup', () => import('@/lib/jobs/cleanup').then(m => m.cleanupData())],
    ['check-alerts', () => import('@/lib/jobs/check-alerts').then(m => m.checkAlerts())],
    ['sitemap', () => import('@/lib/jobs/generate-sitemap').then(m => m.generateSitemap())],
  ] as const

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

  return NextResponse.json({
    ok: failedCount === 0,
    totalDurationMs: totalDuration,
    jobCount: jobs.length,
    failedCount,
    results,
  })
}
