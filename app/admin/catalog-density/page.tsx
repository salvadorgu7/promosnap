import { getAllPriorityCategoryDensities } from "@/lib/catalog/density"
import { analyzeCatalogGaps } from "@/lib/demand/catalog-gaps"
import {
  BarChart3,
  Package,
  Image,
  Link2,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Target,
  TrendingUp,
} from "lucide-react"

export const dynamic = "force-dynamic"

function scoreColor(score: number) {
  if (score >= 60) return "text-accent-green"
  if (score >= 30) return "text-amber-500"
  return "text-accent-red"
}

function scoreBg(score: number) {
  if (score >= 60) return "bg-green-50"
  if (score >= 30) return "bg-amber-50"
  return "bg-red-50"
}

function progressBarColor(score: number) {
  if (score >= 60) return "bg-accent-green"
  if (score >= 30) return "bg-amber-500"
  return "bg-accent-red"
}

const SOURCE_COLORS = [
  "bg-accent-blue",
  "bg-accent-green",
  "bg-amber-500",
  "bg-accent-red",
  "bg-purple-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-orange-500",
]

export default async function CatalogDensityPage() {
  const [densities, catalog] = await Promise.all([
    getAllPriorityCategoryDensities(),
    analyzeCatalogGaps(),
  ])

  // Summary stats
  const totalProducts = densities.reduce((sum, d) => sum + d.current.totalProducts, 0)
  const avgDensity = densities.length > 0
    ? Math.round(densities.reduce((sum, d) => sum + d.readiness.densityScore, 0) / densities.length)
    : 0
  const avgOverall = densities.length > 0
    ? Math.round(densities.reduce((sum, d) => sum + d.readiness.overallScore, 0) / densities.length)
    : 0
  const needAttention = densities.filter(d => d.readiness.overallScore < 40)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent-blue/10 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-accent-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Densidade de Catalogo — Sprint de Densificacao
          </h1>
          <p className="text-sm text-text-muted">
            Progresso por categoria prioritaria, gaps e prontidao comercial
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted flex items-center gap-1">
            <Package className="w-3 h-3" /> Produtos (Categorias Prioritarias)
          </p>
          <p className="text-2xl font-bold font-display text-text-primary">
            {totalProducts.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted flex items-center gap-1">
            <Target className="w-3 h-3" /> Densidade Media
          </p>
          <p className={`text-2xl font-bold font-display ${scoreColor(avgDensity)}`}>
            {avgDensity}/100
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Score Medio Geral
          </p>
          <p className={`text-2xl font-bold font-display ${scoreColor(avgOverall)}`}>
            {avgOverall}/100
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <p className="text-xs text-text-muted flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Precisam Atencao
          </p>
          <p className={`text-2xl font-bold font-display ${needAttention.length > 0 ? "text-accent-red" : "text-accent-green"}`}>
            {needAttention.length} / {densities.length}
          </p>
        </div>
      </div>

      {/* Categories needing attention */}
      {needAttention.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <h2 className="text-sm font-bold text-accent-red flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4" />
            Categorias que precisam de atencao urgente
          </h2>
          <div className="flex flex-wrap gap-2">
            {needAttention.map((d) => (
              <span
                key={d.slug}
                className="text-xs px-2.5 py-1 rounded-full bg-white text-accent-red font-medium border border-red-200"
              >
                {d.name} — Score {d.readiness.overallScore}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-surface-200 p-4 mb-6">
        <h2 className="text-sm font-bold text-text-primary mb-2">Acoes Rapidas</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/api/admin/catalog/fill"
            className="text-xs px-3 py-1.5 rounded-lg bg-accent-blue/10 text-accent-blue font-medium hover:bg-accent-blue/20 transition-colors"
          >
            Executar Fill Endpoint
          </a>
          <a
            href="/admin/imports"
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-100 text-text-secondary font-medium hover:bg-surface-200 transition-colors"
          >
            Importar Produtos
          </a>
          <a
            href="/admin/growth"
            className="text-xs px-3 py-1.5 rounded-lg bg-surface-100 text-text-secondary font-medium hover:bg-surface-200 transition-colors"
          >
            Ver Growth
          </a>
        </div>
      </div>

      {/* Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {densities.map((d) => (
          <div key={d.slug} className="bg-white rounded-xl border border-surface-200 p-6 flex flex-col">
            {/* Category header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-bold font-display text-text-primary">{d.name}</h3>
                <p className="text-[11px] font-mono text-text-muted">/{d.slug}</p>
              </div>
              <span
                className={`text-sm font-bold px-3 py-1 rounded-lg ${scoreBg(d.readiness.overallScore)} ${scoreColor(d.readiness.overallScore)}`}
              >
                {d.readiness.overallScore}
              </span>
            </div>

            {/* Progress bar: current vs target */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-text-muted">Produtos</span>
                <span className="text-xs font-mono font-semibold text-text-primary">
                  {d.current.totalProducts} / {d.target}
                </span>
              </div>
              <div className="w-full bg-surface-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressBarColor(d.readiness.densityScore)}`}
                  style={{ width: `${Math.min(100, (d.current.totalProducts / d.target) * 100)}%` }}
                />
              </div>
            </div>

            {/* Score grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <div className="text-center p-2 rounded-lg bg-surface-50">
                <p className="text-[10px] text-text-muted">Densidade</p>
                <p className={`text-sm font-bold ${scoreColor(d.readiness.densityScore)}`}>
                  {d.readiness.densityScore}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface-50">
                <p className="text-[10px] text-text-muted">Comercial</p>
                <p className={`text-sm font-bold ${scoreColor(d.readiness.commercialScore)}`}>
                  {d.readiness.commercialScore}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface-50">
                <p className="text-[10px] text-text-muted">SEO</p>
                <p className={`text-sm font-bold ${scoreColor(d.readiness.seoScore)}`}>
                  {d.readiness.seoScore}
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-surface-50">
                <p className="text-[10px] text-text-muted">Geral</p>
                <p className={`text-sm font-bold ${scoreColor(d.readiness.overallScore)}`}>
                  {d.readiness.overallScore}
                </p>
              </div>
            </div>

            {/* Key stats */}
            <div className="space-y-1.5 mb-4 text-xs">
              <div className="flex items-center gap-2 text-text-secondary">
                <Image className="w-3 h-3 text-text-muted flex-shrink-0" />
                <span>Com imagem:</span>
                <span className="font-mono font-semibold ml-auto">
                  {d.current.withImages} / {d.current.totalProducts}
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <Link2 className="w-3 h-3 text-text-muted flex-shrink-0" />
                <span>Com affiliate URL:</span>
                <span className="font-mono font-semibold ml-auto">
                  {d.current.withAffiliateUrl} / {d.current.totalProducts}
                </span>
              </div>
              <div className="flex items-center gap-2 text-text-secondary">
                <ShoppingBag className="w-3 h-3 text-text-muted flex-shrink-0" />
                <span>Media ofertas/produto:</span>
                <span className="font-mono font-semibold ml-auto">
                  {d.current.avgOffersPerProduct}
                </span>
              </div>
            </div>

            {/* Source distribution mini-chart */}
            {d.current.sources.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1.5">Fontes</p>
                <div className="flex rounded-full h-2 overflow-hidden">
                  {d.current.sources.map((src, i) => {
                    const totalSourceProducts = d.current.sources.reduce((s, x) => s + x.count, 0)
                    const share = totalSourceProducts > 0 ? (src.count / totalSourceProducts) * 100 : 0
                    return (
                      <div
                        key={src.slug}
                        className={`h-full ${SOURCE_COLORS[i % SOURCE_COLORS.length]}`}
                        style={{ width: `${Math.max(share, 2)}%` }}
                        title={`${src.slug}: ${src.count} produtos (${share.toFixed(0)}%)`}
                      />
                    )
                  })}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                  {d.current.sources.map((src, i) => (
                    <span key={src.slug} className="text-[10px] text-text-muted flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full inline-block ${SOURCE_COLORS[i % SOURCE_COLORS.length]}`} />
                      {src.slug} ({src.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Top brands */}
            {d.current.brands.length > 0 && (
              <div className="mb-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Marcas</p>
                <div className="flex flex-wrap gap-1">
                  {d.current.brands.map((b) => (
                    <span
                      key={b.name}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-surface-100 text-text-secondary"
                    >
                      {b.name} ({b.count})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Price range */}
            {d.current.priceRange && (
              <div className="mb-4">
                <p className="text-[10px] text-text-muted uppercase tracking-wider mb-1">Faixa de Preco</p>
                <p className="text-xs font-mono text-text-secondary">
                  R$ {d.current.priceRange.min.toFixed(2)} — R$ {d.current.priceRange.max.toFixed(2)}
                  <span className="text-text-muted ml-2">(media R$ {d.current.priceRange.avg.toFixed(2)})</span>
                </p>
              </div>
            )}

            {/* Gaps */}
            <div className="mt-auto pt-3 border-t border-surface-100 space-y-1">
              {d.gaps.productsNeeded > 0 && (
                <p className="text-xs text-accent-red flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  Precisa de {d.gaps.productsNeeded} mais produtos
                </p>
              )}
              {d.gaps.missingImages > 0 && (
                <p className="text-xs text-amber-500 flex items-center gap-1.5">
                  <Image className="w-3 h-3 flex-shrink-0" />
                  {d.gaps.missingImages} sem imagem
                </p>
              )}
              {d.gaps.missingAffiliateUrls > 0 && (
                <p className="text-xs text-amber-500 flex items-center gap-1.5">
                  <Link2 className="w-3 h-3 flex-shrink-0" />
                  {d.gaps.missingAffiliateUrls} sem affiliate URL
                </p>
              )}
              {d.gaps.lowOfferCoverage > 0 && (
                <p className="text-xs text-text-muted flex items-center gap-1.5">
                  <ShoppingBag className="w-3 h-3 flex-shrink-0" />
                  {d.gaps.lowOfferCoverage} com menos de 2 ofertas
                </p>
              )}
              {d.gaps.productsNeeded === 0 && d.gaps.missingImages === 0 && d.gaps.missingAffiliateUrls === 0 && (
                <p className="text-xs text-accent-green flex items-center gap-1.5">
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                  Categoria pronta comercialmente
                </p>
              )}
            </div>
          </div>
        ))}

        {densities.length === 0 && (
          <div className="lg:col-span-3 bg-white rounded-xl border border-surface-200 p-12 text-center">
            <Package className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-muted">
              Nenhuma categoria prioritaria encontrada. Verifique se as categorias foram criadas no catalogo.
            </p>
          </div>
        )}
      </div>

      {/* Catalog Health from analyzeCatalogGaps */}
      <div className="bg-white rounded-xl border border-surface-200 p-6 mt-6">
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-5 h-5 text-accent-blue" />
          <h2 className="text-base font-bold font-display text-text-primary">
            Saude Geral do Catalogo
          </h2>
          <div className="ml-auto">
            <span
              className={`text-sm font-bold px-3 py-1 rounded-lg ${scoreBg(catalog.healthScore)} ${scoreColor(catalog.healthScore)}`}
            >
              Score: {catalog.healthScore}/100
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-3 rounded-lg bg-surface-50">
            <p className="text-xs text-text-muted">Produtos Ativos</p>
            <p className="text-lg font-bold text-text-primary">{catalog.totalProducts}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-50">
            <p className="text-xs text-text-muted">Ofertas Ativas</p>
            <p className="text-lg font-bold text-text-primary">{catalog.activeOffers}</p>
          </div>
          <div className="p-3 rounded-lg bg-surface-50">
            <p className="text-xs text-text-muted">Fontes Ativas</p>
            <p className="text-lg font-bold text-text-primary">
              {catalog.sourceCoverage.filter((s) => s.products > 0).length}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-surface-50">
            <p className="text-xs text-text-muted">Gaps Detectados</p>
            <p className="text-lg font-bold text-accent-red">{catalog.gaps.length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
