import {
  Package, Tag, Store, MousePointerClick, BarChart3, Ticket,
  Layers, Clock, CheckCircle, XCircle, AlertTriangle, Loader2,
  Bell, TrendingUp, Heart, ArrowRight, DollarSign, Image,
  Upload, Zap, Activity, Shield, FileText, Users, Rocket,
  Radio, Target, Flame, Gauge
} from "lucide-react";
import Link from "next/link";
import { getAdminDashboardData } from "@/lib/db/queries";
import { formatNumber, formatPrice, timeAgo } from "@/lib/utils";
import prisma from "@/lib/db/prisma";
import { classifyCriticalPending } from "@/lib/project/pending-audit";
import { getIntegritySummary } from "@/lib/project/integrity";

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
    readyForDistribution, trendingWithoutCoverage, publishedToday,
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
    prisma.offer.count({ where: { isActive: true, offerScore: { gte: 50 }, listing: { status: "ACTIVE", product: { status: "ACTIVE", hidden: false } } } }).catch(() => 0),
    prisma.$queryRaw<{ cnt: bigint }[]>`
      SELECT COUNT(DISTINCT tk.keyword)::bigint AS cnt
      FROM trending_keywords tk
      WHERE tk."fetchedAt" > NOW() - INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM products p
        WHERE p.status = 'ACTIVE' AND p.name ILIKE '%' || tk.keyword || '%'
      )
    `.then((r) => Number(r[0]?.cnt ?? 0)).catch(() => 0),
    prisma.catalogCandidate.count({ where: { status: "IMPORTED", updatedAt: { gte: today } } }).catch(() => 0),
  ]);

  const calcRevenue = (rows: SourceRow[]) =>
    rows.reduce((sum, r) => sum + Number(r.clickouts) * (r.avgPrice ?? 0) * getRate(r.sourceSlug), 0);

  const revenueToday = calcRevenue(revTodayRaw);
  const revenue7d = calcRevenue(rev7dRaw);

  const activeSources = sourcesHealth.filter((s) => s.status === "ACTIVE").length;
  const errorSources = sourcesHealth.filter((s) => s.status === "ERROR").length;

  // Pending audit and integrity
  const pendingAudit = classifyCriticalPending();
  const criticalOpen = pendingAudit.critical_for_execution.filter((i) => i.status !== "closed");
  const integritySummary = getIntegritySummary();

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
          <div className="status-ok">
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

      {/* Pendencias Criticas + Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pendencias Criticas */}
        {criticalOpen.length > 0 && (
          <div className="stat-card stat-card-red lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Pendencias Criticas</span>
              <span className="ml-auto text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                {criticalOpen.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {criticalOpen.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.status === "open" ? "bg-red-400" : "bg-amber-400"}`} />
                  <span className="text-text-primary truncate">{item.title}</span>
                  <span className="text-[10px] text-text-muted ml-auto flex-shrink-0">{item.estimatedEffort}</span>
                </div>
              ))}
              {criticalOpen.length > 4 && (
                <p className="text-[10px] text-text-muted">+{criticalOpen.length - 4} mais</p>
              )}
            </div>
            <div className="mt-2 pt-2 border-t border-surface-200 flex items-center gap-4 text-[10px] text-text-muted">
              <span>{pendingAudit.totalOpen} abertas</span>
              <span>{pendingAudit.totalPartial} parciais</span>
              <span>{pendingAudit.totalClosed} concluidas</span>
            </div>
          </div>
        )}

        {/* Sistema - Integrity Score */}
        <div className={`stat-card ${integritySummary.score >= 75 ? "stat-card-green" : integritySummary.score >= 50 ? "stat-card-orange" : "stat-card-red"}`}>
          <div className="flex items-center gap-2 mb-2">
            <Gauge className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Sistema</span>
          </div>
          <p className="text-3xl font-bold font-display text-text-primary">{integritySummary.score}<span className="text-sm font-normal text-text-muted">/100</span></p>
          <p className="text-xs text-text-muted mt-1">{integritySummary.status}</p>
          <div className="mt-2 pt-2 border-t border-surface-200 flex items-center gap-3 text-[10px] text-text-muted">
            {integritySummary.criticalCount > 0 && (
              <span className="text-red-500 font-medium">{integritySummary.criticalCount} criticos</span>
            )}
            {integritySummary.warningCount > 0 && (
              <span className="text-amber-500 font-medium">{integritySummary.warningCount} avisos</span>
            )}
            <span>{integritySummary.totalChecks} checks</span>
          </div>
        </div>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card stat-card-green">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Revenue Hoje</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatPrice(revenueToday)}</p>
        </div>
        <div className="stat-card stat-card-blue">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Revenue 7d</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatPrice(revenue7d)}</p>
        </div>
        <div className="stat-card stat-card-orange">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-accent-orange" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Clickouts Hoje</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(stats.clickoutsToday)}</p>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-brand-500" />
            <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Clickouts 7d</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(clickouts7d)}</p>
        </div>
      </div>

      {/* Proximos Passos — strategic recommendations */}
      {(() => {
        const recs: string[] = [];
        const mlConfigured = !!(process.env.ML_CLIENT_ID || process.env.MERCADOLIVRE_APP_ID);
        const emailConfigured = !!process.env.RESEND_API_KEY;
        // Build recommendations based on current state
        if (!mlConfigured) recs.push("Configurar credenciais ML (ML_CLIENT_ID + SECRET) para discovery automatico de produtos");
        if (!emailConfigured) recs.push("Configurar RESEND_API_KEY para habilitar envio de alertas e newsletters");
        if (productsTotal === 0) recs.push("Catalogo vazio — importar produtos via /admin/ingestao ou rodar discover-import");
        if (stats.activeOffers === 0 && productsTotal > 0) recs.push("Nenhuma oferta ativa — verificar pipeline de ingestao");
        if (stats.clickoutsToday === 0 && clickouts7d === 0) recs.push("Nenhum clickout registrado — verificar affiliate links e tracking");
        if (candidatesPending > 0) recs.push(`${candidatesPending} candidato(s) pendente(s) para revisar em Ingestao`);
        if (trendingWithoutCoverage > 0) recs.push(`${trendingWithoutCoverage} keywords trending sem cobertura no catalogo`);
        if (errorSources > 0) recs.push(`${errorSources} fonte(s) com erro — verificar em Fontes`);
        if (lastJob?.status === "FAILED") recs.push(`Ultimo job falhou (${lastJob.jobName}) — verificar em Jobs`);
        // Only show top 5
        const topRecs = recs.slice(0, 5);
        if (topRecs.length === 0) return null;
        return (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-0">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-amber-700" />
              <h3 className="font-bold text-amber-800 text-sm">Proximos Passos</h3>
              <span className="ml-auto text-[10px] font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                {topRecs.length} acao/acoes
              </span>
            </div>
            <ul className="text-sm text-amber-700 space-y-1">
              {topRecs.map((r, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {/* Acoes do dia */}
      <div className="card p-5 border-l-4 border-l-brand-500">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-5 w-5 text-brand-500" />
          <h2 className="text-sm font-semibold font-display text-text-primary">Acoes do Dia</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {candidatesPending > 0 && (
            <Link
              href="/admin/ingestao"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent-orange/10 hover:bg-accent-orange/20 transition-colors"
            >
              <Upload className="h-4 w-4 text-accent-orange flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">{candidatesPending} candidatos</p>
                <p className="text-[10px] text-text-muted">para revisar</p>
              </div>
            </Link>
          )}
          {readyForDistribution > 0 && (
            <Link
              href="/admin/distribution"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 transition-colors"
            >
              <Radio className="h-4 w-4 text-brand-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">{readyForDistribution} ofertas</p>
                <p className="text-[10px] text-text-muted">prontas p/ distribuir</p>
              </div>
            </Link>
          )}
          {trendingWithoutCoverage > 0 && (
            <Link
              href="/admin/growth-ops"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent-purple/10 hover:bg-accent-purple/20 transition-colors"
            >
              <TrendingUp className="h-4 w-4 text-accent-purple flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-text-primary">{trendingWithoutCoverage} keywords</p>
                <p className="text-[10px] text-text-muted">sem cobertura</p>
              </div>
            </Link>
          )}
          <Link
            href="/admin/banners"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-accent-green/10 hover:bg-accent-green/20 transition-colors"
          >
            <Image className="h-4 w-4 text-accent-green flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-text-primary">{bannersActive} banners</p>
              <p className="text-[10px] text-text-muted">ativos</p>
            </div>
          </Link>
          {lastJob && (
            <Link
              href="/admin/jobs"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                lastJob.status === "FAILED"
                  ? "bg-red-500/10 hover:bg-red-500/20"
                  : "bg-surface-100 hover:bg-surface-200"
              }`}
            >
              <Clock className={`h-4 w-4 flex-shrink-0 ${lastJob.status === "FAILED" ? "text-red-500" : "text-text-muted"}`} />
              <div>
                <p className="text-sm font-medium text-text-primary">Ultimo job</p>
                <p className={`text-[10px] ${lastJob.status === "FAILED" ? "text-red-500 font-medium" : "text-text-muted"}`}>
                  {lastJob.status} {timeAgo(new Date(lastJob.startedAt))}
                </p>
              </div>
            </Link>
          )}
        </div>
        {publishedToday > 0 && (
          <p className="text-[10px] text-accent-green mt-2">
            {publishedToday} produto(s) publicado(s) hoje
          </p>
        )}
      </div>

      {/* Catalog & platform stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-surface-50 flex items-center justify-center">
                <s.icon className={`h-3.5 w-3.5 ${s.color}`} />
              </div>
              <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">{s.label}</span>
            </div>
            <p className="text-2xl font-bold font-display text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
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
        <Link href="/admin/growth-ops" className="card p-3 flex items-center justify-between hover:bg-surface-50 transition-colors border border-brand-500/20">
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-brand-500" />
            <div>
              <p className="text-sm font-medium text-text-primary">Growth</p>
              <p className="text-xs text-text-muted">Oportunidades</p>
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
      <div className="admin-card">
        <div className="admin-section-header">
          <BarChart3 className="h-5 w-5 text-accent-blue" />
          <div>
            <h2 className="admin-section-title">Clickouts - Ultimos 7 dias</h2>
          </div>
        </div>
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
        <div className="admin-card">
          <div className="admin-section-header">
            <MousePointerClick className="h-5 w-5 text-accent-orange" />
            <h2 className="admin-section-title">Ultimos Clickouts</h2>
          </div>
          {recentClickouts.length === 0 ? (
            <p className="text-sm text-text-muted">Nenhum clickout registrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-admin">
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
        <div className="admin-card">
          <div className="admin-section-header">
            <TrendingUp className="h-5 w-5 text-accent-green" />
            <h2 className="admin-section-title">Top Produtos Clicados</h2>
          </div>
          {(topProducts as any[]).length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de cliques.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-admin">
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
      <div className="admin-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-accent-blue" />
            <h2 className="admin-section-title">Jobs Recentes</h2>
          </div>
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
