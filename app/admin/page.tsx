import {
  Package, Tag, Store, MousePointerClick, BarChart3, Ticket,
  Layers, Clock, CheckCircle, XCircle, AlertTriangle, Loader2,
  Bell, TrendingUp, Heart, ArrowRight
} from "lucide-react";
import Link from "next/link";
import { getAdminDashboardData } from "@/lib/db/queries";
import { formatNumber, formatPrice, timeAgo } from "@/lib/utils";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const data = await getAdminDashboardData();
  const { stats, recentClickouts, topProducts, jobRuns, couponsActive, clickoutsByDay } = data;

  const [alertsActive, trendsCount] = await Promise.all([
    prisma.priceAlert.count({ where: { isActive: true, triggeredAt: null } }).catch(() => 0),
    prisma.trendingKeyword.count().catch(() => 0),
  ]);

  const statCards = [
    { label: "Listings", value: formatNumber(stats.listings), icon: Package, color: "text-accent-blue" },
    { label: "Ofertas Ativas", value: formatNumber(stats.activeOffers), icon: Tag, color: "text-accent-green" },
    { label: "Clickouts Hoje", value: formatNumber(stats.clickoutsToday), icon: MousePointerClick, color: "text-accent-orange" },
    { label: "Clickouts 7d", value: formatNumber(stats.clickoutsWeek), icon: BarChart3, color: "text-brand-500" },
    { label: "Fontes", value: stats.sources.toString(), icon: Store, color: "text-accent-purple" },
    { label: "Cupons", value: couponsActive.toString(), icon: Ticket, color: "text-accent-pink" },
    { label: "Marcas", value: stats.brands.toString(), icon: Layers, color: "text-accent-blue" },
    { label: "Categorias", value: stats.categories.toString(), icon: Layers, color: "text-accent-green" },
  ];

  const days = clickoutsByDay as { day: Date | string; count: number }[];
  const maxClicks = Math.max(...days.map((d) => d.count), 1);

  const jobStatusIcon: Record<string, { icon: typeof CheckCircle; color: string }> = {
    SUCCESS: { icon: CheckCircle, color: "text-accent-green" },
    FAILED: { icon: XCircle, color: "text-red-500" },
    RUNNING: { icon: Loader2, color: "text-accent-blue" },
    CANCELLED: { icon: AlertTriangle, color: "text-accent-orange" },
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Dashboard</h1>
        <p className="text-sm text-text-muted">Visao geral do PromoSnap</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-text-muted uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold font-display text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick ops links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Link href="/admin/alertas" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent-orange" />
            <div>
              <p className="text-sm font-medium text-text-primary">{alertsActive} alertas ativos</p>
              <p className="text-xs text-text-muted">Alertas de preço</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>
        <Link href="/admin/tendencias" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-blue" />
            <div>
              <p className="text-sm font-medium text-text-primary">{trendsCount} trends</p>
              <p className="text-xs text-text-muted">Tendências & Growth</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>
        <Link href="/admin/jobs" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-green" />
            <div>
              <p className="text-sm font-medium text-text-primary">Jobs</p>
              <p className="text-xs text-text-muted">Automação</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>
        <Link href="/admin/ingestao" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-brand-500" />
            <div>
              <p className="text-sm font-medium text-text-primary">Ingestão</p>
              <p className="text-xs text-text-muted">Importar produtos</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>
      </div>

      {/* Clickouts chart */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Clickouts - Ultimos 7 dias</h2>
        {days.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados de clickouts.</p>
        ) : (
          <div className="flex items-end gap-2 h-40">
            {days.map((d, i) => {
              const pct = (d.count / maxClicks) * 100;
              const dayLabel = new Date(d.day).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric" });
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs font-medium text-text-primary">{d.count}</span>
                  <div className="w-full bg-surface-100 rounded-t" style={{ height: "120px" }}>
                    <div
                      className="w-full bg-accent-blue rounded-t transition-all"
                      style={{ height: `${Math.max(pct, 2)}%`, marginTop: `${100 - Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-text-muted">{dayLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent clickouts */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Ultimos Clickouts</h2>
          {recentClickouts.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum clickout registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Produto</th>
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Fonte</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Quando</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClickouts.slice(0, 10).map((c: any) => (
                    <tr key={c.id} className="border-b border-surface-100">
                      <td className="py-2 text-text-primary max-w-[200px] truncate">
                        {c.offer?.listing?.rawTitle || "—"}
                      </td>
                      <td className="py-2 text-text-secondary">
                        {c.offer?.listing?.source?.name || c.sourceSlug || "—"}
                      </td>
                      <td className="py-2 text-right text-text-muted text-xs">
                        {timeAgo(new Date(c.clickedAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="card p-5">
          <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Top Produtos Clicados</h2>
          {(topProducts as any[]).length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de cliques.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Produto</th>
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Fonte</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Cliques</th>
                  </tr>
                </thead>
                <tbody>
                  {(topProducts as any[]).map((p: any, i: number) => (
                    <tr key={i} className="border-b border-surface-100">
                      <td className="py-2 text-text-primary max-w-[200px] truncate">{p.rawTitle || "—"}</td>
                      <td className="py-2 text-text-secondary">{p.sourceName || "—"}</td>
                      <td className="py-2 text-right font-medium text-text-primary">{p.clicks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Job runs */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Jobs Recentes</h2>
        {jobRuns.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhum job executado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Job</th>
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Status</th>
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Iniciado</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Itens</th>
                </tr>
              </thead>
              <tbody>
                {jobRuns.map((j: any) => {
                  const si = jobStatusIcon[j.status] || jobStatusIcon.CANCELLED;
                  const Icon = si.icon;
                  return (
                    <tr key={j.id} className="border-b border-surface-100">
                      <td className="py-2 font-medium text-text-primary">{j.jobName}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center gap-1 text-xs ${si.color}`}>
                          <Icon className="h-3 w-3" />
                          {j.status}
                        </span>
                      </td>
                      <td className="py-2 text-text-muted text-xs">{timeAgo(new Date(j.startedAt))}</td>
                      <td className="py-2 text-right text-text-secondary">
                        {j.itemsDone ?? 0}/{j.itemsTotal ?? 0}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
