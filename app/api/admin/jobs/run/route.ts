import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

// Job metadata for admin visibility
interface JobInfo {
  fn: () => Promise<any>
  description: string
  requiresCredentials?: string
  /** The jobName used in the JobRun table (may differ from the key in JOB_MAP) */
  jobRunName: string
}

const JOB_MAP: Record<string, JobInfo> = {}

async function loadJobs() {
  if (Object.keys(JOB_MAP).length > 0) return
  const { ingestMLTrends } = await import('@/lib/jobs/ingest-ml')
  const { updatePrices } = await import('@/lib/jobs/update-prices')
  const { computeScores } = await import('@/lib/jobs/compute-scores')
  const { cleanupData } = await import('@/lib/jobs/cleanup')
  const { generateSitemap } = await import('@/lib/jobs/generate-sitemap')
  const { checkAlerts } = await import('@/lib/jobs/check-alerts')
  const { discoverAndImport } = await import('@/lib/jobs/discover-import')

  JOB_MAP['ingest'] = { fn: ingestMLTrends, description: 'Importar trends do Mercado Livre', requiresCredentials: 'ML_CLIENT_ID', jobRunName: 'ingest-ml-trends' }
  JOB_MAP['update-prices'] = { fn: updatePrices, description: 'Atualizar precos e criar snapshots', jobRunName: 'update-prices' }
  JOB_MAP['compute-scores'] = { fn: computeScores, description: 'Recalcular scores de ofertas e produtos', jobRunName: 'compute-scores' }
  JOB_MAP['cleanup'] = { fn: cleanupData, description: 'Limpar dados antigos (snapshots, logs, ofertas stale)', jobRunName: 'cleanup' }
  JOB_MAP['sitemap'] = { fn: generateSitemap, description: 'Gerar contagem de URLs para sitemap', jobRunName: 'generate-sitemap' }
  JOB_MAP['check-alerts'] = { fn: checkAlerts, description: 'Verificar alertas de preco e enviar emails', requiresCredentials: 'RESEND_API_KEY (opcional)', jobRunName: 'check-alerts' }
  JOB_MAP['discover-import'] = { fn: () => discoverAndImport(), description: 'Discovery automatico + importacao via ML (daily)', requiresCredentials: 'ML_CLIENT_ID', jobRunName: 'discover-import' }
  JOB_MAP['discover-import-massive'] = { fn: () => discoverAndImport({ mode: 'massive' }), description: 'Import massivo — todas as 28 categorias, até 500 produtos', requiresCredentials: 'ML_CLIENT_ID', jobRunName: 'discover-import' }
  JOB_MAP['discover-import-extended'] = { fn: () => discoverAndImport({ mode: 'extended' }), description: 'Import estendido — todas as categorias, até 150 produtos', requiresCredentials: 'ML_CLIENT_ID', jobRunName: 'discover-import' }
}

// ---------------------------------------------------------------------------
// Health indicator based on last run
// ---------------------------------------------------------------------------

type JobHealth = 'healthy' | 'stale' | 'failing' | 'never'

function computeJobHealth(lastRun: { status: string; startedAt: Date } | null): JobHealth {
  if (!lastRun) return 'never'
  if (lastRun.status === 'FAILED') return 'failing'
  const ageMs = Date.now() - lastRun.startedAt.getTime()
  if (ageMs > 25 * 60 * 60 * 1000) return 'stale'
  return 'healthy'
}

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  await loadJobs()

  const format = req.nextUrl.searchParams.get('format')

  // ── ?format=status — enriched per-job status from JobRun table ──────────
  if (format === 'status') {
    const jobNames = Object.values(JOB_MAP).map(j => j.jobRunName)

    // Fetch the latest run for each known job name
    const latestRuns = await prisma.jobRun.findMany({
      where: { jobName: { in: jobNames } },
      orderBy: { startedAt: 'desc' },
      select: {
        jobName: true,
        status: true,
        startedAt: true,
        durationMs: true,
        errorLog: true,
      },
    })

    // Deduplicate: keep only the most recent per jobName
    const lastRunMap: Record<string, typeof latestRuns[number]> = {}
    for (const run of latestRuns) {
      if (!lastRunMap[run.jobName]) {
        lastRunMap[run.jobName] = run
      }
    }

    const jobs = Object.entries(JOB_MAP).map(([name, info]) => {
      const lastRun = lastRunMap[info.jobRunName] ?? null
      return {
        name,
        description: info.description,
        health: computeJobHealth(lastRun),
        lastRunAt: lastRun?.startedAt?.toISOString() ?? null,
        lastStatus: lastRun?.status ?? null,
        lastDurationMs: lastRun?.durationMs ?? null,
        lastError: lastRun?.errorLog ? lastRun.errorLog.slice(0, 200) : null,
        requiresCredentials: info.requiresCredentials || null,
      }
    })

    return NextResponse.json({ jobs })
  }

  // ── Default: simple job list ────────────────────────────────────────────
  const jobs = Object.entries(JOB_MAP).map(([name, info]) => ({
    name,
    description: info.description,
    requiresCredentials: info.requiresCredentials || null,
  }))

  return NextResponse.json({ jobs })
}

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  let jobName = 'unknown'
  const startTime = Date.now()

  try {
    const body = await req.json()
    jobName = (body.job as string) || ''

    if (!jobName) {
      return NextResponse.json(
        { error: 'Campo "job" obrigatorio no body. Use GET para listar jobs disponiveis.' },
        { status: 400 }
      )
    }

    await loadJobs()

    const jobInfo = JOB_MAP[jobName]
    if (!jobInfo) {
      return NextResponse.json(
        { error: `Job desconhecido: ${jobName}`, available: Object.keys(JOB_MAP) },
        { status: 400 }
      )
    }

    const result = await jobInfo.fn()
    const durationMs = Date.now() - startTime

    return NextResponse.json({
      ok: true,
      job: jobName,
      description: jobInfo.description,
      durationMs,
      result,
    })
  } catch (error) {
    const durationMs = Date.now() - startTime
    const { captureError } = await import('@/lib/monitoring')
    await captureError(error, { route: '/api/admin/jobs/run', job: jobName })
    const errorMessage = error instanceof Error ? error.message : String(error)
    logger.error("jobs-run.failed", { error, job: jobName })
    return NextResponse.json(
      { error: 'Falha ao executar job', job: jobName, durationMs, detail: errorMessage },
      { status: 500 }
    )
  }
}
