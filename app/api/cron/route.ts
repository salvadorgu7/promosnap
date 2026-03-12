import { NextRequest, NextResponse } from 'next/server'
import { captureError, captureEvent } from '@/lib/monitoring'

const CRON_SECRET = process.env.CRON_SECRET

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization header
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Record<string, any> = {}
  const startTime = Date.now()

  captureEvent('cron:start', { timestamp: new Date().toISOString() })

  const jobs = [
    ['ingest', () => import('@/lib/jobs/ingest-ml').then(m => m.ingestMLTrends())],
    ['update-prices', () => import('@/lib/jobs/update-prices').then(m => m.updatePrices())],
    ['compute-scores', () => import('@/lib/jobs/compute-scores').then(m => m.computeScores())],
    ['cleanup', () => import('@/lib/jobs/cleanup').then(m => m.cleanupData())],
    ['check-alerts', () => import('@/lib/jobs/check-alerts').then(m => m.checkAlerts())],
    ['sitemap', () => import('@/lib/jobs/generate-sitemap').then(m => m.generateSitemap())],
  ] as const

  for (const [name, fn] of jobs) {
    try {
      results[name] = await fn()
    } catch (error) {
      await captureError(error, { route: '/api/cron', job: name })
      results[name] = { status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown' }
    }
  }

  captureEvent('cron:complete', {
    durationMs: Date.now() - startTime,
    jobCount: jobs.length,
  })

  return NextResponse.json({
    ok: true,
    totalDurationMs: Date.now() - startTime,
    results,
  })
}
