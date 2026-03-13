import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'

// Job metadata for admin visibility
interface JobInfo {
  fn: () => Promise<any>
  description: string
  requiresCredentials?: string
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

  JOB_MAP['ingest'] = { fn: ingestMLTrends, description: 'Importar trends do Mercado Livre', requiresCredentials: 'ML_CLIENT_ID' }
  JOB_MAP['update-prices'] = { fn: updatePrices, description: 'Atualizar precos e criar snapshots' }
  JOB_MAP['compute-scores'] = { fn: computeScores, description: 'Recalcular scores de ofertas e produtos' }
  JOB_MAP['cleanup'] = { fn: cleanupData, description: 'Limpar dados antigos (snapshots, logs, ofertas stale)' }
  JOB_MAP['sitemap'] = { fn: generateSitemap, description: 'Gerar contagem de URLs para sitemap' }
  JOB_MAP['check-alerts'] = { fn: checkAlerts, description: 'Verificar alertas de preco e enviar emails', requiresCredentials: 'RESEND_API_KEY (opcional)' }
  JOB_MAP['discover-import'] = { fn: discoverAndImport, description: 'Discovery automatico + importacao via ML', requiresCredentials: 'ML_CLIENT_ID' }
}

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  await loadJobs()

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

  try {
    const body = await req.json()
    const jobName = body.job as string

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

    const startTime = Date.now()
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
    const { captureError } = await import('@/lib/monitoring')
    const jobName = await req.clone().json().then(b => b.job).catch(() => 'unknown')
    await captureError(error, { route: '/api/admin/jobs/run', job: jobName })
    return NextResponse.json(
      { error: 'Falha ao executar job', job: jobName, message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
