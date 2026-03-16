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

// Revenue rates per source (overridable via REVENUE_RATES env var as JSON)
const DEFAULT_REVENUE_RATES: Record<string, number> = {
  "amazon-br": 0.04,
  mercadolivre: 0.03,
  shopee: 0.025,
  shein: 0.03,
};

const REVENUE_RATES: Record<string, number> = (() => {
  try {
    const envRates = process.env.REVENUE_RATES;
    return envRates ? { ...DEFAULT_REVENUE_RATES, ...JSON.parse(envRates) } : DEFAULT_REVENUE_RATES;
  } catch {
    return DEFAULT_REVENUE_RATES;
  }
})();

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
          <p className="text-sm text-text-muted">Visão geral do PromoSnap</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="status-ok">
            <Activity className="h-3 w-3" />
            Platform OK
          </div>
          {lastJob && (
            <div className="text-xs text-text-muted">
              Último job: <span className="font-medium text-text-secondary">{lastJob.jobName}</span>{" "}
              <span className={jobStatusIcon[lastJob.status]?.color || "text-text-muted"}>
                {lastJob.status}
              </span>{" "}
              {timeAgo(new Date(lastJob.startedAt))}
            </div>
          )}
        </div>
      </div>

      {/* Pendências Críticas + Sistema */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pendências Críticas */}
        {criticalOpen.length > 0 && (
          <div className="stat-card stat-card-red lg:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Pendências Críticas</span>
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
              <span>{pendingAudit.totalClosed} concluídas</span>
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
              <span className="text-red-500 font-medium">{integritySummary.criticalCount} críticos</span>
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

      {/* Revenue Funnel + Monetization Status — side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Funnel */}
        {(() => {
          const funnelSteps = [
            { label: "Produtos ativos", value: productsTotal, color: "bg-accent-blue" },
            { label: "Ofertas rastreadas", value: stats.activeOffers, color: "bg-brand-500" },
            { label: "Prontas p/ clickout", value: readyForDistribution, color: "bg-accent-purple" },
            { label: "Clickouts 7d", value: clickouts7d, color: "bg-accent-orange" },
          ];
          const maxFunnel = Math.max(...funnelSteps.map(s => s.value), 1);
          return (
            <div className="stat-card">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-4 w-4 text-brand-500" />
                <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Revenue Funnel</span>
              </div>
              <div className="space-y-2.5">
                {funnelSteps.map((step) => {
                  const pct = Math.max((step.value / maxFunnel) * 100, 3);
                  return (
                    <div key={step.label}>
                      <div className="flex items-center justify-between text-xs mb-0.5">
                        <span className="text-text-muted">{step.label}</span>
                        <span className="font-bold text-text-primary">{formatNumber(step.value)}</span>
                      </div>
                      <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                        <div className={`h-full ${step.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {productsTotal > 0 && clickouts7d === 0 && (
                <p className="mt-3 pt-2 border-t border-surface-200 text-[11px] text-red-500 font-medium">
                  ⚠ Zero clickouts — o funil para antes da conversão. Verificar CTAs e affiliate URLs.
                </p>
              )}
              {productsTotal > 0 && clickouts7d > 0 && (
                <p className="mt-3 pt-2 border-t border-surface-200 text-[11px] text-text-muted">
                  Taxa de conversão estimada: <span className="font-bold text-text-primary">{((clickouts7d / Math.max(readyForDistribution, 1)) * 100).toFixed(1)}%</span> das ofertas prontas geraram click
                </p>
              )}
            </div>
          );
        })()}

        {/* Monetization Readiness */}
        {(() => {
          const mlAffiliateId = !!process.env.MERCADOLIVRE_AFFILIATE_ID;
          const amazonTag = !!process.env.AMAZON_AFFILIATE_TAG;
          const adminSecret = !!process.env.ADMIN_SECRET;
          const resendKey = !!process.env.RESEND_API_KEY;
          const allReady = mlAffiliateId && amazonTag && adminSecret;
          const items = [
            { label: "MERCADOLIVRE_AFFILIATE_ID", ok: mlAffiliateId, critical: true },
            { label: "AMAZON_AFFILIATE_TAG", ok: amazonTag, critical: true },
            { label: "ADMIN_SECRET", ok: adminSecret, critical: true },
            { label: "RESEND_API_KEY", ok: resendKey, critical: false },
          ];
          return (
            <div className={`stat-card ${allReady ? "stat-card-green" : "stat-card-orange"} border-l-4 ${allReady ? "border-l-accent-green" : "border-l-amber-500"}`}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-4 w-4 text-brand-500" />
                <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Monetization Status</span>
                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${allReady ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>
                  {allReady ? "READY" : "INCOMPLETE"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {items.map((item) => (
                  <div key={item.label} className="flex items-center gap-2">
                    {item.ok ? (
                      <CheckCircle className="h-3.5 w-3.5 text-accent-green flex-shrink-0" />
                    ) : (
                      <XCircle className={`h-3.5 w-3.5 flex-shrink-0 ${item.critical ? "text-red-500" : "text-amber-500"}`} />
                    )}
                    <span className="text-xs text-text-secondary font-mono truncate">{item.label}</span>
                  </div>
                ))}
              </div>
              {/* Source-level revenue breakdown */}
              {rev7dRaw.length > 0 && (
                <div className="mt-3 pt-3 border-t border-surface-200">
                  <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">Revenue por Fonte (7d)</p>
                  <div className="space-y-1.5">
                    {rev7dRaw.sort((a, b) => Number(b.clickouts) - Number(a.clickouts)).map((row) => {
                      const srcRevenue = Number(row.clickouts) * (row.avgPrice ?? 0) * getRate(row.sourceSlug);
                      return (
                        <div key={row.sourceSlug || "unknown"} className="flex items-center justify-between text-xs">
                          <span className="text-text-secondary">{row.sourceSlug || "desconhecida"}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-text-muted">{Number(row.clickouts)} clicks</span>
                            <span className="font-bold text-text-primary">{formatPrice(srcRevenue)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="mt-3 pt-3 border-t border-surface-200 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-muted">Total clickouts 7d</p>
                  <p className="text-lg font-bold font-display text-text-primary">{formatNumber(clickouts7d)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-muted">Ofertas c/ affiliate URL</p>
                  <p className="text-lg font-bold font-display text-text-primary">{formatNumber(readyForDistribution)}</p>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* O que bloqueia receita — brutally honest */}
      {(() => {
        const blockers: { text: string; severity: "critical" | "warning" | "info" }[] = [];
        const mlConfigured = !!(process.env.ML_CLIENT_ID || process.env.MERCADOLIVRE_APP_ID);
        const emailConfigured = !!process.env.RESEND_API_KEY;
        const mlAffiliate = !!process.env.MERCADOLIVRE_AFFILIATE_ID;
        const amazonAffiliate = !!process.env.AMAZON_AFFILIATE_TAG;

        // Critical blockers — these prevent revenue
        if (!mlAffiliate) blockers.push({ text: "MERCADOLIVRE_AFFILIATE_ID ausente — clicks no ML não geram comissão", severity: "critical" });
        if (!amazonAffiliate) blockers.push({ text: "AMAZON_AFFILIATE_TAG ausente — clicks na Amazon não geram comissão", severity: "critical" });
        if (productsTotal === 0) blockers.push({ text: "Catálogo vazio — sem produtos, sem receita possível", severity: "critical" });
        if (stats.activeOffers === 0 && productsTotal > 0) blockers.push({ text: "Zero ofertas ativas — produtos existem mas não tem preços", severity: "critical" });
        if (readyForDistribution === 0 && stats.activeOffers > 0) blockers.push({ text: "Nenhuma oferta com affiliate URL — clicks existem mas não monetizam", severity: "critical" });
        if (stats.clickoutsToday === 0 && clickouts7d === 0) blockers.push({ text: "Zero clickouts — ninguém está clicando para comprar", severity: "critical" });

        // Warnings — these reduce revenue
        if (errorSources > 0) blockers.push({ text: `${errorSources} fonte(s) com erro — preços desatualizados`, severity: "warning" });
        if (lastJob?.status === "FAILED") blockers.push({ text: `Job "${lastJob.jobName}" falhou — pipeline pode estar parado`, severity: "warning" });
        if (!mlConfigured) blockers.push({ text: "ML API não configurada — discovery automático desabilitado", severity: "warning" });
        if (candidatesPending > 0) blockers.push({ text: `${candidatesPending} candidato(s) esperando revisão em Ingestão`, severity: "warning" });

        // Growth opportunities
        if (!emailConfigured) blockers.push({ text: "RESEND_API_KEY ausente — alertas de preço e newsletters desabilitados", severity: "info" });
        if (trendingWithoutCoverage > 0) blockers.push({ text: `${trendingWithoutCoverage} keywords trending sem produtos no catálogo`, severity: "info" });

        if (blockers.length === 0) return (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <h3 className="font-bold text-green-800 text-sm">Sistema Operacional</h3>
            </div>
            <p className="text-sm text-green-700 mt-1">Nenhum bloqueio crítico identificado. Pipeline de receita funcional.</p>
          </div>
        );

        const criticals = blockers.filter(b => b.severity === "critical");
        const warnings = blockers.filter(b => b.severity === "warning");
        const infos = blockers.filter(b => b.severity === "info");
        const borderColor = criticals.length > 0 ? "border-red-500" : warnings.length > 0 ? "border-amber-500" : "border-blue-400";

        return (
          <div className={`card p-4 border-l-4 ${borderColor}`}>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className={`h-4 w-4 ${criticals.length > 0 ? "text-red-500" : "text-amber-500"}`} />
              <h3 className="font-bold text-text-primary text-sm">O Que Bloqueia Receita</h3>
              {criticals.length > 0 && (
                <span className="ml-auto text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
                  {criticals.length} crítico{criticals.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="space-y-2">
              {criticals.length > 0 && (
                <div className="space-y-1">
                  {criticals.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-red-500" />
                      <span className="text-red-700">{b.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {warnings.length > 0 && (
                <div className="space-y-1">
                  {warnings.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                      <span className="text-amber-700">{b.text}</span>
                    </div>
                  ))}
                </div>
              )}
              {infos.length > 0 && (
                <div className="space-y-1 pt-1 border-t border-surface-200">
                  {infos.map((b, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-accent-blue" />
                      <span className="text-text-muted">{b.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Ações do dia */}
      <div className="card p-5 border-l-4 border-l-brand-500">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="h-5 w-5 text-brand-500" />
          <h2 className="text-sm font-semibold font-display text-text-primary">Ações do Dia</h2>
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
                <p className="text-sm font-medium text-text-primary">Último job</p>
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
            <h2 className="admin-section-title">Clickouts - Últimos 7 dias</h2>
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
            <h2 className="admin-section-title">Últimos Clickouts</h2>
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
