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
} from "lucide-react";
import { getAllBusinessMetrics } from "@/lib/business/metrics";
import { getAllScorecards } from "@/lib/business/scorecards";
import type { MetricResult, MetricStatus, Scorecard, ScorecardItem } from "@/lib/business/types";
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

export default async function AdminBusinessPage() {
  const [metrics, scorecards] = await Promise.all([
    getAllBusinessMetrics(),
    getAllScorecards(),
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
