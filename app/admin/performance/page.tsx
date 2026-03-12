import { Store, MousePointerClick, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPerformancePage() {
  // Per-source stats: products, clickouts, CTR
  let sourceStats: any[] = [];
  try {
    sourceStats = await prisma.$queryRaw`
      SELECT
        s.id,
        s.name,
        s.slug,
        s."logoUrl",
        s.status,
        COUNT(DISTINCT l.id)::int AS products,
        COUNT(DISTINCT c.id)::int AS clickouts,
        COUNT(DISTINCT CASE WHEN c."clickedAt" > NOW() - INTERVAL '7 days' THEN c.id END)::int AS clickouts_7d,
        COUNT(DISTINCT CASE WHEN c."clickedAt" > NOW() - INTERVAL '14 days' AND c."clickedAt" <= NOW() - INTERVAL '7 days' THEN c.id END)::int AS clickouts_prev_7d
      FROM sources s
      LEFT JOIN listings l ON l."sourceId" = s.id
      LEFT JOIN offers o ON o."listingId" = l.id
      LEFT JOIN clickouts c ON c."offerId" = o.id
      GROUP BY s.id, s.name, s.slug, s."logoUrl", s.status
      ORDER BY clickouts DESC
    `;
  } catch {}

  // Total aggregates
  const totalProducts = sourceStats.reduce((sum, s) => sum + s.products, 0);
  const totalClickouts = sourceStats.reduce((sum, s) => sum + s.clickouts, 0);
  const totalCTR = totalProducts > 0 ? ((totalClickouts / totalProducts) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Desempenho</h1>
        <p className="text-sm text-text-muted">Performance por fonte e metricas de conversao</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <Store className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Total Produtos</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{totalProducts.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-accent-orange" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Total Clickouts</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{totalClickouts.toLocaleString("pt-BR")}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted uppercase tracking-wider">CTR Medio</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{totalCTR}%</p>
        </div>
      </div>

      {/* Source cards grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sourceStats.map((s) => {
          const ctr = s.products > 0 ? ((s.clickouts / s.products) * 100).toFixed(1) : "0.0";
          const trend = s.clickouts_7d - s.clickouts_prev_7d;
          const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
          const trendColor = trend > 0 ? "text-accent-green" : trend < 0 ? "text-red-500" : "text-text-muted";
          const trendLabel = trend > 0 ? `+${trend}` : trend.toString();

          return (
            <div key={s.id} className="card p-5">
              <div className="flex items-center gap-3 mb-4">
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

              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <p className="text-lg font-bold font-display text-text-primary">{s.products.toLocaleString("pt-BR")}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">Produtos</p>
                </div>
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <p className="text-lg font-bold font-display text-text-primary">{s.clickouts.toLocaleString("pt-BR")}</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">Clickouts</p>
                </div>
                <div className="text-center p-2 bg-surface-50 rounded-lg">
                  <p className="text-lg font-bold font-display text-text-primary">{ctr}%</p>
                  <p className="text-[10px] text-text-muted uppercase tracking-wider">CTR</p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-xs">
                <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                <span className={trendColor}>{trendLabel} clickouts vs semana anterior</span>
              </div>
            </div>
          );
        })}

        {sourceStats.length === 0 && (
          <div className="col-span-full card p-8 text-center text-text-muted">
            Nenhuma fonte encontrada.
          </div>
        )}
      </div>

      {/* Comparison table */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Comparativo de Fontes</h2>
        {sourceStats.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados para comparacao.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Fonte</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Produtos</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Clickouts Total</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Clickouts 7d</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">CTR</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {sourceStats.map((s) => {
                  const ctr = s.products > 0 ? ((s.clickouts / s.products) * 100).toFixed(1) : "0.0";
                  const trend = s.clickouts_7d - s.clickouts_prev_7d;
                  const trendColor = trend > 0 ? "text-accent-green" : trend < 0 ? "text-red-500" : "text-text-muted";
                  const trendLabel = trend > 0 ? `+${trend}` : trend.toString();

                  return (
                    <tr key={s.id} className="border-b border-surface-100">
                      <td className="py-2 font-medium text-text-primary">{s.name}</td>
                      <td className="py-2 text-right text-text-secondary">{s.products.toLocaleString("pt-BR")}</td>
                      <td className="py-2 text-right text-text-secondary">{s.clickouts.toLocaleString("pt-BR")}</td>
                      <td className="py-2 text-right text-text-secondary">{s.clickouts_7d.toLocaleString("pt-BR")}</td>
                      <td className="py-2 text-right text-text-secondary">{ctr}%</td>
                      <td className={`py-2 text-right font-medium ${trendColor}`}>{trendLabel}</td>
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
