'use client'

import { useState } from 'react'
import { Send, Eye, Settings } from 'lucide-react'

export function TelegramActions() {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleAction(action: string) {
    setLoading(action)
    setResult(null)
    try {
      const res = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': process.env.NEXT_PUBLIC_ADMIN_SECRET ?? '' },
        body: JSON.stringify({ key: 'telegram', action }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setResult({ type: 'success', message: data.message || 'Acao executada com sucesso' })
      } else {
        setResult({ type: 'error', message: data.error || 'Erro ao executar acao' })
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
          onClick={() => handleAction('test')}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          <Send className="h-3.5 w-3.5" />
          {loading === 'test' ? 'Enviando...' : 'Enviar Teste'}
        </button>
        <button
          onClick={() => handleAction('preview')}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          {loading === 'preview' ? 'Enviando...' : 'Enviar Preview de Oferta'}
        </button>
        <button
          onClick={() => handleAction('validate')}
          disabled={loading !== null}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors"
        >
          <Settings className="h-3.5 w-3.5" />
          {loading === 'validate' ? 'Validando...' : 'Validar Config'}
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
