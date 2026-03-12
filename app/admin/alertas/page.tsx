import { Bell, BellRing, BellOff } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminAlertasPage() {
  const alerts = await prisma.priceAlert.findMany({
    include: {
      listing: {
        select: {
          rawTitle: true,
          imageUrl: true,
          source: { select: { name: true } },
          offers: {
            where: { isActive: true },
            orderBy: { currentPrice: "asc" },
            take: 1,
            select: { currentPrice: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const active = alerts.filter((a) => a.isActive && !a.triggeredAt);
  const triggered = alerts.filter((a) => a.triggeredAt);
  const inactive = alerts.filter((a) => !a.isActive);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Alertas de Preço</h1>
        <p className="text-sm text-text-muted">
          {active.length} ativo{active.length !== 1 ? "s" : ""} · {triggered.length} disparado{triggered.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <Bell className="w-5 h-5 text-accent-blue mx-auto mb-1" />
          <div className="font-display font-bold text-xl text-accent-blue">{active.length}</div>
          <div className="text-xs text-text-muted">Ativos</div>
        </div>
        <div className="card p-4 text-center">
          <BellRing className="w-5 h-5 text-accent-green mx-auto mb-1" />
          <div className="font-display font-bold text-xl text-accent-green">{triggered.length}</div>
          <div className="text-xs text-text-muted">Disparados</div>
        </div>
        <div className="card p-4 text-center">
          <BellOff className="w-5 h-5 text-text-muted mx-auto mb-1" />
          <div className="font-display font-bold text-xl text-text-muted">{inactive.length}</div>
          <div className="text-xs text-text-muted">Inativos</div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Email</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Produto</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Fonte</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Preço Alvo</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Preço Atual</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Status</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Criado</th>
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const currentPrice = a.listing.offers[0]?.currentPrice;
                const isTriggered = !!a.triggeredAt;

                return (
                  <tr key={a.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="py-2 px-4 text-text-primary">{a.email}</td>
                    <td className="py-2 px-4 text-text-secondary max-w-[200px] truncate">
                      {a.listing.rawTitle}
                    </td>
                    <td className="py-2 px-4 text-text-muted text-xs">{a.listing.source?.name}</td>
                    <td className="py-2 px-4 text-right font-medium text-accent-orange">
                      R$ {a.targetPrice.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-right text-text-secondary">
                      {currentPrice ? `R$ ${currentPrice.toFixed(2)}` : "—"}
                    </td>
                    <td className="py-2 px-4">
                      {isTriggered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-accent-green bg-green-50">
                          <BellRing className="w-3 h-3" /> Disparado
                        </span>
                      ) : a.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-accent-blue bg-blue-50">
                          <Bell className="w-3 h-3" /> Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-text-muted bg-surface-100">
                          <BellOff className="w-3 h-3" /> Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-text-muted text-xs">
                      {timeAgo(new Date(a.createdAt))}
                    </td>
                  </tr>
                );
              })}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-surface-100 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-surface-300" />
                      </div>
                      <p className="text-sm font-medium text-text-muted">Nenhum alerta registrado</p>
                      <p className="text-xs text-surface-400">Alertas de preco criados pelos usuarios aparecerao aqui.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
