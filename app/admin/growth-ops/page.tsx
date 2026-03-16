import {
  Rocket,
  TrendingUp,
  TrendingDown,
  Package,
  FileText,
  Radio,
  ArrowRight,
  AlertTriangle,
  Upload,
  Globe,
  Pencil,
  Send,
  Zap,
  Target,
  DollarSign,
  BarChart3,
  Star,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  ShoppingBag,
  Layers,
  Map,
  Repeat,
  Activity,
  Flame,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { getCatalogOpportunities } from "@/lib/catalog/opportunities";
import { getTrendCatalogGaps } from "@/lib/catalog/trend-links";
import { getReadyOffers } from "@/lib/distribution/engine";
import { getTopRevenueProducts, getUnderperformers, getRevenueOpportunities } from "@/lib/business/revenue-intelligence";
import { getAutomationSuggestions } from "@/lib/automation/automation-bridge";
import { getMoneyMap, getCompoundingRevenue } from "@/lib/business/money-map";
import { getQuickActions } from "@/lib/operations/assisted-actions";

export const dynamic = "force-dynamic";

const PRIORITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-surface-100 text-text-muted",
};

const PRIORITY_LABELS: Record<string, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const ACTION_STYLES: Record<string, { bg: string; text: string; icon: typeof Zap }> = {
  Destacar: { bg: "bg-accent-blue/10", text: "text-accent-blue", icon: Star },
  Distribuir: { bg: "bg-brand-100", text: "text-brand-700", icon: Send },
  "Importar Produto": { bg: "bg-accent-orange/10", text: "text-accent-orange", icon: Upload },
  "Expandir Cobertura": { bg: "bg-accent-green/10", text: "text-accent-green", icon: Layers },
};

