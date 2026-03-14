import { TrendingUp, MousePointerClick, Layers, Bell, Mail, Users, BarChart3 } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function GrowthDashboardPage() {
  // Clickouts by rail source (7d)
  let byRailSource: { railSource: string; count: bigint }[] = [];
  try {
    byRailSource = await prisma.$queryRaw(Prisma.sql`
      SELECT "railSource", COUNT(*) as count
      FROM clickouts
      WHERE "clickedAt" > NOW() - INTERVAL '7 days' AND "railSource" IS NOT NULL
      GROUP BY "railSource"
      ORDER BY count DESC
    `);
  } catch {
    byRailSource = [];
  }

  // Clickouts by category (7d)
  let byCategory: { categorySlug: string; count: bigint }[] = [];
  try {
    byCategory = await prisma.$queryRaw(Prisma.sql`
      SELECT "categorySlug", COUNT(*) as count
      FROM clickouts
      WHERE "clickedAt" > NOW() - INTERVAL '7 days' AND "categorySlug" IS NOT NULL
      GROUP BY "categorySlug"
      ORDER BY count DESC LIMIT 10
    `);
  } catch {
    byCategory = [];
  }

  // Retention signals
  let retentionData: {
    alerts_week: bigint;
    subs_week: bigint;
    unique_sessions: bigint;
    total_clickouts: bigint;
  }[] = [];
  try {
    retentionData = await prisma.$queryRaw(Prisma.sql`
      SELECT
        (SELECT COUNT(*) FROM price_alerts WHERE "createdAt" > NOW() - INTERVAL '7 days') as alerts_week,
        (SELECT COUNT(*) FROM subscribers WHERE "createdAt" > NOW() - INTERVAL '7 days') as subs_week,
        (SELECT COUNT(DISTINCT "sessionId") FROM clickouts WHERE "clickedAt" > NOW() - INTERVAL '7 days') as unique_sessions,
        (SELECT COUNT(*) FROM clickouts WHERE "clickedAt" > NOW() - INTERVAL '7 days') as total_clickouts
    `);
  } catch {
    retentionData = [];
  }

  // Returning visitors (sessions with >1 clickout)
  let returningData: { returning_visitors: bigint }[] = [];
  try {
    returningData = await prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*) as returning_visitors FROM (
        SELECT "sessionId", COUNT(*) as cnt
        FROM clickouts
        WHERE "clickedAt" > NOW() - INTERVAL '7 days' AND "sessionId" IS NOT NULL
        GROUP BY "sessionId" HAVING COUNT(*) > 1
      ) sub
    `);
  } catch {
    returningData = [];
  }

  const alertsWeek = Number(retentionData[0]?.alerts_week ?? 0);
  const subsWeek = Number(retentionData[0]?.subs_week ?? 0);
  const uniqueSessions = Number(retentionData[0]?.unique_sessions ?? 0);
  const totalClickouts = Number(retentionData[0]?.total_clickouts ?? 0);
  const returningVisitors = Number(returningData[0]?.returning_visitors ?? 0);
  const returningPct = uniqueSessions > 0 ? ((returningVisitors / uniqueSessions) * 100).toFixed(1) : "0.0";

  const maxRailCount = byRailSource.length > 0 ? Number(byRailSource[0].count) : 1;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-accent-green" />
          Growth Dashboard
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Metricas de aquisicao, retencao e conversao dos ultimos 7 dias
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <MousePointerClick className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Clickouts (7d)</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(totalClickouts)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Sessoes Unicas</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(uniqueSessions)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-accent-blue" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Retornantes</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(returningVisitors)}</p>
          <p className="text-xs text-text-muted mt-1">{returningPct}% das sessoes</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Bell className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Alertas (7d)</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(alertsWeek)}</p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4 text-accent-green" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Subscribers (7d)</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{formatNumber(subsWeek)}</p>
        </div>
      </div>

      {/* Surfaces que Mais Convertem */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Layers className="h-5 w-5 text-accent-blue" />
          Surfaces que Mais Convertem
        </h2>
        <p className="text-xs text-text-muted mb-4">Clickouts por rail source nos ultimos 7 dias</p>
        {byRailSource.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Nenhum clickout registrado nos ultimos 7 dias.</p>
        ) : (
          <div className="space-y-2">
            {byRailSource.map((r) => {
              const count = Number(r.count);
              const pct = ((count / maxRailCount) * 100).toFixed(0);
              const totalPct = totalClickouts > 0 ? ((count / totalClickouts) * 100).toFixed(1) : "0.0";
              return (
                <div key={r.railSource} className="flex items-center gap-3 px-3 py-2">
                  <span className="text-sm font-medium text-text-primary w-40 truncate">{r.railSource}</span>
                  <div className="flex-1 h-3 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-blue rounded-full transition-all"
                      style={{ width: `${Math.max(Number(pct), 2)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-text-primary w-16 text-right">
                    {formatNumber(count)}
                  </span>
                  <span className="text-xs text-text-muted w-12 text-right">{totalPct}%</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorias que Mais Convertem */}
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-brand-500" />
            Categorias que Mais Convertem
          </h2>
          {byCategory.length === 0 ? (
            <p className="text-sm text-text-muted py-4 text-center">Sem dados de categoria.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left text-text-muted font-medium py-2 pr-4">#</th>
                    <th className="text-left text-text-muted font-medium py-2 pr-4">Categoria</th>
                    <th className="text-right text-text-muted font-medium py-2 px-4">Clickouts</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((c, i) => (
                    <tr key={c.categorySlug} className="border-b border-surface-100 hover:bg-surface-50">
                      <td className="py-2 pr-4 text-text-muted text-xs font-bold">{i + 1}.</td>
                      <td className="py-2 pr-4 font-medium text-text-primary">{c.categorySlug}</td>
                      <td className="py-2 px-4 text-right font-semibold">{formatNumber(Number(c.count))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Sinais de Retencao */}
        <section className="bg-white rounded-xl border border-surface-200 p-5">
          <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent-green" />
            Sinais de Retencao
          </h2>
          <p className="text-xs text-text-muted mb-4">Indicadores de engajamento e retencao dos ultimos 7 dias</p>
          <div className="space-y-4">
            <div className="flex items-center justify-between px-4 py-3 bg-surface-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-text-primary">Alertas de preco criados</span>
              </div>
              <span className="text-lg font-bold font-display text-text-primary">{formatNumber(alertsWeek)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-surface-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-accent-green" />
                <span className="text-sm text-text-primary">Novos subscribers</span>
              </div>
              <span className="text-lg font-bold font-display text-text-primary">{formatNumber(subsWeek)}</span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-surface-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-accent-blue" />
                <span className="text-sm text-text-primary">Visitantes retornantes</span>
              </div>
              <span className="text-lg font-bold font-display text-text-primary">
                {formatNumber(returningVisitors)}{" "}
                <span className="text-sm font-normal text-text-muted">({returningPct}%)</span>
              </span>
            </div>
            <div className="flex items-center justify-between px-4 py-3 bg-surface-50 rounded-lg">
              <div className="flex items-center gap-2">
                <MousePointerClick className="h-4 w-4 text-text-muted" />
                <span className="text-sm text-text-primary">Clickouts / sessao</span>
              </div>
              <span className="text-lg font-bold font-display text-text-primary">
                {uniqueSessions > 0 ? (totalClickouts / uniqueSessions).toFixed(1) : "0.0"}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
