import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  SkipForward,
  Loader2,
  Image,
  Radio,
  Star,
  Megaphone,
  Upload,
  Eye,
  Zap,
  Mail,
  Globe,
  Filter,
  RefreshCw,
  ArrowLeft,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { getExecutions, getExecutionSummary } from "@/lib/execution/engine";
import type { ExecutionType, ExecutionStatus, ExecutionRecord } from "@/lib/execution/types";

export const dynamic = "force-dynamic";

// ─── Helpers ────────────────────────────────────────────────────────────────

const typeConfig: Record<ExecutionType, { label: string; icon: typeof Zap; color: string }> = {
  create_banner: { label: "Criar Banner", icon: Image, color: "text-purple-600" },
  publish_distribution: { label: "Distribuir", icon: Radio, color: "text-blue-600" },
  feature_product: { label: "Destacar Produto", icon: Star, color: "text-amber-600" },
  create_campaign: { label: "Criar Campanha", icon: Megaphone, color: "text-pink-600" },
  create_import_batch: { label: "Importar Lote", icon: Upload, color: "text-teal-600" },
  create_review_task: { label: "Revisao", icon: Eye, color: "text-orange-600" },
  trigger_job: { label: "Trigger Job", icon: Zap, color: "text-indigo-600" },
  trigger_email: { label: "Email", icon: Mail, color: "text-emerald-600" },
  trigger_webhook: { label: "Webhook", icon: Globe, color: "text-gray-600" },
};

const statusConfig: Record<ExecutionStatus, { label: string; bg: string; text: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", bg: "bg-gray-100", text: "text-gray-700", icon: Clock },
  running: { label: "Executando", bg: "bg-blue-100", text: "text-blue-700", icon: Loader2 },
  success: { label: "Sucesso", bg: "bg-emerald-100", text: "text-emerald-700", icon: CheckCircle2 },
  failed: { label: "Falhou", bg: "bg-red-100", text: "text-red-700", icon: XCircle },
  skipped: { label: "Ignorado", bg: "bg-yellow-100", text: "text-yellow-700", icon: SkipForward },
};

function StatusBadge({ status }: { status: ExecutionStatus }) {
  const c = statusConfig[status];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      <Icon className="h-3 w-3" /> {c.label}
    </span>
  );
}

