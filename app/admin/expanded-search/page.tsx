/**
 * Admin Dashboard — Busca Ampliada
 *
 * Overview of expanded search: feature flag, connector health,
 * coverage analysis, experiment status, and live test.
 */

import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Radio,
  FlaskConical,
  Search,
  Shield,
  Plug,
  BarChart3,
  Settings,
} from 'lucide-react'
import { getFlag } from '@/lib/config/feature-flags'
import { EXPERIMENTS } from '@/lib/search/expanded/experiments'

export const dynamic = 'force-dynamic'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
  )
}

export default async function ExpandedSearchDashboard() {
  const flagEnabled = getFlag('expandedSearch')

  // Check connector readiness
  let connectors: Record<string, boolean> = {}
  try {
    const { connectorRegistry } = await import('@/lib/ai/candidate-resolver')
    const slugs = ['google-shopping', 'mercadolivre-search', 'shopee-search', 'magalu-search']
    for (const slug of slugs) {
      const conn = connectorRegistry.get(slug)
      connectors[slug] = !!conn && conn.isReady()
    }
  } catch {
    connectors = {}
  }

  const readyCount = Object.values(connectors).filter(Boolean).length
  const totalConnectors = Object.keys(connectors).length

  // Env var check
  const envVars = {
    SEARCHAPI_KEY: !!process.env.SEARCHAPI_KEY,
    SERPAPI_KEY: !!process.env.SERPAPI_KEY,
    ML_CLIENT_ID: !!process.env.ML_CLIENT_ID,
    SHOPEE_AFFILIATE_ID: !!process.env.SHOPEE_AFFILIATE_ID,
    FF_EXPANDED_SEARCH: process.env.FF_EXPANDED_SEARCH || 'not set',
  }

  // Active experiments
  const activeExperiments = Object.values(EXPERIMENTS).filter(e => e.active)

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand-500" />
            Busca Ampliada
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Expanded search pipeline — cobertura, conectores e experimentos
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
          flagEnabled
            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {flagEnabled ? 'ATIVO' : 'DESATIVADO'}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Feature Flag */}
        <div className="card p-4 border-l-3 border-l-brand-500">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-brand-500" />
            <span className="text-xs font-semibold text-text-secondary uppercase">Feature Flag</span>
          </div>
          <div className="flex items-center gap-2">
            <StatusDot ok={flagEnabled} />
            <span className="text-sm font-bold">{flagEnabled ? 'Habilitado' : 'Desabilitado'}</span>
          </div>
          <p className="text-[10px] text-text-muted mt-1">FF_EXPANDED_SEARCH = {String(envVars.FF_EXPANDED_SEARCH)}</p>
        </div>

        {/* Connectors */}
        <div className="card p-4 border-l-3 border-l-accent-blue">
          <div className="flex items-center gap-2 mb-2">
            <Plug className="w-4 h-4 text-accent-blue" />
            <span className="text-xs font-semibold text-text-secondary uppercase">Conectores</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{readyCount}/{totalConnectors}</span>
            <span className="text-xs text-text-muted">prontos</span>
          </div>
        </div>

        {/* Experiments */}
        <div className="card p-4 border-l-3 border-l-accent-purple">
          <div className="flex items-center gap-2 mb-2">
            <FlaskConical className="w-4 h-4 text-accent-purple" />
            <span className="text-xs font-semibold text-text-secondary uppercase">Experimentos</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold">{activeExperiments.length}</span>
            <span className="text-xs text-text-muted">ativos</span>
          </div>
        </div>

        {/* Pipeline */}
        <div className="card p-4 border-l-3 border-l-accent-green">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-accent-green" />
            <span className="text-xs font-semibold text-text-secondary uppercase">Pipeline</span>
          </div>
          <div className="text-xs text-text-secondary space-y-0.5">
            <div>10 estágios</div>
            <div>Coverage → Expansion → Quality → Ranking</div>
          </div>
        </div>
      </div>

      {/* Connector Detail */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <Radio className="w-4 h-4 text-accent-blue" />
          Status dos Conectores
        </h2>
        <div className="space-y-2">
          {Object.entries(connectors).map(([slug, ready]) => (
            <div key={slug} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-50">
              <div className="flex items-center gap-2">
                <StatusDot ok={ready} />
                <span className="text-sm font-medium">{slug}</span>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                ready ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {ready ? 'Ready' : 'Not configured'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-text-muted mt-3">
          Conectores verificam env vars (API keys) ao iniciar. Configure as chaves faltantes para habilitar mais fontes.
        </p>
      </div>

      {/* Environment Check */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-accent-green" />
          Variáveis de Ambiente
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {Object.entries(envVars).map(([key, value]) => (
            <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50">
              <StatusDot ok={value === true || (typeof value === 'string' && value !== 'not set')} />
              <span className="text-xs font-medium text-text-secondary truncate">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Experiments */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <FlaskConical className="w-4 h-4 text-accent-purple" />
          Experimentos A/B
        </h2>
        <div className="space-y-3">
          {activeExperiments.map(exp => (
            <div key={exp.id} className="border border-surface-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold">{exp.name}</h3>
                  <p className="text-[10px] text-text-muted">{exp.description}</p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent-purple/10 text-accent-purple font-bold">
                  ATIVO
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {exp.variants.map(v => (
                  <span key={v.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-surface-100 text-text-secondary">
                    <span className="font-semibold">{v.id}</span>
                    <span className="text-text-muted">({v.weight}%)</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture overview */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-brand-500" />
          Pipeline Architecture
        </h2>
        <div className="flex items-center gap-1 flex-wrap text-xs">
          {[
            'Query Understanding',
            'Internal Search',
            'Coverage Eval',
            'Expansion Decision',
            'Connector Exec',
            'Candidate Resolution',
            'Quality Gates',
            'Dedup',
            'Hybrid Ranking',
            'Response',
          ].map((stage, i) => (
            <span key={stage}>
              <span className="px-2 py-1 rounded bg-surface-100 text-text-secondary font-medium">
                {stage}
              </span>
              {i < 9 && <span className="text-text-muted mx-0.5">→</span>}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-text-muted mt-3">
          Diagnóstico completo via API: GET /api/admin/diag/expanded-search?q=termo (requer x-admin-secret)
        </p>
      </div>

      {/* Integration Points */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-accent-orange" />
          Pontos de Integração
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { label: 'Página de Busca', path: '/busca', desc: 'Grid expandido + weak results banner' },
            { label: 'Página de Produto', path: '/produto/[slug]', desc: 'ExpandedAlternatives (client fetch)' },
            { label: 'Página de Categoria', path: '/categoria/[slug]', desc: 'Rail horizontal em categorias finas' },
            { label: 'Assistente IA', path: '/assistente', desc: 'executeExpandedSearch em paralelo' },
            { label: 'API Expanded', path: '/api/search/expanded', desc: 'GET endpoint rate-limited' },
            { label: 'API Diagnóstico', path: '/api/admin/diag/expanded-search', desc: 'Admin-only test endpoint' },
          ].map(item => (
            <div key={item.path} className="px-3 py-2.5 rounded-lg bg-surface-50">
              <p className="text-xs font-semibold text-text-primary">{item.label}</p>
              <p className="text-[10px] text-text-muted font-mono">{item.path}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
