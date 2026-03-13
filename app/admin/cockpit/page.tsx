import {
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
  TrendingUp,
  Package,
  MousePointerClick,
  Tag,
  Users,
  ShieldAlert,
  Clock,
  XCircle,
  Star,
  FileText,
  Radio,
  Megaphone,
  Search,
  Eye,
  CheckCircle2,
  ExternalLink,
  Play,
  Activity,
} from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/db/prisma";
import { getTopOpportunities, summarizeOpportunities } from "@/lib/opportunity/engine";
import { getExecutions } from "@/lib/execution/engine";
import type { ExecutionRecord, ExecutionStatus } from "@/lib/execution/types";
import type { Opportunity, OpportunityPriority, OpportunityType } from "@/lib/opportunity/types";
import { ExecuteButton } from "./ExecuteButton";

export const dynamic = "force-dynamic";

// ============================================
// Data fetching (server component)
// ============================================

async function getCockpitData() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const [opportunities, stats] = await Promise.all([
    getTopOpportunities(10),
    fetchWeeklyStats(sevenDaysAgo, fourteenDaysAgo),
  ]);

  const summary = summarizeOpportunities(opportunities);

  return { opportunities, summary, ...stats };
}

async function fetchWeeklyStats(sevenDaysAgo: Date, fourteenDaysAgo: Date) {
  const [
    clickoutsThisWeek,
    clickoutsLastWeek,
    newProductsThisWeek,
    newListingsThisWeek,
    totalActiveProducts,
    totalActiveOffers,
    totalSubscribers,
    failedJobs,
    lowTrustOffers,
    staleOffers,
    needsReviewProducts,
    topCategories,
  ] = await Promise.all([
    prisma.clickout.count({ where: { clickedAt: { gte: sevenDaysAgo } } }),
    prisma.clickout.count({ where: { clickedAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } } }),
    prisma.product.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.listing.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.product.count({ where: { status: "ACTIVE" } }),
    prisma.offer.count({ where: { isActive: true } }),
    prisma.subscriber.count({ where: { status: "ACTIVE" } }),
    prisma.jobRun.findMany({
      where: { status: "FAILED", startedAt: { gte: sevenDaysAgo } },
      select: { id: true, jobName: true, startedAt: true, errorLog: true },
      orderBy: { startedAt: "desc" },
      take: 5,
    }),
    prisma.offer.count({ where: { isActive: true, offerScore: { lt: 20 } } }),
    prisma.offer.count({ where: { isActive: true, lastSeenAt: { lt: sevenDaysAgo } } }),
    prisma.product.count({ where: { needsReview: true, status: "ACTIVE" } }),
    prisma.clickout.groupBy({
      by: ["categorySlug"],
      _count: { id: true },
      where: { clickedAt: { gte: sevenDaysAgo }, categorySlug: { not: null } },
      orderBy: { _count: { id: "desc" } },
      take: 5,
    }),
  ]);

  const clickoutsDelta =
    clickoutsLastWeek > 0
      ? Math.round(((clickoutsThisWeek - clickoutsLastWeek) / clickoutsLastWeek) * 100)
      : clickoutsThisWeek > 0
      ? 100
      : 0;

  return {
    weeklyStats: {
      clickoutsThisWeek,
      clickoutsLastWeek,
      clickoutsDelta,
      newProductsThisWeek,
      newListingsThisWeek,
      totalActiveProducts,
      totalActiveOffers,
      totalSubscribers,
      topCategories: topCategories.map((c) => ({
        category: c.categorySlug ?? "sem-categoria",
        clickouts: c._count.id,
      })),
    },
    risks: {
      failedJobs: failedJobs.map((j) => ({
        id: j.id,
        jobName: j.jobName,
        startedAt: j.startedAt,
        errorSnippet: j.errorLog ? j.errorLog.slice(0, 120) : null,
      })),
      lowTrustOffers,
      staleOffers,
      needsReviewProducts,
    },
  };
}

// ============================================
// Sub-components
// ============================================

const priorityConfig: Record<OpportunityPriority, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", label: "Critico" },
  high: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "Alto" },
  medium: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", label: "Medio" },
  low: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", label: "Baixo" },
};

function typeIcon(type: OpportunityType) {
  switch (type) {
    case "catalog-weak": return Package;
    case "high-potential-product": return Star;
    case "category-gap": return Search;
    case "low-monetization-page": return MousePointerClick;
    case "low-trust-relevant": return ShieldAlert;
    case "highlight-candidate": return Star;
    case "content-missing": return FileText;
    case "distribution-recommended": return Radio;
    case "campaign-recommended": return Megaphone;
    case "needs-review": return Eye;
    default: return Zap;
  }
}

