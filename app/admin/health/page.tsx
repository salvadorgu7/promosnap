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
} from 'lucide-react'

export const dynamic = 'force-dynamic'

const statusColor: Record<HealthStatus, string> = {
  healthy: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  degraded: 'text-amber-600 bg-amber-50 border-amber-200',
  critical: 'text-red-600 bg-red-50 border-red-200',
}

const statusBadge: Record<HealthStatus, string> = {
  healthy: 'bg-emerald-500',
  degraded: 'bg-amber-500',
  critical: 'bg-red-500',
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

function CheckCard({ check }: { check: HealthCheckResult }) {
  const Icon = iconMap[check.name] || Activity
  return (
    <div
      className={`rounded-xl border p-4 ${statusColor[check.status]} transition-shadow hover:shadow-md`}
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
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white ${statusBadge[check.status]}`}
        >
          {check.status}
        </span>
        <span className="text-[10px] uppercase tracking-wider opacity-60">
          severity: {check.severity}
        </span>
      </div>
    </div>
  )
}

export default async function HealthPage() {
  const report = await runAllHealthChecks()

  const overallColor: Record<HealthStatus, string> = {
    healthy: 'from-emerald-500 to-emerald-600',
    degraded: 'from-amber-500 to-amber-600',
    critical: 'from-red-500 to-red-600',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            System Health
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Control panel — real-time system diagnostics
          </p>
        </div>
        <div className="text-xs text-text-muted">
          Last checked: {new Date(report.timestamp).toLocaleString('pt-BR')}
        </div>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`rounded-2xl bg-gradient-to-r ${overallColor[report.status]} p-6 text-white shadow-lg`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-white/20 p-3">
              <Activity className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm font-medium opacity-90">Overall System Status</p>
              <p className="text-3xl font-bold font-display uppercase tracking-wide">
                {report.status}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-2xl font-bold">{report.summary.healthy}</p>
              <p className="text-xs opacity-80">Healthy</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.summary.degraded}</p>
              <p className="text-xs opacity-80">Degraded</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{report.summary.critical}</p>
              <p className="text-xs opacity-80">Critical</p>
            </div>
          </div>
        </div>
      </div>

      {/* Critical Items First */}
      {report.checks.some((c) => c.status === 'critical') && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wider flex items-center gap-2">
            <XCircle className="h-4 w-4" /> Critical Issues
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
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-amber-600 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Warnings
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
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider">
          All Checks ({report.summary.total})
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