function OriginBadge({ origin }: { origin: string }) {
  const colors: Record<string, string> = {
    opportunity: "bg-purple-100 text-purple-700",
    manual: "bg-gray-100 text-gray-700",
    automation: "bg-blue-100 text-blue-700",
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${colors[origin] || "bg-gray-100 text-gray-700"}`}>
      {origin}
    </span>
  );
}

function PayloadPreview({ payload }: { payload: Record<string, unknown> }) {
  const entries = Object.entries(payload).slice(0, 3);
  if (entries.length === 0) return <span className="text-text-muted">-</span>;
  return (
    <span className="text-[11px] text-text-muted font-mono">
      {entries.map(([k, v]) => `${k}: ${typeof v === "string" ? v.slice(0, 30) : JSON.stringify(v)}`).join(", ")}
    </span>
  );
}

function ExecutionRow({ exec }: { exec: ExecutionRecord }) {
  const tc = typeConfig[exec.type];
  const TypeIcon = tc.icon;

  return (
    <details className="bg-white rounded-xl border border-surface-200 hover:shadow-sm transition-shadow group">
      <summary className="flex items-center gap-3 p-4 cursor-pointer list-none">
        <div className={`flex-shrink-0 w-9 h-9 rounded-lg bg-surface-50 flex items-center justify-center`}>
          <TypeIcon className={`h-4 w-4 ${tc.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-text-primary">{tc.label}</span>
            <StatusBadge status={exec.status} />
            <OriginBadge origin={exec.origin} />
            {exec.retries > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">
                <RefreshCw className="h-2.5 w-2.5" /> {exec.retries}x
              </span>
            )}
          </div>
          <PayloadPreview payload={exec.payload} />
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[11px] text-text-muted block">
            {new Date(exec.createdAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
          {exec.completedAt && (
            <span className="text-[10px] text-text-muted">
              {Math.round((new Date(exec.completedAt).getTime() - new Date(exec.createdAt).getTime()) / 1000)}s
            </span>
          )}
        </div>
      </summary>
      <div className="border-t border-surface-100 p-4 space-y-3">
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase mb-1">Payload</h4>
          <pre className="text-xs font-mono bg-surface-50 rounded-lg p-3 overflow-x-auto max-h-40">
            {JSON.stringify(exec.payload, null, 2)}
          </pre>
        </div>
        {exec.result && (
          <div>
            <h4 className="text-xs font-semibold text-emerald-600 uppercase mb-1">Resultado</h4>
            <pre className="text-xs font-mono bg-emerald-50 rounded-lg p-3 overflow-x-auto max-h-40">
              {JSON.stringify(exec.result, null, 2)}
            </pre>
          </div>
        )}
        {exec.error && (
          <div>
            <h4 className="text-xs font-semibold text-red-600 uppercase mb-1">Erro</h4>
            <pre className="text-xs font-mono bg-red-50 text-red-700 rounded-lg p-3 overflow-x-auto max-h-40">
              {exec.error}
            </pre>
          </div>
        )}
        {exec.linkedOpportunityId && (
          <div className="text-xs text-text-muted">
            Oportunidade vinculada: <code className="font-mono">{exec.linkedOpportunityId}</code>
          </div>
        )}
      </div>
    </details>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ExecutionsPage() {
  const executions = getExecutions({ limit: 100 });
  const summary = getExecutionSummary();

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/cockpit" className="text-text-muted hover:text-text-primary">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-2xl font-bold font-display text-text-primary">Execucoes</h1>
          </div>
          <p className="text-sm text-text-muted">
            Historico de acoes executadas — banners, destaques, distribuicao, jobs e mais
          </p>
        </div>
        <Link
          href="/admin/cockpit"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-blue hover:underline"
        >
          <Activity className="h-4 w-4" /> Cockpit
        </Link>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <span className="text-xs text-text-muted">Total</span>
          <span className="block text-2xl font-bold font-display text-text-primary">{summary.total}</span>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <span className="text-xs text-emerald-600">Sucesso</span>
          <span className="block text-2xl font-bold font-display text-emerald-700">{summary.byStatus.success}</span>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <span className="text-xs text-red-600">Falhas</span>
          <span className="block text-2xl font-bold font-display text-red-700">{summary.byStatus.failed}</span>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4">
          <span className="text-xs text-blue-600">Pendentes</span>
          <span className="block text-2xl font-bold font-display text-blue-700">
            {summary.byStatus.pending + summary.byStatus.running}
          </span>
        </div>
      </div>

      {/* Type breakdown */}
      {summary.total > 0 && (
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
            <Filter className="h-4 w-4 text-text-muted" /> Por Tipo
          </h3>
          <div className="flex flex-wrap gap-2">
            {(Object.entries(summary.byType) as [ExecutionType, number][])
              .filter(([, count]) => count > 0)
              .sort(([, a], [, b]) => b - a)
              .map(([type, count]) => {
                const tc = typeConfig[type];
                const Icon = tc.icon;
                return (
                  <span
                    key={type}
                    className="inline-flex items-center gap-1.5 text-xs font-medium bg-surface-50 px-3 py-1.5 rounded-full"
                  >
                    <Icon className={`h-3.5 w-3.5 ${tc.color}`} />
                    {tc.label}: {count}
                  </span>
                );
              })}
          </div>
        </div>
      )}

      {/* Execution list */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Play className="h-5 w-5 text-accent-blue" />
          <h2 className="text-lg font-bold font-display text-text-primary">Historico</h2>
          <span className="text-xs text-text-muted bg-surface-100 px-2 py-0.5 rounded-full">
            {executions.length} execucao(oes)
          </span>
        </div>

        {executions.length === 0 ? (
          <div className="bg-white rounded-xl border border-surface-200 p-8 text-center">
            <Clock className="h-10 w-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-text-muted">Nenhuma execucao registrada ainda.</p>
            <p className="text-xs text-text-muted mt-1">
              Execute acoes no Cockpit ou via API para ve-las aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {executions.map((exec) => (
              <ExecutionRow key={exec.id} exec={exec} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
