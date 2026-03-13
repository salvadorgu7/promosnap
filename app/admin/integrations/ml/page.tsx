'use client'

import { useState } from 'react'
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Key,
  Link2,
  Shield,
  Play,
  Loader2,
} from 'lucide-react'

export default function MlIntegrationPage() {
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [testing, setTesting] = useState(false)

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'ml' }),
      })
      const data = await res.json()
      setTestResult({ success: data.success, message: data.message })
    } catch {
      setTestResult({ success: false, message: 'Erro de rede ao testar' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-50 text-yellow-600">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mercado Livre</h1>
          <p className="text-sm text-gray-500">Integracao OAuth 2.0</p>
        </div>
      </div>

      {/* OAuth Status */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Status OAuth</h2>
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          <ConfigRow
            label="Client ID"
            envKey="ML_CLIENT_ID ou MERCADOLIVRE_APP_ID"
            icon={<Key className="h-4 w-4" />}
          />
          <ConfigRow
            label="Client Secret"
            envKey="ML_CLIENT_SECRET ou MERCADOLIVRE_SECRET"
            icon={<Shield className="h-4 w-4" />}
          />
          <ConfigRow
            label="Redirect URI"
            envKey="ML_REDIRECT_URI"
            icon={<Link2 className="h-4 w-4" />}
          />
        </div>
      </section>

      {/* Token Status */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Status do Token</h2>
        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-gray-900">Token de acesso</p>
              <p className="text-xs text-gray-500">
                Tokens sao gerenciados via fluxo OAuth. Inicie o fluxo abaixo para obter/renovar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Callback URL */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">URL de Callback esperada</h2>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <code className="text-sm text-blue-800 break-all">
            {typeof window !== 'undefined'
              ? `${window.location.origin}/api/auth/ml/callback`
              : '[APP_URL]/api/auth/ml/callback'}
          </code>
          <p className="mt-2 text-xs text-blue-600">
            Configure esta URL no painel de desenvolvedores do Mercado Livre.
          </p>
        </div>
      </section>

      {/* Limitations */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Limitacoes</h2>
        <div className="rounded-xl border border-gray-200 p-4 space-y-3">
          <div>
            <h3 className="text-sm font-medium text-emerald-700">Funciona</h3>
            <ul className="mt-1 space-y-1 text-sm text-gray-600">
              <li>- Busca de produtos publica (sem auth)</li>
              <li>- Detalhes de anuncios publicos</li>
              <li>- Categorias e tendencias</li>
              <li>- OAuth flow completo</li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-700">Bloqueado / Limitado</h3>
            <ul className="mt-1 space-y-1 text-sm text-gray-600">
              <li>- Busca limitada a 1000 resultados por query</li>
              <li>- Rate limit: ~10 requests/segundo</li>
              <li>- Certificacao necessaria para operacoes de venda</li>
              <li>- Dados de vendedor requerem token autenticado</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Acoes</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleTest}
            disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            Testar Auth
          </button>
          <a
            href="/api/auth/ml"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Iniciar OAuth
          </a>
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
            {testResult.message}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Config row — shows configured/missing without exposing values
// ---------------------------------------------------------------------------

function ConfigRow({
  label,
  envKey,
  icon,
}: {
  label: string
  envKey: string
  icon: React.ReactNode
}) {
  // Client components cannot read process.env at runtime, so we show the env key name
  // The actual check happens via the test endpoint
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-gray-400">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{envKey}</p>
      </div>
      <span className="text-xs text-gray-400">via teste</span>
    </div>
  )
}
