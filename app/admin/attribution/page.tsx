import {
  Target,
  MousePointerClick,
  DollarSign,
  Globe,
  Layers,
  Radio,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { formatPrice, formatNumber } from "@/lib/utils";
import prisma from "@/lib/db/prisma";
import {
  getAttributionSummary,
  getAttributionFunnel,
} from "@/lib/attribution/engine";
import {
  getRevenueByAttribution,
  getTopPerformingPages,
  getChannelROI,
} from "@/lib/attribution/revenue-attribution";

export const dynamic = "force-dynamic";

export default async function AttributionPage() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

  // DB clickout count for 7d (real data)
  const clickouts7d = await prisma.clickout
    .count({ where: { clickedAt: { gte: sevenDaysAgo } } })
    .catch(() => 0);

  // Attribution data (in-memory)
  const summary = getAttributionSummary(7);
  const funnel = getAttributionFunnel();
  const revenue = getRevenueByAttribution(7);
  const topPages = getTopPerformingPages(10);
  const channelROI = await getChannelROI();

  // Determine top source and top page type
  const topSource =
    Object.entries(summary.bySource).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "N/A";
  const topPageType =
    Object.entries(summary.byPageType).sort(([, a], [, b]) => b - a)[0]?.[0] ||
    "N/A";

  // Estimated revenue 7d
  const estimatedRevenue7d = revenue.totalEstimatedRevenue;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">
          Attribution
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Rastreamento de origem dos clickouts e atribuicao de revenue por
          dimensao.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          icon={MousePointerClick}
          label="Clickouts (7d)"
          value={formatNumber(clickouts7d)}
          sub={`${summary.total} com atribuicao`}
        />
        <SummaryCard
          icon={DollarSign}
          label="Revenue Estimado (7d)"
          value={formatPrice(estimatedRevenue7d)}
          sub="baseado em comissoes"
        />
        <SummaryCard
          icon={Globe}
          label="Top Source"
          value={topSource}
          sub="maior volume de clickouts"
        />
        <SummaryCard
          icon={Layers}
          label="Top Page Type"
          value={topPageType}
          sub="tipo de pagina com mais clickouts"
        />
      </div>

      {/* Origem dos Clickouts */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent-blue" />
          Origem dos Clickouts
        </h2>
        {revenue.bySource.length === 0 ? (
          <p className="text-sm text-text-muted">
            Nenhum dado de atribuicao por source ainda. Os dados aparecem conforme
            clickouts com parametros de atribuicao sao registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-text-muted">
                  <th className="text-left py-2 pr-4">Source</th>
                  <th className="text-right py-2 px-4">Clickouts</th>
                  <th className="text-right py-2 px-4">Revenue Est.</th>
                </tr>
              </thead>
              <tbody>
                {revenue.bySource.map((r) => (
                  <tr
                    key={r.key}
                    className="border-b border-surface-100 hover:bg-surface-50"
                  >
                    <td className="py-2 pr-4 font-medium">{r.key}</td>
                    <td className="py-2 px-4 text-right">
                      {formatNumber(r.clickouts)}
                    </td>
                    <td className="py-2 px-4 text-right text-green-700">
                      {formatPrice(r.estimatedRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Clickouts por Contexto */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* By Page Type */}
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Layers className="h-5 w-5 text-brand-500" />
            Clickouts por Tipo de Pagina
          </h2>
          {revenue.byPageType.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de pageType.</p>
          ) : (
            <div className="space-y-2">
              {revenue.byPageType.map((r) => (
                <div key={r.key} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.key}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted">
                      {formatNumber(r.clickouts)}
                    </span>
                    <span className="text-sm text-green-700">
                      {formatPrice(r.estimatedRevenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* By Channel */}
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Radio className="h-5 w-5 text-purple-600" />
            Clickouts por Canal
          </h2>
          {revenue.byChannel.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de channel.</p>
          ) : (
            <div className="space-y-2">
              {revenue.byChannel.map((r) => (
                <div key={r.key} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{r.key}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-text-muted">
                      {formatNumber(r.clickouts)}
                    </span>
                    <span className="text-sm text-green-700">
                      {formatPrice(r.estimatedRevenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Revenue por Campanha/Canal/Banner */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-orange-500" />
          Revenue por Campanha / Canal / Banner
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Campaigns */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">
              Campanhas
            </h3>
            {revenue.byCampaign.length === 0 ? (
              <p className="text-xs text-text-muted">Sem campanhas rastreadas.</p>
            ) : (
              <div className="space-y-1">
                {revenue.byCampaign.map((r) => (
                  <div
                    key={r.key}
                    className="flex justify-between text-sm"
                  >
                    <span>{r.key}</span>
                    <span className="text-green-700">
                      {formatPrice(r.estimatedRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Channel ROI */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">
              Canal ROI
            </h3>
            {channelROI.length === 0 ? (
              <p className="text-xs text-text-muted">Sem dados de canal.</p>
            ) : (
              <div className="space-y-1">
                {channelROI.map((r) => (
                  <div
                    key={r.channel}
                    className="flex justify-between text-sm"
                  >
                    <span>{r.channel}</span>
                    <span className="text-text-muted">
                      {r.roi > 0 ? `${r.roi}x` : "-"} &middot;{" "}
                      <span className="text-green-700">
                        {formatPrice(r.estimatedRevenue)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Banners */}
          <div>
            <h3 className="text-sm font-semibold text-text-muted mb-2 uppercase tracking-wider">
              Banners
            </h3>
            {revenue.byBanner.length === 0 ? (
              <p className="text-xs text-text-muted">Sem banners rastreados.</p>
            ) : (
              <div className="space-y-1">
                {revenue.byBanner.map((r) => (
                  <div
                    key={r.key}
                    className="flex justify-between text-sm"
                  >
                    <span>{r.key}</span>
                    <span className="text-green-700">
                      {formatPrice(r.estimatedRevenue)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Funil de Conversao */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Target className="h-5 w-5 text-red-500" />
          Funil de Conversao
        </h2>
        {funnel.steps.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados de funil.</p>
        ) : (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {funnel.steps.map((step, idx) => (
              <div key={step.stage} className="flex items-center gap-2">
                <div className="text-center px-4 py-3 bg-surface-50 rounded-lg min-w-[120px]">
                  <p className="text-xs text-text-muted uppercase tracking-wider">
                    {step.stage.replace(/_/g, " ")}
                  </p>
                  <p className="text-xl font-bold text-text-primary mt-1">
                    {step.stage.includes("revenue")
                      ? formatPrice(step.count)
                      : formatNumber(step.count)}
                  </p>
                  {step.byDimension &&
                    Object.keys(step.byDimension).length > 0 && (
                      <div className="mt-1 space-y-0.5">
                        {Object.entries(step.byDimension)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 3)
                          .map(([dim, val]) => (
                            <p
                              key={dim}
                              className="text-[10px] text-text-muted"
                            >
                              {dim}: {formatNumber(val)}
                            </p>
                          ))}
                      </div>
                    )}
                </div>
                {idx < funnel.steps.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-text-muted" />
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Top Performing Pages */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent-blue" />
          Top Pages (30d)
        </h2>
        {topPages.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados de top pages.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 text-text-muted">
                  <th className="text-left py-2 pr-4">Tipo</th>
                  <th className="text-right py-2 px-4">Clickouts</th>
                  <th className="text-right py-2 px-4">Revenue Est.</th>
                  <th className="text-right py-2 pl-4">Share</th>
                </tr>
              </thead>
              <tbody>
                {topPages.map((p) => (
                  <tr
                    key={p.pageType}
                    className="border-b border-surface-100 hover:bg-surface-50"
                  >
                    <td className="py-2 pr-4 font-medium">{p.pageType}</td>
                    <td className="py-2 px-4 text-right">
                      {formatNumber(p.clickouts)}
                    </td>
                    <td className="py-2 px-4 text-right text-green-700">
                      {formatPrice(p.estimatedRevenue)}
                    </td>
                    <td className="py-2 pl-4 text-right text-text-muted">
                      {p.share}%
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

// ─── Components ─────────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-text-muted" />
        <span className="text-xs text-text-muted uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted mt-1">{sub}</p>
    </div>
  );
}
