import { Store, CheckCircle, AlertTriangle, PauseCircle, XCircle, Settings, Plug, PlugZap } from "lucide-react";
import { getAdminSources } from "@/lib/db/queries";
import { timeAgo } from "@/lib/utils";
import { adapterRegistry } from "@/lib/adapters/registry";
import type { AdapterStatus } from "@/lib/adapters/types";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  ACTIVE: { icon: CheckCircle, color: "text-accent-green", bg: "bg-green-50", label: "Ativo" },
  PAUSED: { icon: PauseCircle, color: "text-accent-orange", bg: "bg-orange-50", label: "Pausado" },
  ERROR: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", label: "Erro" },
  DISABLED: { icon: XCircle, color: "text-text-muted", bg: "bg-surface-100", label: "Desativado" },
};

const healthConfig: Record<string, { color: string; bg: string; label: string }> = {
  READY: { color: "text-accent-green", bg: "bg-green-50", label: "Pronto" },
  PARTIAL: { color: "text-accent-orange", bg: "bg-orange-50", label: "Parcial" },
  MOCK: { color: "text-blue-500", bg: "bg-blue-50", label: "Mock" },
  BLOCKED: { color: "text-red-500", bg: "bg-red-50", label: "Bloqueado" },
};

function AdapterStatusCard({ adapter }: { adapter: AdapterStatus }) {
  const hc = healthConfig[adapter.health] || healthConfig.MOCK;

  return (
    <div className="card p-4 border-l-4" style={{ borderLeftColor: adapter.configured ? '#22c55e' : '#f59e0b' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {adapter.configured ? (
            <PlugZap className="h-4 w-4 text-accent-green" />
          ) : (
            <Plug className="h-4 w-4 text-accent-orange" />
          )}
          <span className="font-semibold font-display text-sm text-text-primary">{adapter.name}</span>
          <span className="text-xs text-text-muted">({adapter.slug})</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${hc.color} ${hc.bg}`}>
          {hc.label}
        </span>
      </div>
      <p className="text-xs text-text-secondary mb-2">{adapter.message}</p>
      {adapter.missingEnvVars.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {adapter.missingEnvVars.map((v) => (
            <code key={v} className="text-[10px] bg-orange-50 text-accent-orange px-1.5 py-0.5 rounded font-mono">
              {v}
            </code>
          ))}
        </div>
      )}
    </div>
  );
}

export default async function AdminFontesPage() {
  const sources = await getAdminSources();
  const adapterSummary = adapterRegistry.getSummary();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Fontes</h1>
        <p className="text-sm text-text-muted">{sources.length} fontes configuradas</p>
      </div>

      {/* ---- Adapter Configuration Status ---- */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-text-muted" />
          <h2 className="text-lg font-bold font-display text-text-primary">Integracao de APIs</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="text-center p-3 bg-surface-50 rounded-lg">
            <p className="text-2xl font-bold font-display text-text-primary">{adapterSummary.total}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wider">Total</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold font-display text-accent-green">{adapterSummary.configured}</p>
            <p className="text-[10px] text-accent-green uppercase tracking-wider">Configurados</p>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <p className="text-2xl font-bold font-display text-accent-orange">{adapterSummary.unconfigured}</p>
            <p className="text-[10px] text-accent-orange uppercase tracking-wider">Pendentes</p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold font-display text-blue-500">
              {adapterSummary.adapters.filter((a) => a.health === 'MOCK').length}
            </p>
            <p className="text-[10px] text-blue-500 uppercase tracking-wider">Mock</p>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {adapterSummary.adapters.map((adapter) => (
            <AdapterStatusCard key={adapter.slug} adapter={adapter} />
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
              <div key={s.id} className="card p-5">
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
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${sc.color} ${sc.bg}`}>
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
                    <span>Sem dados ainda</span>
                  )}
                </div>

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
            <div className="col-span-2 card p-8 text-center text-text-muted">
              Nenhuma fonte cadastrada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
