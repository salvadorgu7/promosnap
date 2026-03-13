import Link from "next/link";
import {
  Settings,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  Mail,
  MessageCircle,
  Hash,
  Gamepad2,
  Phone,
  Clock,
  Globe,
  ArrowRight,
} from "lucide-react";
import {
  getAllIntegrationReadiness,
  getActivationScore,
  type IntegrationStatus,
} from "@/lib/integrations/readiness";

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
}

function buildGlobalChecklist(): ChecklistItem[] {
  return [
    { label: "Dominio (APP_URL)", ok: !!(process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL) },
    { label: "CRON_SECRET", ok: !!process.env.CRON_SECRET },
    { label: "ADMIN_SECRET", ok: !!process.env.ADMIN_SECRET },
    { label: "Email (RESEND_API_KEY)", ok: !!process.env.RESEND_API_KEY },
    { label: "ML OAuth (ML_CLIENT_ID)", ok: !!(process.env.ML_CLIENT_ID || process.env.MERCADOLIVRE_APP_ID) },
    { label: "Telegram (BOT_TOKEN)", ok: !!process.env.TELEGRAM_BOT_TOKEN },
    { label: "Slack / Discord Webhook", ok: !!(process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL) },
  ];
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminSetupPage() {
  const integrations = getAllIntegrationReadiness();
  const score = getActivationScore();
  const checklist = buildGlobalChecklist();

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
          Checklist de Ativacao
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {checklist.map((item) => (
            <div
              key={item.label}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                item.ok
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {item.ok ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              ) : (
                <XCircle className="h-4 w-4 flex-shrink-0" />
              )}
              {item.label}
            </div>
          ))}
        </div>
      </div>

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
