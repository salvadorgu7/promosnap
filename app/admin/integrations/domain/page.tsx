import { getBaseUrl } from '@/lib/seo/url'
import { getIntegrationUrls } from '@/lib/integrations/url-helper'
import { checkDomainReadiness } from '@/lib/integrations/readiness'
import {
  CheckCircle2,
  XCircle,
  Globe,
  Settings,
  AlertTriangle,
  Shield,
  Link,
} from 'lucide-react'
import { toSeverity, severityBadge, severityCard } from '@/lib/admin/severity'
import type { IntegrationStatus } from '@/lib/integrations/readiness'
import { CopyButtons } from './copy-buttons'

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

export default function DomainIntegrationPage() {
  const readiness = checkDomainReadiness()
  const sev = statusSeverity(readiness.status)
  const baseUrl = getBaseUrl().replace(/\/+$/, '')
  const urls = getIntegrationUrls()

  const hasAppUrl = !!process.env.APP_URL
  const hasPublicUrl = !!process.env.NEXT_PUBLIC_APP_URL
  const appUrl = (process.env.APP_URL || '').replace(/\/+$/, '')
  const publicUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/+$/, '')

  // Checks
  const isHttps = baseUrl.startsWith('https://')
  const hasTrailingSlash = (process.env.APP_URL || '').endsWith('/')
  const urlMismatch = hasAppUrl && hasPublicUrl && appUrl !== publicUrl

  // Build URLs for display
  const domainUrls = [
    { label: 'Sitemap', url: `${baseUrl}/sitemap.xml` },
    { label: 'Robots.txt', url: `${baseUrl}/robots.txt` },
    { label: 'ML Callback URL', url: `${baseUrl}/api/auth/ml/callback` },
    { label: 'Cron Endpoint', url: `${baseUrl}/api/cron` },
    { label: 'Webhooks Base', url: `${baseUrl}/api/webhooks/*` },
    { label: 'Health Check', url: `${baseUrl}/api/health` },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Globe className="h-6 w-6" /> Domínio & URLs
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Configuração de domínio e URLs canônicas do sistema
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 ${severityCard(sev)}`}>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 p-2 shadow-sm">
            <Globe className="h-5 w-5" />
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

      {/* Domain Detection */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" /> Detecção de Domínio
        </h2>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Domínio detectado</span>
            <span className="font-mono font-semibold">{baseUrl}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Canonical URL</span>
            <span className="font-mono">{baseUrl}</span>
          </div>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" /> Variáveis de Ambiente
        </h2>
        <EnvRow label="APP_URL" present={hasAppUrl} />
        <EnvRow label="NEXT_PUBLIC_APP_URL" present={hasPublicUrl} />
      </div>

      {/* Validation Checks */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" /> Validações
        </h2>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-text-muted">HTTPS</span>
            {isHttps ? (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Sim
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Não (recomendado em produção)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-text-muted">Trailing slash</span>
            {hasTrailingSlash ? (
              <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" /> Detectado (pode causar problemas)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> OK
              </span>
            )}
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-xs text-text-muted">APP_URL == NEXT_PUBLIC_APP_URL</span>
            {!hasAppUrl || !hasPublicUrl ? (
              <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                N/A
              </span>
            ) : urlMismatch ? (
              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                <XCircle className="h-3.5 w-3.5" /> Divergente
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Consistente
              </span>
            )}
          </div>
        </div>
      </div>

      {/* URL Mismatch Warning */}
      {urlMismatch && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-800">Inconsistência Detectada</h3>
              <p className="text-xs text-red-700 mt-1">
                APP_URL ({appUrl}) difere de NEXT_PUBLIC_APP_URL ({publicUrl}).
                Isso pode causar problemas de SEO, links e callbacks OAuth.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* URLs with Copy Buttons */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Link className="h-4 w-4" /> URLs Importantes
        </h2>
        <CopyButtons urls={domainUrls} />
      </div>

      {/* Warnings */}
      {readiness.warnings.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3">
            Avisos
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
    </div>
  )
}
