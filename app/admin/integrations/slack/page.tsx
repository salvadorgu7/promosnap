import { isSlackConfigured, getSlackReadiness } from '@/lib/integrations/slack'
import { checkSlackReadiness } from '@/lib/integrations/readiness'
import {
  CheckCircle2,
  XCircle,
  Hash,
  Settings,
  Clock,
} from 'lucide-react'
import { toSeverity, severityBadge, severityCard } from '@/lib/admin/severity'
import type { IntegrationStatus } from '@/lib/integrations/readiness'
import { SlackActions } from './actions'

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

export default function SlackIntegrationPage() {
  const readiness = checkSlackReadiness()
  const slackReadiness = getSlackReadiness()
  const sev = statusSeverity(readiness.status)

  const hasWebhook = isSlackConfigured()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Hash className="h-6 w-6" /> Slack
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Configuracao e diagnostico da integracao Slack
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 ${severityCard(sev)}`}>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 p-2 shadow-sm">
            <Hash className="h-5 w-5" />
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
          <Settings className="h-4 w-4" /> Variaveis de Ambiente
        </h2>
        <EnvRow label="SLACK_WEBHOOK_URL" present={hasWebhook} />
      </div>

      {/* Readiness Details */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
          Estado Interno
        </h2>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Ultimo envio</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-text-muted" />
              {slackReadiness.lastSent
                ? slackReadiness.lastSent.toLocaleString('pt-BR')
                : 'Nunca'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Ultimo erro</span>
            <span className={slackReadiness.lastError ? 'text-red-600' : 'text-emerald-600'}>
              {slackReadiness.lastError || 'Nenhum'}
            </span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      {readiness.nextSteps.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3">
            Proximos Passos
          </h2>
          <ul className="space-y-1">
            {readiness.nextSteps.map((step, i) => (
              <li key={i} className="text-xs text-amber-800 flex items-start gap-2">
                <span className="text-amber-500 mt-0.5">&#8226;</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <SlackActions />
    </div>
  )
}
