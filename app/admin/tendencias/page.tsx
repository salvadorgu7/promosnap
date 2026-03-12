import { TrendingUp, Search, MousePointerClick, Lightbulb, BarChart3 } from "lucide-react";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AdminTendenciasPage() {
  // Latest trending keywords
  const latestTrends = await prisma.trendingKeyword.findMany({
    orderBy: [{ fetchedAt: "desc" }, { position: "asc" }],
    take: 20,
  });

  // Top search terms (7 days)
  let topSearches: any[] = [];
  try {
    topSearches = await prisma.$queryRaw`
      SELECT "normalizedQuery" as term, COUNT(*)::int as count
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
      AND "normalizedQuery" IS NOT NULL AND "normalizedQuery" != ''
      GROUP BY "normalizedQuery"
      ORDER BY count DESC
      LIMIT 15
    `;
  } catch {}

  // Top clickouts (7 days)
  let topClickouts: any[] = [];
  try {
    topClickouts = await prisma.$queryRaw`
      SELECT l."rawTitle", s.name as "sourceName", COUNT(c.id)::int as clicks
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      JOIN listings l ON o."listingId" = l.id
      JOIN sources s ON l."sourceId" = s.id
      WHERE c."clickedAt" > NOW() - INTERVAL '7 days'
      GROUP BY l."rawTitle", s.name
      ORDER BY clicks DESC
      LIMIT 10
    `;
  } catch {}

  // Categories with product counts
  const categories = await prisma.category.findMany({
    include: { _count: { select: { products: true } } },
    orderBy: { position: "asc" },
  });

  // Opportunity suggestions
  const opportunities: { type: string; title: string; detail: string }[] = [];

  // Search terms without good catalog coverage
  for (const s of topSearches.slice(0, 5)) {
    const productCount = await prisma.product.count({
      where: {
        status: "ACTIVE",
        name: { contains: s.term, mode: "insensitive" },
        listings: { some: { offers: { some: { isActive: true } } } },
      },
    });
    if (productCount < 3) {
      opportunities.push({
        type: "catalog_gap",
        title: `"${s.term}" — ${s.count} buscas, ${productCount} produtos`,
        detail: "Adicionar mais produtos para este termo de busca popular",
      });
    }
  }

  // Categories with low catalog
  for (const cat of categories) {
    if (cat._count.products < 5) {
      opportunities.push({
        type: "low_category",
        title: `${cat.name} — ${cat._count.products} produtos`,
        detail: "Categoria com pouco catálogo, considere expandir",
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Tendências & Growth</h1>
        <p className="text-sm text-text-muted">Inteligência operacional para expansão do catálogo</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Keywords */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent-blue" />
            <h2 className="font-display font-semibold text-text-primary">Tendências ML</h2>
          </div>
          {latestTrends.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {latestTrends.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-blue/10 text-accent-blue text-xs font-medium"
                >
                  #{t.position} {t.keyword}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Nenhuma tendência coletada. Execute o job de ingestão.</p>
          )}
        </div>

        {/* Top Searches */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-accent-green" />
            <h2 className="font-display font-semibold text-text-primary">Top Buscas (7d)</h2>
          </div>
          {topSearches.length > 0 ? (
            <div className="space-y-2">
              {topSearches.map((s: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">{s.term}</span>
                  <span className="text-xs font-medium text-text-muted bg-surface-100 px-2 py-0.5 rounded-full">
                    {s.count}x
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Nenhuma busca registrada ainda.</p>
          )}
        </div>

        {/* Top Clickouts */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <MousePointerClick className="w-5 h-5 text-accent-orange" />
            <h2 className="font-display font-semibold text-text-primary">Top Clickouts (7d)</h2>
          </div>
          {topClickouts.length > 0 ? (
            <div className="space-y-2">
              {topClickouts.map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-text-secondary truncate max-w-[250px]">{c.rawTitle}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-text-muted">{c.sourceName}</span>
                    <span className="text-xs font-medium text-accent-orange bg-orange-50 px-2 py-0.5 rounded-full">
                      {c.clicks}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Nenhum clickout registrado ainda.</p>
          )}
        </div>

        {/* Category Health */}
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-brand-500" />
            <h2 className="font-display font-semibold text-text-primary">Saúde do Catálogo</h2>
          </div>
          <div className="space-y-2">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{cat.name}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  cat._count.products >= 10 ? "text-accent-green bg-green-50" :
                  cat._count.products >= 3 ? "text-accent-orange bg-orange-50" :
                  "text-red-500 bg-red-50"
                }`}>
                  {cat._count.products} produtos
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Opportunity Suggestions */}
      {opportunities.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-accent-orange" />
            <h2 className="font-display font-semibold text-text-primary">Oportunidades de Expansão</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {opportunities.map((opp, i) => (
              <div key={i} className="p-3 rounded-lg bg-surface-50 border border-surface-200">
                <p className="text-sm font-medium text-text-primary">{opp.title}</p>
                <p className="text-xs text-text-muted mt-1">{opp.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
