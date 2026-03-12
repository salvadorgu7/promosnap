import Link from "next/link";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { getAdminOffers, getAdminSources } from "@/lib/db/queries";
import { formatPrice, truncate } from "@/lib/utils";
import CopyButton from "@/components/admin/CopyButton";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; source?: string }>;
}

export default async function AdminOfertasPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const sourceFilter = params.source || "";

  const [{ offers, total, totalPages }, sources] = await Promise.all([
    getAdminOffers({ page, limit: 25, source: sourceFilter || undefined }),
    getAdminSources(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Ofertas</h1>
        <p className="text-sm text-text-muted">{total} ofertas ativas</p>
      </div>

      {/* Filter */}
      <form method="GET" action="/admin/ofertas" className="flex items-center gap-2">
        <Filter className="h-4 w-4 text-text-muted" />
        <select
          name="source"
          defaultValue={sourceFilter}
          className="text-sm border border-surface-200 rounded-lg px-3 py-2 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
        >
          <option value="">Todas as fontes</option>
          {sources.map((s: any) => (
            <option key={s.slug} value={s.slug}>{s.name}</option>
          ))}
        </select>
        <button type="submit" className="btn-primary text-sm px-4 py-2">Filtrar</button>
        {sourceFilter && (
          <Link href="/admin/ofertas" className="btn-secondary text-sm px-4 py-2">Limpar</Link>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Listing</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Fonte</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Preco Atual</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Original</th>
                <th className="text-center py-3 px-4 text-xs text-text-muted font-medium">Score</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Affiliate URL</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o: any) => {
                const listing = o.listing;
                const source = listing?.source;
                const isHot = o.offerScore >= 80;

                return (
                  <tr key={o.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="py-2 px-4 max-w-[280px]">
                      <span className="text-text-primary truncate block">{listing?.rawTitle || "—"}</span>
                    </td>
                    <td className="py-2 px-4 text-text-secondary text-xs">{source?.name || "—"}</td>
                    <td className="py-2 px-4 text-right font-medium text-text-primary">
                      {formatPrice(o.currentPrice)}
                    </td>
                    <td className="py-2 px-4 text-right text-text-muted line-through">
                      {o.originalPrice ? formatPrice(o.originalPrice) : ""}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        isHot
                          ? "bg-red-100 text-red-700"
                          : o.offerScore >= 60
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-surface-100 text-text-secondary"
                      }`}>
                        {o.offerScore.toFixed(0)}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      {o.affiliateUrl ? (
                        <div className="flex items-center gap-1">
                          <a
                            href={o.affiliateUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-accent-blue hover:underline truncate max-w-[200px] block"
                            title={o.affiliateUrl}
                          >
                            {truncate(o.affiliateUrl, 40)}
                          </a>
                          <CopyButton text={o.affiliateUrl} />
                        </div>
                      ) : (
                        <span className="text-xs text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {offers.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    Nenhuma oferta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-text-muted">
            Pagina {page} de {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/ofertas?page=${page - 1}${sourceFilter ? `&source=${sourceFilter}` : ""}`}
                className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/ofertas?page=${page + 1}${sourceFilter ? `&source=${sourceFilter}` : ""}`}
                className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1"
              >
                Proxima <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
