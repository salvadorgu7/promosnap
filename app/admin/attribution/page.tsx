import {
  Target,
  MousePointerClick,
  DollarSign,
  BarChart3,
  Search,
  TrendingDown,
  Layers,
} from "lucide-react";
import { formatPrice, formatNumber } from "@/lib/utils";
import {
  getClickoutsByRail,
  getClickoutsByCategory,
  getClickoutsByProduct,
  getClickoutConversionRate,
  getRevenueOpportunities,
} from "@/lib/analytics/attribution";

export const dynamic = "force-dynamic";

export default async function AttributionPage() {
  const [byRail, byCategory, topProducts, conversion, revenueOpps] =
    await Promise.all([
      getClickoutsByRail(7),
      getClickoutsByCategory(7),
      getClickoutsByProduct(7, 15),
      getClickoutConversionRate(7),
      getRevenueOpportunities(15),
    ]);

  const totalClickouts = byRail.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Target className="h-6 w-6 text-accent-blue" />
          Attribution
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Atribuicao de clickouts por rail, categoria, produto e oportunidades de revenue (7 dias)
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Clickouts (7d)</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(totalClickouts)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Rails Ativos</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{byRail.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Conversao Search</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {(conversion.conversionRate * 100).toFixed(1)}%
          </p>
          <p className="text-xs text-text-muted mt-1">
            {formatNumber(conversion.searchesWithClickout)} / {formatNumber(conversion.totalSearches)} buscas
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Oportunidades</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{revenueOpps.length}</p>
          <p className="text-xs text-text-muted mt-1">ofertas com desconto e poucos clicks</p>
        </div>
      </div>

      {/* Clickouts by Rail */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-accent-blue" />
          Clickouts por Rail
        </h2>
        {byRail.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Nenhum clickout registrado nos ultimos 7 dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-text-muted">
                  <th className="text-left py-2 pr-4">Rail</th>
                  <th className="text-right py-2 px-4">Clickouts</th>
                  <th className="text-right py-2 px-4">%</th>
                  <th className="text-left py-2 pl-4">Distribuicao</th>
                </tr>
              </thead>
              <tbody>
                {byRail.map((r) => (
                  <tr key={r.railSource} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-2 pr-4 font-medium">{r.railSource}</td>
                    <td className="py-2 px-4 text-right">{formatNumber(r.count)}</td>
                    <td className="py-2 px-4 text-right text-text-muted">{r.percentage}%</td>
                    <td className="py-2 pl-4">
                      <div className="w-full max-w-[200px] h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-accent-blue rounded-full"
                          style={{ width: `${Math.min(r.percentage, 100)}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Two column: Categories + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Clickouts by Category */}
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-500" />
            Clickouts por Categoria
          </h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">Sem dados de categoria.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {byCategory.map((c, i) => (
                <div key={c.categorySlug} className="flex items-center gap-3 px-3 py-2 bg-surface-50 rounded-lg">
                  <span className="text-xs font-bold text-text-muted w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary font-medium truncate block">{c.categorySlug}</span>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{formatNumber(c.count)}</span>
                  <span className="text-xs text-text-muted w-12 text-right">{c.percentage}%</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Top Products */}
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <MousePointerClick className="h-5 w-5 text-emerald-500" />
            Top Produtos (Clickouts)
          </h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">Sem dados de produto.</p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {topProducts.map((p, i) => (
                <div key={p.productId} className="flex items-center gap-3 px-3 py-2 bg-surface-50 rounded-lg">
                  <span className="text-xs font-bold text-text-muted w-5">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-text-primary font-medium truncate block">{p.productName}</span>
                    <span className="text-[10px] text-text-muted">/{p.productSlug}</span>
                  </div>
                  <span className="text-sm font-semibold text-text-primary">{formatNumber(p.clickouts)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Revenue Opportunities */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-orange-500" />
          Oportunidades de Revenue
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Ofertas com desconto significativo (&gt;15%) e affiliate URL, mas poucos clickouts — monetizacao perdida
        </p>
        {revenueOpps.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Nenhuma oportunidade identificada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-text-muted">
                  <th className="text-left py-2 pr-4">Produto</th>
                  <th className="text-right py-2 px-4">Preco</th>
                  <th className="text-right py-2 px-4">De</th>
                  <th className="text-right py-2 px-4">Desconto</th>
                  <th className="text-right py-2 px-4">Clickouts (7d)</th>
                </tr>
              </thead>
              <tbody>
                {revenueOpps.map((opp) => (
                  <tr key={opp.offerId} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-2 pr-4 font-medium max-w-[250px] truncate">{opp.productName}</td>
                    <td className="py-2 px-4 text-right text-emerald-700 font-semibold">
                      {formatPrice(opp.currentPrice)}
                    </td>
                    <td className="py-2 px-4 text-right text-text-muted line-through">
                      {formatPrice(opp.originalPrice)}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
                        -{opp.discountPct}%
                      </span>
                    </td>
                    <td className="py-2 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-text-muted">
                        <TrendingDown className="h-3 w-3" />
                        {opp.clickouts}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
