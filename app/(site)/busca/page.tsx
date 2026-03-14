import Link from "next/link";
import { Search, SlidersHorizontal, ArrowUpDown, X, Truck } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata } from "@/lib/seo/metadata";
import { searchListings } from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";

interface SearchParams {
  q?: string;
  sort?: string;
  page?: string;
  minPrice?: string;
  maxPrice?: string;
  source?: string;
  freeShipping?: string;
  category?: string;
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { q } = await searchParams;
  return buildMetadata({
    title: q ? `${q} - Busca` : "Buscar Ofertas",
    description: q
      ? `Compare precos de "${q}" nas melhores lojas do Brasil. Encontre o menor preco.`
      : "Busque e compare precos de milhares de produtos nas melhores lojas.",
    path: `/busca${q ? `?q=${encodeURIComponent(q)}` : ""}`,
  });
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevancia" },
  { value: "price_asc", label: "Menor Preco" },
  { value: "score", label: "Melhor Oferta" },
  { value: "discount", label: "Maior Desconto" },
];

const SOURCE_OPTIONS = [
  { value: "amazon-br", label: "Amazon" },
  { value: "mercadolivre", label: "Mercado Livre" },
  { value: "shopee", label: "Shopee" },
  { value: "magazineluiza", label: "Magazine Luiza" },
];

function buildSearchUrl(base: SearchParams, overrides: Partial<SearchParams>): string {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.sort && merged.sort !== "relevance") params.set("sort", merged.sort);
  if (merged.page && merged.page !== "1") params.set("page", merged.page);
  if (merged.minPrice) params.set("minPrice", merged.minPrice);
  if (merged.maxPrice) params.set("maxPrice", merged.maxPrice);
  if (merged.source) params.set("source", merged.source);
  if (merged.freeShipping === "true") params.set("freeShipping", "true");
  if (merged.category) params.set("category", merged.category);
  const qs = params.toString();
  return `/busca${qs ? `?${qs}` : ""}`;
}

