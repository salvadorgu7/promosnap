'use client'

import { useState, useEffect } from 'react'
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Loader2,
  Send,
  Clock,
} from 'lucide-react'

interface EmailLogEntry {
  id: string
  type: string
  recipient: string
  status: string
  error?: string
  sentAt: string
}

interface EmailStats {
  totalSent: number
  totalFailed: number
  lastSentAt: string | null
}

const TEMPLATES = [
  { key: 'welcome', label: 'Welcome', description: 'Email de boas-vindas' },
  { key: 'daily-deals', label: 'Daily Deals', description: 'Ofertas do dia' },
  { key: 'campaign', label: 'Campaign', description: 'Email de campanha' },
  { key: 'alert', label: 'Alert', description: 'Alerta de preço' },
] as const

type TemplateKey = (typeof TEMPLATES)[number]['key']

export default function EmailIntegrationPage() {
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
    template?: string
  } | null>(null)
  const [testing, setTesting] = useState<string | null>(null)
  const [configTest, setConfigTest] = useState<{
    success: boolean
    message: string
    details: Record<string, unknown> | null
  } | null>(null)
  const [configTesting, setConfigTesting] = useState(false)

  // Test general email config on mount
  useEffect(() => {
    async function checkConfig() {
      setConfigTesting(true)
      try {
        const res = await fetch('/api/admin/integrations/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'email' }),
        })
        const data = await res.json()
        setConfigTest(data)
      } catch {
        setConfigTest({ success: false, message: 'Erro de rede', details: null })
      } finally {
        setConfigTesting(false)
      }
    }
    checkConfig()
  }, [])

  async function handleTemplateTest(template: TemplateKey) {
    setTesting(template)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/integrations/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template }),
      })
      const data = await res.json()
      setTestResult({ success: data.success, message: data.message, template })
    } catch {
      setTestResult({ success: false, message: 'Erro de rede ao testar', template })
    } finally {
      setTesting(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
          <Mail className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email / Resend</h1>
          <p className="text-sm text-gray-500">Integração de email transacional</p>
        </div>
      </div>

      {/* Provider info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Configuração</h2>
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {/* Provider */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Send className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Provider</p>
              <p className="text-xs text-gray-500">Resend</p>
            </div>
          </div>

          {/* API Key status */}
          <div className="flex items-center gap-3 px-4 py-3">
            {configTesting ? (
              <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
            ) : configTest?.success ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">RESEND_API_KEY</p>
              <p className="text-xs text-gray-500">
                {configTesting
                  ? 'Verificando...'
                  : configTest?.success
                    ? 'Configurada'
                    : 'Não configurada'}
              </p>
            </div>
          </div>

          {/* EMAIL_FROM */}
          <div className="flex items-center gap-3 px-4 py-3">
            <Mail className="h-4 w-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">EMAIL_FROM</p>
              <p className="text-xs text-gray-500">
                Verificado via teste de configuração
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Template test section */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Teste de Templates</h2>
        <p className="text-sm text-gray-500">
          Teste cada template de email. O envio real requer RESEND_API_KEY configurada.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {TEMPLATES.map((tmpl) => (
            <button
              key={tmpl.key}
              onClick={() => handleTemplateTest(tmpl.key)}
              disabled={testing !== null}
              className="flex flex-col items-start gap-1 rounded-xl border border-gray-200 bg-white p-4 text-left transition-all hover:border-violet-300 hover:shadow-sm disabled:opacity-50"
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{tmpl.label}</span>
                {testing === tmpl.key ? (
                  <Loader2 className="h-4 w-4 text-violet-500 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <span className="text-xs text-gray-500">{tmpl.description}</span>
            </button>
          ))}
        </div>

        {testResult && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              testResult.success
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-700'
            }`}
          >
            {testResult.success ? (
              <CheckCircle2 className="inline h-4 w-4 mr-1" />
            ) : (
              <XCircle className="inline h-4 w-4 mr-1" />
            )}
            <span className="font-medium">[{testResult.template}]</span> {testResult.message}
          </div>
        )}
      </section>

      {/* Recent sends — placeholder since logs are in-memory server-side */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Envios Recentes</h2>
        <div className="rounded-xl border border-gray-200 p-6 text-center">
          <Clock className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">
            O log de envios é mantido em memoria no servidor.
          </p>
          <p className="text-xs text-gray-400">
            Use o teste de templates acima para gerar entradas.
          </p>
        </div>
      </section>
    </div>
  )
}
