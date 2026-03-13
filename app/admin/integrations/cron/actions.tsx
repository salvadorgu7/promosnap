'use client'

import { useState } from 'react'
import { Shield, Play, List } from 'lucide-react'

export function CronActions() {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleAction(action: string) {
    setLoading(action)
    setResult(null)
    try {
      if (action === 'executions') {
        window.location.href = '/admin/executions'
        return
      }

      const endpoint = action === 'run-cron' ? '/api/cron' : '/api/admin/integrations/test'
      const body =
        action === 'run-cron'
          ? {}
          : { key: 'cron', action }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && (data.success || data.ok)) {
        setResult({ type: 'success', message: data.message || 'Acao executada com sucesso' })
      } else {
        setResult({ type: 'error', message: data.error || `Resposta ${res.status}` })
      }
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Erro de rede' })
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-wider mb-3">
        Acoes
      </h2>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleAction('test-auth')}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Shield className="h-3.5 w-3.5" />
          {loading === 'test-auth' ? 'Testando...' : 'Testar Auth Cron'}
        </button>
        <button
          onClick={() => handleAction('run-cron')}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Play className="h-3.5 w-3.5" />
          {loading === 'run-cron' ? 'Executando...' : 'Rodar Cron Manual'}
        </button>
        <button
          onClick={() => handleAction('executions')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors"
        >
          <List className="h-3.5 w-3.5" />
          Ver Execucoes
        </button>
      </div>
      {result && (
        <div
          className={`mt-3 rounded-lg p-2 text-xs ${
            result.type === 'success'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {result.message}
        </div>
      )}
    </div>
  )
}
