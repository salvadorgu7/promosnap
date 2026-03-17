import {
  getMonitoringReport,
} from "@/lib/monitoring";
import {
  AlertTriangle,
  Activity,
  Clock,
  Bug,
  FileWarning,
  BarChart3,
  Zap,
  CheckCircle2,
  Info,
  Radio,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import {
  toSeverity,
  severityBadge,
  severityText,
} from "@/lib/admin/severity";
import prisma from "@/lib/db/prisma";
import { getFlag } from "@/lib/config/feature-flags";

export const dynamic = "force-dynamic";

async function getPromosAppMetrics() {
  const promosappEnabled = getFlag("promosappEnabled");
  if (!promosappEnabled) return null;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    total, pending, approved, rejected, imported,
    last24h, last7d,
    recentBatches,
    recentScored,
  ] = await Promise.all([
    prisma.catalogCandidate.count({ where: { sourceSlug: "promosapp" } }),
    prisma.catalogCandidate.count({ where: { sourceSlug: "promosapp", status: "PENDING" } }),
    prisma.catalogCandidate.count({ where: { sourceSlug: "promosapp", status: "APPROVED" } }),
    prisma.catalogCandidate.count({ where: { sourceSlug: "promosapp", status: "REJECTED" } }),
    prisma.catalogCandidate.count({ where: { sourceSlug: "promosapp", status: "IMPORTED" } }),
    prisma.catalogCandidate.count({ where: { sourceSlug: "promosapp", createdAt: { gte: oneDayAgo } } }),
    prisma.catalogCandidate.count({ where: { sourceSlug: "promosapp", createdAt: { gte: sevenDaysAgo } } }),
    prisma.importBatch.findMany({
      where: { format: "promosapp" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, status: true, totalItems: true, imported: true, rejected: true, createdAt: true },
    }),
    prisma.catalogCandidate.findMany({
      where: { sourceSlug: "promosapp", createdAt: { gte: sevenDaysAgo } },
      select: { enrichedData: true, status: true },
      take: 500,
    }),
  ]);

  const scores = recentScored
    .map(c => (c.enrichedData as any)?.score)
    .filter((s): s is number => typeof s === "number");

  const avgScore = scores.length > 0
    ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
    : 0;

  const enrichedCount = recentScored.filter(c => (c.enrichedData as any)?.enriched === true).length;
  const enrichRate = last7d > 0 ? Math.round((enrichedCount / last7d) * 100) : 0;
  const rejectRate = last7d > 0 ? Math.round((rejected / Math.max(total, 1)) * 100) : 0;
  const approvalRate = last7d > 0 ? Math.round(((approved + imported) / Math.max(total, 1)) * 100) : 0;

  // Top marketplaces from enrichedData
  const marketplaceCounts: Record<string, number> = {};
  for (const c of recentScored) {
    const mp = (c.enrichedData as any)?.marketplace;
    if (mp) marketplaceCounts[mp] = (marketplaceCounts[mp] || 0) + 1;
  }
  const topMarketplaces = Object.entries(marketplaceCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return {
    total, pending, approved, rejected, imported,
    last24h, last7d, avgScore,
    enrichRate, rejectRate, approvalRate,
    topMarketplaces, recentBatches,
    scoreDistribution: {
      high: scores.filter(s => s >= 70).length,
      medium: scores.filter(s => s >= 40 && s < 70).length,
      low: scores.filter(s => s < 40).length,
    },
  };
}

export default async function MonitoringPage() {
  const report = getMonitoringReport();
  const stats = report.stats;
  const errors = report.recentErrors;
  const events = report.recentEvents;
  const promosapp = await getPromosAppMetrics().catch(() => null);

  const typeEntries = Object.entries(stats.byType).sort(
    ([, a], [, b]) => b - a
  );
  const routeEntries = Object.entries(stats.byRoute).sort(
    ([, a], [, b]) => b - a
  );

  // Determine overall health
  const errorSeverity =
    stats.lastHourCount > 10
      ? "critical"
      : stats.lastHourCount > 0
        ? "warning"
        : stats.totalErrors > 0
          ? "info"
          : "ok";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Monitoring
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Rastreamento de erros, eventos e observabilidade do sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${severityBadge(toSeverity(errorSeverity === "ok" ? "ok" : errorSeverity === "info" ? "info" : errorSeverity))}`}>
            {errorSeverity === "ok" && <><CheckCircle2 className="h-3 w-3" /> Sem erros</>}
            {errorSeverity === "info" && <><Info className="h-3 w-3" /> Erros antigos</>}
            {errorSeverity === "warning" && <><AlertTriangle className="h-3 w-3" /> Erros recentes</>}
            {errorSeverity === "critical" && <><Bug className="h-3 w-3" /> Muitos erros</>}
          </span>
          <span className="text-xs text-text-muted">
            {new Date(report.timestamp).toLocaleString("pt-BR")}
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Bug}
          label="Total de Erros"
          value={stats.totalErrors}
          severity={stats.totalErrors > 0 ? "critical" : "ok"}
          sublabel={stats.totalErrors === 0 ? "Sistema limpo" : undefined}
        />
        <StatCard
          icon={Clock}
          label="Ultima Hora"
          value={stats.lastHourCount}
          severity={stats.lastHourCount > 10 ? "critical" : stats.lastHourCount > 0 ? "warning" : "ok"}
          sublabel={stats.lastHourCount === 0 ? "Sem erros recentes" : undefined}
        />
        <StatCard
          icon={AlertTriangle}
          label="Ultimas 24h"
          value={stats.last24hCount}
          severity={stats.last24hCount > 50 ? "critical" : stats.last24hCount > 0 ? "warning" : "ok"}
        />
        <StatCard
          icon={Zap}
          label="Eventos"
          value={events.length}
          severity="info"
          sublabel="No buffer"
        />
      </div>

      {/* Error Stats Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
            <FileWarning className="h-4 w-4 text-red-500" /> Erros por Tipo
          </h2>
          {typeEntries.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Nenhum erro capturado. Sistema operando normalmente.
            </div>
          ) : (
            <div className="space-y-2">
              {typeEntries.map(([type, count]) => {
                const pct = stats.totalErrors > 0 ? (count / stats.totalErrors) * 100 : 0;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary font-mono truncate max-w-[200px]">
                        {type}
                      </span>
                      <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* By Route */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-amber-500" /> Erros por Rota
          </h2>
          {routeEntries.length === 0 ? (
            <div className="flex items-center gap-2 py-4 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              Nenhum erro por rota rastreado.
            </div>
          ) : (
            <div className="space-y-2">
              {routeEntries.map(([route, count]) => {
                const pct = stats.totalErrors > 0 ? (count / stats.totalErrors) * 100 : 0;
                return (
                  <div key={route} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-text-secondary font-mono truncate max-w-[200px]">
                        {route}
                      </span>
                      <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {count}
                      </span>
                    </div>
                    <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Bug className="h-4 w-4 text-red-500" /> Erros Recentes ({errors.length})
        </h2>
        {errors.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-400" />
            <p className="text-sm font-medium text-emerald-600">Nenhum erro capturado</p>
            <p className="text-xs text-text-muted mt-1">O sistema está operando sem erros detectados.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {errors.slice(0, 50).map((error) => (
              <div
                key={error.id}
                className="rounded-lg border border-red-100 bg-red-50/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-800 truncate">
                      {error.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-mono text-red-600 bg-red-100 px-1.5 py-0.5 rounded border border-red-200">
                        {error.type}
                      </span>
                      {error.route && (
                        <span className="text-[10px] font-mono text-text-muted bg-surface-100 px-1.5 py-0.5 rounded">
                          {error.route}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[10px] text-text-muted whitespace-nowrap">
                    {new Date(error.timestamp).toLocaleString("pt-BR")}
                  </span>
                </div>
                {error.stack && (
                  <pre className="mt-2 text-[10px] text-red-700 bg-red-100/50 rounded p-2 overflow-x-auto max-h-24 leading-relaxed font-mono">
                    {error.stack.split("\n").slice(0, 5).join("\n")}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Events */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-blue-500" /> Eventos Recentes ({events.length})
        </h2>
        {events.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Activity className="h-8 w-8 mx-auto mb-2 text-blue-300" />
            <p className="text-sm font-medium text-text-muted">Nenhum evento capturado</p>
            <p className="text-xs text-text-muted mt-1">
              Eventos são registrados quando jobs executam, cron roda e ações do sistema acontecem.
            </p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {events.slice(0, 50).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-text-primary">
                    {event.name}
                  </span>
                  {event.data && (
                    <span className="text-[10px] font-mono text-text-muted truncate max-w-[300px]">
                      {JSON.stringify(event.data)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-text-muted whitespace-nowrap ml-3">
                  {new Date(event.timestamp).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PromosApp Observability ── */}
      {promosapp && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold font-display text-text-primary flex items-center gap-2 mt-4">
            <Radio className="h-5 w-5 text-brand-500" />
            PromosApp Pipeline
          </h2>

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {[
              { label: "Total", value: promosapp.total, color: "text-text-primary" },
              { label: "Pendentes", value: promosapp.pending, color: "text-amber-600" },
              { label: "Aprovados", value: promosapp.approved, color: "text-emerald-600" },
              { label: "Rejeitados", value: promosapp.rejected, color: "text-red-500" },
              { label: "Importados", value: promosapp.imported, color: "text-brand-500" },
              { label: "Últimas 24h", value: promosapp.last24h, color: "text-blue-600" },
              { label: "Últimos 7d", value: promosapp.last7d, color: "text-indigo-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="rounded-xl border border-surface-200 bg-white p-3">
                <p className="text-xs text-text-muted">{kpi.label}</p>
                <p className={`text-xl font-bold font-display ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* Health indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Score médio */}
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-text-primary">Score Médio (7d)</h3>
                {promosapp.avgScore >= 50 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
              </div>
              <p className={`text-3xl font-bold font-display ${
                promosapp.avgScore >= 60 ? "text-emerald-600" :
                promosapp.avgScore >= 40 ? "text-amber-600" : "text-red-500"
              }`}>
                {promosapp.avgScore}
              </p>
              <div className="flex gap-2 mt-2 text-[10px]">
                <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                  Alta: {promosapp.scoreDistribution.high}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
                  Média: {promosapp.scoreDistribution.medium}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-200">
                  Baixa: {promosapp.scoreDistribution.low}
                </span>
              </div>
            </div>

            {/* Taxas operacionais */}
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Taxas Operacionais</h3>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-text-muted">Enriquecimento</span>
                    <span className={promosapp.enrichRate >= 50 ? "text-emerald-600 font-medium" : "text-amber-600 font-medium"}>
                      {promosapp.enrichRate}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min(promosapp.enrichRate, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-text-muted">Aprovação</span>
                    <span className="text-brand-500 font-medium">{promosapp.approvalRate}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-brand-400 rounded-full" style={{ width: `${Math.min(promosapp.approvalRate, 100)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-0.5">
                    <span className="text-text-muted">Rejeição</span>
                    <span className={promosapp.rejectRate <= 30 ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                      {promosapp.rejectRate}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(promosapp.rejectRate, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Top marketplaces */}
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Top Marketplaces (7d)</h3>
              {promosapp.topMarketplaces.length === 0 ? (
                <p className="text-xs text-text-muted py-2">Sem dados de marketplace</p>
              ) : (
                <div className="space-y-2">
                  {promosapp.topMarketplaces.map(([name, count]) => {
                    const total = promosapp.topMarketplaces.reduce((s, [, c]) => s + c, 0);
                    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-xs mb-0.5">
                          <span className="text-text-secondary">{name}</span>
                          <span className="text-text-muted">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-400 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent batches */}
          {promosapp.recentBatches.length > 0 && (
            <div className="rounded-xl border border-surface-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-text-primary mb-3">Batches Recentes</h3>
              <div className="space-y-1">
                {promosapp.recentBatches.map((b) => (
                  <div key={b.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-surface-50 text-xs">
                    <div className="flex items-center gap-3">
                      <span className={`font-medium ${
                        b.status === "COMPLETED" ? "text-emerald-600" :
                        b.status === "FAILED" ? "text-red-500" : "text-amber-600"
                      }`}>
                        {b.status}
                      </span>
                      <span className="text-text-secondary">{b.totalItems} items</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-600">{b.imported} ok</span>
                      <span className="text-red-400">{b.rejected} rej</span>
                      <span className="text-text-muted">
                        {new Date(b.createdAt).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  severity,
  sublabel,
}: {
  icon: typeof Bug;
  label: string;
  value: number;
  severity: string;
  sublabel?: string;
}) {
  const sev = toSeverity(severity);
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${severityText(sev)} bg-opacity-10`} style={{ backgroundColor: sev === 'ok' ? '#ecfdf5' : sev === 'info' ? '#eff6ff' : sev === 'warning' ? '#fffbeb' : '#fef2f2' }}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className={`text-2xl font-bold font-display ${severityText(sev)}`}>
            {value}
          </p>
          <p className="text-xs text-text-muted">{label}</p>
          {sublabel && (
            <p className="text-[10px] text-text-muted opacity-70">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
