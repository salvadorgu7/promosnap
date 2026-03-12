import {
  Package, Tag, Store, MousePointerClick, BarChart3, Ticket,
  Layers, Clock, CheckCircle, XCircle, AlertTriangle, Loader2,
  Bell, TrendingUp, Heart, ArrowRight, DollarSign, Image,
  Upload, Zap, Activity, Shield, FileText, Users
} from "lucide-react";
import Link from "next/link";
import { getAdminDashboardData } from "@/lib/db/queries";
import { formatNumber, formatPrice, timeAgo } from "@/lib/utils";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const REVENUE_RATES: Record<string, number> = {
  "amazon-br": 0.04,
  mercadolivre: 0.03,
  shopee: 0.025,
  shein: 0.03,
};

const DEFAULT_RATE = 0.03;

function getRate(slug: string | null): number {
  if (!slug) return DEFAULT_RATE;
  return REVENUE_RATES[slug] ?? DEFAULT_RATE;
}

export default async function AdminDashboard() {
  const data = await getAdminDashboardData();
  const { stats, recentClickouts, topProducts, jobRuns, couponsActive, clickoutsByDay } = data;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);

  type SourceRow = { sourceSlug: string | null; clickouts: bigint; avgPrice: number | null };

  const [
    alertsActive, trendsCount, revTodayRaw, rev7dRaw, clickouts7d,
    productsTotal, bannersActive, candidatesPending,
    sourcesHealth, lastJob,
  ] = await Promise.all([
    prisma.priceAlert.count({ where: { isActive: true, triggeredAt: null } }).catch(() => 0),
    prisma.trendingKeyword.count().catch(() => 0),
    prisma.$queryRaw<SourceRow[]>`
      SELECT c."sourceSlug", COUNT(c.id) as clickouts, AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${today}
      GROUP BY c."sourceSlug"
    `.catch(() => [] as SourceRow[]),
    prisma.$queryRaw<SourceRow[]>`
      SELECT c."sourceSlug", COUNT(c.id) as clickouts, AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${sevenDaysAgo}
      GROUP BY c."sourceSlug"
    `.catch(() => [] as SourceRow[]),
    prisma.clickout.count({ where: { clickedAt: { gte: sevenDaysAgo } } }).catch(() => 0),
    prisma.product.count().catch(() => 0),
    prisma.banner.count({ where: { isActive: true } }).catch(() => 0),
    prisma.catalogCandidate.count({ where: { status: "PENDING" } }).catch(() => 0),
    prisma.source.findMany({
      select: { id: true, name: true, slug: true, status: true },
      orderBy: { name: "asc" },
    }).catch(() => []),
    prisma.jobRun.findFirst({ orderBy: { startedAt: "desc" }, select: { jobName: true, status: true, startedAt: true } }).catch(() => null),
  ]);

  const calcRevenue = (rows: SourceRow[]) =>
    rows.reduce((sum, r) => sum + Number(r.clickouts) * (r.avgPrice ?? 0) * getRate(r.sourceSlug), 0);

  const revenueToday = calcRevenue(revTodayRaw);
  const revenue7d = calcRevenue(rev7dRaw);

  const activeSources = sourcesHealth.filter((s) => s.status === "ACTIVE").length;
  const errorSources = sourcesHealth.filter((s) => s.status === "ERROR").length;

  const statCards = [
    { label: "Produtos", value: formatNumber(productsTotal), icon: Package, color: "text-accent-blue" },
    { label: "Ofertas Ativas", value: formatNumber(stats.activeOffers), icon: Tag, color: "text-accent-green" },
    { label: "Listings", value: formatNumber(stats.listings), icon: Layers, color: "text-brand-500" },
    { label: "Fontes", value: `${activeSources}/${sourcesHealth.length}`, icon: Store, color: errorSources > 0 ? "text-red-500" : "text-accent-green" },
    { label: "Cupons", value: couponsActive.toString(), icon: Ticket, color: "text-accent-pink" },
    { label: "Marcas", value: stats.brands.toString(), icon: Layers, color: "text-accent-blue" },
    { label: "Categorias", value: stats.categories.toString(), icon: Layers, color: "text-accent-green" },
    { label: "Banners Ativos", value: bannersActive.toString(), icon: Image, color: "text-accent-purple" },
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
      {/* Header with platform status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Command Center</h1>
          <p className="text-sm text-text-muted">Visao geral do PromoSnap</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-green/10 text-accent-green text-xs font-medium">
            <Activity className="h-3 w-3" />
            Platform OK
          </div>
          {lastJob && (
            <div className="text-xs text-text-muted">
              Ultimo job: <span className="font-medium text-text-secondary">{lastJob.jobName}</span>{" "}
              <span className={jobStatusIcon[lastJob.status]?.color || "text-text-muted"}>
                {lastJob.status}
              </span>{" "}
              {timeAgo(new Date(lastJob.startedAt))}
            </div>
          )}
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 border-l-4 border-l-accent-green">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Revenue Hoje</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatPrice(revenueToday)}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-accent-blue">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Revenue 7d</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatPrice(revenue7d)}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-accent-orange">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-accent-orange" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Clickouts Hoje</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(stats.clickoutsToday)}</p>
        </div>
        <div className="card p-4 border-l-4 border-l-brand-500">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-brand-500" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Clickouts 7d</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(clickouts7d)}</p>
        </div>
      </div>

      {/* Catalog & platform stats */}
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

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Link href="/admin/banners" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-accent-purple" />
            <div>
              <p className="text-sm font-medium text-text-primary">Banners</p>
              <p className="text-xs text-text-muted">{bannersActive} ativos</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>
        <Link href="/admin/catalog-edit" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent-blue" />
            <div>
              <p className="text-sm font-medium text-text-primary">Editor</p>
              <p className="text-xs text-text-muted">Catalogo</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>
        {candidatesPending > 0 && (
          <Link href="/admin/ingestao" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors border border-accent-orange/30">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-accent-orange" />
              <div>
                <p className="text-sm font-medium text-text-primary">Importacao</p>
                <p className="text-xs text-accent-orange font-medium">{candidatesPending} pendentes</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-text-muted" />
          </Link>
        )}
        <Link href="/admin/alertas" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent-orange" />
            <div>
              <p className="text-sm font-medium text-text-primary">{alertsActive} alertas</p>
              <p className="text-xs text-text-muted">Alertas de preco</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>
        <Link href="/admin/jobs" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent-green" />
            <div>
              <p className="text-sm font-medium text-text-primary">Jobs</p>
              <p className="text-xs text-text-muted">Automacao</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-text-muted" />
        </Link>
      </div>

      {/* Sources health */}
      {errorSources > 0 && (
        <div className="card p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-text-primary">Fontes com Erro</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sourcesHealth.filter((s) => s.status === "ERROR").map((s) => (
              <span key={s.id} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded-md font-medium">
                {s.name}
              </span>
            ))}
          </div>
        </div>
      )}

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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold font-display text-text-primary">Jobs Recentes</h2>
          <Link href="/admin/jobs" className="text-xs text-brand-500 hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
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
