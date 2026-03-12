import { runAllHealthChecks } from '@/lib/health/checks'
import type { HealthCheckResult, HealthStatus } from '@/lib/health/types'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe,
  Key,
  Mail,
  Server,
  Timer,
  XCircle,
  Info,
} from 'lucide-react'
import {
  toSeverity,
  severityBadge,
  severityCard,
  severityGradient,
  severityIconBg,
  severitySolid,
  type Severity,
} from '@/lib/admin/severity'

export const dynamic = 'force-dynamic'

/** Map HealthStatus → Severity */
function healthToSeverity(status: HealthStatus): Severity {
  return toSeverity(status)
}

const iconMap: Record<string, typeof Activity> = {
  Database: Database,
  Sources: Globe,
  Jobs: Timer,
  Sitemap: Server,
  'Email / Resend': Mail,
  'Cron Readiness': Timer,
  'Critical Env Vars': Key,
  'Build / Runtime': Server,
}

function StatusIcon({ status }: { status: HealthStatus }) {
  if (status === 'healthy') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />
  if (status === 'degraded') return <AlertTriangle className="h-5 w-5 text-amber-500" />
  return <XCircle className="h-5 w-5 text-red-500" />
}

function operationalGuidance(check: HealthCheckResult): string | null {
  if (check.status === 'healthy') return null
  const name = check.name.toLowerCase()
  if (name.includes('database'))
    return 'Verifique DATABASE_URL e conectividade de rede. Sem banco, nenhuma funcionalidade opera.'
  if (name.includes('source'))
    return 'Nenhuma fonte ativa. Acesse /admin/fontes e ative pelo menos uma fonte para ingestao.'
  if (name.includes('job'))
    return 'Jobs falhando indicam problemas de dados ou conectividade. Verifique os logs em /admin/monitoring.'
  if (name.includes('sitemap'))
    return 'Sitemap nao gerado. Execute o job de sitemap manualmente em /admin/jobs ou aguarde o proximo cron.'
  if (name.includes('email') || name.includes('resend'))
    return 'Sem RESEND_API_KEY, emails nao serao enviados. Crie conta em resend.com e configure.'
  if (name.includes('cron'))
    return 'Sem CRON_SECRET, jobs agendados nao executam. Precos e scores ficam desatualizados.'
  if (name.includes('env'))
    return 'Variaveis de ambiente criticas ausentes. Acesse /admin/config para ver quais faltam.'
  if (name.includes('build') || name.includes('runtime'))
    return 'Problema no build ou runtime. Verifique os logs do deploy e o NODE_ENV.'
  return null
}

function CheckCard({ check }: { check: HealthCheckResult }) {
  const Icon = iconMap[check.name] || Activity
  const sev = healthToSeverity(check.status)
  const guidance = operationalGuidance(check)

  return (
    <div
      className={`rounded-xl border p-4 ${severityCard(sev)} transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 p-2 shadow-sm">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">{check.name}</h3>
            <p className="text-xs mt-0.5 opacity-80">{check.message}</p>
          </div>
        </div>
        <StatusIcon status={check.status} />
      </div>
      <div className="flex items-center gap-2 mt-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${severitySolid(sev)}`}
        >
          {check.status}
        </span>
        <span className="text-[10px] uppercase tracking-wider opacity-60">
          severity: {check.severity}
        </span>
      </div>
      {guidance && (
        <div className="flex items-start gap-1.5 mt-3 pt-2 border-t border-current/10">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5 opacity-60" />
          <p className="text-[10px] opacity-70 leading-relaxed">{guidance}</p>
        </div>
      )}
    </div>
  )
}

export default async function HealthPage() {
  const report = await runAllHealthChecks()

  const overallSev = healthToSeverity(report.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            System Health
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Painel de diagnostico em tempo real do sistema
          </p>
        </div>
        <div className="text-xs text-text-muted">
          Verificado: {new Date(report.timestamp).toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`rounded-2xl bg-gradient-to-r ${severityGradient(overallSev)} p-6 text-white shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Status Geral do Sistema</p>
              <p className="text-3xl font-bold font-display uppercase tracking-wide">
                {report.status === 'healthy'
                  ? 'Saudavel'
                  : report.status === 'degraded'
                    ? 'Degradado'
                    : 'Critico'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{report.summary.healthy}</p>
              <p className="text-xs opacity-80">OK</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.summary.degraded}</p>
              <p className="text-xs opacity-80">Alerta</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.summary.critical}</p>
              <p className="text-xs opacity-80">Critico</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Items First */}
      {report.checks.some((c) => c.status === 'critical') && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Problemas Criticos
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.checks
              .filter((c) => c.status === 'critical')
              .map((check) => (
                <CheckCard key={check.name} check={check} />
              ))}
          </div>
        </div>
      )}

      {/* Degraded Items */}
      {report.checks.some((c) => c.status === 'degraded') && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Alertas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {report.checks
              .filter((c) => c.status === 'degraded')
              .map((check) => (
                <CheckCard key={check.name} check={check} />
              ))}
          </div>
        </div>
      )}

      {/* All Checks Grid */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          Todos os Checks ({report.summary.total})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {report.checks.map((check) => (
            <CheckCard key={check.name} check={check} />
          ))}
        </div>
      </div>
    </div>
  )
}
