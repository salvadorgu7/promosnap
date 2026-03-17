import {
  DollarSign,
  MousePointerClick,
  TrendingUp,
  Store,
  Layers,
  Package,
} from "lucide-react";
import { formatPrice, formatNumber } from "@/lib/utils";
import prisma from "@/lib/db/prisma";
import { getCommissionRate, estimateRevenue } from "@/lib/commerce/commission-rates";

export const dynamic = "force-dynamic";

export default async function MonetizacaoPage() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000);

  // Clickouts count
  const clickoutsToday = await prisma.clickout
    .count({ where: { clickedAt: { gte: today } } })
    .catch(() => 0);

  // Revenue by source per period
  type SourceRow = { sourceSlug: string | null; clickouts: bigint; avgPrice: number | null };

  const [bySourceTodayRaw, bySource7dRaw, bySource30dRaw] = await Promise.all([
    prisma.$queryRaw<SourceRow[]>`
      SELECT c."sourceSlug", COUNT(c.id) as clickouts, AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${today}
      GROUP BY c."sourceSlug"
    `.catch(() => [] as SourceRow[]),
    prisma.$queryRaw<SourceRow[]>`
      SELECT c."sourceSlug", COUNT(c.id) as clickouts, AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${sevenDaysAgo}
      GROUP BY c."sourceSlug"
    `.catch(() => [] as SourceRow[]),
    prisma.$queryRaw<SourceRow[]>`
      SELECT c."sourceSlug", COUNT(c.id) as clickouts, AVG(o."currentPrice") as "avgPrice"
      FROM clickouts c JOIN offers o ON c."offerId" = o.id
      WHERE c."clickedAt" >= ${thirtyDaysAgo}
      GROUP BY c."sourceSlug"
      ORDER BY clickouts DESC
    `.catch(() => [] as SourceRow[]),
  ]);

  const revenueToday = estimateRevenue(bySourceTodayRaw);
  const revenue7d = estimateRevenue(bySource7dRaw);
  const revenue30d = estimateRevenue(bySource30dRaw);

  // By source table (30d)
  const bySource = bySource30dRaw.map((r) => ({
    source: r.sourceSlug ?? "unknown",
    clickouts: Number(r.clickouts),
    avgPrice: r.avgPrice ?? 0,
    rate: getCommissionRate(r.sourceSlug),
    estimatedRevenue: Number(r.clickouts) * (r.avgPrice ?? 0) * getCommissionRate(r.sourceSlug),
  }));

  // By category (30d)
  type CatRow = { category: string | null; sourceSlug: string | null; clickouts: bigint; avgPrice: number | null };
  const byCatRaw = await prisma.$queryRaw<CatRow[]>`
    SELECT c."categorySlug" as category, c."sourceSlug", COUNT(c.id) as clickouts, AVG(o."currentPrice") as "avgPrice"
    FROM clickouts c JOIN offers o ON c."offerId" = o.id
    WHERE c."clickedAt" >= ${thirtyDaysAgo}
    GROUP BY c."categorySlug", c."sourceSlug"
    ORDER BY clickouts DESC
  `.catch(() => [] as CatRow[]);

  const catMap = new Map<string, { clickouts: number; estimatedRevenue: number }>();
  for (const r of byCatRaw) {
    const cat = r.category ?? "sem-categoria";
    const existing = catMap.get(cat) ?? { clickouts: 0, estimatedRevenue: 0 };
    const clicks = Number(r.clickouts);
    existing.clickouts += clicks;
    existing.estimatedRevenue += clicks * (r.avgPrice ?? 0) * getCommissionRate(r.sourceSlug);
    catMap.set(cat, existing);
  }
  const byCategory = Array.from(catMap.entries())
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.estimatedRevenue - a.estimatedRevenue);

  // Top 10 products (30d)
  type ProdRow = { name: string; slug: string; clickouts: bigint; avgPrice: number | null; sourceSlug: string | null };
  const topProductsRaw = await prisma.$queryRaw<ProdRow[]>`
    SELECT p.name, p.slug, COUNT(c.id) as clickouts, AVG(o."currentPrice") as "avgPrice", MAX(c."sourceSlug") as "sourceSlug"
    FROM clickouts c
    JOIN offers o ON c."offerId" = o.id
    JOIN listings l ON o."listingId" = l.id
    LEFT JOIN products p ON l."productId" = p.id
    WHERE c."clickedAt" >= ${thirtyDaysAgo}
    GROUP BY p.name, p.slug
    ORDER BY clickouts DESC
    LIMIT 10
  `.catch(() => [] as ProdRow[]);

  const topProducts = topProductsRaw.map((r) => ({
    name: r.name ?? "Produto sem nome",
    slug: r.slug ?? "",
    clickouts: Number(r.clickouts),
    estimatedRevenue: Number(r.clickouts) * (r.avgPrice ?? 0) * getCommissionRate(r.sourceSlug),
  }));

  const statCards = [
    { label: "Revenue Hoje", value: formatPrice(revenueToday), icon: DollarSign, color: "text-accent-green" },
    { label: "Revenue 7d", value: formatPrice(revenue7d), icon: TrendingUp, color: "text-accent-blue" },
    { label: "Revenue 30d", value: formatPrice(revenue30d), icon: TrendingUp, color: "text-brand-500" },
    { label: "Clickouts Hoje", value: formatNumber(clickoutsToday), icon: MousePointerClick, color: "text-accent-orange" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Monetizacao</h1>
        <p className="text-sm text-text-muted">
          Receita estimada por afiliados (Amazon 4%, ML 3%, Shopee 2.5%, Shein 3%)
        </p>
      </div>

      {/* Revenue cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-text-muted uppercase tracking-wider">{s.label}</span>
            </div>
            <p className="text-2xl font-bold font-display text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Revenue by source */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store className="h-5 w-5 text-accent-blue" />
            <h2 className="text-lg font-semibold font-display text-text-primary">
              Revenue por Fonte (30d)
            </h2>
          </div>
          {bySource.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de clickouts.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Fonte</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Clickouts</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Taxa</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Receita Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {bySource.map((r) => (
                    <tr key={r.source} className="border-b border-surface-100">
                      <td className="py-2 text-text-primary font-medium">{r.source}</td>
                      <td className="py-2 text-right text-text-secondary">{formatNumber(r.clickouts)}</td>
                      <td className="py-2 text-right text-text-muted">{(r.rate * 100).toFixed(1)}%</td>
                      <td className="py-2 text-right font-medium text-accent-green">{formatPrice(r.estimatedRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-surface-200">
                    <td className="py-2 font-bold text-text-primary">Total</td>
                    <td className="py-2 text-right font-bold text-text-primary">
                      {formatNumber(bySource.reduce((s, r) => s + r.clickouts, 0))}
                    </td>
                    <td className="py-2"></td>
                    <td className="py-2 text-right font-bold text-accent-green">
                      {formatPrice(bySource.reduce((s, r) => s + r.estimatedRevenue, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Revenue by category */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="h-5 w-5 text-accent-purple" />
            <h2 className="text-lg font-semibold font-display text-text-primary">
              Revenue por Categoria (30d)
            </h2>
          </div>
          {byCategory.length === 0 ? (
            <p className="text-sm text-text-muted">Sem dados de categorias.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Categoria</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Clickouts</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Receita Est.</th>
                  </tr>
                </thead>
                <tbody>
                  {byCategory.map((r) => (
                    <tr key={r.category} className="border-b border-surface-100">
                      <td className="py-2 text-text-primary font-medium">{r.category}</td>
                      <td className="py-2 text-right text-text-secondary">{formatNumber(r.clickouts)}</td>
                      <td className="py-2 text-right font-medium text-accent-green">{formatPrice(r.estimatedRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Top 10 products */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Package className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-semibold font-display text-text-primary">
            Top 10 Produtos por Revenue (30d)
          </h2>
        </div>
        {topProducts.length === 0 ? (
          <p className="text-sm text-text-muted">Sem dados de produtos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left py-2 text-xs text-text-muted font-medium">#</th>
                  <th className="text-left py-2 text-xs text-text-muted font-medium">Produto</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Clickouts</th>
                  <th className="text-right py-2 text-xs text-text-muted font-medium">Receita Est.</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p, i) => (
                  <tr key={p.slug || i} className="border-b border-surface-100">
                    <td className="py-2 text-text-muted">{i + 1}</td>
                    <td className="py-2 text-text-primary font-medium max-w-[300px] truncate">{p.name}</td>
                    <td className="py-2 text-right text-text-secondary">{formatNumber(p.clickouts)}</td>
                    <td className="py-2 text-right font-medium text-accent-green">{formatPrice(p.estimatedRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
