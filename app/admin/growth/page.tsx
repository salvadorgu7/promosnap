import { getClickoutIntelligence } from "@/lib/demand/clickout-intelligence"
import { analyzeCatalogGaps } from "@/lib/demand/catalog-gaps"
import { TrendingUp, DollarSign, MousePointerClick, Package, AlertCircle, ArrowRight } from "lucide-react"

export const dynamic = "force-dynamic"

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"]

export default async function GrowthPage() {
  const [intel, catalog] = await Promise.all([
    getClickoutIntelligence(30),
    analyzeCatalogGaps(),
  ])

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent-green/10 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-accent-green" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Growth & Revenue</h1>
          <p className="text-sm text-text-muted">Clickouts, conversao, receita estimada e saude do catalogo</p>
        </div>
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> Clickouts Hoje</p>
          <p className="text-2xl font-bold font-display text-text-primary">{intel.todayClickouts}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> Clickouts 7d</p>
          <p className="text-2xl font-bold font-display text-text-primary">{intel.weekClickouts}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted flex items-center gap-1"><DollarSign className="w-3 h-3" /> Receita Est. Hoje</p>
          <p className="text-2xl font-bold font-display text-accent-green">R$ {intel.estimatedRevenue.today.toFixed(2)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted flex items-center gap-1"><DollarSign className="w-3 h-3" /> Receita Est. Mes</p>
          <p className="text-2xl font-bold font-display text-accent-green">R$ {intel.estimatedRevenue.month.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Conversion by Source */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-4">Clickouts por Fonte</h2>
          <div className="space-y-3">
            {intel.conversionBySource.map((s) => (
              <div key={s.source} className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary w-28 truncate">{s.source}</span>
                <div className="flex-1 bg-surface-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-accent-blue rounded-full"
                    style={{ width: `${Math.max(s.share * 100, 2)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-text-muted w-16 text-right">{s.clicks} clicks</span>
                <span className="text-xs font-mono text-accent-blue w-12 text-right">{(s.share * 100).toFixed(0)}%</span>
              </div>
            ))}
            {intel.conversionBySource.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">Nenhum clickout registrado</p>
            )}
          </div>
        </div>

        {/* Conversion by Category */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-4">Clickouts por Categoria</h2>
          <div className="space-y-3">
            {intel.conversionByCategory.slice(0, 10).map((c) => (
              <div key={c.category} className="flex items-center gap-3">
                <span className="text-sm font-medium text-text-primary w-28 truncate">{c.category}</span>
                <div className="flex-1 bg-surface-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-accent-green rounded-full"
                    style={{ width: `${Math.max(c.share * 100, 2)}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-text-muted w-16 text-right">{c.clicks} clicks</span>
              </div>
            ))}
            {intel.conversionByCategory.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">Nenhum clickout com categoria</p>
            )}
          </div>
        </div>

        {/* Top Converting Products */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-4">Top Produtos (Clickouts)</h2>
          <div className="space-y-2">
            {intel.topConverting.slice(0, 10).map((p, i) => (
              <div key={p.offerId} className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
                <span className="text-xs text-text-muted w-5 text-right">{i + 1}</span>
                <span className="text-sm text-text-primary flex-1 truncate">{p.productName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-text-muted">{p.sourceSlug}</span>
                <span className="text-xs font-mono font-semibold text-text-primary">{p.clicks}x</span>
              </div>
            ))}
            {intel.topConverting.length === 0 && (
              <p className="text-sm text-text-muted text-center py-4">Nenhum clickout registrado</p>
            )}
          </div>
        </div>

        {/* Clickout Heatmap by Hour */}
        <div className="bg-white rounded-xl border border-surface-200 p-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-4">Clickouts por Hora</h2>
          <div className="grid grid-cols-6 gap-1.5">
            {Array.from({ length: 24 }, (_, h) => {
              const data = intel.conversionByHour.find(d => d.hour === h);
              const clicks = data?.clicks || 0;
              const maxClicks = Math.max(...intel.conversionByHour.map(d => d.clicks), 1);
              const intensity = clicks / maxClicks;
              return (
                <div
                  key={h}
                  className="flex flex-col items-center gap-0.5"
                  title={`${h}h: ${clicks} clickouts`}
                >
                  <div
                    className="w-full h-6 rounded"
                    style={{
                      backgroundColor: clicks > 0
                        ? `rgba(18, 183, 106, ${0.1 + intensity * 0.9})`
                        : "#f1f4fa",
                    }}
                  />
                  <span className="text-[9px] text-text-muted">{h}h</span>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 mt-3">
            {intel.conversionByDay.map(d => (
              <div key={d.day} className="text-center flex-1">
                <p className="text-[10px] text-text-muted">{DAY_NAMES[d.day]}</p>
                <p className="text-xs font-mono font-semibold text-text-primary">{d.clicks}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Catalog Health */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-accent-blue" />
          <h2 className="text-base font-bold font-display text-text-primary">Saude do Catalogo</h2>
          <div className="ml-auto">
            <span className={`text-sm font-bold px-3 py-1 rounded-lg ${
              catalog.healthScore >= 70 ? "bg-green-50 text-accent-green" :
              catalog.healthScore >= 40 ? "bg-amber-50 text-amber-600" :
              "bg-red-50 text-accent-red"
            }`}>
              Score: {catalog.healthScore}/100
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-3 rounded-lg bg-surface-50">
            <p className="text-xs text-text-muted">Produtos Ativos</p>
            <p className="text-lg font-bold text-text-primary">{catalog.totalProducts}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-50">
            <p className="text-xs text-text-muted">Ofertas Ativas</p>
            <p className="text-lg font-bold text-text-primary">{catalog.activeOffers}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-50">
            <p className="text-xs text-text-muted">Fontes</p>
            <p className="text-lg font-bold text-text-primary">{catalog.sourceCoverage.filter(s => s.products > 0).length}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-50">
            <p className="text-xs text-text-muted">Gaps Detectados</p>
            <p className="text-lg font-bold text-accent-red">{catalog.gaps.length}</p>
          </div>
        </div>

        {/* Source Coverage */}
        <h3 className="text-sm font-semibold text-text-primary mb-2">Cobertura por Fonte</h3>
        <div className="space-y-2 mb-4">
          {catalog.sourceCoverage.map((s) => (
            <div key={s.source} className="flex items-center gap-3">
              <span className="text-sm text-text-primary w-28">{s.source}</span>
              <span className="text-xs font-mono text-text-muted">{s.products} produtos</span>
              <span className="text-xs font-mono text-accent-blue">{s.offers} ofertas</span>
            </div>
          ))}
        </div>

        {/* Gaps */}
        {catalog.gaps.length > 0 && (
          <>
            <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 text-accent-red" />
              Gaps no Catalogo
            </h3>
            <div className="space-y-2">
              {catalog.gaps.slice(0, 10).map((g) => (
                <div key={g.query} className="flex items-center gap-3 py-1.5 border-b border-surface-50 last:border-0">
                  <span className="text-sm text-text-primary flex-1 truncate">{g.query}</span>
                  <span className="text-xs font-mono text-text-muted">{g.searchCount}x buscado</span>
                  <span className="text-xs font-mono text-amber-500">{g.currentProducts} prod</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    g.suggestedAction === "import" ? "bg-blue-50 text-accent-blue" :
                    g.suggestedAction === "expand_category" ? "bg-amber-50 text-amber-600" :
                    "bg-green-50 text-accent-green"
                  }`}>
                    {g.suggestedAction === "import" ? "Importar" :
                     g.suggestedAction === "expand_category" ? "Expandir" :
                     g.suggestedAction === "create_page" ? "Criar Pagina" : "Adicionar Fonte"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
