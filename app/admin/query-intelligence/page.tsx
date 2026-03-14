import { Search, AlertTriangle, Lightbulb, BarChart3 } from "lucide-react";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { BEST_PAGE_SLUGS } from "@/lib/seo/best-pages";
import { COMPARISON_SLUGS } from "@/lib/seo/comparisons";

export const dynamic = "force-dynamic";

export default async function QueryIntelligencePage() {
  // Top queries (last 7 days)
  let topQueries: { query: string; count: bigint; clicks: bigint }[] = [];
  try {
    topQueries = await prisma.$queryRaw(Prisma.sql`
      SELECT "normalizedQuery" as query, COUNT(*) as count,
        SUM(CASE WHEN "clickedProductId" IS NOT NULL THEN 1 ELSE 0 END) as clicks
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '7 days' AND "normalizedQuery" IS NOT NULL
      GROUP BY "normalizedQuery"
      ORDER BY count DESC LIMIT 30
    `);
  } catch {
    topQueries = [];
  }

  // Zero-result queries (last 30 days)
  let zeroResultQueries: { query: string; count: bigint }[] = [];
  try {
    zeroResultQueries = await prisma.$queryRaw(Prisma.sql`
      SELECT "normalizedQuery" as query, COUNT(*) as count
      FROM search_logs
      WHERE "resultsCount" = 0 AND "createdAt" > NOW() - INTERVAL '30 days' AND "normalizedQuery" IS NOT NULL
      GROUP BY "normalizedQuery"
      ORDER BY count DESC LIMIT 20
    `);
  } catch {
    zeroResultQueries = [];
  }

  // Search conversion rate
  let conversionData: { total: bigint; converted: bigint }[] = [];
  try {
    conversionData = await prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*) as total,
        SUM(CASE WHEN "clickedProductId" IS NOT NULL THEN 1 ELSE 0 END) as converted
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
    `);
  } catch {
    conversionData = [];
  }

  const totalSearches = Number(conversionData[0]?.total ?? 0);
  const totalConverted = Number(conversionData[0]?.converted ?? 0);
  const conversionRate = totalSearches > 0 ? ((totalConverted / totalSearches) * 100).toFixed(1) : "0.0";
  const totalZeroResults = zeroResultQueries.reduce((sum, q) => sum + Number(q.count), 0);
  const zeroResultRate = totalSearches > 0 ? ((totalZeroResults / totalSearches) * 100).toFixed(1) : "0.0";

  // Cross-reference top queries with existing SEO pages
  const allSeoSlugs = new Set([...BEST_PAGE_SLUGS, ...COMPARISON_SLUGS]);
  const queryToSlug = (q: string) =>
    q
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const uncoveredQueries = topQueries
    .filter((q) => {
      const slug = queryToSlug(q.query);
      const melhoresSlug = `melhores-${slug}`;
      return !allSeoSlugs.has(slug) && !allSeoSlugs.has(melhoresSlug);
    })
    .slice(0, 10);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Search className="h-6 w-6 text-accent-blue" />
          Query Intelligence
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Comportamento de busca, gaps de conteudo e oportunidades de SEO
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Buscas (7d)</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">
            {totalSearches.toLocaleString("pt-BR")}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-text-muted" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Conversao</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{conversionRate}%</p>
          <p className="text-xs text-text-muted mt-1">
            {totalConverted.toLocaleString("pt-BR")} / {totalSearches.toLocaleString("pt-BR")} buscas
          </p>
        </div>
        <div className="bg-white rounded-xl border border-surface-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <span className="text-xs text-text-muted uppercase tracking-wider">Zero Resultado</span>
          </div>
          <p className="text-2xl font-bold font-display text-text-primary">{zeroResultRate}%</p>
          <p className="text-xs text-text-muted mt-1">
            {totalZeroResults.toLocaleString("pt-BR")} buscas sem resultado (30d)
          </p>
        </div>
      </div>

      {/* Top Queries Table */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent-blue" />
          Top Queries (7 dias)
        </h2>
        {topQueries.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Nenhuma busca registrada nos ultimos 7 dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left text-text-muted font-medium py-2 pr-4">Query</th>
                  <th className="text-right text-text-muted font-medium py-2 px-4">Buscas</th>
                  <th className="text-right text-text-muted font-medium py-2 px-4">Clicks</th>
                  <th className="text-right text-text-muted font-medium py-2 px-4">CTR%</th>
                </tr>
              </thead>
              <tbody>
                {topQueries.map((q, i) => {
                  const count = Number(q.count);
                  const clicks = Number(q.clicks);
                  const ctr = count > 0 ? ((clicks / count) * 100).toFixed(1) : "0.0";
                  return (
                    <tr
                      key={q.query}
                      className={`border-b border-surface-100 ${i % 2 === 0 ? "bg-white" : "bg-surface-50"}`}
                    >
                      <td className="py-2 pr-4 font-medium text-text-primary">{q.query}</td>
                      <td className="py-2 px-4 text-right">{count.toLocaleString("pt-BR")}</td>
                      <td className="py-2 px-4 text-right">{clicks.toLocaleString("pt-BR")}</td>
                      <td className="py-2 px-4 text-right">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                            parseFloat(ctr) >= 10
                              ? "bg-green-50 text-green-700"
                              : parseFloat(ctr) >= 5
                                ? "bg-yellow-50 text-yellow-700"
                                : "bg-red-50 text-red-700"
                          }`}
                        >
                          {ctr}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Zero-Result Queries */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-500" />
          Queries Sem Resultado (30 dias)
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Buscas que nao retornaram nenhum produto — oportunidades de conteudo ou catalogo
        </p>
        {zeroResultQueries.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">Nenhuma query sem resultado nos ultimos 30 dias.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200">
                  <th className="text-left text-text-muted font-medium py-2 pr-4">Query</th>
                  <th className="text-right text-text-muted font-medium py-2 px-4">Buscas</th>
                </tr>
              </thead>
              <tbody>
                {zeroResultQueries.map((q) => (
                  <tr key={q.query} className="border-b border-surface-100 hover:bg-orange-50/50">
                    <td className="py-2 pr-4 font-medium text-orange-700">{q.query}</td>
                    <td className="py-2 px-4 text-right">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">
                        {Number(q.count).toLocaleString("pt-BR")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Content Suggestions */}
      <section className="bg-white rounded-xl border border-surface-200 p-5">
        <h2 className="text-lg font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Sugestoes de Conteudo
        </h2>
        <p className="text-xs text-text-muted mb-4">
          Top queries que ainda nao possuem pagina SEO dedicada (best-pages ou comparisons)
        </p>
        {uncoveredQueries.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">
            Todas as top queries ja possuem paginas dedicadas.
          </p>
        ) : (
          <div className="space-y-2">
            {uncoveredQueries.map((q) => {
              const suggestedSlug = queryToSlug(q.query);
              return (
                <div
                  key={q.query}
                  className="flex items-center justify-between px-4 py-3 bg-yellow-50/50 border border-yellow-200/60 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-text-primary block truncate">
                      &ldquo;{q.query}&rdquo;
                    </span>
                    <span className="text-[11px] text-text-muted">
                      {Number(q.count).toLocaleString("pt-BR")} buscas &middot; slug sugerido:{" "}
                      <code className="text-xs bg-surface-100 px-1 py-0.5 rounded">
                        /melhores/{suggestedSlug}
                      </code>
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full ml-3 whitespace-nowrap">
                    Sem pagina
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
