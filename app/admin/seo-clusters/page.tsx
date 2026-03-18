import {
  Network,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  ArrowRight,
  Calendar,
  Zap,
  BarChart3,
  Layers,
  GitCompare,
  ShoppingBag,
  Clock,
  Target,
  Activity,
} from "lucide-react";
import {
  getClusterHealthReports,
  generateProductionBacklog,
  getProductionStats,
  type ClusterHealthReport,
  type BacklogItem,
  type ContentPriority,
} from "@/lib/seo/cluster-engine";
import {
  getWeeklyActions,
  getUpcomingEvents,
  type CalendarAction,
  type ActionPriority,
} from "@/lib/seo/seo-calendar";

export const dynamic = "force-dynamic";

// ── Config maps ───────────────────────────────────────────

const priorityConfig: Record<
  ContentPriority,
  { label: string; color: string; bg: string }
> = {
  create_now: { label: "Criar Agora", color: "text-accent-green", bg: "bg-green-50" },
  strengthen_now: { label: "Reforçar", color: "text-accent-blue", bg: "bg-blue-50" },
  update_now: { label: "Atualizar", color: "text-accent-orange", bg: "bg-orange-50" },
  seasonal_prepare: { label: "Sazonal", color: "text-accent-purple", bg: "bg-purple-50" },
  low_priority: { label: "Baixa", color: "text-text-muted", bg: "bg-surface-100" },
  do_not_create_yet: { label: "Não Criar", color: "text-text-muted", bg: "bg-surface-100" },
};

const actionPriorityConfig: Record<
  ActionPriority,
  { color: string; bg: string; label: string }
> = {
  critical: { color: "text-red-600", bg: "bg-red-50", label: "Crítico" },
  high: { color: "text-accent-orange", bg: "bg-orange-50", label: "Alto" },
  medium: { color: "text-accent-blue", bg: "bg-blue-50", label: "Médio" },
  low: { color: "text-text-muted", bg: "bg-surface-100", label: "Baixo" },
};

const pageTypeConfig: Record<
  BacklogItem["pageType"],
  { label: string; icon: typeof Plus; color: string }
> = {
  melhores: { label: "Melhores", icon: TrendingUp, color: "text-accent-green" },
  comparacao: { label: "Comparação", icon: GitCompare, color: "text-accent-purple" },
  oferta: { label: "Oferta", icon: ShoppingBag, color: "text-accent-orange" },
  "vale-a-pena": { label: "Vale a Pena", icon: Target, color: "text-accent-blue" },
  "faixa-preco": { label: "Faixa Preço", icon: BarChart3, color: "text-text-secondary" },
  hub: { label: "Hub", icon: Layers, color: "text-accent-purple" },
};

const statusConfig: Record<
  ClusterHealthReport["status"],
  { label: string; color: string; bg: string; icon: typeof CheckCircle }
> = {
  healthy: { label: "Saudável", color: "text-accent-green", bg: "bg-green-50", icon: CheckCircle },
  partial: { label: "Parcial", color: "text-accent-blue", bg: "bg-blue-50", icon: Activity },
  thin: { label: "Ralo", color: "text-accent-orange", bg: "bg-orange-50", icon: AlertTriangle },
  empty: { label: "Vazio", color: "text-red-500", bg: "bg-red-50", icon: AlertTriangle },
};

// ── Sub-components ────────────────────────────────────────

