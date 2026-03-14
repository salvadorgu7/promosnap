import Link from "next/link";
import {
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShoppingCart,
  Mail,
  MessageCircle,
  Hash,
  Gamepad2,
  Phone,
  Clock,
  Globe,
  ArrowRight,
  Database,
  BarChart3,
  Package,
  Tag,
  Layers,
  Rocket,
  Upload,
  Shield,
} from "lucide-react";
import {
  getAllIntegrationReadiness,
  getActivationScore,
  type IntegrationStatus,
} from "@/lib/integrations/readiness";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusLabel: Record<IntegrationStatus, string> = {
  NOT_CONFIGURED: "Nao configurado",
  CONFIG_PARTIAL: "Parcial",
  READY_TO_TEST: "Pronto p/ teste",
  READY_PRODUCTION: "Producao",
  BLOCKED_EXTERNAL: "Bloqueado externo",
};

const statusBadgeClass: Record<IntegrationStatus, string> = {
  NOT_CONFIGURED:
    "bg-red-50 text-red-700 border-red-200",
  CONFIG_PARTIAL:
    "bg-amber-50 text-amber-700 border-amber-200",
  READY_TO_TEST:
    "bg-blue-50 text-blue-700 border-blue-200",
  READY_PRODUCTION:
    "bg-emerald-50 text-emerald-700 border-emerald-200",
  BLOCKED_EXTERNAL:
    "bg-gray-50 text-gray-600 border-gray-200",
};

const integrationIcons: Record<string, typeof ShoppingCart> = {
  mercadolivre: ShoppingCart,
  email: Mail,
  telegram: MessageCircle,
  slack: Hash,
  discord: Gamepad2,
  whatsapp: Phone,
  cron: Clock,
  domain: Globe,
};

// ---------------------------------------------------------------------------
// Global checklist items
// ---------------------------------------------------------------------------

interface ChecklistItem {
  label: string;
  ok: boolean;
  partial?: boolean;
  detail?: string;
}

function buildGlobalChecklist(): ChecklistItem[] {
  const adminSecret = process.env.ADMIN_SECRET;
  const adminWeak = adminSecret === "change-me-in-production" || adminSecret === "admin";
  return [
    { label: "Database", ok: true, detail: "Prisma conectado" },
    { label: "Dominio (APP_URL)", ok: !!(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL), detail: process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || undefined },
    { label: "CRON_SECRET", ok: !!process.env.CRON_SECRET, detail: !process.env.CRON_SECRET ? "Cron acessivel sem auth" : undefined },
    { label: "ADMIN_SECRET", ok: !!adminSecret && !adminWeak, partial: !!adminSecret && adminWeak, detail: adminWeak ? "Valor padrao — trocar em producao" : undefined },
    { label: "Email (RESEND_API_KEY)", ok: !!process.env.RESEND_API_KEY },
    { label: "ML OAuth (ML_CLIENT_ID)", ok: !!(process.env.ML_CLIENT_ID || process.env.MERCADOLIVRE_APP_ID) },
    { label: "Analytics (GA_ID)", ok: !!process.env.NEXT_PUBLIC_GA_ID },
    { label: "Sentry (DSN)", ok: !!process.env.SENTRY_DSN },
    { label: "Redis", ok: !!process.env.REDIS_URL, partial: !process.env.REDIS_URL, detail: !process.env.REDIS_URL ? "Usando cache in-memory" : undefined },
    { label: "Telegram (BOT_TOKEN)", ok: !!process.env.TELEGRAM_BOT_TOKEN },
    { label: "Slack / Discord Webhook", ok: !!(process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL) },
  ];
}

// ---------------------------------------------------------------------------
// Catalog stats (server-side)
// ---------------------------------------------------------------------------

