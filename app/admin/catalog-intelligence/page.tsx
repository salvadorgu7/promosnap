import {
  Brain,
  Search,
  TrendingUp,
  AlertTriangle,
  Target,
  Zap,
  ArrowRight,
  CheckCircle2,
  Globe,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import {
  getTopDemandQueries,
  getDemandGaps,
  getGrowthLoops,
  getDemandOpportunities,
} from "@/lib/demand/intelligence";

export const dynamic = "force-dynamic";

const INTENT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  brand: { bg: "bg-purple-50", text: "text-purple-700", label: "Marca" },
  category: { bg: "bg-blue-50", text: "text-blue-700", label: "Categoria" },
  promotion: { bg: "bg-orange-50", text: "text-orange-700", label: "Promo" },
  comparison: { bg: "bg-amber-50", text: "text-amber-700", label: "Comparacao" },
  product: { bg: "bg-emerald-50", text: "text-emerald-700", label: "Produto" },
};

export default async function CatalogIntelligencePage() {
  const [topQueries, gaps, growthLoops, opportunities] = await Promise.all([
    getTopDemandQueries(20),
    getDemandGaps(20),
    getGrowthLoops(15),
    getDemandOpportunities(20),
  ]);

  const totalActions = gaps.length + growthLoops.filter((l) => !l.hasExistingPage).length + opportunities.length;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <Brain className="h-6 w-6 text-accent-blue" />
            Demand Intelligence
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Analise de demanda: queries populares, gaps, oportunidades de crescimento e conversao
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-medium">
            <Target className="h-3 w-3" />
            {totalActions} acoes
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Search} label="Top Queries" value={topQueries.length} color="text-accent-blue" borderColor="border-l-accent-blue" />
        <SummaryCard icon={AlertTriangle} label="Demand Gaps" value={gaps.length} color="text-orange-500" borderColor="border-l-orange-500" />
        <SummaryCard icon={TrendingUp} label="Growth Loops" value={growthLoops.length} color="text-emerald-500" borderColor="border-l-emerald-500" />
        <SummaryCard icon={BarChart3} label="Oportunidades" value={opportunities.length} color="text-brand-500" borderColor="border-l-brand-500" />
      </div>

      {/* Top Demand Queries */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Search className="h-5 w-5 text-accent-blue" />
          Top Queries por Demanda
          <span className="text-xs text-text-muted bg-surface-100 px-2 py-0.5 rounded-full ml-2">{topQueries.length}</span>
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Ranking por frequencia x recencia (30 dias). Queries mais recentes e frequentes tem score maior.
        </p>
        {topQueries.length === 0 ? (
          <EmptyState text="Nenhuma query registrada nos ultimos 30 dias." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-text-muted">
                  <th className="text-left py-2 pr-4">#</th>
                  <th className="text-left py-2 pr-4">Query</th>
                  <th className="text-right py-2 px-4">Buscas</th>
                  <th className="text-right py-2 px-4">Recencia</th>
                  <th className="text-right py-2 px-4">Demand Score</th>
                  <th className="text-right py-2 pl-4">Ultima Busca</th>
                </tr>
              </thead>
              <tbody>
                {topQueries.map((q, i) => (
                  <tr key={q.query} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-2 pr-4 text-text-muted text-xs">{i + 1}</td>
                    <td className="py-2 pr-4 font-medium">{q.query}</td>
                    <td className="py-2 px-4 text-right">{q.count}</td>
                    <td className="py-2 px-4 text-right text-text-muted">{q.recencyScore}</td>
                    <td className="py-2 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-accent-blue/10 text-accent-blue">
                        {q.demandScore}
                      </span>
                    </td>
                    <td className="py-2 pl-4 text-right text-text-muted text-xs">
                      {new Date(q.lastSearched).toLocaleDateString("pt-BR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Two column: Gaps + Opportunities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Gaps */}
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Demand Gaps
            <span className="text-xs text-text-muted bg-surface-100 px-2 py-0.5 rounded-full ml-2">{gaps.length}</span>
          </h2>
          <p className="text-xs text-text-muted mb-4">
            Queries frequentes que retornam poucos ou zero resultados — demanda nao atendida.
          </p>
          {gaps.length === 0 ? (
            <EmptyState text="Nenhum gap de demanda identificado." />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {gaps.map((g) => (
                <div key={g.query} className="flex items-center justify-between px-3 py-2.5 bg-surface-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{g.query}</p>
                    <p className="text-[10px] text-text-muted">
                      {g.searchCount} buscas | media {g.avgResultsCount} resultados
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200 flex-shrink-0">
                    GAP
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Demand Opportunities */}
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-500" />
            Oportunidades de Conversao
            <span className="text-xs text-text-muted bg-surface-100 px-2 py-0.5 rounded-full ml-2">{opportunities.length}</span>
          </h2>
          <p className="text-xs text-text-muted mb-4">
            Queries com resultados mas baixa taxa de clickout (&lt;10%) — potencial de UX ou merchandising.
          </p>
          {opportunities.length === 0 ? (
            <EmptyState text="Nenhuma oportunidade de conversao identificada." />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {opportunities.map((o) => (
                <div key={o.query} className="flex items-center justify-between px-3 py-2.5 bg-surface-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{o.query}</p>
                    <p className="text-[10px] text-text-muted">
                      {o.searchCount} buscas | {o.avgResultsCount} resultados | {o.clickoutCount} clickouts
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex-shrink-0">
                    {(o.conversionRate * 100).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Growth Loops */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-500" />
          Growth Loops
          <span className="text-xs text-text-muted bg-surface-100 px-2 py-0.5 rounded-full ml-2">{growthLoops.length}</span>
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Queries frequentes com intencao comercial que podem virar landing pages dedicadas para SEO e conversao.
        </p>
        {growthLoops.length === 0 ? (
          <EmptyState text="Nenhum growth loop identificado." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-text-muted">
                  <th className="text-left py-2 pr-4">Query</th>
                  <th className="text-right py-2 px-4">Buscas</th>
                  <th className="text-center py-2 px-4">Intencao</th>
                  <th className="text-left py-2 px-4">Slug Potencial</th>
                  <th className="text-center py-2 pl-4">Pagina Existente</th>
                </tr>
              </thead>
              <tbody>
                {growthLoops.map((loop) => {
                  const intentStyle = INTENT_STYLES[loop.intent] || INTENT_STYLES.product;
                  return (
                    <tr key={loop.query} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="py-2 pr-4 font-medium">{loop.query}</td>
                      <td className="py-2 px-4 text-right">{loop.searchCount}</td>
                      <td className="py-2 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${intentStyle.bg} ${intentStyle.text}`}>
                          {intentStyle.label}
                        </span>
                      </td>
                      <td className="py-2 px-4 text-text-muted font-mono text-xs">/{loop.potentialSlug}</td>
                      <td className="py-2 pl-4 text-center">
                        {loop.hasExistingPage ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            CRIAR
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Empty state fallback */}
      {topQueries.length === 0 && gaps.length === 0 && growthLoops.length === 0 && opportunities.length === 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-surface-300" />
          <p className="text-text-muted text-sm">
            Nenhum dado de demand intelligence disponivel.
          </p>
          <p className="text-text-muted text-xs mt-1">
            Os dados aparecem conforme buscas e clickouts sao registrados no sistema.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ──

function SummaryCard({
  icon: Icon,
  label,
  value,
  color,
  borderColor,
}: {
  icon: typeof Search;
  label: string;
  value: number;
  color: string;
  borderColor: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-surface-200 border-l-4 ${borderColor} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-text-muted uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold font-display text-text-primary">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-2 py-6 justify-center text-sm text-text-muted">
      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
      {text}
    </div>
  );
}