function StatCard({
  label,
  value,
  color = "text-text-primary",
  sub,
}: {
  label: string;
  value: number | string;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4 text-center">
      <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
      <p className="text-xs text-text-muted mt-1">{label}</p>
      {sub && <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function Coveragebar({ pct, status }: { pct: number; status: ClusterHealthReport["status"] }) {
  const barColor =
    status === "healthy"
      ? "bg-accent-green"
      : status === "partial"
        ? "bg-accent-blue"
        : status === "thin"
          ? "bg-accent-orange"
          : "bg-red-400";
  return (
    <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────

export default async function AdminSEOClustersPage() {
  const [healthReports, backlog, stats, weeklyActions, upcomingEvents] = await Promise.all([
    Promise.resolve(getClusterHealthReports()),
    Promise.resolve(generateProductionBacklog(20)),
    Promise.resolve(getProductionStats()),
    Promise.resolve(getWeeklyActions()),
    Promise.resolve(getUpcomingEvents(12)),
  ]);

  const criticalActions = weeklyActions.filter((a) => a.priority === "critical" || a.priority === "high");
  const nextEvents = upcomingEvents.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Network className="h-6 w-6 text-accent-blue" />
          Topical Authority — Cluster SEO
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Saúde dos clusters, backlog de produção e calendário editorial sazonal
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard
          label="A Criar"
          value={stats.createNow}
          color="text-accent-green"
          sub="páginas novas"
        />
        <StatCard
          label="A Reforçar"
          value={stats.strengthenNow}
          color="text-accent-blue"
          sub="páginas existentes"
        />
        <StatCard
          label="Gap Total"
          value={stats.totalOpportunities}
          color="text-accent-orange"
          sub="oportunidades"
        />
        <StatCard
          label="Sazonais"
          value={stats.seasonal}
          color="text-accent-purple"
          sub="próximas"
        />
        <StatCard
          label="Clusters OK"
          value={stats.clustersHealthy}
          color="text-accent-green"
          sub={`de ${healthReports.length}`}
        />
        <StatCard
          label="Clusters Ralos"
          value={stats.clustersThin}
          color="text-red-500"
          sub="thin + empty"
        />
      </div>

      {/* Cluster Health Grid */}
      <div className="rounded-xl border border-surface-200 bg-white">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent-blue" />
          <h2 className="text-sm font-semibold text-text-primary">Saúde por Cluster</h2>
          <span className="text-xs text-text-muted ml-auto">{healthReports.length} clusters</span>
        </div>
        <div className="divide-y divide-surface-100">
          {healthReports.map((report) => {
            const sc = statusConfig[report.status];
            const StatusIcon = sc.icon;
            return (
              <div key={report.clusterId} className="px-5 py-4 hover:bg-surface-50 transition-colors">
                <div className="flex items-start gap-4">
                  {/* Status icon + health score */}
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl ${sc.bg} flex items-center justify-center`}>
                    <StatusIcon className={`h-5 w-5 ${sc.color}`} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-text-primary">
                        {report.clusterName}
                      </span>
                      <span className="text-[10px] text-text-muted bg-surface-100 px-1.5 py-0.5 rounded-full">
                        P{report.priority}
                      </span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    </div>

                    {/* Coverage bar */}
                    <div className="mb-1.5">
                      <Coveragebar pct={report.coverage.pct} status={report.status} />
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-text-muted">
                      <span>{report.coverage.existing}/{report.coverage.total} páginas</span>
                      <span className="font-medium">{report.coverage.pct}% cobertura</span>
                      <span className="text-accent-orange">{report.coverage.missing} faltando</span>
                    </div>
                  </div>

                  {/* Health score */}
                  <div className="flex-shrink-0 text-right">
                    <p
                      className={`text-xl font-bold font-display ${
                        report.healthScore >= 70
                          ? "text-accent-green"
                          : report.healthScore >= 40
                            ? "text-accent-orange"
                            : "text-red-500"
                      }`}
                    >
                      {report.healthScore}
                    </p>
                    <p className="text-[10px] text-text-muted">health</p>
                  </div>
                </div>

                {/* Top opportunities for thin/empty clusters */}
                {(report.status === "thin" || report.status === "empty") &&
                  report.topOpportunities.length > 0 && (
                    <div className="mt-3 ml-14 space-y-1">
                      {report.topOpportunities.map((opp) => {
                        const ptc = pageTypeConfig[opp.pageType];
                        const pc = priorityConfig[opp.priority];
                        const OppIcon = ptc.icon;
                        return (
                          <div
                            key={opp.id}
                            className="flex items-center gap-2 text-[11px]"
                          >
                            <OppIcon className={`h-3 w-3 flex-shrink-0 ${ptc.color}`} />
                            <span className="text-text-secondary truncate flex-1">
                              {opp.suggestedTitle}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded-full font-semibold ${pc.bg} ${pc.color}`}>
                              {pc.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Production Backlog + Weekly Actions — 2-col on large */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Backlog */}
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <Zap className="h-4 w-4 text-accent-orange" />
            <h2 className="text-sm font-semibold text-text-primary">Backlog de Produção</h2>
            <span className="text-xs text-text-muted ml-auto">Top {backlog.length}</span>
          </div>
          <div className="divide-y divide-surface-100">
            {backlog.map((item) => {
              const ptc = pageTypeConfig[item.pageType];
              const pc = priorityConfig[item.priority];
              const ItemIcon = ptc.icon;
              const effortColor =
                item.effortEstimate === "quick"
                  ? "text-accent-green"
                  : item.effortEstimate === "medium"
                    ? "text-accent-orange"
                    : "text-red-500";

              return (
                <div
                  key={item.targetUrl}
                  className="px-4 py-3 flex items-center gap-3 hover:bg-surface-50 transition-colors"
                >
                  {/* Rank */}
                  <div className="w-6 h-6 rounded-md bg-surface-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-[10px] font-bold text-text-muted">{item.rank}</span>
                  </div>

                  {/* Icon */}
                  <div className="flex-shrink-0">
                    <ItemIcon className={`h-4 w-4 ${ptc.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate">
                      {item.suggestedTitle}
                    </p>
                    <p className="text-[10px] text-text-muted">{item.clusterName} · {item.targetUrl}</p>
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pc.bg} ${pc.color}`}>
                      {pc.label}
                    </span>
                    <span className={`text-[10px] font-medium ${effortColor}`}>
                      {item.effortEstimate === "quick" ? "rápido" : item.effortEstimate === "medium" ? "médio" : "pesado"}
                    </span>
                  </div>
                </div>
              );
            })}

            {backlog.length === 0 && (
              <div className="px-5 py-8 text-center">
                <CheckCircle className="h-8 w-8 text-accent-green mx-auto mb-2" />
                <p className="text-sm text-text-muted">Backlog vazio — todos os clusters estão cobertos!</p>
              </div>
            )}
          </div>
        </div>

        {/* Weekly Action Plan */}
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-accent-purple" />
            <h2 className="text-sm font-semibold text-text-primary">Plano Semanal</h2>
            <span className="text-xs text-text-muted ml-auto">{weeklyActions.length} ações</span>
          </div>
          <div className="divide-y divide-surface-100">
            {criticalActions.slice(0, 10).map((action, i) => {
              const apc = actionPriorityConfig[action.priority];
              return (
                <div key={action.id} className="px-4 py-3 hover:bg-surface-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-md bg-surface-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-[10px] font-bold text-text-muted">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${apc.bg} ${apc.color}`}>
                          {apc.label}
                        </span>
                        <span className="text-[10px] text-text-muted">
                          {action.effortHours}h · impacto {action.impactScore}/10
                        </span>
                      </div>
                      <p className="text-xs font-medium text-text-primary">{action.title}</p>
                      <p className="text-[10px] text-text-muted mt-0.5 line-clamp-2">{action.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {weeklyActions.length > 10 && (
              <div className="px-5 py-3 text-center">
                <p className="text-xs text-text-muted">+{weeklyActions.length - 10} ações adicionais</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Seasonal Events */}
      {nextEvents.length > 0 && (
        <div className="rounded-xl border border-surface-200 bg-white">
          <div className="px-5 py-4 border-b border-surface-100 flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-purple" />
            <h2 className="text-sm font-semibold text-text-primary">Próximos Eventos Sazonais</h2>
            <span className="text-xs text-text-muted ml-auto">{upcomingEvents.length} eventos</span>
          </div>
          <div className="divide-y divide-surface-100">
            {nextEvents.map((event) => {
              const isUrgent = event.shouldPrepare && event.daysUntil < 28;
              const isCritical = event.daysUntil < 14;

              return (
                <div key={event.id} className="px-5 py-4 hover:bg-surface-50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Days badge */}
                    <div
                      className={`flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[56px] ${
                        isCritical
                          ? "bg-red-50"
                          : isUrgent
                            ? "bg-orange-50"
                            : "bg-surface-50"
                      }`}
                    >
                      <p
                        className={`text-lg font-bold font-display leading-none ${
                          isCritical
                            ? "text-red-500"
                            : isUrgent
                              ? "text-accent-orange"
                              : "text-text-secondary"
                        }`}
                      >
                        {event.daysUntil}
                      </p>
                      <p className="text-[10px] text-text-muted">dias</p>
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-text-primary">{event.name}</span>
                        {event.shouldPrepare && (
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              isCritical ? "bg-red-50 text-red-600" : "bg-orange-50 text-accent-orange"
                            }`}
                          >
                            {isCritical ? "Urgente" : "Preparar"}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {event.urls.slice(0, 4).map((url) => (
                          <span
                            key={url.href}
                            className={`text-[10px] px-2 py-0.5 rounded-full ${
                              url.type === "create"
                                ? "bg-green-50 text-accent-green"
                                : "bg-blue-50 text-accent-blue"
                            }`}
                          >
                            {url.type === "create" ? "✚" : "↑"} {url.label}
                          </span>
                        ))}
                        {event.urls.length > 4 && (
                          <span className="text-[10px] text-text-muted px-1">
                            +{event.urls.length - 4} páginas
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cluster tags */}
                    <div className="flex-shrink-0 flex flex-wrap gap-1 max-w-[100px] justify-end">
                      {event.clusterIds.slice(0, 3).map((cId) => (
                        <span
                          key={cId}
                          className="text-[10px] bg-surface-100 text-text-muted px-1.5 py-0.5 rounded-full"
                        >
                          {cId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {upcomingEvents.length > 5 && (
            <div className="px-5 py-3 border-t border-surface-100 flex items-center justify-center gap-1 text-xs text-text-muted">
              <span>+{upcomingEvents.length - 5} eventos no calendário</span>
              <ArrowRight className="h-3 w-3" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