function PriorityBadge({ priority }: { priority: OpportunityPriority }) {
  const c = priorityConfig[priority];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${c.bg} ${c.text} ${c.border}`}>
      {c.label}
    </span>
  );
}

function ImpactBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-yellow-500" : "bg-gray-300";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[10px] text-text-muted">{score}</span>
    </div>
  );
}

function DeltaIndicator({ value }: { value: number }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-emerald-600">
        <ArrowUpRight className="h-3 w-3" /> +{value}%
      </span>
    );
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-500">
        <ArrowDownRight className="h-3 w-3" /> {value}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-text-muted">
      <Minus className="h-3 w-3" /> 0%
    </span>
  );
}

function StatCard({
  label,
  value,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  delta?: number;
  icon: typeof Package;
}) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{label}</span>
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-bold font-display text-text-primary">
          {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
        </span>
        {delta !== undefined && <DeltaIndicator value={delta} />}
      </div>
    </div>
  );
}

function getExecutionTypeForOpportunity(opp: Opportunity): { type: string; payload: Record<string, unknown> } | null {
  switch (opp.type) {
    case "highlight-candidate":
    case "high-potential-product":
      return opp.meta?.productId
        ? { type: "feature_product", payload: { productId: opp.meta.productId } }
        : null;
    case "campaign-recommended":
      return {
        type: "create_campaign",
        payload: {
          title: `Campanha: ${opp.title}`,
          ...(opp.meta?.offerId ? { offerId: opp.meta.offerId } : {}),
        },
      };
    case "distribution-recommended":
      return {
        type: "publish_distribution",
        payload: { segment: "geral", channel: "homepage" },
      };
    case "needs-review":
      return opp.meta?.productId
        ? { type: "create_review_task", payload: { productId: opp.meta.productId } }
        : null;
    case "content-missing":
      return {
        type: "create_banner",
        payload: { title: `Conteudo: ${opp.meta?.categoryName || "Categoria"}`, autoMode: "top-offers" },
      };
    default:
      return null;
  }
}

const execStatusConfig: Record<ExecutionStatus, { label: string; bg: string; text: string }> = {
  pending: { label: "Pendente", bg: "bg-gray-100", text: "text-gray-600" },
  running: { label: "Executando", bg: "bg-blue-100", text: "text-blue-700" },
  success: { label: "OK", bg: "bg-emerald-100", text: "text-emerald-700" },
  failed: { label: "Falhou", bg: "bg-red-100", text: "text-red-700" },
  skipped: { label: "Ignorado", bg: "bg-yellow-100", text: "text-yellow-700" },
};

function MiniStatusBadge({ status }: { status: ExecutionStatus }) {
  const c = execStatusConfig[status];
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}

function OpportunityCard({ opp }: { opp: Opportunity }) {
  const Icon = typeIcon(opp.type);
  const pc = priorityConfig[opp.priority];
  const execInfo = getExecutionTypeForOpportunity(opp);

  return (
    <div className={`bg-white rounded-xl border ${pc.border} p-4 hover:shadow-sm transition-shadow`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg ${pc.bg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${pc.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-text-primary truncate">{opp.title}</h3>
            <PriorityBadge priority={opp.priority} />
          </div>
          <p className="text-xs text-text-muted mb-2 line-clamp-2">{opp.description}</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-text-muted uppercase">Impacto</span>
                <ImpactBar score={opp.impactScore} />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-text-muted uppercase">Confianca</span>
                <ImpactBar score={opp.confidenceScore} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {execInfo && (
                <ExecuteButton
                  type={execInfo.type}
                  payload={execInfo.payload}
                  label="Executar"
                />
              )}
              {opp.adminUrl && (
                <Link
                  href={opp.adminUrl}
                  className="inline-flex items-center gap-1 text-xs font-medium text-accent-blue hover:underline"
                >
                  Agir <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskItem({
  icon: Icon,
  label,
  count,
  href,
  color = "text-red-500",
}: {
  icon: typeof AlertTriangle;
  label: string;
  count: number;
  href: string;
  color?: string;
}) {
  if (count === 0) return null;
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-white rounded-xl border border-surface-200 p-4 hover:shadow-sm transition-shadow"
    >
      <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className="block text-xs text-text-muted">{count} item(ns) requerem atencao</span>
      </div>
      <span className="text-lg font-bold text-red-600">{count}</span>
    </Link>
  );
}

// ============================================
// Recent Executions Section
// ============================================

const execTypeLabels: Record<string, string> = {
  create_banner: "Banner",
  publish_distribution: "Distribuicao",
  feature_product: "Destaque",
  create_campaign: "Campanha",
  create_import_batch: "Importacao",
  create_review_task: "Revisao",
  trigger_job: "Job",
  trigger_email: "Email",
  trigger_webhook: "Webhook",
};

function RecentExecutionsSection() {
  const recentExecs = getExecutions({ limit: 5 });

  if (recentExecs.length === 0) return null;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-indigo-500" />
          <h2 className="text-lg font-bold font-display text-text-primary">Execucoes Recentes</h2>
          <span className="text-xs text-text-muted bg-surface-100 px-2 py-0.5 rounded-full">
            {recentExecs.length}
          </span>
        </div>
        <Link
          href="/admin/executions"
          className="text-xs font-medium text-accent-blue hover:underline inline-flex items-center gap-1"
        >
          Ver todas <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-surface-200 divide-y divide-surface-100">
        {recentExecs.map((exec) => (
          <div key={exec.id} className="flex items-center gap-3 p-3">
            <Play className="h-3.5 w-3.5 text-text-muted flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-text-primary">
                {execTypeLabels[exec.type] || exec.type}
              </span>
              <span className="text-xs text-text-muted ml-2">
                {exec.origin}
              </span>
            </div>
            <MiniStatusBadge status={exec.status} />
            <span className="text-[11px] text-text-muted flex-shrink-0">
              {new Date(exec.createdAt).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

// ============================================
// Page
// ============================================

export default async function CockpitPage() {
  const { opportunities, summary, weeklyStats, risks } = await getCockpitData();

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Cockpit Executivo</h1>
        <p className="text-sm text-text-muted mt-1">
          Visao consolidada do PromoSnap — acoes prioritarias, metricas da semana e alertas
        </p>
      </div>

      {/* Section 1: Hoje no PromoSnap */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold font-display text-text-primary">Hoje no PromoSnap</h2>
          <span className="ml-2 text-xs text-text-muted bg-surface-100 px-2 py-0.5 rounded-full">
            {summary.total} oportunidades
          </span>
          {summary.byCritical > 0 && (
            <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
              {summary.byCritical} critica(s)
            </span>
          )}
        </div>

        {opportunities.length === 0 ? (
          <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm text-text-muted">Nenhuma acao prioritaria no momento. Tudo em ordem!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {opportunities.map((opp) => (
              <OpportunityCard key={opp.id} opp={opp} />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Destaques da Semana */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-accent-blue" />
          <h2 className="text-lg font-bold font-display text-text-primary">Destaques da Semana</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="Clickouts (7d)"
            value={weeklyStats.clickoutsThisWeek}
            delta={weeklyStats.clickoutsDelta}
            icon={MousePointerClick}
          />
          <StatCard
            label="Novos Produtos"
            value={weeklyStats.newProductsThisWeek}
            icon={Package}
          />
          <StatCard
            label="Novos Listings"
            value={weeklyStats.newListingsThisWeek}
            icon={Tag}
          />
          <StatCard
            label="Assinantes"
            value={weeklyStats.totalSubscribers}
            icon={Users}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            label="Produtos Ativos"
            value={weeklyStats.totalActiveProducts}
            icon={Package}
          />
          <StatCard
            label="Ofertas Ativas"
            value={weeklyStats.totalActiveOffers}
            icon={Tag}
          />
          <StatCard
            label="Impacto Medio"
            value={summary.averageImpact}
            icon={TrendingUp}
          />
        </div>

        {/* Top Categories */}
        {weeklyStats.topCategories.length > 0 && (
          <div className="bg-white rounded-xl border border-surface-200 p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3">Top Categorias (Clickouts 7d)</h3>
            <div className="space-y-2">
              {weeklyStats.topCategories.map((cat, i) => (
                <div key={cat.category} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-text-muted w-5">{i + 1}.</span>
                  <span className="text-sm text-text-primary flex-1">{cat.category}</span>
                  <span className="text-sm font-semibold text-text-primary">{cat.clickouts}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Section 3: Execucoes Recentes */}
      <RecentExecutionsSection />

      {/* Section 4: Riscos e Alertas */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <h2 className="text-lg font-bold font-display text-text-primary">Riscos e Alertas</h2>
        </div>

        <div className="space-y-3">
          <RiskItem
            icon={ShieldAlert}
            label="Ofertas com baixa confianca"
            count={risks.lowTrustOffers}
            href="/admin/data-trust"
          />
          <RiskItem
            icon={Clock}
            label="Ofertas obsoletas (sem atualizacao 7d)"
            count={risks.staleOffers}
            href="/admin/ofertas"
            color="text-orange-500"
          />
          <RiskItem
            icon={Eye}
            label="Produtos aguardando revisao"
            count={risks.needsReviewProducts}
            href="/admin/produtos?filter=needs-review"
            color="text-yellow-600"
          />
          <RiskItem
            icon={XCircle}
            label="Jobs com falha (7d)"
            count={risks.failedJobs.length}
            href="/admin/jobs"
          />
        </div>

        {/* Failed jobs detail */}
        {risks.failedJobs.length > 0 && (
          <div className="mt-4 bg-white rounded-xl border border-red-100 p-4">
            <h3 className="text-sm font-semibold text-red-700 mb-2">Jobs com Falha</h3>
            <div className="space-y-2">
              {risks.failedJobs.map((job) => (
                <div key={job.id} className="flex items-start gap-2 text-xs">
                  <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-medium text-text-primary">{job.jobName}</span>
                    <span className="text-text-muted ml-2">
                      {new Date(job.startedAt).toLocaleDateString("pt-BR")}
                    </span>
                    {job.errorSnippet && (
                      <p className="text-red-600 mt-0.5 font-mono text-[10px] truncate max-w-lg">
                        {job.errorSnippet}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