export default async function BuscaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = params.q || "";
  const sort = params.sort || "relevance";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);
  const minPrice = params.minPrice ? parseFloat(params.minPrice) : undefined;
  const maxPrice = params.maxPrice ? parseFloat(params.maxPrice) : undefined;
  const source = params.source || undefined;
  const freeShipping = params.freeShipping === "true";
  const category = params.category || undefined;
  const limit = 24;

  const { products, total } = query
    ? await searchListings(query, {
        page,
        limit,
        sort,
        minPrice,
        maxPrice,
        source,
        freeShipping: freeShipping || undefined,
        category,
      })
    : { products: [], total: 0 };

  const totalPages = Math.ceil(total / limit);

  // Active filters
  const activeFilters: { label: string; clearUrl: string }[] = [];
  if (minPrice) {
    activeFilters.push({
      label: `Min: ${formatPrice(minPrice)}`,
      clearUrl: buildSearchUrl(params, { minPrice: undefined, page: "1" }),
    });
  }
  if (maxPrice) {
    activeFilters.push({
      label: `Max: ${formatPrice(maxPrice)}`,
      clearUrl: buildSearchUrl(params, { maxPrice: undefined, page: "1" }),
    });
  }
  if (source) {
    const sourceLabel = SOURCE_OPTIONS.find((s) => s.value === source)?.label || source;
    activeFilters.push({
      label: sourceLabel,
      clearUrl: buildSearchUrl(params, { source: undefined, page: "1" }),
    });
  }
  if (freeShipping) {
    activeFilters.push({
      label: "Frete Gratis",
      clearUrl: buildSearchUrl(params, { freeShipping: undefined, page: "1" }),
    });
  }
  if (category) {
    activeFilters.push({
      label: `Categoria: ${category}`,
      clearUrl: buildSearchUrl(params, { category: undefined, page: "1" }),
    });
  }

  const clearAllUrl = buildSearchUrl({ q: params.q }, { page: "1" });

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-text-primary mb-1">
          {query ? `Resultados para "${query}"` : "Buscar Ofertas"}
        </h1>
        {query && (
          <p className="text-sm text-text-muted">
            {total} {total === 1 ? "resultado" : "resultados"} encontrados
          </p>
        )}
      </div>

      {/* Active filters */}
      {activeFilters.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-text-muted">Filtros ativos:</span>
          {activeFilters.map((f) => (
            <Link
              key={f.label}
              href={f.clearUrl}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 text-xs font-medium hover:bg-brand-100 transition-colors border border-brand-500/15"
            >
              {f.label}
              <X className="h-3 w-3" />
            </Link>
          ))}
          <Link
            href={clearAllUrl}
            className="text-xs text-text-muted hover:text-accent-red transition-colors underline"
          >
            Limpar todos
          </Link>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block w-60 flex-shrink-0 space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
            </h3>

            {/* Price range */}
            <div className="space-y-2 mb-5">
              <p className="text-xs font-medium text-text-secondary">Faixa de Preco</p>
              <form className="flex gap-2">
                <input type="hidden" name="q" value={query} />
                {sort !== "relevance" && <input type="hidden" name="sort" value={sort} />}
                {source && <input type="hidden" name="source" value={source} />}
                {freeShipping && <input type="hidden" name="freeShipping" value="true" />}
                {category && <input type="hidden" name="category" value={category} />}
                <input
                  type="number"
                  name="minPrice"
                  placeholder="Min"
                  defaultValue={params.minPrice || ""}
                  className="input text-xs py-1.5 px-2 w-full"
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  name="maxPrice"
                  placeholder="Max"
                  defaultValue={params.maxPrice || ""}
                  className="input text-xs py-1.5 px-2 w-full"
                  min="0"
                  step="0.01"
                />
                <button
                  type="submit"
                  formAction="/busca"
                  className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap"
                >
                  Ir
                </button>
              </form>
            </div>

            {/* Source checkboxes */}
            <div className="space-y-2 mb-5">
              <p className="text-xs font-medium text-text-secondary">Loja</p>
              {SOURCE_OPTIONS.map((s) => (
                <Link
                  key={s.value}
                  href={buildSearchUrl(params, {
                    source: source === s.value ? undefined : s.value,
                    page: "1",
                  })}
                  className={`flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                    source === s.value
                      ? "text-accent-blue font-medium"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      source === s.value
                        ? "bg-accent-blue border-accent-blue text-white"
                        : "border-surface-300"
                    }`}
                  >
                    {source === s.value && (
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </span>
                  {s.label}
                </Link>
              ))}
            </div>

            {/* Free shipping toggle */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">Entrega</p>
              <Link
                href={buildSearchUrl(params, {
                  freeShipping: freeShipping ? undefined : "true",
                  page: "1",
                })}
                className={`flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                  freeShipping
                    ? "text-accent-blue font-medium"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <span
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                    freeShipping ? "bg-accent-blue" : "bg-surface-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                      freeShipping ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
                <Truck className="h-3.5 w-3.5" />
                Frete Gratis
              </Link>
            </div>
          </div>
        </aside>

        {/* Mobile filters */}
        <details className="lg:hidden mb-4">
          <summary className="flex items-center gap-2 px-3 py-2 bg-surface-100 rounded-lg text-sm font-medium cursor-pointer">
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </summary>
          <div className="mt-2 p-3 bg-surface-50 rounded-lg border">
            {/* Price range */}
            <div className="space-y-2 mb-5">
              <p className="text-xs font-medium text-text-secondary">Faixa de Preco</p>
              <form className="flex gap-2">
                <input type="hidden" name="q" value={query} />
                {sort !== "relevance" && <input type="hidden" name="sort" value={sort} />}
                {source && <input type="hidden" name="source" value={source} />}
                {freeShipping && <input type="hidden" name="freeShipping" value="true" />}
                {category && <input type="hidden" name="category" value={category} />}
                <input
                  type="number"
                  name="minPrice"
                  placeholder="Min"
                  defaultValue={params.minPrice || ""}
                  className="input text-xs py-1.5 px-2 w-full"
                  min="0"
                  step="0.01"
                />
                <input
                  type="number"
                  name="maxPrice"
                  placeholder="Max"
                  defaultValue={params.maxPrice || ""}
                  className="input text-xs py-1.5 px-2 w-full"
                  min="0"
                  step="0.01"
                />
                <button
                  type="submit"
                  formAction="/busca"
                  className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap"
                >
                  Ir
                </button>
              </form>
            </div>

            {/* Source checkboxes */}
            <div className="space-y-2 mb-5">
              <p className="text-xs font-medium text-text-secondary">Loja</p>
              {SOURCE_OPTIONS.map((s) => (
                <Link
                  key={s.value}
                  href={buildSearchUrl(params, {
                    source: source === s.value ? undefined : s.value,
                    page: "1",
                  })}
                  className={`flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                    source === s.value
                      ? "text-accent-blue font-medium"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      source === s.value
                        ? "bg-accent-blue border-accent-blue text-white"
                        : "border-surface-300"
                    }`}
                  >
                    {source === s.value && (
                      <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M2 6l3 3 5-5" />
                      </svg>
                    )}
                  </span>
                  {s.label}
                </Link>
              ))}
            </div>

            {/* Free shipping toggle */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-text-secondary">Entrega</p>
              <Link
                href={buildSearchUrl(params, {
                  freeShipping: freeShipping ? undefined : "true",
                  page: "1",
                })}
                className={`flex items-center gap-2 text-xs cursor-pointer transition-colors ${
                  freeShipping
                    ? "text-accent-blue font-medium"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <span
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                    freeShipping ? "bg-accent-blue" : "bg-surface-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                      freeShipping ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
                <Truck className="h-3.5 w-3.5" />
                Frete Gratis
              </Link>
            </div>
          </div>
        </details>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Sort pills */}
          {query && (
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-surface-100 border border-surface-200 flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <ArrowUpDown className="h-3.5 w-3.5" /> Ordenar:
              </div>
              <div className="flex gap-1 flex-wrap">
                {SORT_OPTIONS.map((opt) => (
                  <Link
                    key={opt.value}
                    href={buildSearchUrl(params, { sort: opt.value, page: "1" })}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                      sort === opt.value
                        ? "bg-accent-blue/10 text-accent-blue"
                        : "text-text-muted hover:bg-surface-200"
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Product grid */}
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                {products.map((p) => (
                  <OfferCard key={p.id} product={p} railSource="search" page="search" />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {page > 1 && (
                    <Link
                      href={buildSearchUrl(params, { page: String(page - 1) })}
                      className="btn-secondary px-4 py-2 text-sm"
                    >
                      Anterior
                    </Link>
                  )}

                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum: number;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (page <= 4) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = page - 3 + i;
                    }
                    return (
                      <Link
                        key={pageNum}
                        href={buildSearchUrl(params, { page: String(pageNum) })}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? "bg-accent-blue text-white shadow-sm"
                            : "bg-surface-100 text-text-muted hover:bg-surface-200"
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}

                  {page < totalPages && (
                    <Link
                      href={buildSearchUrl(params, { page: String(page + 1) })}
                      className="btn-secondary px-4 py-2 text-sm"
                    >
                      Proximo
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : query ? (
            <EmptyState
              icon={Search}
              title="Nenhum resultado encontrado"
              description={`Nao encontramos ofertas para "${query}". Tente buscar com termos diferentes, verificar a ortografia ou remover filtros aplicados.`}
              ctaLabel="Limpar filtros"
              ctaHref={`/busca?q=${encodeURIComponent(query)}`}
            />
          ) : (
            <EmptyState
              icon={Search}
              title="Busque um produto"
              description="Digite o nome do produto, marca ou categoria para comparar precos nas melhores lojas do Brasil."
            />
          )}
        </div>
      </div>
    </div>
  );
}
