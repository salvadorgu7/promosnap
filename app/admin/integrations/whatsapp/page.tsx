import { getReadinessStatus, formatWhatsAppMessage } from '@/lib/distribution/whatsapp'
import { checkWhatsAppReadiness } from '@/lib/integrations/readiness'
import {
  CheckCircle2,
  XCircle,
  Phone,
  Settings,
  Info,
  Eye,
} from 'lucide-react'
import { toSeverity, severityBadge, severityCard } from '@/lib/admin/severity'
import type { IntegrationStatus } from '@/lib/integrations/readiness'

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

export default function WhatsAppIntegrationPage() {
  const providerReadiness = getReadinessStatus()
  const readiness = checkWhatsAppReadiness()
  const sev = statusSeverity(readiness.status)

  const hasApiUrl = !!process.env.WHATSAPP_API_URL
  const hasApiToken = !!process.env.WHATSAPP_API_TOKEN
  const hasPhoneId = !!process.env.WHATSAPP_PHONE_ID
  const hasTemplate = !!process.env.WHATSAPP_TEMPLATE_NAME

  // Sample offer for preview
  const sampleMessage = formatWhatsAppMessage({
    offerId: 'sample-001',
    productName: 'Fone Bluetooth TWS Pro',
    productSlug: 'fone-bluetooth-tws-pro',
    currentPrice: 89.90,
    originalPrice: 199.90,
    discount: 55,
    offerScore: 85,
    sourceSlug: 'amazon-br',
    sourceName: 'Amazon Brasil',
    productUrl: 'https://example.com/fone',
    affiliateUrl: null,
    isFreeShipping: true,
    couponText: 'PROMO10',
    rating: 4.5,
    reviewsCount: 342,
    imageUrl: null,
  })

  // Determine what's missing
  const missing: string[] = []
  if (!providerReadiness.provider) missing.push('Provider externo (Twilio, Meta Business, etc.)')
  if (!hasApiToken) missing.push('WHATSAPP_API_TOKEN')
  if (!hasPhoneId) missing.push('WHATSAPP_PHONE_ID (recomendado)')
  if (!hasTemplate) missing.push('WHATSAPP_TEMPLATE_NAME (recomendado)')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Phone className="h-6 w-6" /> WhatsApp
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Configuracao e diagnostico da integracao WhatsApp
        </p>
      </div>

      {/* Status Banner */}
      <div className={`rounded-xl border p-4 ${severityCard(sev)}`}>
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-white/80 p-2 shadow-sm">
            <Phone className="h-5 w-5" />
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

      {/* Important Notice */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-blue-800">Sobre WhatsApp Business API</h3>
            <p className="text-xs text-blue-700 mt-1">
              WhatsApp requer provider externo (ex: Twilio, Meta Business API, MessageBird, Vonage).
              O PromoSnap gera as mensagens formatadas — o envio depende do provider configurado.
              Sem provider, o modo preview permite copiar as mensagens manualmente.
            </p>
          </div>
        </div>
      </div>

      {/* Mode & Provider */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
          Modo de Operacao
        </h2>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Modo</span>
            <span className={`font-mono font-semibold ${providerReadiness.mode === 'api' ? 'text-emerald-600' : 'text-amber-600'}`}>
              {providerReadiness.mode === 'api' ? 'API (envio automatico)' : 'Preview (copiar manual)'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-text-muted">Provider</span>
            <span className="font-mono">
              {providerReadiness.provider || 'Nenhum'}
            </span>
          </div>
        </div>
      </div>

      {/* Configuration */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Settings className="h-4 w-4" /> Variaveis de Ambiente
        </h2>
        <EnvRow label="WHATSAPP_API_URL" present={hasApiUrl} />
        <EnvRow label="WHATSAPP_API_TOKEN" present={hasApiToken} />
        <EnvRow label="WHATSAPP_PHONE_ID" present={hasPhoneId} />
        <EnvRow label="WHATSAPP_TEMPLATE_NAME" present={hasTemplate} />
      </div>

      {/* What's Missing */}
      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wider mb-3">
            O que falta
          </h2>
          <ul className="space-y-1">
            {missing.map((item, i) => (
              <li key={i} className="text-xs text-amber-800 flex items-start gap-2">
                <XCircle className="h-3 w-3 text-amber-500 flex-shrink-0 mt-0.5" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      {readiness.nextSteps.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
            Proximos Passos
          </h2>
          <ul className="space-y-1">
            {readiness.nextSteps.map((step, i) => (
              <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                <span className="text-gray-400 mt-0.5">&#8226;</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Message Preview */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
          <Eye className="h-4 w-4" /> Preview de Mensagem (Oferta Exemplo)
        </h2>
        <pre className="text-xs font-mono bg-gray-50 rounded-lg p-3 whitespace-pre-wrap text-text-muted border border-gray-100 overflow-x-auto">
          {sampleMessage}
        </pre>
      </div>
    </div>
  )
}
