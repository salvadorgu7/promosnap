import Link from "next/link";
import { Search, SlidersHorizontal, ArrowUpDown, X, Truck, Brain, Sparkles, TrendingDown } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import SearchAnalytics from "@/components/analytics/SearchAnalytics";
import RelatedSearches from "@/components/ui/RelatedSearches";
import ZeroResultActions from "@/components/search/ZeroResultActions";
import SpellSuggestion from "@/components/search/SpellSuggestion";
import ExpandedResults from "@/components/search/ExpandedResults";
import WeakResultsBanner from "@/components/search/WeakResultsBanner";
import type { UnifiedResult } from "@/lib/search/expanded/types";
import { buildMetadata } from "@/lib/seo/metadata";
import { getBaseUrl } from "@/lib/seo/url";
import { searchListings } from "@/lib/db/queries";
import { getFlag } from "@/lib/config/feature-flags";

const APP_URL = getBaseUrl();
import { formatPrice } from "@/lib/utils";
import { BEST_PAGES } from "@/lib/seo/best-pages";
import { COMPARISON_LIST } from "@/lib/seo/comparisons";
import { OFFER_PAGES } from "@/lib/seo/offer-pages";

function buildRelatedSearches(query: string): { label: string; href: string }[] {
  if (!query) return [];
  const q = query.toLowerCase();
  const results: { label: string; href: string }[] = [];

  // Match best pages
  for (const [slug, def] of Object.entries(BEST_PAGES)) {
    if (
      def.title.toLowerCase().includes(q) ||
      def.query.keywords?.some((k) => q.includes(k.toLowerCase())) ||
      def.query.categories?.some((c) => q.includes(c.toLowerCase()))
    ) {
      results.push({ label: def.title, href: `/melhores/${slug}` });
    }
  }

  // Match comparisons
  for (const comp of COMPARISON_LIST) {
    if (
      comp.productA.query.toLowerCase().includes(q) ||
      comp.productB.query.toLowerCase().includes(q) ||
      q.includes(comp.productA.query.toLowerCase()) ||
      q.includes(comp.productB.query.toLowerCase())
    ) {
      results.push({ label: comp.title, href: `/comparar/${comp.slug}` });
    }
  }

  // Match offer pages
  for (const [slug, def] of Object.entries(OFFER_PAGES)) {
    if (
      def.searchQuery.toLowerCase().includes(q) ||
      q.includes(def.searchQuery.toLowerCase())
    ) {
      results.push({ label: def.title, href: `/ofertas/${slug}` });
    }
  }

  // Generic high-intent searches
  results.push(
    { label: `Melhores ${query}`, href: `/busca?q=melhores+${encodeURIComponent(query)}` },
    { label: `Ofertas ${query}`, href: `/busca?q=ofertas+${encodeURIComponent(query)}` },
    { label: `${query} menor preço`, href: `/busca?q=${encodeURIComponent(query)}+menor+preco` },
  );

  // Deduplicate by href and limit to 8
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.href)) return false;
    seen.add(r.href);
    return true;
  }).slice(0, 8);
}

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
  // Search result pages (?q=) are noindexed — parameterized pages waste crawl budget
  // The /busca root stays indexable as the search entry point
  if (q) {
    return buildMetadata({
      title: `${q} – Busca de Ofertas`,
      description: `Resultados para "${q}": compare preços em Amazon, Mercado Livre, Shopee e mais.`,
      path: `/busca?q=${encodeURIComponent(q)}`,
      noIndex: true,
    });
  }
  return buildMetadata({
    title: "Buscar Ofertas e Comparar Preços",
    description: "Busque e compare preços de milhares de produtos nas melhores lojas do Brasil. Histórico de 90 dias, cupons e alertas de queda.",
    path: `/busca`,
  });
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevância" },
  { value: "price_asc", label: "Menor Preço" },
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
  const page = Math.min(500, Math.max(1, parseInt(params.page || "1", 10) || 1));
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

  // ── Busca Ampliada (expanded search) — only when FF enabled ──────────
  let expandedData: { results: UnifiedResult[]; framing?: string; coverageScore: number } | null = null;
  if (query && getFlag('expandedSearch') && page === 1) {
    try {
      const { expandedSearch } = await import('@/lib/search/expanded')
      // Map search page sort values to expanded search sort values
      const sortMap: Record<string, 'relevance' | 'price_asc' | 'price_desc' | 'score'> = {
        relevance: 'relevance',
        price_asc: 'price_asc',
        score: 'score',
        discount: 'score', // "discount" sort → use score as proxy (no direct equivalent)
      }
      const expanded = await expandedSearch({
        query,
        page: 1,
        limit,
        category,
        brand: undefined,
        source,
        minPrice,
        maxPrice,
        sortBy: sortMap[sort] || 'relevance',
      })
      // Only show expanded results if there are actual external results
      if (expanded.expandedResults.length > 0) {
        expandedData = {
          results: expanded.expandedResults,
          framing: expanded.expandedFraming,
          coverageScore: expanded.coverage.coverageScore,
        }
      }
    } catch (err) {
      // Expanded search failure is non-critical — internal results still show
      console.error('[busca] expanded search failed:', err)
    }
  }

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
      label: "Frete Grátis",
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
      {/* Search analytics — fires GA4 search + zero_results + expanded events */}
      {query && (
        <SearchAnalytics
          query={query}
          resultCount={total}
          expandedCount={expandedData?.results.length}
          coverageScore={expandedData?.coverageScore}
        />
      )}

      {/* ItemList JSON-LD for search results */}
      {query && products.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `Resultados para "${query}"`,
              numberOfItems: total,
              itemListElement: products.slice(0, 10).map((p: any, i: number) => ({
                "@type": "ListItem",
                position: i + 1,
                url: `${APP_URL}/produto/${p.slug}`,
                name: p.name || p.title,
              })),
            }),
          }}
        />
      )}

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

      {/* Mobile filters */}
      <details className="lg:hidden mb-4">
        <summary className="flex items-center gap-2 px-3 py-2.5 bg-white rounded-xl border border-surface-200 text-sm font-medium cursor-pointer shadow-sm">
          <SlidersHorizontal className="w-4 h-4 text-brand-500" />
          Filtros
          {activeFilters.length > 0 && (
            <span className="ml-auto bg-brand-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilters.length}
            </span>
          )}
        </summary>
        <div className="mt-2 p-4 bg-white rounded-xl border border-surface-200 shadow-sm space-y-4">
          {/* Price range */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">Faixa de Preço</p>
            <form className="flex gap-2">
              <input type="hidden" name="q" value={query} />
              {sort !== "relevance" && <input type="hidden" name="sort" value={sort} />}
              {source && <input type="hidden" name="source" value={source} />}
              {freeShipping && <input type="hidden" name="freeShipping" value="true" />}
              {category && <input type="hidden" name="category" value={category} />}
              <input type="number" name="minPrice" placeholder="Min" defaultValue={params.minPrice || ""} className="input text-sm w-full" min="0" step="0.01" />
              <input type="number" name="maxPrice" placeholder="Max" defaultValue={params.maxPrice || ""} className="input text-sm w-full" min="0" step="0.01" />
              <button type="submit" formAction="/busca" className="btn-secondary text-xs px-3 min-h-[44px] whitespace-nowrap">Ir</button>
            </form>
          </div>
          {/* Source */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-text-secondary">Loja</p>
            <div className="flex flex-wrap gap-2">
              {SOURCE_OPTIONS.map((s) => (
                <Link key={s.value} href={buildSearchUrl(params, { source: source === s.value ? undefined : s.value, page: "1" })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${source === s.value ? "bg-brand-50 text-brand-600 border-brand-500/20" : "bg-surface-50 text-text-muted border-surface-200 hover:bg-surface-100"}`}>
                  {s.label}
                </Link>
              ))}
            </div>
          </div>
          {/* Free shipping */}
          <Link href={buildSearchUrl(params, { freeShipping: freeShipping ? undefined : "true", page: "1" })}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${freeShipping ? "bg-brand-50 text-brand-600 border-brand-500/20" : "bg-surface-50 text-text-muted border-surface-200 hover:bg-surface-100"}`}>
            <Truck className="h-3.5 w-3.5" /> Frete Grátis
          </Link>
        </div>
      </details>

      <div className="flex gap-6">
        {/* Sidebar filters (desktop) */}
        <aside className="hidden lg:block w-60 flex-shrink-0 space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-1.5">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Filtros
            </h3>

            {/* Price range */}
            <div className="space-y-2 mb-5">
              <p className="text-xs font-medium text-text-secondary">Faixa de Preço</p>
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
                      ? "text-brand-600 font-medium"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <span
                    className={`w-3.5 h-3.5 rounded border flex items-center justify-center ${
                      source === s.value
                        ? "bg-brand-500 border-brand-500 text-white"
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
                    ? "text-brand-600 font-medium"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <span
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                    freeShipping ? "bg-brand-500" : "bg-surface-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                      freeShipping ? "translate-x-4 ml-0.5" : "translate-x-0.5"
                    }`}
                  />
                </span>
                <Truck className="h-3.5 w-3.5" />
                Frete Grátis
              </Link>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          {/* Sort pills */}
          {query && (
            <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-white border border-surface-200 shadow-sm flex-wrap gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-text-secondary">
                <ArrowUpDown className="h-3.5 w-3.5 text-brand-500" /> Ordenar por:
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {SORT_OPTIONS.map((opt) => (
                  <Link
                    key={opt.value}
                    href={buildSearchUrl(params, { sort: opt.value, page: "1" })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      sort === opt.value
                        ? "bg-accent-blue text-white"
                        : "bg-surface-100 text-text-secondary hover:bg-surface-200"
                    }`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Search intelligence bar */}
          {products.length > 0 && (() => {
            const bestDeal = products.reduce((best, p) => p.bestOffer.offerScore > best.bestOffer.offerScore ? p : best, products[0]);
            const cheapest = products.reduce((best, p) => p.bestOffer.price < best.bestOffer.price ? p : best, products[0]);
            const withDiscount = products.filter(p => p.bestOffer.discount && p.bestOffer.discount > 0).length;
            const withFreeShipping = products.filter(p => p.bestOffer.isFreeShipping).length;
            return (
              <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-brand-50/60 to-accent-blue/5 border border-brand-500/15">
                <div className="flex items-center gap-1.5 text-xs mb-2">
                  <Brain className="w-3.5 h-3.5 text-brand-500" />
                  <span className="font-semibold text-text-primary">Resumo inteligente</span>
                  <span className="text-text-muted">— {total} resultados analisados</span>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <Link href={`/produto/${bestDeal.slug}`} className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-brand-600 transition-colors">
                    <Sparkles className="w-3.5 h-3.5 text-accent-orange flex-shrink-0" />
                    <span>Melhor oferta: <span className="font-semibold text-accent-blue">{bestDeal.name.length > 30 ? bestDeal.name.slice(0, 30) + "..." : bestDeal.name}</span></span>
                    <span className="px-1.5 py-0.5 rounded bg-accent-green/10 text-accent-green text-[10px] font-bold">{bestDeal.bestOffer.offerScore}</span>
                  </Link>
                  {cheapest.id !== bestDeal.id && (
                    <span className="inline-flex items-center gap-1 text-xs text-text-secondary">
                      <TrendingDown className="w-3.5 h-3.5 text-accent-green flex-shrink-0" />
                      A partir de <span className="font-bold text-accent-green">{formatPrice(cheapest.bestOffer.price)}</span>
                    </span>
                  )}
                  {withDiscount > 0 && (
                    <span className="text-xs text-text-muted">
                      {withDiscount} com desconto
                    </span>
                  )}
                  {withFreeShipping > 0 && (
                    <span className="text-xs text-text-muted">
                      {withFreeShipping} com frete grátis
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Weak results banner — few internal but expanded found more */}
          {expandedData && products.length > 0 && products.length <= 4 && (
            <WeakResultsBanner
              query={query}
              internalCount={products.length}
              expandedCount={expandedData.results.length}
            />
          )}

          {/* Product grid */}
          {products.length > 0 ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {products.map((p) => (
                  <OfferCard key={p.id} product={p} railSource="search" page="search" />
                ))}
              </div>

              {/* Expanded results — external marketplace results */}
              {expandedData && (
                <aside data-expanded-results data-nosnippet aria-label="Mais opções em lojas parceiras">
                  <ExpandedResults
                    results={expandedData.results}
                    framing={expandedData.framing}
                    coverageScore={expandedData.coverageScore}
                    query={query}
                    mode="complement"
                  />
                </aside>
              )}

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
                        className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? "bg-brand-500 text-white shadow-sm"
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
                      Próximo
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : query ? (
            <>
              {/* Even with zero internal results, expanded search may have found matches */}
              {expandedData ? (
                <aside data-expanded-results data-nosnippet aria-label="Resultados de lojas parceiras">
                  <ExpandedResults
                    results={expandedData.results}
                    framing={expandedData.framing}
                    coverageScore={expandedData.coverageScore}
                    query={query}
                    mode="rescue"
                  />
                </aside>
              ) : (
                <EmptyState
                  icon={Search}
                  title="Nenhum resultado encontrado"
                  description={`Não encontramos ofertas para "${query}". Tente buscar com termos diferentes, verificar a ortografia ou remover filtros aplicados.`}
                  ctaLabel="Limpar filtros"
                  ctaHref={`/busca?q=${encodeURIComponent(query)}`}
                />
              )}
              <SpellSuggestion query={query} />
              <ZeroResultActions query={query} />
            </>
          ) : (
            <EmptyState
              icon={Search}
              title="Busque um produto"
              description="Digite o nome do produto, marca ou categoria para comparar preços nas melhores lojas do Brasil."
            />
          )}

          {/* Related searches */}
          {query && (
            <RelatedSearches searches={buildRelatedSearches(query)} />
          )}
        </div>
      </div>
    </div>
  );
}
