import Link from "next/link";
import Image from "next/image";
import { Search, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { getAdminProducts } from "@/lib/db/queries";
import { formatPrice, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string; search?: string; sort?: string; order?: string }>;
}

export default async function AdminProdutosPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = parseInt(params.page || "1", 10);
  const search = params.search || "";
  const sort = params.sort || "updatedAt";
  const order = params.order || "desc";

  const { products, total, totalPages } = await getAdminProducts({ page, limit: 25, search: search || undefined, sort, order });

  function sortUrl(field: string) {
    const newOrder = sort === field && order === "desc" ? "asc" : "desc";
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    sp.set("sort", field);
    sp.set("order", newOrder);
    sp.set("page", "1");
    return `/admin/produtos?${sp.toString()}`;
  }

  function sortIndicator(field: string) {
    if (sort !== field) return "";
    return order === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary">Produtos</h1>
          <p className="text-sm text-text-muted">{total} produtos encontrados</p>
        </div>
      </div>

      {/* Search */}
      <form method="GET" action="/admin/produtos" className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Buscar produtos..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
          />
        </div>
        <button type="submit" className="btn-primary text-sm px-4 py-2">Buscar</button>
        {search && (
          <Link href="/admin/produtos" className="btn-secondary text-sm px-4 py-2">Limpar</Link>
        )}
      </form>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50">
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Img</th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">
                  <Link href={sortUrl("name")} className="hover:text-text-primary">
                    Titulo{sortIndicator("name")}
                  </Link>
                </th>
                <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Fonte</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Preco</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Original</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Desc %</th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">
                  <Link href={sortUrl("popularityScore")} className="hover:text-text-primary">
                    Score{sortIndicator("popularityScore")}
                  </Link>
                </th>
                <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">
                  <Link href={sortUrl("updatedAt")} className="hover:text-text-primary">
                    Atualizado{sortIndicator("updatedAt")}
                  </Link>
                </th>
                <th className="text-center py-3 px-4 text-xs text-text-muted font-medium">Links</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p: any) => {
                const listing = p.listings?.[0];
                const offer = listing?.offers?.[0];
                const source = listing?.source;
                const imgUrl = p.imageUrl || listing?.imageUrl;
                const discount = offer?.originalPrice && offer.originalPrice > offer.currentPrice
                  ? Math.round(((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100)
                  : null;

                return (
                  <tr key={p.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="py-2 px-4">
                      {imgUrl ? (
                        <Image
                          src={imgUrl}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="w-10 h-10 bg-surface-100 rounded flex items-center justify-center text-text-muted text-xs">N/A</div>
                      )}
                    </td>
                    <td className="py-2 px-4 max-w-[250px]">
                      <Link href={`/produto/${p.slug}`} className="text-text-primary hover:text-accent-blue font-medium truncate block">
                        {p.name}
                      </Link>
                      {p.brand && <span className="text-xs text-text-muted">{p.brand.name}</span>}
                    </td>
                    <td className="py-2 px-4 text-text-secondary text-xs">{source?.name || "—"}</td>
                    <td className="py-2 px-4 text-right font-medium text-text-primary">
                      {offer ? formatPrice(offer.currentPrice) : "—"}
                    </td>
                    <td className="py-2 px-4 text-right text-text-muted line-through">
                      {offer?.originalPrice ? formatPrice(offer.originalPrice) : ""}
                    </td>
                    <td className="py-2 px-4 text-right">
                      {discount ? (
                        <span className={`text-xs font-medium ${discount >= 30 ? "text-accent-green" : "text-text-secondary"}`}>
                          -{discount}%
                        </span>
                      ) : ""}
                    </td>
                    <td className="py-2 px-4 text-right text-text-secondary">{p.popularityScore?.toFixed(1) ?? "0"}</td>
                    <td className="py-2 px-4 text-right text-text-muted text-xs">{timeAgo(new Date(p.updatedAt))}</td>
                    <td className="py-2 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {listing?.productUrl && (
                          <a href={listing.productUrl} target="_blank" rel="noopener noreferrer"
                            className="p-1 rounded hover:bg-surface-100 text-text-muted hover:text-accent-blue" title="Link externo">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-text-muted">
                    Nenhum produto encontrado.
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
                href={`/admin/produtos?page=${page - 1}${search ? `&search=${search}` : ""}&sort=${sort}&order=${order}`}
                className="btn-secondary text-sm px-3 py-1.5 inline-flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/produtos?page=${page + 1}${search ? `&search=${search}` : ""}&sort=${sort}&order=${order}`}
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
