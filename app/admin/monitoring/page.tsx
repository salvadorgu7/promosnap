import {
  getMonitoringReport,
  getRecentErrors,
  getRecentEvents,
  getErrorStats,
} from "@/lib/monitoring";
import {
  AlertTriangle,
  Activity,
  Clock,
  Bug,
  FileWarning,
  BarChart3,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function MonitoringPage() {
  const report = getMonitoringReport();
  const stats = report.stats;
  const errors = report.recentErrors;
  const events = report.recentEvents;

  const typeEntries = Object.entries(stats.byType).sort(
    ([, a], [, b]) => b - a
  );
  const routeEntries = Object.entries(stats.byRoute).sort(
    ([, a], [, b]) => b - a
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">
            Monitoring
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Error tracking, events, and system observability
          </p>
        </div>
        <div className="text-xs text-text-muted">
          Report: {new Date(report.timestamp).toLocaleString("pt-BR")}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Bug}
          label="Total Errors"
          value={stats.totalErrors}
          color="text-red-600 bg-red-50"
        />
        <StatCard
          icon={Clock}
          label="Last Hour"
          value={stats.lastHourCount}
          color="text-amber-600 bg-amber-50"
        />
        <StatCard
          icon={AlertTriangle}
          label="Last 24h"
          value={stats.last24hCount}
          color="text-orange-600 bg-orange-50"
        />
        <StatCard
          icon={Zap}
          label="Events"
          value={events.length}
          color="text-blue-600 bg-blue-50"
        />
      </div>

      {/* Error Stats Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By Type */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
            <FileWarning className="h-4 w-4 text-red-500" /> Errors by Type
          </h2>
          {typeEntries.length === 0 ? (
            <p className="text-sm text-text-muted">No errors captured yet.</p>
          ) : (
            <div className="space-y-2">
              {typeEntries.map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-text-secondary font-mono">
                    {type}
                  </span>
                  <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* By Route */}
        <div className="rounded-xl border border-surface-200 bg-white p-5">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
            <BarChart3 className="h-4 w-4 text-amber-500" /> Errors by Route
          </h2>
          {routeEntries.length === 0 ? (
            <p className="text-sm text-text-muted">No route errors tracked.</p>
          ) : (
            <div className="space-y-2">
              {routeEntries.map(([route, count]) => (
                <div
                  key={route}
                  className="flex items-center justify-between py-1"
                >
                  <span className="text-sm text-text-secondary font-mono">
                    {route}
                  </span>
                  <span className="text-sm font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Errors */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2 mb-4">
          <Bug className="h-4 w-4 text-red-500" /> Recent Errors (
          {errors.length})
        </h2>
        {errors.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Bug className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No errors captured. System is clean.</p>
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
                      <span className="text-[10px] font-mono text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
                        {error.type}
                      </span>
                      {error.route && (
                        <span className="text-[10px] font-mono text-text-muted">
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
                  <pre className="mt-2 text-[10px] text-red-700 bg-red-100/50 rounded p-2 overflow-x-auto max-h-24 leading-relaxed">
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
          <Activity className="h-4 w-4 text-blue-500" /> Recent Events (
          {events.length})
        </h2>
        {events.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No events captured yet.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {events.slice(0, 50).map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-text-primary">
                    {event.name}
                  </span>
                  {event.data && (
                    <span className="text-[10px] font-mono text-text-muted truncate max-w-[300px]">
                      {JSON.stringify(event.data)}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-text-muted whitespace-nowrap">
                  {new Date(event.timestamp).toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Bug;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {value}
          </p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </div>
    </div>
  );
}
