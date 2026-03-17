import {
  DollarSign,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  Store,
  Layers,
  Package,
  Clock,
  Calendar,
  Target,
  AlertTriangle,
  Zap,
  BarChart3,
  ArrowUpRight,
  Map,
} from "lucide-react";
import { formatPrice, formatNumber } from "@/lib/utils";
import { getClickoutIntelligence } from "@/lib/demand/clickout-intelligence";
import { getMoneyMap, getCompoundingRevenue } from "@/lib/business/money-map";
import {
  getRevenueBySource,
  getRevenueByCategory,
  getTopRevenueProducts,
  getUnderperformers,
  getRevenueOpportunities,
} from "@/lib/business/revenue-intelligence";

export const dynamic = "force-dynamic";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function BarInline({ value, max, color = "bg-brand-500" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-text-muted w-8 text-right">{pct}%</span>
    </div>
  );
}

function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "green" | "orange" | "red" | "blue" | "purple" }) {
  const colors = {
    default: "bg-surface-100 text-text-secondary",
    green: "bg-emerald-50 text-emerald-700",
    orange: "bg-amber-50 text-amber-700",
    red: "bg-red-50 text-red-700",
    blue: "bg-blue-50 text-blue-700",
    purple: "bg-purple-50 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[variant]}`}>
      {children}
    </span>
  );
}