async function getCatalogStats() {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [products, offers, listings, clickouts, subscribers, alerts, jobs] = await Promise.all([
      prisma.product.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.offer.count({ where: { isActive: true } }).catch(() => 0),
      prisma.listing.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.clickout.count().catch(() => 0),
      prisma.subscriber.count({ where: { status: "ACTIVE" } }).catch(() => 0),
      prisma.priceAlert.count({ where: { isActive: true, triggeredAt: null } }).catch(() => 0),
      prisma.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 5, select: { jobName: true, status: true, startedAt: true } }).catch(() => []),
    ]);

    let realImported = 0;
    try {
      realImported = await prisma.product.count({ where: { status: "ACTIVE", originType: "imported" } });
    } catch { /* originType may not exist */ }

    return { products, offers, listings, clickouts, subscribers, alerts, realImported, seedProducts: products - realImported, recentJobs: jobs };
  } catch {
    return { products: 0, offers: 0, listings: 0, clickouts: 0, subscribers: 0, alerts: 0, realImported: 0, seedProducts: 0, recentJobs: [] };
  }
}

// ---------------------------------------------------------------------------
// Build dynamic recommendations
// ---------------------------------------------------------------------------

function buildRecommendations(checklist: ChecklistItem[], catalog: Awaited<ReturnType<typeof getCatalogStats>>): string[] {
  const recs: string[] = [];
  const mlConfigured = !!(process.env.ML_CLIENT_ID || process.env.MERCADOLIVRE_APP_ID);
  const emailConfigured = !!process.env.RESEND_API_KEY;

  if (!mlConfigured) recs.push("Configurar ML_CLIENT_ID + ML_CLIENT_SECRET para habilitar discovery automatico de produtos");
  if (!emailConfigured) recs.push("Configurar RESEND_API_KEY para envio de alertas e newsletters");
  if (catalog.realImported === 0) recs.push("Rodar discover-import para popular o catalogo com produtos reais do Mercado Livre");
  if (catalog.clickouts === 0 && catalog.products > 0) recs.push("Verificar tracking de affiliate links — nenhum clickout registrado");
  if (catalog.subscribers === 0) recs.push("Captar assinantes de newsletter para distribuicao de ofertas");
  if (catalog.alerts === 0 && catalog.realImported > 0) recs.push("Criar alertas de preco para engajar usuarios");
  if (catalog.recentJobs.length === 0) recs.push("Executar cron manualmente em /admin/jobs para inicializar a automacao");
  if (!process.env.CRON_SECRET) recs.push("Configurar CRON_SECRET para proteger endpoints de cron");
  if (!process.env.NEXT_PUBLIC_GA_ID) recs.push("Configurar NEXT_PUBLIC_GA_ID para habilitar analytics");

  return recs;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminSetupPage() {
  const integrations = getAllIntegrationReadiness();
  const score = getActivationScore();
  const checklist = buildGlobalChecklist();
  const catalog = await getCatalogStats();
  const recommendations = buildRecommendations(checklist, catalog);

  const scoreColor =
    score >= 80
      ? "text-emerald-600"
      : score >= 60
        ? "text-amber-600"
        : "text-red-600";

  const scoreRingColor =
    score >= 80
      ? "border-emerald-400"
      : score >= 60
        ? "border-amber-400"
        : "border-red-400";

  return (
    <div className="space-y-6">
      {/* ── Hero ── */}
      <div className="admin-section-header">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
              <Settings className="h-6 w-6 text-text-muted" />
              Ativacao da Plataforma
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Visao geral de todas as integracoes e requisitos de ativacao
            </p>
          </div>
          <div className="flex flex-col items-center">
            <div
              className={`w-24 h-24 rounded-full border-4 ${scoreRingColor} flex items-center justify-center bg-white shadow-sm`}
            >
              <span className={`text-3xl font-bold font-display ${scoreColor}`}>
                {score}
              </span>
            </div>
            <span className="text-xs text-text-muted mt-1">Activation Score</span>
          </div>
        </div>
      </div>

      {/* ── Global checklist ── */}
      <div className="stat-card">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4">
          O Que Funciona
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {checklist.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                item.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : item.partial
                    ? "bg-amber-50 text-amber-700"
                    : "bg-red-50 text-red-700"
              }`}
            >
              {item.ok ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : item.partial ? (
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <span>{item.label}</span>
                {item.detail && (
                  <span className="block text-[10px] opacity-75 truncate">{item.detail}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Catalog Stats ── */}
      <div className="stat-card">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4">
          Estado do Catalogo
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "Produtos", value: catalog.products, icon: Package, color: "text-accent-blue" },
            { label: "Importados", value: catalog.realImported, icon: Upload, color: catalog.realImported > 0 ? "text-emerald-600" : "text-red-500" },
            { label: "Seed", value: catalog.seedProducts, icon: Database, color: "text-text-muted" },
            { label: "Ofertas", value: catalog.offers, icon: Tag, color: "text-accent-green" },
            { label: "Listings", value: catalog.listings, icon: Layers, color: "text-brand-500" },
            { label: "Clickouts", value: catalog.clickouts, icon: BarChart3, color: catalog.clickouts > 0 ? "text-accent-orange" : "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-3 px-2 rounded-lg bg-surface-50">
              <s.icon className={`h-5 w-5 ${s.color} mb-1`} />
              <span className="text-2xl font-bold font-display text-text-primary">{s.value}</span>
              <span className="text-[10px] text-text-muted uppercase tracking-wider">{s.label}</span>
            </div>
          ))}
        </div>
        {catalog.realImported === 0 && catalog.products > 0 && (
          <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            Todos os produtos sao seed/demo. Rode o job de import para popular com dados reais.
          </p>
        )}
      </div>

      {/* ── Proximos Passos ── */}
      {recommendations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="h-5 w-5 text-amber-700" />
            <h2 className="text-lg font-semibold font-display text-amber-800">
              Proximos Passos
            </h2>
            <span className="ml-auto text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
              {recommendations.length} pendente{recommendations.length > 1 ? "s" : ""}
            </span>
          </div>
          <ul className="space-y-2">
            {recommendations.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-amber-700">
                <ArrowRight className="h-4 w-4 flex-shrink-0 mt-0.5 text-amber-500" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Integration cards grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {integrations.map((integ) => {
          const Icon = integrationIcons[integ.key] || Settings;
          return (
            <div key={integ.key} className="stat-card flex flex-col gap-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
                    <Icon className="h-4 w-4 text-text-secondary" />
                  </div>
                  <span className="font-semibold text-text-primary">{integ.name}</span>
                </div>
                <span
                  className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full border ${statusBadgeClass[integ.status]}`}
                >
                  {statusLabel[integ.status]}
                </span>
              </div>

              {/* Summary */}
              <p className="text-sm text-text-secondary">{integ.summary}</p>

              {/* Missing requirements */}
              {integ.missingRequirements.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">Requisitos faltando:</p>
                  <ul className="space-y-0.5">
                    {integ.missingRequirements.map((req) => (
                      <li key={req} className="text-xs text-red-600 flex items-center gap-1">
                        <XCircle className="h-3 w-3 flex-shrink-0" />
                        <code className="font-mono bg-red-50 px-1 py-0.5 rounded">{req}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Warnings */}
              {integ.warnings.length > 0 && (
                <div>
                  <ul className="space-y-0.5">
                    {integ.warnings.map((w) => (
                      <li key={w} className="text-xs text-amber-600">
                        {w}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Next steps */}
              {integ.nextSteps.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-text-muted mb-1">Proximos passos:</p>
                  <ul className="space-y-0.5">
                    {integ.nextSteps.map((step) => (
                      <li key={step} className="text-xs text-text-secondary flex items-start gap-1">
                        <ArrowRight className="h-3 w-3 flex-shrink-0 mt-0.5 text-blue-500" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Links ── */}
      <div className="flex items-center gap-3">
        <Link
          href="/admin/config"
          className="text-sm text-blue-600 hover:text-blue-800 underline underline-offset-2"
        >
          Configuracoes do sistema
        </Link>
      </div>
    </div>
  );
}
