import prisma from "@/lib/db/prisma";
import {
  Users,
  Eye,
  MousePointerClick,
  TrendingUp,
  Gift,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const referrals = await prisma.referral.findMany({
    orderBy: { createdAt: "desc" },
  });

  const totalReferrals = referrals.length;
  const totalVisits = referrals.reduce((sum, r) => sum + r.visits, 0);
  const totalClickouts = referrals.reduce((sum, r) => sum + r.clickouts, 0);
  const avgConversion =
    totalVisits > 0 ? ((totalClickouts / totalVisits) * 100).toFixed(1) : "0";

  const topReferrers = [...referrals]
    .sort((a, b) => b.visits + b.clickouts - (a.visits + a.clickouts))
    .slice(0, 20);

  const recentReferrals = referrals.slice(0, 10);

  return (
    <div>
      <div className="mb-6">
        <h1 className="heading-section flex items-center gap-2">
          <Gift className="h-6 w-6 text-accent-orange" />
          Indicações
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Acompanhe o programa de indicação e os principais indicadores.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="stat-card stat-card-blue">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-accent-blue" />
            <span className="text-xs font-medium text-text-muted">
              Total Indicações
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {totalReferrals}
          </p>
        </div>
        <div className="stat-card stat-card-purple">
          <div className="flex items-center gap-2 mb-2">
            <Eye className="h-4 w-4 text-accent-purple" />
            <span className="text-xs font-medium text-text-muted">
              Total Visitas
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {totalVisits.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="stat-card stat-card-green">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-accent-green" />
            <span className="text-xs font-medium text-text-muted">
              Total Clickouts
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {totalClickouts.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="stat-card stat-card-orange">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-accent-orange" />
            <span className="text-xs font-medium text-text-muted">
              Conversão Média
            </span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {avgConversion}%
          </p>
        </div>
      </div>

      {/* Top referrers */}
      <div className="card mb-6">
        <div className="px-5 py-4 border-b border-surface-200">
          <h2 className="font-display font-semibold text-text-primary">
            Top Indicadores
          </h2>
        </div>
        {topReferrers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Users className="h-7 w-7 text-text-muted" />
            </div>
            <p className="empty-state-title">Nenhuma indicação ainda</p>
            <p className="empty-state-text">
              Quando usuarios compartilharem seus códigos, eles aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Código</th>
                  <th>Email</th>
                  <th>Visitas</th>
                  <th>Clickouts</th>
                  <th>Conversão</th>
                  <th>Criado em</th>
                </tr>
              </thead>
              <tbody>
                {topReferrers.map((ref, i) => {
                  const conv =
                    ref.visits > 0
                      ? ((ref.clickouts / ref.visits) * 100).toFixed(1)
                      : "0";
                  return (
                    <tr key={ref.id}>
                      <td className="font-mono text-xs text-text-muted">
                        {i + 1}
                      </td>
                      <td>
                        <span className="font-mono text-sm font-semibold text-accent-blue">
                          {ref.code}
                        </span>
                      </td>
                      <td className="text-text-muted">
                        {ref.email || "—"}
                      </td>
                      <td className="font-display font-semibold">
                        {ref.visits.toLocaleString("pt-BR")}
                      </td>
                      <td className="font-display font-semibold">
                        {ref.clickouts.toLocaleString("pt-BR")}
                      </td>
                      <td>
                        <span
                          className={`text-xs font-semibold ${
                            Number(conv) >= 10
                              ? "text-accent-green"
                              : Number(conv) >= 5
                              ? "text-accent-orange"
                              : "text-text-muted"
                          }`}
                        >
                          {conv}%
                        </span>
                      </td>
                      <td className="text-xs text-text-muted">
                        {new Date(ref.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent referrals */}
      <div className="card">
        <div className="px-5 py-4 border-b border-surface-200">
          <h2 className="font-display font-semibold text-text-primary">
            Indicações Recentes
          </h2>
        </div>
        {recentReferrals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Gift className="h-7 w-7 text-text-muted" />
            </div>
            <p className="empty-state-title">Nenhuma indicação recente</p>
            <p className="empty-state-text">
              Novas indicações aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {recentReferrals.map((ref) => (
              <div
                key={ref.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-surface-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent-orange/10 flex items-center justify-center">
                    <Gift className="h-4 w-4 text-accent-orange" />
                  </div>
                  <div>
                    <span className="font-mono text-sm font-semibold text-text-primary">
                      {ref.code}
                    </span>
                    {ref.email && (
                      <p className="text-xs text-text-muted">{ref.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {ref.visits}
                  </span>
                  <span className="flex items-center gap-1">
                    <MousePointerClick className="h-3 w-3" /> {ref.clickouts}
                  </span>
                  <span>
                    {new Date(ref.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
