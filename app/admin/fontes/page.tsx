import {
  Store,
  CheckCircle2,
  AlertTriangle,
  PauseCircle,
  XCircle,
  Settings,
  Plug,
  PlugZap,
  Info,
  ChevronDown,
  ChevronRight,
  Shield,
  Zap,
} from "lucide-react";
import { getAdminSources } from "@/lib/db/queries";
import { timeAgo } from "@/lib/utils";
import { adapterRegistry } from "@/lib/adapters/registry";
import type { AdapterStatus } from "@/lib/adapters/types";
import { getSourceReadiness, type SourceReadiness, type ReadinessStatus, type ChecklistItem } from "@/lib/adapters/readiness";
import {
  toSeverity,
  severityBadge,
  severityIconBg,
  severityBg,
  type Severity,
} from "@/lib/admin/severity";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { icon: typeof CheckCircle2; severity: Severity; label: string }> = {
  ACTIVE: { icon: CheckCircle2, severity: "ok", label: "Ativo" },
  PAUSED: { icon: PauseCircle, severity: "warning", label: "Pausado" },
  ERROR: { icon: AlertTriangle, severity: "critical", label: "Erro" },
  DISABLED: { icon: XCircle, severity: "warning", label: "Desativado" },
};

const healthConfig: Record<string, { severity: Severity; label: string; guidance: string }> = {
  READY: { severity: "ok", label: "Pronto", guidance: "Adapter configurado e pronto para operar." },
  PARTIAL: { severity: "warning", label: "Parcial", guidance: "Funcionando com limitacoes. Configure as variaveis faltantes para funcionalidade completa." },
  MOCK: { severity: "info", label: "Mock", guidance: "Usando dados simulados. Configure as credenciais reais para dados de producao." },
  BLOCKED: { severity: "critical", label: "Bloqueado", guidance: "Adapter nao funcional. Credenciais ou configuracao critica ausente." },
};