export default async function RevenueDashboard() {
  // Fetch all data in parallel
  const [
    clickoutIntel,
    moneyMap,
    compounding,
    revenueBySource,
    revenueByCategory,
    topProducts,
    underperformers,
    opportunities,
  ] = await Promise.all([
    getClickoutIntelligence(30).catch(() => null),
    getMoneyMap().catch(() => null),
    getCompoundingRevenue().catch(() => null),
    getRevenueBySource().catch(() => []),
    getRevenueByCategory().catch(() => []),
    getTopRevenueProducts(15).catch(() => []),
    getUnderperformers(10).catch(() => []),
    getRevenueOpportunities(10).catch(() => []),
  ]);

  const rev = clickoutIntel?.estimatedRevenue;

  // ---- Summary cards ----
  const summaryCards = [
    {
      label: "Revenue Hoje",
      value: formatPrice(rev?.today ?? 0),
      icon: DollarSign,
      color: "text-accent-green",
      bg: "bg-emerald-50",
    },
    {
      label: "Revenue 7d",
      value: formatPrice(rev?.week ?? 0),
      icon: TrendingUp,
      color: "text-accent-blue",
      bg: "bg-blue-50",
    },
    {
      label: "Revenue 30d",
      value: formatPrice(rev?.month ?? 0),
      icon: BarChart3,
      color: "text-brand-500",
      bg: "bg-purple-50",
    },
    {
      label: "Clickouts Hoje",
      value: formatNumber(clickoutIntel?.todayClickouts ?? 0),
      icon: MousePointerClick,
      color: "text-accent-orange",
      bg: "bg-amber-50",
    },
    {
      label: "Clickouts 7d",
      value: formatNumber(clickoutIntel?.weekClickouts ?? 0),
      icon: MousePointerClick,
      color: "text-accent-blue",
      bg: "bg-blue-50",
    },
    {
      label: "Clickouts 30d",
      value: formatNumber(clickoutIntel?.totalClickouts ?? 0),
      icon: MousePointerClick,
      color: "text-brand-500",
      bg: "bg-purple-50",
    },
    {
      label: "Ticket Médio",
      value: formatPrice(rev?.avgTicket ?? 0),
      icon: Package,
      color: "text-text-secondary",
      bg: "bg-surface-50",
    },
    {
      label: "Comissão Média",
      value: `${((rev?.avgCommission ?? 0) * 100).toFixed(1)}%`,
      icon: Target,
      color: "text-accent-green",
      bg: "bg-emerald-50",
    },
  ];

  // Hourly / daily patterns
  const hourlyData = clickoutIntel?.conversionByHour ?? [];
  const dailyData = clickoutIntel?.conversionByDay ?? [];
  const maxHourly = hourlyData.length > 0 ? Math.max(...hourlyData.map((h) => h.clicks), 1) : 1;
  const maxDaily = dailyData.length > 0 ? Math.max(...dailyData.map((d) => d.clicks), 1) : 1;

  // Money map data
  const mmCategories = moneyMap?.byCategory ?? [];
  const mmSources = moneyMap?.bySource ?? [];

  // Compounding data
  const recurringProducts = compounding?.recurringProducts?.slice(0, 10) ?? [];
  const channelsReturn = compounding?.channelsWithReturn ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-accent-green" />
          Revenue Dashboard
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Visão completa de receita, clickouts, padrões de conversão e oportunidades
        </p>
      </div>

      {/* ---- KPI Cards ---- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`p-1.5 rounded-lg ${s.bg}`}>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <span className="text-xs text-text-muted uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold font-display text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* ---- Row: Revenue by Source + Revenue by Category ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by Source */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-accent-blue" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Revenue por Fonte</h2>
            <Badge variant="blue">30d</Badge>
          </div>
          {revenueBySource.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de clickouts ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Fonte</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Clicks 7d</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Clicks 30d</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Comissão</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Receita Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueBySource.map((r) => (
                    <tr key={r.sourceSlug} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="py-2 text-text-primary font-medium">{r.sourceName}</td>
                      <td className="py-2 text-right text-text-secondary">{formatNumber(r.clickouts7d)}</td>
                      <td className="py-2 text-right text-text-secondary">{formatNumber(r.clickouts30d)}</td>
                      <td className="py-2 text-right text-text-muted">{(r.commissionRate * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right font-medium text-accent-green">{formatPrice(r.estimatedRevenue30d)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-200">
                    <td className="py-2 font-bold text-text-primary">Total</td>
                    <td className="py-2 text-right font-bold">{formatNumber(revenueBySource.reduce((s, r) => s + r.clickouts7d, 0))}</td>
                    <td className="py-2 text-right font-bold">{formatNumber(revenueBySource.reduce((s, r) => s + r.clickouts30d, 0))}</td>
                    <td></td>
                    <td className="py-2 text-right font-bold text-accent-green">
                      {formatPrice(revenueBySource.reduce((s, r) => s + r.estimatedRevenue30d, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Revenue by Category */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-accent-purple" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Revenue por Categoria</h2>
            <Badge variant="purple">30d</Badge>
          </div>
          {revenueByCategory.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de categorias.</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Categoria</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Clicks</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Receita</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {revenueByCategory.map((r) => (
                    <tr key={r.categorySlug} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="py-2 text-text-primary font-medium">{r.categoryName}</td>
                      <td className="py-2 text-right text-text-secondary">{formatNumber(r.clickouts30d)}</td>
                      <td className="py-2 text-right font-medium text-accent-green">{formatPrice(r.estimatedRevenue30d)}</td>
                      <td className="py-2 text-right">
                        {r.trend > 0 ? (
                          <span className="text-accent-green text-xs flex items-center justify-end gap-0.5">
                            <TrendingUp className="h-3 w-3" />+{r.trend.toFixed(0)}%
                          </span>
                        ) : r.trend < 0 ? (
                          <span className="text-red-500 text-xs flex items-center justify-end gap-0.5">
                            <TrendingDown className="h-3 w-3" />{r.trend.toFixed(0)}%
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---- Top Products ---- */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold font-display text-text-primary">Top 15 Produtos por Revenue</h2>
          <Badge variant="default">30d</Badge>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados de produtos ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 text-xs text-text-muted font-medium w-8">#</th>
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Produto</th>
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Categoria</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Clicks 7d</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Clicks 30d</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Melhor Preço</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Score</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Receita Est.</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.productSlug || i} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-2 text-text-muted font-medium">{i + 1}</td>
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        {p.imageUrl && (
                          <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />
                        )}
                        <span className="text-text-primary font-medium max-w-[250px] truncate block">
                          {p.productName}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 text-text-muted text-xs">{p.categorySlug ?? "—"}</td>
                    <td className="py-2 text-right text-text-secondary">{formatNumber(p.clickouts7d)}</td>
                    <td className="py-2 text-right text-text-secondary">{formatNumber(p.clickouts30d)}</td>
                    <td className="py-2 text-right text-text-secondary">{p.bestPrice ? formatPrice(p.bestPrice) : "—"}</td>
                    <td className="py-2 text-right">
                      {p.offerScore ? (
                        <Badge variant={p.offerScore >= 70 ? "green" : p.offerScore >= 40 ? "orange" : "default"}>
                          {p.offerScore}
                        </Badge>
                      ) : "—"}
                    </td>
                    <td className="py-2 text-right font-medium text-accent-green">{formatPrice(p.estimatedRevenue30d)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---- Row: Hourly + Daily Patterns ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Hourly Pattern */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-accent-orange" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Clickouts por Hora</h2>
          </div>
          {hourlyData.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados.</p>
          ) : (
            <div className="space-y-1">
              {hourlyData.map((h) => (
                <div key={h.hour} className="flex items-center gap-2 text-xs">
                  <span className="w-6 text-right text-text-muted font-mono">{String(h.hour).padStart(2, "0")}h</span>
                  <div className="flex-1 h-3 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent-orange to-amber-400"
                      style={{ width: `${Math.round((h.clicks / maxHourly) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-text-secondary font-medium">{h.clicks}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Daily Pattern */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="h-5 w-5 text-accent-blue" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Clickouts por Dia da Semana</h2>
          </div>
          {dailyData.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {dailyData.map((d) => (
                <div key={d.day} className="flex items-center gap-3">
                  <span className="w-8 text-sm text-text-muted font-medium">{DAY_NAMES[d.day] ?? d.day}</span>
                  <div className="flex-1 h-6 bg-surface-100 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg bg-gradient-to-r from-accent-blue to-blue-400 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(Math.round((d.clicks / maxDaily) * 100), 8)}%` }}
                    >
                      <span className="text-xs text-white font-medium">{d.clicks}</span>
                    </div>
                  </div>
                  <span className="w-12 text-right text-xs text-text-muted">{maxDaily > 0 ? ((d.clicks / maxDaily) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Money Map ---- */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Map className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold font-display text-text-primary">Money Map — Oportunidades de Monetizacao</h2>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Gap Score = Interest - Revenue. Quanto maior o gap, maior a oportunidade de monetizacao.
        </p>

        {mmCategories.length === 0 && mmSources.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados suficientes para o Money Map.</p>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Categories */}
            {mmCategories.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-1">
                  <Layers className="h-4 w-4" /> Categorias
                </h3>
                <div className="space-y-2">
                  {mmCategories.slice(0, 10).map((c) => (
                    <div key={c.label} className="flex items-center gap-3 text-sm">
                      <span className="w-32 truncate text-text-primary font-medium" title={c.label}>{c.label}</span>
                      <div className="flex-1">
                        <BarInline
                          value={c.gapScore}
                          max={100}
                          color={c.gapScore >= 40 ? "bg-red-400" : c.gapScore >= 20 ? "bg-amber-400" : "bg-emerald-400"}
                        />
                      </div>
                      <Badge variant={c.gapScore >= 40 ? "red" : c.gapScore >= 20 ? "orange" : "green"}>
                        Gap {c.gapScore}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sources */}
            {mmSources.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-text-secondary mb-3 flex items-center gap-1">
                  <Store className="h-4 w-4" /> Fontes
                </h3>
                <div className="space-y-2">
                  {mmSources.slice(0, 10).map((s) => (
                    <div key={s.label} className="flex items-center gap-3 text-sm">
                      <span className="w-32 truncate text-text-primary font-medium" title={s.label}>{s.label}</span>
                      <div className="flex-1">
                        <BarInline
                          value={s.gapScore}
                          max={100}
                          color={s.gapScore >= 40 ? "bg-red-400" : s.gapScore >= 20 ? "bg-amber-400" : "bg-emerald-400"}
                        />
                      </div>
                      <Badge variant={s.gapScore >= 40 ? "red" : s.gapScore >= 20 ? "orange" : "green"}>
                        Gap {s.gapScore}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ---- Row: Recurring Revenue + Channels ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recurring Products */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap className="h-5 w-5 text-accent-green" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Produtos Recorrentes</h2>
          </div>
          <p className="text-xs text-text-muted mb-3">Produtos com 3+ clickouts em 30d — receita composta</p>
          {recurringProducts.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum produto recorrente ainda.</p>
          ) : (
            <div className="space-y-2">
              {recurringProducts.map((p) => (
                <div key={p.productId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-50">
                  {p.imageUrl && <img src={p.imageUrl} alt="" className="w-8 h-8 rounded object-cover" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{p.productName}</p>
                    <p className="text-xs text-text-muted">{p.uniqueSessions} sessoes unicas</p>
                  </div>
                  <Badge variant="green">{p.clickouts30d} clicks</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Channels */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpRight className="h-5 w-5 text-accent-blue" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Canais com Retorno</h2>
          </div>
          {channelsReturn.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de canais.</p>
          ) : (
            <div className="space-y-3">
              {channelsReturn.map((ch) => (
                <div key={ch.sourceSlug} className="p-3 rounded-lg border border-surface-100 hover:border-surface-200">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary">{ch.sourceName}</span>
                    <span className="text-sm font-bold text-accent-green">{formatPrice(ch.estimatedRevenue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-text-muted">
                    <span>{formatNumber(ch.clickouts30d)} clickouts/mes</span>
                    <span className={ch.trend >= 0 ? "text-accent-green" : "text-red-500"}>
                      {ch.trend >= 0 ? "+" : ""}{ch.trend.toFixed(0)}% WoW
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Row: Underperformers + Opportunities ---- */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Underperformers */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Underperformers</h2>
          </div>
          <p className="text-xs text-text-muted mb-3">Alta visibilidade, baixa conversao — oportunidade de otimizacao</p>
          {underperformers.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum underperformer detectado.</p>
          ) : (
            <div className="space-y-2">
              {underperformers.map((u) => (
                <div key={u.productSlug} className="p-3 rounded-lg border border-amber-100 bg-amber-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-text-primary truncate max-w-[200px]">{u.productName}</span>
                    <Badge variant="orange">{u.conversionRate.toFixed(1)}% conv</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>{u.views} views</span>
                    <span>{u.clickouts} clicks</span>
                  </div>
                  {u.suggestion && (
                    <p className="text-xs text-amber-700 mt-1">{u.suggestion}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revenue Opportunities */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Target className="h-5 w-5 text-accent-green" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Oportunidades de Receita</h2>
          </div>
          {opportunities.length === 0 ? (
            <p className="text-sm text-text-muted">Sem oportunidades identificadas.</p>
          ) : (
            <div className="space-y-2">
              {opportunities.map((o, i) => (
                <div key={i} className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/30">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={o.type === "category" ? "purple" : o.type === "brand" ? "blue" : "default"}>
                        {o.type}
                      </Badge>
                      <span className="text-sm font-medium text-text-primary">{o.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted mt-1">
                    <span>Atual: {formatPrice(o.currentRevenue)}</span>
                    <span className="text-accent-green font-medium">Potencial: {formatPrice(o.estimatedPotential)}</span>
                    <span className="text-amber-600">Gap: {formatPrice(o.estimatedPotential - o.currentRevenue)}</span>
                  </div>
                  {o.reason && (
                    <p className="text-xs text-emerald-700 mt-1">{o.reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---- Top Converting Offers ---- */}
      {clickoutIntel && clickoutIntel.topConverting.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <MousePointerClick className="h-5 w-5 text-accent-orange" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Top Ofertas por Conversao</h2>
            <Badge>30d</Badge>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 text-xs text-text-muted font-medium">#</th>
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Produto</th>
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Fonte</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Clickouts</th>
                </tr>
              </thead>
              <tbody>
                {clickoutIntel.topConverting.map((o, i) => (
                  <tr key={o.offerId} className="border-b border-surface-100 hover:bg-surface-50">
                    <td className="py-2 text-text-muted">{i + 1}</td>
                    <td className="py-2 text-text-primary font-medium max-w-[300px] truncate">{o.productName ?? "—"}</td>
                    <td className="py-2 text-text-muted">{o.sourceSlug ?? "—"}</td>
                    <td className="py-2 text-right font-medium text-accent-orange">{formatNumber(o.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ---- Conversion by Source ---- */}
      {clickoutIntel && clickoutIntel.conversionBySource.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-text-secondary" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Distribuicao de Clickouts por Fonte</h2>
          </div>
          <div className="space-y-2">
            {clickoutIntel.conversionBySource.map((s) => (
              <div key={s.source} className="flex items-center gap-3 text-sm">
                <span className="w-28 truncate text-text-primary font-medium">{s.source}</span>
                <div className="flex-1">
                  <BarInline value={s.share} max={100} color="bg-accent-blue" />
                </div>
                <span className="w-16 text-right text-text-secondary font-medium">{formatNumber(s.clicks)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
