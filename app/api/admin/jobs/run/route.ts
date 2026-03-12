import { NextRequest, NextResponse } from 'next/server'

const ADMIN_SECRET = process.env.ADMIN_SECRET

function isAuthorized(req: NextRequest): boolean {
  if (!ADMIN_SECRET) return true // no secret = open (dev)
  const auth = req.headers.get('authorization')
  if (auth === `Bearer ${ADMIN_SECRET}`) return true
  const url = new URL(req.url)
  return url.searchParams.get('secret') === ADMIN_SECRET
}

const JOB_MAP: Record<string, () => Promise<any>> = {}

async function loadJobs() {
  if (Object.keys(JOB_MAP).length > 0) return
  const { ingestMLTrends } = await import('@/lib/jobs/ingest-ml')
  const { updatePrices } = await import('@/lib/jobs/update-prices')
  const { computeScores } = await import('@/lib/jobs/compute-scores')
  const { cleanupData } = await import('@/lib/jobs/cleanup')
  const { generateSitemap } = await import('@/lib/jobs/generate-sitemap')
  const { checkAlerts } = await import('@/lib/jobs/check-alerts')
  JOB_MAP['ingest'] = ingestMLTrends
  JOB_MAP['update-prices'] = updatePrices
  JOB_MAP['compute-scores'] = computeScores
  JOB_MAP['cleanup'] = cleanupData
  JOB_MAP['sitemap'] = generateSitemap
  JOB_MAP['check-alerts'] = checkAlerts
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const jobName = body.job as string

    await loadJobs()

    const jobFn = JOB_MAP[jobName]
    if (!jobFn) {
      return NextResponse.json(
        { error: `Unknown job: ${jobName}. Available: ${Object.keys(JOB_MAP).join(', ')}` },
        { status: 400 }
      )
    }

    const result = await jobFn()
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Job execution failed' },
      { status: 500 }
    )
  }
}
