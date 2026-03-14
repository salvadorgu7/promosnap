import { getDemandGraph } from "@/lib/demand/graph"
import { Search, TrendingUp, AlertTriangle, BarChart3, ArrowUpRight, Target } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function QueryIntelligencePage() {
  const demand = await getDemandGraph(30)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-accent-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Query Intelligence</h1>
          <p className="text-sm text-text-muted">O que os usuarios buscam, o que encontram, e o que falta</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted">Total Buscas (30d)</p>
          <p className="text-2xl font-bold font-display text-text-primary">{demand.totalSearches.toLocaleString("pt-BR")}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted">Queries Unicas</p>
          <p className="text-2xl font-bold font-display text-text-primary">{demand.uniqueQueries}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted">Taxa Zero Resultado</p>
          <p className={`text-2xl font-bold font-display ${demand.zeroResultRate > 0.3 ? "text-accent-red" : demand.zeroResultRate > 0.15 ? "text-amber-500" : "text-accent-green"}`}>
            {(demand.zeroResultRate * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted">Trending Up</p>
          <p className="text-2xl font-bold font-display text-accent-blue">{demand.trendingUp.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Queries */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-accent-blue" />
            Top Queries
          </h2>
          <div className="space-y-2">
            {demand.topQueries.slice(0, 15).map((q, i) => (
              <div key={q.query} className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
                <span className="text-xs text-text-muted w-5 text-right">{i + 1}</span>
                <span className="text-sm text-text-primary flex-1 truncate">{q.query}</span>
                <span className="text-xs font-mono text-text-muted">{q.count}x</span>
                <span className={`text-xs font-mono ${q.avgResultCount > 5 ? "text-accent-green" : q.avgResultCount > 0 ? "text-amber-500" : "text-accent-red"}`}>
                  {q.avgResultCount} results
                </span>
                {q.clickthroughRate > 0 && (
                  <span className="text-xs font-mono text-accent-blue">{(q.clickthroughRate * 100).toFixed(0)}% CTR</span>
                )}
              </div>
            ))}
            {demand.topQueries.length === 0 && (
              <p className="text-sm text-text-muted py-4 text-center">Nenhuma busca registrada ainda</p>
            )}
          </div>
        </div>

        {/* Zero Result Queries */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-accent-red" />
            Zero Resultado — Oportunidades
          </h2>
          <div className="space-y-2">
            {demand.zeroResultQueries.slice(0, 15).map((q) => (
              <div key={q.query} className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
                <span className="text-sm text-text-primary flex-1 truncate">{q.query}</span>
                <span className="text-xs font-mono text-text-muted">{q.count}x buscado</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-accent-red font-medium">sem resultado</span>
              </div>
            ))}
            {demand.zeroResultQueries.length === 0 && (
              <p className="text-sm text-text-muted py-4 text-center">Nenhuma query sem resultado</p>
            )}
          </div>
        </div>

        {/* High Demand Low Supply */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-500" />
            Alta Demanda / Pouca Oferta
          </h2>
          <div className="space-y-2">
            {demand.highDemandLowSupply.slice(0, 10).map((q) => (
              <div key={q.query} className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
                <span className="text-sm text-text-primary flex-1 truncate">{q.query}</span>
                <span className="text-xs font-mono text-text-muted">{q.count}x buscado</span>
                <span className="text-xs font-mono text-amber-500">{q.avgResultCount} prod</span>
              </div>
            ))}
            {demand.highDemandLowSupply.length === 0 && (
              <p className="text-sm text-text-muted py-4 text-center">Catalogo atende bem a demanda</p>
            )}
          </div>
        </div>

        {/* Trending Up */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-green" />
            Trending Up (7d vs 30d)
          </h2>
          <div className="space-y-2">
            {demand.trendingUp.slice(0, 10).map((q) => (
              <div key={q.query} className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
                <ArrowUpRight className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                <span className="text-sm text-text-primary flex-1 truncate">{q.query}</span>
                <span className="text-xs font-mono text-text-muted">{q.count}x total</span>
              </div>
            ))}
            {demand.trendingUp.length === 0 && (
              <p className="text-sm text-text-muted py-4 text-center">Sem tendencias detectadas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
