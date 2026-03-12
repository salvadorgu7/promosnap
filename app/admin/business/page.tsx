import {
  Target,
  Users,
  MousePointerClick,
  DollarSign,
  RefreshCw,
  Server,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  Bell,
  Search,
  Radio,
  FileText,
  Award,
} from "lucide-react";
import { getAllBusinessMetrics } from "@/lib/business/metrics";
import { getAllScorecards } from "@/lib/business/scorecards";
import { getRetentionMetrics as getDetailedRetention } from "@/lib/business/retention";
import { getRetentionValueRanking } from "@/lib/business/retention-value";
import type { MetricResult, MetricStatus, Scorecard, ScorecardItem } from "@/lib/business/types";
import type { RetentionMetrics } from "@/lib/business/retention";
import type { RetentionFeatureRank } from "@/lib/business/retention-value";
import { toSeverity, severityBadge, severityDot } from "@/lib/admin/severity";

export const dynamic = "force-dynamic";

// ============================================
// Sub-components
// ============================================

function StatusDot({ status }: { status: MetricStatus }) {
  const sev = toSeverity(status);
  return <span className={`inline-block w-2 h-2 rounded-full ${severityDot(sev)}`} />;
}

function StatusBadge({ status }: { status: MetricStatus }) {
  const sev = toSeverity(status);
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${severityBadge(sev)}`}>
      <StatusDot status={status} />
      {status === "good" ? "ok" : status}
    </span>
  );
}

function TrendArrow({ value }: { value: number }) {
  if (value > 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 text-xs font-medium">
        <ArrowUpRight className="h-3 w-3" />+{value}%
      </span>
    );
  if (value < 0)
    return (
      <span className="inline-flex items-center gap-0.5 text-red-500 text-xs font-medium">
        <ArrowDownRight className="h-3 w-3" />{value}%
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 text-text-muted text-xs font-medium">
      <Minus className="h-3 w-3" />0%
    </span>
  );
}

function formatValue(value: number, format?: MetricResult["format"]): string {
  switch (format) {
    case "currency":
      return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "percent":
      return `${value}%`;
    case "decimal":
      return value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    default:
      return value.toLocaleString("pt-BR");
  }
}

function MetricCard({ m }: { m: MetricResult }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted font-medium uppercase tracking-wider truncate">{m.label}</span>
        <StatusDot status={m.status} />
      </div>
      <p className="text-2xl font-bold font-display text-text-primary">{formatValue(m.value, m.format)}</p>
      <div className="flex items-center gap-3">
        <TrendArrow value={m.trend7d} />
        {m.trend30d !== 0 && (
          <span className="text-[10px] text-text-muted">30d: {m.trend30d > 0 ? "+" : ""}{m.trend30d}%</span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Target;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center">
        <Icon className="h-5 w-5 text-text-secondary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold font-display text-text-primary">{title}</h2>
        <p className="text-xs text-text-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function ScorecardCard({ scorecard }: { scorecard: Scorecard }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-surface-100 flex items-center justify-between">
        <h3 className="font-semibold font-display text-text-primary">{scorecard.title}</h3>
        <StatusBadge status={scorecard.overallStatus} />
      </div>
      <div className="divide-y divide-surface-100">
        {scorecard.items.map((kpi) => (
          <div key={kpi.key} className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <StatusDot status={kpi.status} />
              <div className="min-w-0">
                <span className="text-sm text-text-primary font-medium truncate block">{kpi.label}</span>
                {kpi.description && (
                  <span className="text-[10px] text-text-muted">{kpi.description}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-sm font-bold font-display text-text-primary">
                {formatValue(kpi.value, kpi.format)}
              </span>
              {kpi.trend7d !== 0 && <TrendArrow value={kpi.trend7d} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Page
// ============================================

const FEATURE_ICONS: Record<string, typeof Bell> = {
  alerts: Bell,
  search: Search,
  distribution: Radio,
  content: FileText,
};

function RetentionDetailCard({ retention }: { retention: RetentionMetrics }) {
  const stats = [
    { label: "Usuarios recorrentes", value: retention.returningUsers, sub: `de ${retention.totalUniqueUsers} unicos` },
    { label: "Taxa de retorno", value: `${retention.returnRate}%`, sub: "nos ultimos 30 dias" },
    { label: "Alertas disparados", value: retention.alertTriggered, sub: `${retention.alertConversionRate}% conversao` },
    { label: "Media alertas/usuario", value: retention.avgAlertsPerUser, sub: `${retention.totalAlertUsers} usuarios` },
    { label: "Clickouts recorrentes", value: retention.recurringClickouts, sub: `${retention.recurringRate}% do total` },
  ];

  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-surface-100">
        <h3 className="font-semibold font-display text-text-primary">Metricas de Retencao</h3>
        <p className="text-xs text-text-muted">Dados dos ultimos 30 dias</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-surface-100">
        {stats.map((s) => (
          <div key={s.label} className="p-4 text-center">
            <p className="text-xl font-bold font-display text-text-primary">{s.value}</p>
            <p className="text-xs text-text-muted font-medium">{s.label}</p>
            <p className="text-[10px] text-text-muted">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureRankingCard({ features }: { features: RetentionFeatureRank[] }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-surface-100">
        <h3 className="font-semibold font-display text-text-primary">Ranking de Features por Retencao</h3>
        <p className="text-xs text-text-muted">Quais features geram mais retorno de usuarios</p>
      </div>
      <div className="divide-y divide-surface-100">
        {features.map((f) => {
          const Icon = FEATURE_ICONS[f.feature] || Award;
          return (
            <div key={f.feature} className="px-4 py-3 flex items-center gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-100 text-text-secondary flex-shrink-0">
                <span className="text-sm font-bold font-display">#{f.rank}</span>
              </div>
              <div className="w-8 h-8 rounded-lg bg-surface-50 flex items-center justify-center flex-shrink-0">
                <Icon className="h-4 w-4 text-text-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{f.label}</p>
                <p className="text-[10px] text-text-muted">{f.description}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-bold font-display text-text-primary">{f.metricValue}</p>
                <p className="text-[10px] text-text-muted">{f.metricLabel}</p>
              </div>
              <div className="text-right flex-shrink-0 min-w-[60px]">
                <p className={`text-sm font-bold ${f.conversionRate > 20 ? "text-green-600" : f.conversionRate > 5 ? "text-amber-600" : "text-text-muted"}`}>
                  {f.conversionRate}%
                </p>
                <p className="text-[10px] text-text-muted">conversao</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function AdminBusinessPage() {
  const [metrics, scorecards, detailedRetention, featureRanking] = await Promise.all([
    getAllBusinessMetrics(),
    getAllScorecards(),
    getDetailedRetention(),
    getRetentionValueRanking(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Business OS</h1>
        <p className="text-sm text-text-muted">North star, scorecards e saude operacional do PromoSnap</p>
      </div>

      {/* North Star */}
      <section>
        <SectionHeader icon={Target} title="North Star" subtitle="Qualified clickouts per day — users who viewed product + clicked out" />
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 shadow-sm p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/80 border border-indigo-200 flex items-center justify-center shadow-sm">
              <Target className="h-7 w-7 text-indigo-600" />
            </div>
            <div>
              <p className="text-4xl font-bold font-display text-indigo-900">
                {formatValue(metrics.northStar.value, metrics.northStar.format)}
              </p>
              <p className="text-sm text-indigo-700/70 font-medium">{metrics.northStar.label}</p>
            </div>
            <div className="ml-auto flex flex-col items-end gap-1">
              <StatusBadge status={metrics.northStar.status} />
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-indigo-600/60">7d:</span>
                <TrendArrow value={metrics.northStar.trend7d} />
                <span className="text-xs text-indigo-600/60 ml-2">30d:</span>
                <TrendArrow value={metrics.northStar.trend30d} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Acquisition */}
      <section>
        <SectionHeader icon={Users} title="Acquisition" subtitle="New users, subscribers, and demand signals" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.acquisition.map((m, i) => (
            <MetricCard key={i} m={m} />
          ))}
        </div>
      </section>

      {/* Engagement */}
      <section>
        <SectionHeader icon={MousePointerClick} title="Engagement" subtitle="Activity depth and frequency" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.engagement.map((m, i) => (
            <MetricCard key={i} m={m} />
          ))}
        </div>
      </section>

      {/* Monetization */}
      <section>
        <SectionHeader icon={DollarSign} title="Monetization" subtitle="Revenue signals and source performance" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {metrics.monetization.map((m, i) => (
            <MetricCard key={i} m={m} />
          ))}
        </div>
      </section>

      {/* Retention Proxy */}
      <section>
        <SectionHeader icon={RefreshCw} title="Retention Proxy" subtitle="Returning users and stickiness signals" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {metrics.retention.map((m, i) => (
            <MetricCard key={i} m={m} />
          ))}
        </div>
      </section>

      {/* Operational Health */}
      <section>
        <SectionHeader icon={Server} title="Operational Health" subtitle="Catalog, jobs, and system reliability" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {metrics.operational.map((m, i) => (
            <MetricCard key={i} m={m} />
          ))}
        </div>
      </section>

      {/* Retencao */}
      <section>
        <SectionHeader icon={Repeat} title="Retencao" subtitle="Metricas de retorno de usuarios e valor das features" />
        <div className="space-y-4">
          <RetentionDetailCard retention={detailedRetention} />
          <FeatureRankingCard features={featureRanking} />
        </div>
      </section>

      {/* Scorecards */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-text-secondary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold font-display text-text-primary">Scorecards</h2>
            <p className="text-xs text-text-muted">Detailed KPIs by domain</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {scorecards.map((sc) => (
            <ScorecardCard key={sc.slug} scorecard={sc} />
          ))}
        </div>
      </section>
    </div>
  );
}
