import { Store, CheckCircle, AlertTriangle, PauseCircle, XCircle } from "lucide-react";
import { getAdminSources } from "@/lib/db/queries";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusConfig: Record<string, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  ACTIVE: { icon: CheckCircle, color: "text-accent-green", bg: "bg-green-50", label: "Ativo" },
  PAUSED: { icon: PauseCircle, color: "text-accent-orange", bg: "bg-orange-50", label: "Pausado" },
  ERROR: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50", label: "Erro" },
  DISABLED: { icon: XCircle, color: "text-text-muted", bg: "bg-surface-100", label: "Desativado" },
};

export default async function AdminFontesPage() {
  const sources = await getAdminSources();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Fontes</h1>
        <p className="text-sm text-text-muted">{sources.length} fontes configuradas</p>
      </div>

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
  );
}
