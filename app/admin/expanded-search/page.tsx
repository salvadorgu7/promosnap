/**
 * Admin Dashboard — Busca Ampliada
 *
 * Operational dashboard: feature flag, connector health, coverage analysis,
 * revenue/affiliate metrics, experiment status, rollout control, and live test.
 */

import {
  Activity,
  Zap,
  Radio,
  FlaskConical,
  Search,
  Shield,
  Plug,
  BarChart3,
  Settings,
  DollarSign,
  TrendingUp,
  Eye,
  MousePointerClick,
  Gauge,
  Layers,
} from 'lucide-react'
import { getFlag, getRolloutPercentage } from '@/lib/config/feature-flags'
import { EXPERIMENTS } from '@/lib/search/expanded/experiments'
import { getAllProfiles } from '@/lib/search/expanded/category-personalization'
import prisma from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span className={`inline-block w-2.5 h-2.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-red-500'}`} />
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: typeof Activity
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className={`card p-4 border-l-3 ${color}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 opacity-70" />
        <span className="text-[10px] font-semibold text-text-secondary uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

export default async function ExpandedSearchDashboard() {
  const flagEnabled = getFlag('expandedSearch')
  const rolloutPct = getRolloutPercentage('FF_EXPANDED_SEARCH')

  // ── Connector readiness ──────────────────────────────────
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

  // ── Revenue & clickout metrics (last 7 days) ────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  let clickoutStats = {
    total7d: 0,
    total24h: 0,
    bySource: [] as { sourceSlug: string; _count: number }[],
    byPage: [] as { pageType: string; _count: number }[],
    byRail: [] as { railSource: string; _count: number }[],
    topQueries: [] as { query: string; _count: number }[],
  }

  try {
    const [total7d, total24h, bySource, byPage, byRail, topQueries] = await Promise.all([
      prisma.clickout.count({ where: { clickedAt: { gte: sevenDaysAgo } } }),
      prisma.clickout.count({ where: { clickedAt: { gte: oneDayAgo } } }),
      prisma.clickout.groupBy({
        by: ['sourceSlug'],
        where: { clickedAt: { gte: sevenDaysAgo }, sourceSlug: { not: null } },
        _count: true,
        orderBy: { _count: { sourceSlug: 'desc' } },
        take: 10,
      }),
      prisma.clickout.groupBy({
        by: ['pageType'],
        where: { clickedAt: { gte: sevenDaysAgo }, pageType: { not: null } },
        _count: true,
        orderBy: { _count: { pageType: 'desc' } },
        take: 10,
      }),
      prisma.clickout.groupBy({
        by: ['railSource'],
        where: { clickedAt: { gte: sevenDaysAgo }, railSource: { not: null } },
        _count: true,
        orderBy: { _count: { railSource: 'desc' } },
        take: 10,
      }),
      prisma.clickout.groupBy({
        by: ['query'],
        where: { clickedAt: { gte: sevenDaysAgo }, query: { not: null } },
        _count: true,
        orderBy: { _count: { query: 'desc' } },
        take: 15,
      }),
    ])

    clickoutStats = {
      total7d,
      total24h,
      bySource: bySource.map(s => ({ sourceSlug: s.sourceSlug || 'unknown', _count: s._count })),
      byPage: byPage.map(p => ({ pageType: p.pageType || 'unknown', _count: p._count })),
      byRail: byRail.map(r => ({ railSource: r.railSource || 'unknown', _count: r._count })),
      topQueries: topQueries.filter(q => q.query).map(q => ({ query: q.query!, _count: q._count })),
    }
  } catch {
    // DB may not have clickout data yet
  }

  // ── Offer/affiliate coverage ─────────────────────────────
  let affiliateStats = { totalActive: 0, withAffiliate: 0, coverage: 0 }
  try {
    const [totalActive, withAffiliate] = await Promise.all([
      prisma.offer.count({ where: { isActive: true } }),
      prisma.offer.count({ where: { isActive: true, affiliateUrl: { not: '' } } }),
    ])
    affiliateStats = {
      totalActive,
      withAffiliate,
      coverage: totalActive > 0 ? Math.round((withAffiliate / totalActive) * 100) : 0,
    }
  } catch {}

  // ── Env vars ─────────────────────────────────────────────
  const envVars: Record<string, boolean | string> = {
    SEARCHAPI_KEY: !!process.env.SEARCHAPI_KEY,
    SERPAPI_KEY: !!process.env.SERPAPI_KEY,
    ML_CLIENT_ID: !!process.env.ML_CLIENT_ID,
    SHOPEE_AFFILIATE_ID: !!process.env.SHOPEE_AFFILIATE_ID,
    FF_EXPANDED_SEARCH: process.env.FF_EXPANDED_SEARCH || 'not set',
  }

  // ── Experiments ──────────────────────────────────────────
  const activeExperiments = Object.values(EXPERIMENTS).filter(e => e.active)

  // ── Category profiles ────────────────────────────────────
  const profiles = getAllProfiles()

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <Zap className="w-6 h-6 text-brand-500" />
            Busca Ampliada
          </h1>
          <p className="text-sm text-text-muted mt-0.5">
            Pipeline, cobertura, receita, conectores e experimentos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
            flagEnabled
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {flagEnabled ? 'ATIVO' : 'DESATIVADO'}
          </div>
          {rolloutPct > 0 && rolloutPct < 100 && (
            <div className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
              Rollout {rolloutPct}%
            </div>
          )}
        </div>
      </div>

      {/* ═══ Key Metrics Row ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon={MousePointerClick} label="Clickouts 24h" value={clickoutStats.total24h} sub={`${clickoutStats.total7d} nos últimos 7 dias`} color="border-l-accent-blue" />
        <MetricCard icon={Shield} label="Cobertura Afiliada" value={`${affiliateStats.coverage}%`} sub={`${affiliateStats.withAffiliate}/${affiliateStats.totalActive} ofertas`} color="border-l-accent-green" />
        <MetricCard icon={Plug} label="Conectores" value={`${readyCount}/${totalConnectors}`} sub="prontos para expansão" color="border-l-accent-purple" />
        <MetricCard icon={Gauge} label="Rollout" value={`${rolloutPct}%`} sub={rolloutPct === 100 ? 'Full rollout' : rolloutPct > 0 ? 'Rollout gradual' : 'Desativado'} color="border-l-brand-500" />
      </div>

      {/* ═══ Revenue Section ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Clickouts by source */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
            <DollarSign className="w-4 h-4 text-accent-green" />
            Clickouts por Marketplace (7d)
          </h2>
          {clickoutStats.bySource.length > 0 ? (
            <div className="space-y-2">
              {clickoutStats.bySource.map(s => {
                const pct = clickoutStats.total7d > 0 ? Math.round((s._count / clickoutStats.total7d) * 100) : 0
                return (
                  <div key={s.sourceSlug} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-28 truncate text-text-secondary">{s.sourceSlug}</span>
                    <div className="flex-1 h-5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-green/60 rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-text-primary w-12 text-right">{s._count}</span>
                    <span className="text-[10px] text-text-muted w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Sem dados de clickout ainda</p>
          )}
        </div>

        {/* Clickouts by page type */}
        <div className="card p-5">
          <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
            <Layers className="w-4 h-4 text-accent-blue" />
            Clickouts por Página (7d)
          </h2>
          {clickoutStats.byPage.length > 0 ? (
            <div className="space-y-2">
              {clickoutStats.byPage.map(p => {
                const pct = clickoutStats.total7d > 0 ? Math.round((p._count / clickoutStats.total7d) * 100) : 0
                return (
                  <div key={p.pageType} className="flex items-center gap-2">
                    <span className="text-xs font-medium w-28 truncate text-text-secondary">{p.pageType}</span>
                    <div className="flex-1 h-5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent-blue/60 rounded-full transition-all"
                        style={{ width: `${Math.max(pct, 2)}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-text-primary w-12 text-right">{p._count}</span>
                    <span className="text-[10px] text-text-muted w-8 text-right">{pct}%</span>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-xs text-text-muted">Sem dados de página ainda</p>
          )}
        </div>
      </div>

      {/* ═══ Top Queries (potential for expanded search) ═══ */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <Search className="w-4 h-4 text-brand-500" />
          Top Queries com Clickout (7d)
          <span className="text-[10px] text-text-muted font-normal ml-auto">Queries que mais geram receita</span>
        </h2>
        {clickoutStats.topQueries.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {clickoutStats.topQueries.map((q, i) => (
              <div key={q.query} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-50">
                <span className="text-[10px] font-bold text-text-muted w-5">{i + 1}</span>
                <span className="text-xs font-medium text-text-primary truncate flex-1">{q.query}</span>
                <span className="text-xs font-bold text-accent-blue">{q._count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">Sem dados de query ainda</p>
        )}
      </div>

      {/* ═══ Clickouts by Rail Source ═══ */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-accent-orange" />
          Clickouts por Bloco/Rail (7d)
          <span className="text-[10px] text-text-muted font-normal ml-auto">Onde os clickouts acontecem na UI</span>
        </h2>
        {clickoutStats.byRail.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {clickoutStats.byRail.map(r => (
              <div key={r.railSource} className="px-3 py-2 rounded-lg bg-surface-50 border border-surface-200">
                <span className="text-xs font-medium text-text-secondary">{r.railSource}</span>
                <span className="ml-2 text-xs font-bold text-accent-orange">{r._count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted">Sem dados de rail/bloco ainda</p>
        )}
      </div>

      {/* ═══ Connector Detail ═══ */}
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
          Configure as chaves de API faltantes no Vercel para habilitar mais conectores.
        </p>
      </div>

      {/* ═══ Environment Check ═══ */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <Settings className="w-4 h-4 text-text-secondary" />
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

      {/* ═══ Experiments ═══ */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <FlaskConical className="w-4 h-4 text-accent-purple" />
          Experimentos A/B ({activeExperiments.length} ativos)
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

      {/* ═══ Category Profiles ═══ */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-accent-orange" />
          Perfis por Categoria ({Object.keys(profiles).length} verticais)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {Object.entries(profiles).map(([slug, profile]) => (
            <div key={slug} className="px-3 py-2.5 rounded-lg bg-surface-50 border border-surface-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-text-primary">{profile.label}</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface-200 text-text-muted">
                  min quality: {profile.minQualityScore}
                </span>
              </div>
              <p className="text-[10px] text-text-muted">{profile.connectorPriority.join(' → ')}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">
                Display: {profile.displayPriority} · Max discount: {profile.maxTrustDiscount}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Pipeline Architecture ═══ */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-brand-500" />
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
      </div>

      {/* ═══ Integration Points ═══ */}
      <div className="card p-5">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-4">
          <Eye className="w-4 h-4 text-accent-blue" />
          Pontos de Integração
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {[
            { label: 'Página de Busca', path: '/busca', desc: 'Grid expandido + weak results banner', status: flagEnabled },
            { label: 'Página de Produto', path: '/produto/[slug]', desc: 'ExpandedAlternatives (client fetch)', status: flagEnabled },
            { label: 'Página de Categoria', path: '/categoria/[slug]', desc: 'Rail horizontal em categorias finas', status: flagEnabled },
            { label: 'Assistente IA', path: '/assistente', desc: 'executeExpandedSearch em paralelo', status: flagEnabled },
            { label: 'API Expanded', path: '/api/search/expanded', desc: 'GET endpoint rate-limited', status: true },
            { label: 'API Diagnóstico', path: '/api/admin/diag/expanded-search', desc: 'Admin-only test endpoint', status: true },
          ].map(item => (
            <div key={item.path} className="px-3 py-2.5 rounded-lg bg-surface-50 flex items-start gap-2">
              <StatusDot ok={item.status} />
              <div>
                <p className="text-xs font-semibold text-text-primary">{item.label}</p>
                <p className="text-[10px] text-text-muted font-mono">{item.path}</p>
                <p className="text-[10px] text-text-secondary mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ Rollout Guide ═══ */}
      <div className="card p-5 bg-gradient-to-r from-brand-50/30 to-transparent border-brand-500/15">
        <h2 className="font-display font-semibold text-base text-text-primary flex items-center gap-2 mb-3">
          <Gauge className="w-4 h-4 text-brand-500" />
          Guia de Rollout
        </h2>
        <div className="space-y-2 text-xs text-text-secondary">
          <p><span className="font-mono font-bold text-text-primary">FF_EXPANDED_SEARCH=10</span> → 10% das requests (validação inicial)</p>
          <p><span className="font-mono font-bold text-text-primary">FF_EXPANDED_SEARCH=25</span> → 25% (monitorar clickouts e erros)</p>
          <p><span className="font-mono font-bold text-text-primary">FF_EXPANDED_SEARCH=50</span> → 50% (comparar métricas A vs B)</p>
          <p><span className="font-mono font-bold text-text-primary">FF_EXPANDED_SEARCH=true</span> → 100% (full rollout)</p>
          <p className="text-[10px] text-text-muted mt-2">
            Diagnóstico ao vivo: <span className="font-mono">GET /api/admin/diag/expanded-search?q=termo</span> (requer x-admin-secret)
          </p>
        </div>
      </div>
    </div>
  )
}