const readinessConfig: Record<ReadinessStatus, { severity: Severity; label: string; color: string }> = {
  ready: { severity: "ok", label: "Pronto", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  partial: { severity: "warning", label: "Parcial", color: "bg-amber-100 text-amber-700 border-amber-300" },
  mock: { severity: "info", label: "Mock", color: "bg-blue-100 text-blue-700 border-blue-300" },
  blocked: { severity: "critical", label: "Bloqueado", color: "bg-red-100 text-red-700 border-red-300" },
  not_configured: { severity: "warning", label: "Nao Configurado", color: "bg-gray-100 text-gray-600 border-gray-300" },
};

const checklistStatusIcon: Record<string, string> = {
  ok: "text-emerald-500",
  missing: "text-red-500",
  partial: "text-amber-500",
};

const capabilityLabels: Record<string, string> = {
  search: "Busca",
  lookup: "Lookup",
  feed_sync: "Feed Sync",
  clickout_ready: "Clickout",
  price_refresh: "Preco",
  import_ready: "Import",
};

function ReadinessCard({ readiness }: { readiness: SourceReadiness }) {
  const rc = readinessConfig[readiness.status];

  return (
    <div className="rounded-xl border border-surface-200 bg-white p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-text-muted" />
          <span className="font-semibold font-display text-sm text-text-primary">{readiness.name}</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${rc.color}`}>
          {rc.label}
        </span>
      </div>

      {/* Capability pills */}
      {readiness.capabilities.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {readiness.capabilities.map((cap) => (
            <span
              key={cap}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-50 text-text-secondary border border-surface-200"
            >
              <Zap className="h-2.5 w-2.5" />
              {capabilityLabels[cap] || cap}
            </span>
          ))}
        </div>
      )}

      {/* Checklist */}
      <div className="space-y-1.5">
        {readiness.checklist.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2">
            <span className={`mt-0.5 ${checklistStatusIcon[item.status] || "text-gray-400"}`}>
              {item.status === "ok" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : item.status === "partial" ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium text-text-primary leading-tight">{item.label}</p>
              <p className="text-[10px] text-text-muted leading-relaxed">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdapterStatusCard({ adapter }: { adapter: AdapterStatus }) {
  const hc = healthConfig[adapter.health] || healthConfig.MOCK;
  const borderColor = adapter.configured ? "border-l-emerald-500" : "border-l-amber-500";

  return (
    <div className={`rounded-xl border border-surface-200 bg-white p-4 border-l-4 ${borderColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {adapter.configured ? (
            <PlugZap className="h-4 w-4 text-emerald-600" />
          ) : (
            <Plug className="h-4 w-4 text-amber-600" />
          )}
          <span className="font-semibold font-display text-sm text-text-primary">{adapter.name}</span>
          <span className="text-xs text-text-muted">({adapter.slug})</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${severityBadge(hc.severity)}`}>
          {hc.label}
        </span>
      </div>
      <p className="text-xs text-text-secondary mb-2">{adapter.message}</p>
      {adapter.missingEnvVars.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider">Variaveis ausentes:</p>
          <div className="flex flex-wrap gap-1">
            {adapter.missingEnvVars.map((v) => (
              <code key={v} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-mono">
                {v}
              </code>
            ))}
          </div>
        </div>
      )}
      {!adapter.configured && (
        <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-surface-100">
          <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-text-muted" />
          <p className="text-[10px] text-text-muted leading-relaxed">{hc.guidance}</p>
        </div>
      )}
    </div>
  );
}

export default async function AdminFontesPage() {
  const sources = await getAdminSources();
  const adapterSummary = adapterRegistry.getSummary();
  const sourceReadiness = getSourceReadiness();

  const allConfigured = adapterSummary.unconfigured === 0;
  const hasMocks = adapterSummary.adapters.some((a) => a.health === "MOCK");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Fontes</h1>
        <p className="text-sm text-text-muted mt-1">
          {sources.length} fontes no banco de dados — {adapterSummary.configured}/{adapterSummary.total} adapters configurados
        </p>
      </div>

      {/* Operational guidance */}
      {adapterSummary.unconfigured > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {adapterSummary.unconfigured} adapter(s) sem configuracao
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Adapters nao configurados usam dados mock ou estao bloqueados.
              Adicione as variaveis de ambiente necessarias (listadas abaixo) para ativar dados reais.
            </p>
          </div>
        </div>
      )}

      {sources.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Nenhuma fonte cadastrada no banco</p>
            <p className="text-xs text-blue-700 mt-0.5">
              Execute a ingestao inicial em /admin/ingestao para criar as fontes automaticamente,
              ou use /admin/jobs para rodar o pipeline completo.
            </p>
          </div>
        </div>
      )}

      {/* ---- Adapter Configuration Status ---- */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-text-muted" />
          <h2 className="text-lg font-bold font-display text-text-primary">Integracao de APIs</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 bg-surface-50 rounded-lg">
            <p className="text-2xl font-bold font-display text-text-primary">{adapterSummary.total}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Total</p>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
            <p className="text-2xl font-bold font-display text-emerald-600">{adapterSummary.configured}</p>
            <p className="text-[10px] text-emerald-600 uppercase tracking-wider">Configurados</p>
          </div>
          <div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-2xl font-bold font-display text-amber-600">{adapterSummary.unconfigured}</p>
            <p className="text-[10px] text-amber-600 uppercase tracking-wider">Pendentes</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-2xl font-bold font-display text-blue-600">
              {adapterSummary.adapters.filter((a) => a.health === "MOCK").length}
            </p>
            <p className="text-[10px] text-blue-600 uppercase tracking-wider">Mock</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {adapterSummary.adapters.map((adapter) => (
            <AdapterStatusCard key={adapter.slug} adapter={adapter} />
          ))}
        </div>
      </div>

      {/* ---- Source Readiness ---- */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-text-muted" />
          <h2 className="text-lg font-bold font-display text-text-primary">Readiness por Fonte</h2>
        </div>
        <p className="text-xs text-text-muted mb-4">
          Status de prontidao, checklist de requisitos e capabilities disponiveis por adapter.
        </p>
        <div className="grid md:grid-cols-2 gap-3">
          {sourceReadiness.map((r) => (
            <ReadinessCard key={r.sourceId} readiness={r} />
          ))}
        </div>
      </div>

      {/* ---- Existing DB Sources ---- */}
      <div>
        <h2 className="text-lg font-bold font-display text-text-primary mb-3">Fontes no Banco de Dados</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {sources.map((s: any) => {
            const sc = statusConfig[s.status] || statusConfig.DISABLED;
            const StatusIcon = sc.icon;

            return (
              <div key={s.id} className="rounded-xl border border-surface-200 bg-white p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {s.logoUrl ? (
                      <img src={s.logoUrl} alt="" className="w-10 h-10 rounded-lg object-contain bg-surface-50 p-1" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center">
                        <Store className="h-5 w-5 text-text-muted" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold font-display text-text-primary">{s.name}</h3>
                      <span className="text-xs text-text-muted">{s.slug}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${severityBadge(sc.severity)}`}>
                    <StatusIcon className="h-3 w-3" />
                    {sc.label}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="text-center p-2 bg-surface-50 rounded-lg">
                    <p className="text-lg font-bold font-display text-text-primary">{s.listingCount}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Listings</p>
                  </div>
                  <div className="text-center p-2 bg-surface-50 rounded-lg">
                    <p className="text-lg font-bold font-display text-text-primary">{s.offerCount}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Ofertas</p>
                  </div>
                  <div className="text-center p-2 bg-surface-50 rounded-lg">
                    <p className="text-lg font-bold font-display text-text-primary">{s.couponCount}</p>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider">Cupons</p>
                  </div>
                </div>

                <div className="text-xs text-text-muted">
                  {s.lastUpdate ? (
                    <span>Ultima atualizacao: {timeAgo(new Date(s.lastUpdate))}</span>
                  ) : (
                    <span className="text-amber-600">
                      Sem dados ainda. Execute ingestao ou aguarde o proximo cron.
                    </span>
                  )}
                </div>

                {s.status === "ERROR" && (
                  <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-surface-100">
                    <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-red-500" />
                    <p className="text-[10px] text-red-600 leading-relaxed">
                      Fonte com erro. Verifique logs em /admin/monitoring e credenciais do adapter.
                    </p>
                  </div>
                )}

                {s.status === "PAUSED" && (
                  <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-surface-100">
                    <Info className="h-3 w-3 flex-shrink-0 mt-0.5 text-amber-500" />
                    <p className="text-[10px] text-amber-600 leading-relaxed">
                      Fonte pausada. Dados nao estao sendo atualizados. Reative se necessario.
                    </p>
                  </div>
                )}

                {s.affiliateConfig && (
                  <div className="mt-3 pt-3 border-t border-surface-100">
                    <p className="text-xs text-text-muted mb-1 font-medium">Config Afiliado:</p>
                    <div className="text-xs text-text-secondary bg-surface-50 rounded p-2 font-mono break-all">
                      {Object.entries(s.affiliateConfig as Record<string, unknown>)
                        .filter(([key]) => !key.toLowerCase().includes("secret") && !key.toLowerCase().includes("token") && !key.toLowerCase().includes("password") && !key.toLowerCase().includes("key"))
                        .map(([key, val]) => (
                          <div key={key}>
                            <span className="text-text-muted">{key}:</span> {String(val)}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {sources.length === 0 && (
            <div className="col-span-2 rounded-xl border border-surface-200 bg-white p-8 text-center">
              <Store className="h-8 w-8 mx-auto mb-2 text-text-muted opacity-30" />
              <p className="text-sm text-text-muted">
                Nenhuma fonte cadastrada. Execute a ingestao para criar fontes automaticamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
