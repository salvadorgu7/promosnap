import { configValidation, getExecutionLog } from '@/lib/distribution/telegram'
import { checkTelegramReadiness } from '@/lib/integrations/readiness'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Eye,
  Settings,
  MessageCircle,
  Clock,
} from 'lucide-react'
import { toSeverity, severityBadge, severityCard } from '@/lib/admin/severity'
import type { IntegrationStatus } from '@/lib/integrations/readiness'
import { TelegramActions } from './actions'

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

export default function TelegramIntegrationPage() {
  const validation = configValidation()
  const readiness = checkTelegramReadiness()
  const log = getExecutionLog(10)
  const sev = statusSeverity(readiness.status)

  const hasBotToken = !!process.env.TELEGRAM_BOT_TOKEN
  const hasChatId = !!process.env.TELEGRAM_CHAT_ID

  const lastSends = log.filter((e) => e.status === 'success')
  const lastErrors = log.filter((e) => e.status === 'failed')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <MessageCircle className="h-6 w-6" /> Telegram
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Configuracao e diagnostico da integracao Telegram
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 ${severityCard(sev)}`}>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 p-2 shadow-sm">
            <MessageCircle className="h-5 w-5" />
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
        <EnvRow label="TELEGRAM_BOT_TOKEN" present={hasBotToken} />
        <EnvRow label="TELEGRAM_CHAT_ID" present={hasChatId} />
      </div>

      {/* Validation */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
          Validacao
        </h2>
        <div className="flex items-center gap-2">
          {validation.valid ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm">{validation.message}</span>
        </div>
        {validation.missing.length > 0 && (
          <div className="mt-2 space-y-1">
            {validation.missing.map((m) => (
              <p key={m} className="text-xs text-red-600 font-mono">
                {m}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Missing Requirements / Next Steps */}
      {(readiness.missingRequirements.length > 0 || readiness.nextSteps.length > 0) && (
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
      <TelegramActions />

      {/* Last Sends */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Send className="h-4 w-4" /> Ultimos Envios
        </h2>
        {lastSends.length === 0 ? (
          <p className="text-xs text-text-muted">Nenhum envio registrado</p>
        ) : (
          <div className="space-y-2">
            {lastSends.slice(0, 5).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-xs border-b border-gray-50 pb-1">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="h-3 w-3" />
                  {entry.messageId ? `msg #${entry.messageId}` : 'Enviado'}
                </span>
                <span className="text-text-muted flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {entry.sentAt.toLocaleString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last Errors */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <XCircle className="h-4 w-4" /> Ultimos Erros
        </h2>
        {lastErrors.length === 0 ? (
          <p className="text-xs text-text-muted">Nenhum erro registrado</p>
        ) : (
          <div className="space-y-2">
            {lastErrors.slice(0, 5).map((entry) => (
              <div key={entry.id} className="text-xs border-b border-gray-50 pb-1">
                <div className="flex items-center justify-between">
                  <span className="text-red-600 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Falha
                  </span>
                  <span className="text-text-muted flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {entry.sentAt.toLocaleString('pt-BR')}
                  </span>
                </div>
                {entry.error && (
                  <p className="text-red-500 font-mono text-[10px] mt-0.5 truncate">{entry.error}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
