'use client'

import { useState, useEffect } from 'react'
import {
  ShoppingBag,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Key,
  Link2,
  Shield,
  Play,
  Loader2,
  Search,
  Download,
  Package,
  TrendingUp,
  Tag,
} from 'lucide-react'

interface SearchResult {
  externalId: string
  title: string
  currentPrice: number
  originalPrice?: number
  imageUrl?: string
  isFreeShipping: boolean
  availability: string
  category?: string
}

interface ImportResult {
  imported: number
  skipped: number
  total: number
  errors?: string[]
  message: string
}

// Quick category buttons for the UI
const QUICK_CATEGORIES = [
  { label: 'Celulares', query: 'celular' },
  { label: 'Notebooks', query: 'notebook' },
  { label: 'Fones', query: 'fone' },
  { label: 'TVs', query: 'tv' },
  { label: 'Smartwatches', query: 'smartwatch' },
  { label: 'Consoles', query: 'console' },
  { label: 'Tablets', query: 'tablet' },
  { label: 'Cameras', query: 'camera' },
  { label: 'Monitores', query: 'monitor' },
  { label: 'Tenis', query: 'tenis' },
  { label: 'Perfumes', query: 'perfume' },
  { label: 'Cafeteiras', query: 'cafeteira' },
]

export default function MlIntegrationPage() {
  const [authStatus, setAuthStatus] = useState<'ok' | 'error' | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const auth = params.get('auth')
    if (auth === 'ok' || auth === 'error') {
      setAuthStatus(auth)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchLimit, setSearchLimit] = useState(20)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [searchMeta, setSearchMeta] = useState<{ category?: string; method?: string } | null>(null)
  const [diagnosing, setDiagnosing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [diagResult, setDiagResult] = useState<Record<string, any> | null>(null)

  const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET ?? ''

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/admin/integrations/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
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

  async function handleDiagnose() {
    setDiagnosing(true)
    setDiagResult(null)
    try {
      const res = await fetch('/api/admin/ml/token-check', {
        headers: { 'x-admin-secret': adminSecret },
      })
      setDiagResult(await res.json())
    } catch (err) {
      setDiagResult({ error: String(err) })
    } finally {
      setDiagnosing(false)
    }
  }

  async function handleSearch(overrideQuery?: string) {
    const q = overrideQuery || searchQuery
    if (!q.trim()) return
    if (overrideQuery) setSearchQuery(overrideQuery)

    setSearching(true)
    setSearchResults([])
    setImportResult(null)
    setSearchError(null)
    setSearchMeta(null)

    try {
      const res = await fetch(
        `/api/admin/ml/search?q=${encodeURIComponent(q)}&limit=${searchLimit}`,
        { headers: { 'x-admin-secret': adminSecret } }
      )
      const data = await res.json()

      if (data.results && data.results.length > 0) {
        setSearchResults(data.results)
        setSearchMeta({ category: data.category, method: data.method })
      } else if (data.error) {
        setSearchError(data.error)
      } else {
        setSearchError(`Nenhum resultado para "${q}". Tente uma das categorias abaixo.`)
      }
    } catch (err) {
      setSearchError(`Erro de rede: ${err}`)
    } finally {
      setSearching(false)
    }
  }

  async function handleImport() {
    if (searchResults.length === 0 && !searchQuery.trim()) return
    setImporting(true)
    setImportResult(null)
    setSearchError(null)

    try {
      // Always import by IDs when we have results (avoids geo-block on server search)
      const importBody = searchResults.length > 0
        ? { externalIds: searchResults.map((r) => r.externalId) }
        : { query: searchQuery, limit: searchLimit }

      const res = await fetch('/api/admin/ml/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-secret': adminSecret },
        body: JSON.stringify(importBody),
      })
      const data = await res.json()
      if (!res.ok) {
        setImportResult({ imported: 0, skipped: 0, total: 0, message: `Erro ${res.status}: ${data.error || JSON.stringify(data)}` })
        return
      }
      setImportResult(data)
    } catch {
      setImportResult({ imported: 0, skipped: 0, total: 0, message: 'Erro de rede' })
    } finally {
      setImporting(false)
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
          <p className="text-sm text-gray-500">Importacao automatica via API — best sellers por categoria</p>
        </div>
      </div>

      {/* OAuth Status */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Status OAuth</h2>
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          <ConfigRow label="Client ID" envKey="MERCADOLIVRE_APP_ID" icon={<Key className="h-4 w-4" />} />
          <ConfigRow label="Client Secret" envKey="MERCADOLIVRE_SECRET" icon={<Shield className="h-4 w-4" />} />
          <ConfigRow label="Redirect URI" envKey="ML_REDIRECT_URI" icon={<Link2 className="h-4 w-4" />} />
        </div>
      </section>

      {/* OAuth result banner */}
      {authStatus === 'ok' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>OAuth concluido com sucesso! Token salvo.</span>
        </div>
      )}
      {authStatus === 'error' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <XCircle className="h-5 w-5 flex-shrink-0" />
          <span>Falha no OAuth. Verifique os logs do Vercel.</span>
        </div>
      )}

      {/* Actions */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Acoes</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={handleTest} disabled={testing}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors">
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Testar Auth
          </button>
          <a href="/api/auth/ml"
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <ExternalLink className="h-4 w-4" />
            Iniciar OAuth
          </a>
          <button onClick={handleDiagnose} disabled={diagnosing}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition-colors">
            {diagnosing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shield className="h-4 w-4" />}
            Diagnosticar
          </button>
        </div>

        {testResult && (
          <div className={`rounded-lg border p-3 text-sm ${testResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
            {testResult.success ? <CheckCircle2 className="inline h-4 w-4 mr-1" /> : <XCircle className="inline h-4 w-4 mr-1" />}
            {testResult.message}
          </div>
        )}

        {diagResult && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs font-mono text-gray-800 overflow-auto max-h-60">
            <pre className="whitespace-pre-wrap">{JSON.stringify(diagResult, null, 2)}</pre>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* IMPORTAR PRODUTOS */}
      {/* ================================================================= */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-yellow-600" />
          <h2 className="text-lg font-semibold text-gray-900">Importar Produtos do ML</h2>
        </div>

        <p className="text-sm text-gray-500">
          Busca best sellers por categoria usando a API do Mercado Livre. Clique numa categoria ou digite uma palavra-chave.
        </p>

        {/* Quick category buttons */}
        <div className="flex flex-wrap gap-2">
          {QUICK_CATEGORIES.map((cat) => (
            <button
              key={cat.query}
              onClick={() => handleSearch(cat.query)}
              disabled={searching}
              className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-yellow-50 hover:border-yellow-300 hover:text-yellow-700 disabled:opacity-50 transition-colors"
            >
              <Tag className="h-3 w-3" />
              {cat.label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-gray-200 p-4 space-y-4">
          {/* Search input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Ex: celular, notebook, fone, tv, smartwatch..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
            <select
              value={searchLimit}
              onChange={(e) => setSearchLimit(Number(e.target.value))}
              className="rounded-lg border border-gray-300 px-2 py-2 text-sm bg-white"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Buttons */}
          <div className="flex gap-2">
            <button onClick={() => handleSearch()} disabled={searching || !searchQuery.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50 transition-colors">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar (preview)
            </button>
            <button onClick={handleImport} disabled={importing || (searchResults.length === 0 && !searchQuery.trim())}
              className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white hover:bg-yellow-600 disabled:opacity-50 transition-colors">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Importar pro Catalogo
            </button>
          </div>

          {/* Search metadata */}
          {searchMeta && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <TrendingUp className="h-3 w-3" />
              {searchMeta.category && <span>Categoria: <strong>{searchMeta.category}</strong></span>}
              {searchMeta.method && <span className="text-gray-400">({searchMeta.method})</span>}
            </div>
          )}

          {/* Search error */}
          {searchError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <XCircle className="inline h-4 w-4 mr-1" />
              {searchError}
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div className={`rounded-lg border p-3 text-sm ${importResult.imported > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              <CheckCircle2 className="inline h-4 w-4 mr-1" />
              {importResult.message}
              {importResult.errors && importResult.errors.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs">
                  {importResult.errors.map((err, i) => (
                    <li key={i} className="text-red-600">• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Search results preview */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">
                {searchResults.length} produtos encontrados:
              </p>
              <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 rounded-lg border border-gray-200">
                {searchResults.map((item) => (
                  <div key={item.externalId} className="flex items-center gap-3 p-3">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-lg object-cover bg-gray-100" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{item.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm font-semibold text-emerald-600">
                          R$ {item.currentPrice?.toFixed(2) || '—'}
                        </span>
                        {item.originalPrice && item.originalPrice > item.currentPrice && (
                          <span className="text-xs text-gray-400 line-through">
                            R$ {item.originalPrice.toFixed(2)}
                          </span>
                        )}
                        {item.isFreeShipping && (
                          <span className="text-xs text-emerald-500 font-medium">Frete gratis</span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-400 font-mono">{item.externalId}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function ConfigRow({ label, envKey, icon }: { label: string; envKey: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-gray-400">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-400 truncate">{envKey}</p>
      </div>
    </div>
  )
}
