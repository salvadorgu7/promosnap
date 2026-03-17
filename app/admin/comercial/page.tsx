import { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import { estimateRevenue } from "@/lib/revenue/tracker";
import { getAttributionSummary } from "@/lib/attribution/engine";
import { adapterRegistry } from "@/lib/adapters/registry";
import { SOURCE_PROFILES } from "@/lib/config/source-profiles";

export const metadata: Metadata = { title: "Comercial" };
export const dynamic = "force-dynamic";

// ─── Data fetchers ─────────────────────────────────────────────────────────

async function getQuickStats() {
  const [today, week, month] = await Promise.all([
    estimateRevenue(1),
    estimateRevenue(7),
    estimateRevenue(30),
  ]);
  return { today, week, month };
}

async function getDailyClickouts(days = 14) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.$queryRaw<
    Array<{ day: string; source: string; cnt: bigint }>
  >`
    SELECT DATE("clickedAt")::text AS day, "sourceSlug" AS source, COUNT(*) AS cnt
    FROM "clickouts"
    WHERE "clickedAt" >= ${since}
    GROUP BY DATE("clickedAt"), "sourceSlug"
    ORDER BY day DESC, cnt DESC
  `;
  // Group by day
  const byDay = new Map<string, Record<string, number>>();
  for (const r of rows) {
    if (!byDay.has(r.day)) byDay.set(r.day, {});
    byDay.get(r.day)![r.source || "unknown"] = Number(r.cnt);
  }
  return Array.from(byDay.entries()).map(([day, sources]) => ({ day, sources }));
}

async function getTopClickedProducts(days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  const rows = await prisma.$queryRaw<
    Array<{ product_id: string; cnt: bigint }>
  >`
    SELECT "productId" AS product_id, COUNT(*) AS cnt
    FROM "clickouts"
    WHERE "clickedAt" >= ${since} AND "productId" IS NOT NULL
    GROUP BY "productId"
    ORDER BY cnt DESC
    LIMIT 10
  `;
  if (rows.length === 0) return [];
  const productIds = rows.map((r) => r.product_id);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, slug: true, imageUrl: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));
  return rows.map((r) => ({
    product: productMap.get(r.product_id) || { id: r.product_id, name: "Unknown", slug: "", imageUrl: null },
    clickouts: Number(r.cnt),
  }));
}

