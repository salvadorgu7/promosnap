import prisma from '@/lib/db/prisma'
import { checkCronReadiness } from '@/lib/integrations/readiness'
import {
  CheckCircle2,
  XCircle,
  Timer,
  Settings,
  Clock,
  AlertTriangle,
  Play,
  List,
  Shield,
} from 'lucide-react'
import { toSeverity, severityBadge, severityCard } from '@/lib/admin/severity'
import type { IntegrationStatus } from '@/lib/integrations/readiness'
import { CronActions } from './actions'

export const dynamic = 'force-dynamic'

function statusSeverity(status: IntegrationStatus) {
  if (status === 'READY_PRODUCTION') return toSeverity('healthy')
  if (status === 'READY_TO_TEST') return toSeverity('info')
  if (status === 'CONFIG_PARTIAL') return toSeverity('warning')
  return toSeverity('critical')
}

function EnvRow({ label, present }: { label: string; present: boolean }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm font-mono text-text-muted">{label}</span>
      {present ? (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" /> Configurado
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5" /> Ausente
        </span>
      )}
    </div>
  )
}

export default async function CronIntegrationPage() {
  const readiness = checkCronReadiness()
  const sev = statusSeverity(readiness.status)

  const hasCronSecret = !!process.env.CRON_SECRET

  // Check vercel.json cron config
  let vercelCronConfigured = false
  let vercelCronSchedule: string | null = null
  try {
    // Read vercel.json via fs at runtime
    const fs = await import('fs')
    const path = await import('path')
    const vercelPath = path.join(process.cwd(), 'vercel.json')
    if (fs.existsSync(vercelPath)) {
      const raw = fs.readFileSync(vercelPath, 'utf-8')
      const vercelConfig = JSON.parse(raw)
      const crons = vercelConfig?.crons
      if (Array.isArray(crons) && crons.length > 0) {
        vercelCronConfigured = true
        vercelCronSchedule = crons[0]?.schedule || null
      }
    }
  } catch {
    // vercel.json not found or not readable
  }

  // Query most recent JobRun
  let lastRun: { jobName: string; status: string; startedAt: Date; durationMs: number | null; errorLog: string | null } | null = null
  let recentErrors: Array<{ id: string; jobName: string; startedAt: Date; errorLog: string | null }> = []

  try {
    lastRun = await prisma.jobRun.findFirst({
      orderBy: { startedAt: 'desc' },
      select: { jobName: true, status: true, startedAt: true, durationMs: true, errorLog: true },
    })

    recentErrors = await prisma.jobRun.findMany({
      where: { status: 'FAILED' },
      orderBy: { startedAt: 'desc' },
      take: 5,
      select: { id: true, jobName: true, startedAt: true, errorLog: true },
    })
  } catch {
    // Database not available
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Timer className="h-6 w-6" /> Cron Jobs
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Configuracao e diagnostico dos jobs agendados
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 ${severityCard(sev)}`}>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 p-2 shadow-sm">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{readiness.summary}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider mt-1 ${severityBadge(sev)}`}
            >
              {readiness.status}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" /> Configuracao
        </h2>
        <EnvRow label="CRON_SECRET" present={hasCronSecret} />
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm font-mono text-text-muted">Endpoint</span>
          <span className="text-xs font-mono text-text-muted">/api/cron</span>
        </div>
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm font-mono text-text-muted">Vercel Cron</span>
          {vercelCronConfigured ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" /> Configurado ({vercelCronSchedule})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5" /> Nao encontrado
            </span>
          )}
        </div>
      </div>

      {/* Last Run */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Play className="h-4 w-4" /> Ultima Execucao
        </h2>
        {lastRun ? (
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Job</span>
              <span className="font-mono">{lastRun.jobName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Status</span>
              <span className={`font-semibold ${lastRun.status === 'SUCCESS' ? 'text-emerald-600' : lastRun.status === 'FAILED' ? 'text-red-600' : 'text-amber-600'}`}>
                {lastRun.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Quando</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-text-muted" />
                {lastRun.startedAt.toLocaleString('pt-BR')}
              </span>
            </div>
            {lastRun.durationMs != null && (
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Duracao</span>
                <span className="font-mono">{(lastRun.durationMs / 1000).toFixed(1)}s</span>
              </div>
            )}
            {lastRun.errorLog && (
              <div className="mt-2">
                <span className="text-text-muted">Erro:</span>
                <p className="text-red-600 font-mono text-[10px] mt-0.5 truncate">{lastRun.errorLog}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-text-muted">Nenhuma execucao registrada</p>
        )}
      </div>

      {/* Recent Errors */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <XCircle className="h-4 w-4" /> Ultimos Erros
        </h2>
        {recentErrors.length === 0 ? (
          <p className="text-xs text-text-muted">Nenhum erro registrado</p>
        ) : (
          <div className="space-y-2">
            {recentErrors.map((err) => (
              <div key={err.id} className="text-xs border-b border-gray-50 pb-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-text-muted">{err.jobName}</span>
                  <span className="text-text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {err.startedAt.toLocaleString('pt-BR')}
                  </span>
                </div>
                {err.errorLog && (
                  <p className="text-red-500 font-mono text-[10px] mt-0.5 truncate">{err.errorLog}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Warnings */}
      {readiness.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Avisos
          </h2>
          <ul className="space-y-1">
            {readiness.warnings.map((w, i) => (
              <li key={i} className="text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <CronActions />
    </div>
  )
}
