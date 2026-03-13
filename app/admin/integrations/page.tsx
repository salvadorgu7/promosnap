import Link from 'next/link'
import {
  getAllIntegrationReadiness,
  type IntegrationReadiness,
  type IntegrationStatus,
} from '@/lib/integrations/readiness'
import {
  toSeverity,
  severityBadge,
  severityDot,
  severityCard,
  type Severity,
} from '@/lib/admin/severity'
import {
  ShoppingBag,
  Mail,
  Send,
  MessageSquare,
  Hash,
  MessageCircle,
  Timer,
  Globe,
  CheckCircle2,
  FlaskConical,
  ArrowRight,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, typeof ShoppingBag> = {
  mercadolivre: ShoppingBag,
  email: Mail,
  telegram: Send,
  slack: Hash,
  discord: MessageSquare,
  whatsapp: MessageCircle,
  cron: Timer,
  domain: Globe,
}

const DETAIL_ROUTES: Record<string, string> = {
  mercadolivre: '/admin/integrations/ml',
  email: '/admin/integrations/email',
}

function statusToSeverity(status: IntegrationStatus): Severity {
  switch (status) {
    case 'READY_PRODUCTION':
      return 'ok'
    case 'READY_TO_TEST':
      return 'info'
    case 'CONFIG_PARTIAL':
      return 'warning'
    case 'BLOCKED_EXTERNAL':
      return 'warning'
    case 'NOT_CONFIGURED':
      return 'critical'
    default:
      return 'critical'
  }
}

function statusLabel(status: IntegrationStatus): string {
  switch (status) {
    case 'READY_PRODUCTION':
      return 'Producao'
    case 'READY_TO_TEST':
      return 'Pronto p/ teste'
    case 'CONFIG_PARTIAL':
      return 'Parcial'
    case 'BLOCKED_EXTERNAL':
      return 'Bloqueado'
    case 'NOT_CONFIGURED':
      return 'Nao configurado'
    default:
      return status
  }
}

function healthDotColor(status: IntegrationStatus): string {
  switch (status) {
    case 'READY_PRODUCTION':
      return 'bg-emerald-500'
    case 'READY_TO_TEST':
      return 'bg-emerald-400'
    case 'CONFIG_PARTIAL':
      return 'bg-amber-500'
    case 'BLOCKED_EXTERNAL':
      return 'bg-red-400'
    case 'NOT_CONFIGURED':
      return 'bg-red-500'
    default:
      return 'bg-gray-400'
  }
}

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------

function IntegrationRow({ integration }: { integration: IntegrationReadiness }) {
  const Icon = ICON_MAP[integration.key] || Globe
  const sev = statusToSeverity(integration.status)
  const detailRoute = DETAIL_ROUTES[integration.key]

  const content = (
    <div
      className={`rounded-xl border p-4 ${severityCard(sev)} transition-shadow hover:shadow-md`}
    >
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/60">
          <Icon className="h-5 w-5" />
        </div>

        {/* Name + summary */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900">{integration.name}</h3>
            {/* Health dot */}
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${healthDotColor(integration.status)}`}
              title={statusLabel(integration.status)}
            />
            {/* Testable indicator */}
            {integration.testable && (
              <span className="flex items-center gap-0.5 text-xs text-blue-600" title="Testavel">
                <FlaskConical className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-gray-600 line-clamp-1">{integration.summary}</p>
        </div>

        {/* Status badge */}
        <span
          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium ${severityBadge(sev)}`}
        >
          {statusLabel(integration.status)}
        </span>

        {/* Arrow if has detail page */}
        {detailRoute && <ArrowRight className="h-4 w-4 shrink-0 text-gray-400" />}
      </div>

      {/* Warnings / missing */}
      {(integration.missingRequirements.length > 0 || integration.warnings.length > 0) && (
        <div className="mt-3 space-y-1 border-t border-current/10 pt-3 text-xs text-gray-500">
          {integration.missingRequirements.map((m) => (
            <p key={m}>Falta: {m}</p>
          ))}
          {integration.warnings.map((w) => (
            <p key={w}>Aviso: {w}</p>
          ))}
        </div>
      )}
    </div>
  )

  if (detailRoute) {
    return (
      <Link href={detailRoute} className="block">
        {content}
      </Link>
    )
  }

  return content
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function IntegrationsPage() {
  const integrations = getAllIntegrationReadiness()

  const readyCount = integrations.filter(
    (i) => i.status === 'READY_PRODUCTION' || i.status === 'READY_TO_TEST'
  ).length

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integracoes</h1>
        <p className="mt-1 text-sm text-gray-500">
          {readyCount} de {integrations.length} integracoes prontas
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex gap-3">
        {(['READY_PRODUCTION', 'READY_TO_TEST', 'CONFIG_PARTIAL', 'NOT_CONFIGURED'] as IntegrationStatus[]).map(
          (status) => {
            const count = integrations.filter((i) => i.status === status).length
            if (count === 0) return null
            const sev = statusToSeverity(status)
            return (
              <span
                key={status}
                className={`rounded-full border px-3 py-1 text-xs font-medium ${severityBadge(sev)}`}
              >
                {statusLabel(status)}: {count}
              </span>
            )
          }
        )}
      </div>

      {/* Integration list */}
      <div className="space-y-3">
        {integrations.map((integration) => (
          <IntegrationRow key={integration.key} integration={integration} />
        ))}
      </div>
    </div>
  )
}