// ─── Components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4">
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default async function ComercialPage() {
  const [stats, attribution, daily, topProducts, adapterSummary] = await Promise.all([
    getQuickStats(),
    getAttributionSummary(30),
    getDailyClickouts(14),
    getTopClickedProducts(7),
    adapterRegistry.getSummary(),
  ]);

  const allSources = Object.keys(SOURCE_PROFILES);

  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard Comercial</h1>
        <p className="text-sm text-text-muted mt-1">
          Receita estimada, clickouts e attribution por fonte
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Clickouts Hoje" value={String(stats.today.clickouts)} sub={formatBRL(stats.today.estimatedRevenue) + " est."} />
        <KpiCard label="Clickouts 7d" value={String(stats.week.clickouts)} sub={formatBRL(stats.week.estimatedRevenue) + " est."} />
        <KpiCard label="Clickouts 30d" value={String(stats.month.clickouts)} sub={formatBRL(stats.month.estimatedRevenue) + " est."} />
        <KpiCard label="Receita 30d est." value={formatBRL(stats.month.estimatedRevenue)} sub={stats.month.estimatedConversions + " conversions est."} />
      </div>

      {/* Revenue by Source */}
      <section className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Receita por Fonte (30d)</h2>
        {stats.month.bySource.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados de clickout ainda.</p>
        ) : (
          <div className="space-y-3">
            {stats.month.bySource
              .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue)
              .map((s) => {
                const maxRev = Math.max(...stats.month.bySource.map((x) => x.estimatedRevenue), 1);
                const pct = (s.estimatedRevenue / maxRev) * 100;
                return (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className="w-28 text-sm font-medium text-text-secondary truncate">{s.source}</span>
                    <div className="flex-1 bg-surface-100 rounded-full h-5 overflow-hidden">
                      <div
                        className="bg-brand-500 h-full rounded-full transition-all"
                        style={{ width: pct + "%" }}
                      />
                    </div>
                    <span className="w-24 text-right text-sm font-medium">{formatBRL(s.estimatedRevenue)}</span>
                    <span className="w-16 text-right text-xs text-text-muted">{s.clickouts} clicks</span>
                  </div>
                );
              })}
          </div>
        )}
      </section>

      {/* Attribution Breakdown */}
      <div className="grid md:grid-cols-3 gap-4">
        <AttributionCard title="Por Tipo de Pagina" data={attribution.byPageType} />
        <AttributionCard title="Por Canal" data={attribution.byChannel} />
        <AttributionCard title="Por Campanha" data={attribution.byCampaign} />
      </div>

      {/* Daily Clickouts Table */}
      <section className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Clickouts Diarios (14d)</h2>
        {daily.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 pr-4 text-text-muted font-medium">Data</th>
                  {allSources.map((s) => (
                    <th key={s} className="text-right py-2 px-2 text-text-muted font-medium">{s}</th>
                  ))}
                  <th className="text-right py-2 pl-4 text-text-muted font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {daily.map((d) => {
                  const total = Object.values(d.sources).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={d.day} className="border-b border-surface-100">
                      <td className="py-2 pr-4 font-mono text-text-secondary">{d.day}</td>
                      {allSources.map((s) => (
                        <td key={s} className="text-right py-2 px-2">{d.sources[s] || 0}</td>
                      ))}
                      <td className="text-right py-2 pl-4 font-semibold">{total}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Top Clicked Products */}
      <section className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Top Produtos Clicados (7d)</h2>
        {topProducts.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados.</p>
        ) : (
          <div className="space-y-2">
            {topProducts.map((item, i) => (
              <div key={item.product.id} className="flex items-center gap-3 py-2 border-b border-surface-100 last:border-0">
                <span className="w-6 text-sm font-bold text-text-muted">{i + 1}</span>
                {item.product.imageUrl && (
                  <img src={item.product.imageUrl} alt="" className="w-10 h-10 object-contain rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{item.product.name}</p>
                  <p className="text-xs text-text-muted">{item.product.slug}</p>
                </div>
                <span className="text-sm font-semibold">{item.clickouts} clicks</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Adapter Health */}
      <section className="bg-white rounded-xl border border-surface-200 p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Status dos Adapters</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {adapterSummary.adapters.map((a) => (
            <div key={a.slug} className={"rounded-lg border p-3 " + (a.configured ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50")}>
              <p className="text-sm font-semibold">{a.name}</p>
              <p className="text-xs mt-1">
                <span className={"inline-block w-2 h-2 rounded-full mr-1 " + (a.configured ? "bg-green-500" : "bg-amber-500")} />
                {a.configured ? "Configurado" : "Nao configurado"}
              </p>
              <p className="text-xs text-text-muted mt-1">{a.message}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3">
          {adapterSummary.configured}/{adapterSummary.total} adapters configurados
        </p>
      </section>
    </div>
  );
}

function AttributionCard({ title, data }: { title: string; data: Record<string, number> }) {
  const entries = Object.entries(data).sort(([, a], [, b]) => b - a);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  return (
    <div className="bg-white rounded-xl border border-surface-200 p-4">
      <h3 className="text-sm font-semibold text-text-primary mb-3">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-xs text-text-muted">Sem dados</p>
      ) : (
        <div className="space-y-2">
          {entries.slice(0, 8).map(([key, val]) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-24 truncate">{key}</span>
              <div className="flex-1 bg-surface-100 rounded-full h-2 overflow-hidden">
                <div className="bg-indigo-400 h-full rounded-full" style={{ width: (total > 0 ? (val / total) * 100 : 0) + "%" }} />
              </div>
              <span className="text-xs font-medium w-10 text-right">{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