export default async function GrowthOpsPage() {
  const [catalogOps, trendGaps, readyOffers, topProducts, underperformers, revenueOps, automationSuggestions, moneyMap, compounding, quickActions] = await Promise.all([
    getCatalogOpportunities().catch(() => ({
      emptyCategories: [],
      sparseBrands: [],
      unmatchedSearches: [],
      trendingWithoutProducts: [],
      totalOpportunities: 0,
    })),
    getTrendCatalogGaps().catch(() => ({
      importOpportunities: [],
      pageOpportunities: [],
      contentOpportunities: [],
      distributionOpportunities: [],
      totalGaps: 0,
    })),
    getReadyOffers(5).catch(() => []),
    getTopRevenueProducts(5).catch(() => []),
    getUnderperformers(5).catch(() => []),
    getRevenueOpportunities(5).catch(() => []),
    getAutomationSuggestions(10).catch(() => []),
    getMoneyMap().catch(() => ({ byCategory: [], byBrand: [], bySource: [] })),
    getCompoundingRevenue().catch(() => ({ recurringProducts: [], recurringCategories: [], conversionContent: [], channelsWithReturn: [] })),
    getQuickActions("growth").catch(() => []),
  ]);

  const totalAll = catalogOps.totalOpportunities + trendGaps.totalGaps;

  // Summary cards with trends
  const summaryCards = [
    {
      label: "Catálogo",
      count: catalogOps.totalOpportunities,
      icon: Package,
      color: "text-accent-blue",
      borderColor: "border-l-accent-blue",
      bgColor: "bg-accent-blue/5",
      description: "Categorias, marcas e buscas sem cobertura",
      href: "/admin/catalog-opportunities",
      trend: catalogOps.totalOpportunities > 5 ? "up" : catalogOps.totalOpportunities > 0 ? "neutral" : "down",
    },
    {
      label: "Importação",
      count: trendGaps.importOpportunities.length,
      icon: Upload,
      color: "text-accent-orange",
      borderColor: "border-l-accent-orange",
      bgColor: "bg-accent-orange/5",
      description: "Keywords em alta sem produtos no catálogo",
      href: "/admin/imports",
      trend: trendGaps.importOpportunities.length > 3 ? "up" : "neutral",
    },
    {
      label: "SEO",
      count: trendGaps.pageOpportunities.length,
      icon: Globe,
      color: "text-accent-green",
      borderColor: "border-l-accent-green",
      bgColor: "bg-accent-green/5",
      description: "Keywords com produtos mas sem página SEO",
      href: "/admin/seo",
      trend: trendGaps.pageOpportunities.length > 0 ? "up" : "neutral",
    },
    {
      label: "Conteúdo",
      count: trendGaps.contentOpportunities.length,
      icon: FileText,
      color: "text-accent-purple",
      borderColor: "border-l-accent-purple",
      bgColor: "bg-accent-purple/5",
      description: "Keywords com produtos mas sem guia/artigo",
      href: "/admin/artigos",
      trend: trendGaps.contentOpportunities.length > 2 ? "up" : "neutral",
    },
    {
      label: "Distribuição",
      count: trendGaps.distributionOpportunities.length + readyOffers.length,
      icon: Radio,
      color: "text-brand-500",
      borderColor: "border-l-brand-500",
      bgColor: "bg-brand-500/5",
      description: "Ofertas prontas para canais de distribuição",
      href: "/admin/distribution",
      trend: readyOffers.length > 0 ? "up" : "neutral",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <Rocket className="h-6 w-6 text-brand-500" />
            Growth & Ops
          </h1>
          <p className="text-sm text-text-muted">
            Oportunidades priorizadas de catálogo, conteúdo, SEO e distribuição
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-medium">
          <Target className="h-3 w-3" />
          {totalAll} oportunidades
        </div>
      </div>

      {/* Summary cards with trend indicators */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`card p-4 border-l-4 ${card.borderColor} hover:bg-surface-50 transition-colors`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <card.icon className={`h-4 w-4 ${card.color}`} />
                <span className="text-xs text-text-muted uppercase tracking-wider">{card.label}</span>
              </div>
              <TrendIndicator trend={card.trend as "up" | "down" | "neutral"} />
            </div>
            <p className="text-2xl font-bold font-display text-text-primary">{card.count}</p>
            <p className="text-[10px] text-text-muted mt-1">{card.description}</p>
          </Link>
        ))}
      </div>

      {/* ── Revenue Opportunity Section ── */}
      {(topProducts.length > 0 || underperformers.length > 0) && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-accent-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Oportunidades de Receita
              </h2>
              <p className="text-[10px] text-text-muted">
                Produtos com maior potencial de monetização
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Revenue Products */}
            {topProducts.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                  <BarChart3 className="h-3 w-3 text-accent-green" />
                  Top Produtos por Receita
                </h3>
                <div className="space-y-1.5">
                  {topProducts.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary truncate">{p.productName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          <span className="flex items-center gap-0.5">
                            <MousePointerClick className="h-2.5 w-2.5" />
                            {p.clickouts7d} cliques/7d
                          </span>
                          {p.bestPrice && (
                            <span>R$ {p.bestPrice.toFixed(2).replace(".", ",")}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-accent-green">
                        R$ {p.estimatedRevenue7d.toFixed(2).replace(".", ",")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Underperformers */}
            {underperformers.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                  <Eye className="h-3 w-3 text-accent-orange" />
                  Alto Trafego, Baixa Conversão
                </h3>
                <div className="space-y-1.5">
                  {underperformers.map((p) => (
                    <div key={p.productId} className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary truncate">{p.productName}</p>
                        <p className="text-[10px] text-text-muted truncate">{p.suggestion}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-orange/10 text-accent-orange">
                        {p.conversionRate}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Revenue Opportunities */}
          {revenueOps.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-200">
              <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-accent-blue" />
                Potencial de Crescimento
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {revenueOps.map((op, i) => (
                  <div key={i} className="px-3 py-2 bg-surface-50 rounded-lg">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        op.type === "category" ? "bg-accent-blue/10 text-accent-blue" :
                        op.type === "brand" ? "bg-accent-purple/10 text-accent-purple" :
                        "bg-accent-green/10 text-accent-green"
                      }`}>
                        {op.type === "category" ? "Categoria" : op.type === "brand" ? "Marca" : "Produto"}
                      </span>
                      <span className="text-xs font-medium text-text-primary truncate">{op.label}</span>
                    </div>
                    <p className="text-[10px] text-text-muted truncate">{op.reason}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-text-muted">Atual: R$ {op.currentRevenue.toFixed(2).replace(".", ",")}</span>
                      <span className="text-accent-green font-medium">Potencial: R$ {op.estimatedPotential.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Money Map ── */}
      {(moneyMap.byCategory.length > 0 || moneyMap.byBrand.length > 0) && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center">
              <Map className="h-5 w-5 text-accent-purple" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Money Map
              </h2>
              <p className="text-[10px] text-text-muted">
                Interesse vs receita — onde ha gap de monetização
              </p>
            </div>
          </div>

          {/* Category Money Map */}
          {moneyMap.byCategory.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <Package className="h-3 w-3 text-accent-blue" />
                Por Categoria
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-text-muted uppercase tracking-wider">
                      <th className="text-left px-3 py-1.5 font-medium">Categoria</th>
                      <th className="text-right px-3 py-1.5 font-medium">Interesse</th>
                      <th className="text-right px-3 py-1.5 font-medium">Receita</th>
                      <th className="text-right px-3 py-1.5 font-medium">Gap</th>
                      <th className="text-left px-3 py-1.5 font-medium">Acao Recomendada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {moneyMap.byCategory.slice(0, 8).map((entry) => (
                      <tr key={entry.slug} className="hover:bg-surface-50">
                        <td className="px-3 py-2 font-medium text-text-primary">{entry.label}</td>
                        <td className="px-3 py-2 text-right">
                          <MoneyMapBar value={entry.interestScore} color="bg-accent-blue" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <MoneyMapBar value={entry.revenueScore} color="bg-accent-green" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            entry.gapScore >= 40 ? "bg-red-100 text-red-700" :
                            entry.gapScore >= 20 ? "bg-amber-100 text-amber-700" :
                            "bg-surface-100 text-text-muted"
                          }`}>
                            {entry.gapScore}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-text-muted text-[10px] truncate max-w-[200px]">{entry.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Brand Money Map */}
          {moneyMap.byBrand.length > 0 && (
            <div className="pt-4 border-t border-surface-200">
              <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <Star className="h-3 w-3 text-accent-purple" />
                Por Marca
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-text-muted uppercase tracking-wider">
                      <th className="text-left px-3 py-1.5 font-medium">Marca</th>
                      <th className="text-right px-3 py-1.5 font-medium">Interesse</th>
                      <th className="text-right px-3 py-1.5 font-medium">Receita</th>
                      <th className="text-right px-3 py-1.5 font-medium">Gap</th>
                      <th className="text-left px-3 py-1.5 font-medium">Acao</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-100">
                    {moneyMap.byBrand.slice(0, 8).map((entry) => (
                      <tr key={entry.slug} className="hover:bg-surface-50">
                        <td className="px-3 py-2 font-medium text-text-primary">{entry.label}</td>
                        <td className="px-3 py-2 text-right">
                          <MoneyMapBar value={entry.interestScore} color="bg-accent-purple" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <MoneyMapBar value={entry.revenueScore} color="bg-accent-green" />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            entry.gapScore >= 40 ? "bg-red-100 text-red-700" :
                            entry.gapScore >= 20 ? "bg-amber-100 text-amber-700" :
                            "bg-surface-100 text-text-muted"
                          }`}>
                            {entry.gapScore}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-text-muted text-[10px] truncate max-w-[200px]">{entry.action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Source Money Map */}
          {moneyMap.bySource.length > 0 && (
            <div className="pt-4 border-t border-surface-200">
              <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <ShoppingBag className="h-3 w-3 text-accent-orange" />
                Por Fonte
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {moneyMap.bySource.slice(0, 6).map((entry) => (
                  <div key={entry.slug} className="px-3 py-2 bg-surface-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary">{entry.label}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        entry.gapScore >= 30 ? "bg-red-100 text-red-700" : "bg-surface-100 text-text-muted"
                      }`}>
                        Gap {entry.gapScore}
                      </span>
                    </div>
                    <p className="text-[10px] text-text-muted">{entry.action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Revenue Compounding ── */}
      {(compounding.recurringProducts.length > 0 || compounding.channelsWithReturn.length > 0) && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <Repeat className="h-5 w-5 text-accent-green" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Revenue Compounding
              </h2>
              <p className="text-[10px] text-text-muted">
                Produtos, categorias e canais com receita recorrente
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recurring Products */}
            {compounding.recurringProducts.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                  <Flame className="h-3 w-3 text-accent-orange" />
                  Produtos Recorrentes (3+ clickouts/30d)
                </h3>
                <div className="space-y-1.5">
                  {compounding.recurringProducts.slice(0, 5).map((p) => (
                    <div key={p.productId} className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary truncate">{p.productName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          <span className="flex items-center gap-0.5">
                            <MousePointerClick className="h-2.5 w-2.5" />
                            {p.clickouts30d} clickouts
                          </span>
                          <span>{p.uniqueSessions} sessões</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent-green/10 text-accent-green">
                        Recorrente
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recurring Categories */}
            {compounding.recurringCategories.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                  <Package className="h-3 w-3 text-accent-blue" />
                  Categorias Recorrentes
                </h3>
                <div className="space-y-1.5">
                  {compounding.recurringCategories.slice(0, 5).map((c) => (
                    <div key={c.categorySlug} className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary truncate">{c.categoryName}</p>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          <span>{c.clickouts30d} clickouts/30d</span>
                          <span>{c.recurringProducts} produtos ativos</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Content that drives conversions */}
          {compounding.conversionContent.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-200">
              <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-accent-purple" />
                Conteúdo que Converte
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {compounding.conversionContent.slice(0, 6).map((item, i) => (
                  <div key={i} className="px-3 py-2 bg-surface-50 rounded-lg">
                    <p className="text-xs font-medium text-text-primary truncate">{item.label}</p>
                    <div className="flex items-center justify-between mt-1 text-[10px]">
                      <span className="text-text-muted">{item.clickouts30d} clickouts/30d</span>
                      <span className="text-accent-green font-medium">Conv: {item.conversionProxy}x</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Channels with return */}
          {compounding.channelsWithReturn.length > 0 && (
            <div className="mt-4 pt-4 border-t border-surface-200">
              <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-brand-500" />
                Canais com Retorno
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {compounding.channelsWithReturn.slice(0, 4).map((ch) => (
                  <div key={ch.sourceSlug} className="px-3 py-2 bg-surface-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-primary">{ch.sourceName}</span>
                      <TrendIndicator trend={ch.trend > 0 ? "up" : ch.trend < 0 ? "down" : "neutral"} />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-text-muted">{ch.clickouts30d} clickouts</span>
                      <span className="text-accent-green font-medium">R$ {ch.estimatedRevenue.toFixed(2).replace(".", ",")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recommended Next Actions ── */}
      {quickActions.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent-orange/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-accent-orange" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-text-primary">
                Próximas Ações Recomendadas
              </h2>
              <p className="text-[10px] text-text-muted">
                Ações baseadas no estado atual do catálogo e dados de performance
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {quickActions.slice(0, 6).map((action) => (
              <Link
                key={action.id}
                href={action.actionUrl}
                className="flex items-center justify-between px-3 py-2.5 bg-surface-50 rounded-lg group hover:bg-surface-100 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary">{action.title}</p>
                  <p className="text-[10px] text-text-muted truncate">{action.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[action.priority]}`}>
                    {PRIORITY_LABELS[action.priority]}
                  </span>
                  {action.canAutoExecute && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent-green/10 text-accent-green">
                      Auto
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── Section Divider ── */}
      <div className="border-t border-surface-200" />

      {/* ── Ações Sugeridas ── */}
      {automationSuggestions.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-brand-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  Ações Sugeridas
                </h2>
                <p className="text-[10px] text-text-muted">
                  Sugestoes automatizadas priorizadas pela engine de automação
                </p>
              </div>
            </div>
            <Link
              href="/admin/automation"
              className="text-xs text-brand-500 hover:underline flex items-center gap-1"
            >
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {automationSuggestions.map((suggestion) => {
              const actionStyle = ACTION_STYLES[suggestion.action] ?? { bg: "bg-surface-100", text: "text-text-muted", icon: Zap };
              const ActionIcon = actionStyle.icon;
              return (
                <div key={suggestion.id} className="flex items-center justify-between px-3 py-2.5 bg-surface-50 rounded-lg group hover:bg-surface-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-7 h-7 rounded-lg ${actionStyle.bg} flex items-center justify-center flex-shrink-0`}>
                      <ActionIcon className={`h-3.5 w-3.5 ${actionStyle.text}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-text-primary truncate">{suggestion.title}</p>
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        <span>{suggestion.source}</span>
                        <span className="text-surface-300">|</span>
                        <span>{suggestion.description}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[suggestion.priority]}`}>
                      {PRIORITY_LABELS[suggestion.priority]}
                    </span>
                    <QuickActionButton type={suggestion.action} slug={suggestion.productSlug} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Section Divider ── */}
      <div className="border-t border-surface-200" />

      {/* ── Trend-Catalog Gaps ── */}

      {/* Import Opportunities */}
      {trendGaps.importOpportunities.length > 0 && (
        <Section
          title="Oportunidades de Importação"
          subtitle="Keywords em alta sem produtos — importar para capturar demanda"
          icon={Upload}
          iconColor="text-accent-orange"
          count={trendGaps.importOpportunities.length}
          actionLabel="Importar Catálogo"
          actionHref="/admin/imports"
        >
          <div className="space-y-2">
            {trendGaps.importOpportunities.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Page (SEO) Opportunities */}
      {trendGaps.pageOpportunities.length > 0 && (
        <Section
          title="Oportunidades de Página SEO"
          subtitle="Produtos existem mas sem página otimizada para buscadores"
          icon={Globe}
          iconColor="text-accent-green"
          count={trendGaps.pageOpportunities.length}
          actionLabel="Gerenciar SEO"
          actionHref="/admin/seo"
        >
          <div className="space-y-2">
            {trendGaps.pageOpportunities.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Content Opportunities */}
      {trendGaps.contentOpportunities.length > 0 && (
        <Section
          title="Oportunidades de Conteúdo"
          subtitle="Keywords com produtos mas sem artigo ou guia editorial"
          icon={FileText}
          iconColor="text-accent-purple"
          count={trendGaps.contentOpportunities.length}
          actionLabel="Criar Conteúdo"
          actionHref="/admin/artigos"
        >
          <div className="space-y-2">
            {trendGaps.contentOpportunities.slice(0, 8).map((gap, i) => (
              <GapRow key={i} gap={gap} />
            ))}
          </div>
        </Section>
      )}

      {/* Distribution Opportunities */}
      {(trendGaps.distributionOpportunities.length > 0 || readyOffers.length > 0) && (
        <Section
          title="Oportunidades de Distribuição"
          subtitle="Ofertas prontas para publicar em Telegram, WhatsApp, e-mail"
          icon={Radio}
          iconColor="text-brand-500"
          count={trendGaps.distributionOpportunities.length + readyOffers.length}
          actionLabel="Distribuir Ofertas"
          actionHref="/admin/distribution"
        >
          <div className="space-y-2">
            {trendGaps.distributionOpportunities.slice(0, 5).map((gap, i) => (
              <GapRow key={`gap-${i}`} gap={gap} />
            ))}
            {readyOffers.slice(0, 5).map((offer) => (
              <div
                key={offer.offerId}
                className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Send className="h-3.5 w-3.5 text-brand-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-text-primary truncate">{offer.productName}</p>
                    <div className="flex items-center gap-2 text-[10px] text-text-muted">
                      <span>R$ {offer.currentPrice.toFixed(2).replace(".", ",")}</span>
                      {offer.discount > 0 && (
                        <span className="text-green-600 font-medium">-{offer.discount}%</span>
                      )}
                      <span>{offer.sourceName}</span>
                      <span>Score: {offer.offerScore}</span>
                    </div>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-brand-100 text-brand-700">
                  Pronta
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* ── Catalog Opportunities ── */}

      {/* Empty Categories */}
      {catalogOps.emptyCategories.length > 0 && (
        <Section
          title="Categorias com Lacunas"
          subtitle="Categorias com poucos ou nenhum produto"
          icon={Package}
          iconColor="text-accent-blue"
          count={catalogOps.emptyCategories.length}
          actionLabel="Editar Catálogo"
          actionHref="/admin/catalog-edit"
        >
          <div className="space-y-2">
            {catalogOps.emptyCategories.slice(0, 6).map((op, i) => (
              <CatalogOpRow key={i} op={op} />
            ))}
          </div>
        </Section>
      )}

      {/* Unmatched Searches */}
      {catalogOps.unmatchedSearches.length > 0 && (
        <Section
          title="Buscas sem Resultados"
          subtitle="Termos buscados por usuarios sem produtos correspondentes"
          icon={TrendingUp}
          iconColor="text-accent-orange"
          count={catalogOps.unmatchedSearches.length}
          actionLabel="Ver Oportunidades"
          actionHref="/admin/catalog-opportunities"
        >
          <div className="space-y-2">
            {catalogOps.unmatchedSearches.slice(0, 6).map((op, i) => (
              <CatalogOpRow key={i} op={op} />
            ))}
          </div>
        </Section>
      )}

      {/* Empty state */}
      {totalAll === 0 && (
        <div className="card p-12 text-center">
          <Zap className="h-10 w-10 mx-auto mb-3 text-surface-300" />
          <p className="text-text-muted text-sm">
            Nenhuma oportunidade identificada no momento.
          </p>
          <p className="text-text-muted text-xs mt-1">
            Importe tendências e produtos para gerar oportunidades automaticamente.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Trend indicator ──────────────────────────────────────────────────────────

function TrendIndicator({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent-green">
        <ArrowUpRight className="h-3 w-3" />
      </span>
    );
  }
  if (trend === "down") {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent-red">
        <ArrowDownRight className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-text-muted">
      <Minus className="h-3 w-3" />
    </span>
  );
}

// ── Quick action button ──────────────────────────────────────────────────────

function QuickActionButton({ type, slug }: { type: string; slug?: string }) {
  let href = "/admin/automation";
  let label = type;

  if (type === "Destacar" && slug) {
    href = `/produto/${slug}`;
    label = "Destacar";
  } else if (type === "Distribuir") {
    href = "/admin/distribution";
    label = "Distribuir";
  } else if (type === "Importar Produto") {
    href = "/admin/imports";
    label = "Importar";
  } else if (type === "Expandir Cobertura") {
    href = "/admin/imports";
    label = "Expandir";
  } else if (type.includes("Guia") || type.includes("Review") || type.includes("Comparativo") || type.includes("Conteúdo")) {
    href = "/admin/artigos";
    label = "Criar";
  }

  return (
    <Link
      href={href}
      className="px-2 py-1 rounded text-[10px] font-medium bg-brand-500/10 text-brand-500 hover:bg-brand-500/20 transition-colors opacity-0 group-hover:opacity-100"
    >
      {label}
    </Link>
  );
}

// ── Reusable section component ──────────────────────────────────────────────

function Section({
  title,
  subtitle,
  icon: Icon,
  iconColor,
  count,
  actionLabel,
  actionHref,
  children,
}: {
  title: string;
  subtitle: string;
  icon: typeof Package;
  iconColor: string;
  count: number;
  actionLabel: string;
  actionHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {title}{" "}
              <span className="text-text-muted font-normal">({count})</span>
            </h2>
            <p className="text-[10px] text-text-muted">{subtitle}</p>
          </div>
        </div>
        <Link
          href={actionHref}
          className="text-xs text-brand-500 hover:underline flex items-center gap-1"
        >
          {actionLabel} <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {children}
    </div>
  );
}

// ── Gap row ─────────────────────────────────────────────────────────────────

function GapRow({ gap }: { gap: { keyword: string; priority: string; suggestion: string; matchingProducts: number } }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <TrendingUp className="h-3.5 w-3.5 text-accent-orange flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-text-primary font-medium">{gap.keyword}</p>
          <p className="text-[10px] text-text-muted truncate">{gap.suggestion}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-text-muted">{gap.matchingProducts} produtos</span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[gap.priority] || PRIORITY_STYLES.low}`}>
          {PRIORITY_LABELS[gap.priority] || "Baixa"}
        </span>
      </div>
    </div>
  );
}

// ── Money map bar ───────────────────────────────────────────────────────────

function MoneyMapBar({ value, color }: { value: number; color: string }) {
  const width = Math.min(100, Math.max(0, value));
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-surface-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${width}%` }} />
      </div>
      <span className="text-[10px] text-text-muted w-6 text-right">{value}</span>
    </div>
  );
}

// ── Catalog opportunity row ─────────────────────────────────────────────────

function CatalogOpRow({ op }: { op: { title: string; description: string; priority: string; metric: number; metricLabel: string } }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-surface-50 rounded-lg">
      <div className="flex items-center gap-3 min-w-0">
        <AlertTriangle className="h-3.5 w-3.5 text-accent-blue flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-sm text-text-primary font-medium">{op.title}</p>
          <p className="text-[10px] text-text-muted truncate">{op.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[10px] text-text-muted">
          {op.metric} {op.metricLabel}
        </span>
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${PRIORITY_STYLES[op.priority] || PRIORITY_STYLES.low}`}>
          {PRIORITY_LABELS[op.priority] || "Baixa"}
        </span>
      </div>
    </div>
  );
}
