import Link from "next/link";
import { notFound } from "next/navigation";
import { SlidersHorizontal, Brain, TrendingDown, Truck, Scale, Award, Flame, Tag, BadgePercent } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import RelatedSearches from "@/components/ui/RelatedSearches";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getProductsByCategory, getCategoryBySlug } from "@/lib/db/queries";
import { BEST_PAGES } from "@/lib/seo/best-pages";
import { COMPARISON_LIST } from "@/lib/seo/comparisons";
import { OFFER_PAGES } from "@/lib/seo/offer-pages";
import CategoryHub from "@/components/seo/CategoryHub";
import prisma from "@/lib/db/prisma";

export const revalidate = 3600;

export async function generateStaticParams() {
  const categories = await prisma.category.findMany({
    select: { slug: true },
  });
  return categories.map((c) => ({ slug: c.slug }));
}

function buildCategoryRelatedSearches(
  categorySlug: string,
  categoryName: string
): { label: string; href: string }[] {
  const slug = categorySlug.toLowerCase();
  const name = categoryName.toLowerCase();
  const results: { label: string; href: string }[] = [];

  // Match best pages by category or keyword overlap
  for (const [bpSlug, def] of Object.entries(BEST_PAGES)) {
    if (
      def.query.categories?.some((c) => c.toLowerCase() === slug || name.includes(c.toLowerCase())) ||
      def.query.keywords?.some((k) => name.includes(k.toLowerCase()) || k.toLowerCase().includes(name)) ||
      def.title.toLowerCase().includes(name)
    ) {
      results.push({ label: def.title, href: `/melhores/${bpSlug}` });
    }
  }

  // Match comparisons
  for (const comp of COMPARISON_LIST) {
    if (
      comp.productA.query.toLowerCase().includes(name) ||
      comp.productB.query.toLowerCase().includes(name) ||
      name.includes(comp.productA.query.toLowerCase()) ||
      name.includes(comp.productB.query.toLowerCase())
    ) {
      results.push({ label: comp.title, href: `/comparar/${comp.slug}` });
    }
  }

  // Match offer pages
  for (const [opSlug, def] of Object.entries(OFFER_PAGES)) {
    if (
      def.searchQuery.toLowerCase().includes(name) ||
      name.includes(def.searchQuery.toLowerCase())
    ) {
      results.push({ label: def.title, href: `/ofertas/${opSlug}` });
    }
  }

  // Generic high-intent searches
  results.push(
    { label: `Melhores ${categoryName}`, href: `/busca?q=melhores+${encodeURIComponent(categoryName)}` },
    { label: `Ofertas ${categoryName}`, href: `/busca?q=ofertas+${encodeURIComponent(categoryName)}` },
    { label: `${categoryName} menor preco`, href: `/busca?q=${encodeURIComponent(categoryName)}+menor+preco` },
  );

  // Deduplicate by href and limit to 8
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.href)) return false;
    seen.add(r.href);
    return true;
  }).slice(0, 8);
}

const SORT_OPTIONS = [
  { value: "score", label: "Melhor oferta" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "discount", label: "Maior desconto" },
] as const;

const ITEMS_PER_PAGE = 24;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  const name = category?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return buildMetadata({
    title: `Melhores Ofertas de ${name} \u2014 Pre\u00e7os Atualizados`,
    description: `Compare pre\u00e7os e encontre as melhores ofertas de ${name} em 2026. Hist\u00f3rico de pre\u00e7os, cupons, frete gr\u00e1tis e descontos reais atualizados.`,
    path: `/categoria/${slug}`,
  });
}

export default async function CategoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const sort = sp.sort || "score";

  const { products, total } = await getProductsByCategory(slug, {
    page,
    sort,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const name = category.name;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* SEO breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name, url: `/categoria/${slug}` },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            {name}
          </h1>
          <p className="text-sm text-text-muted mt-1">
            {total > 0
              ? `${total} produto${total !== 1 ? "s" : ""} com preço comparado`
              : "Nenhum produto encontrado"}
          </p>
        </div>

        {/* Sort pills */}
        {total > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-text-muted flex-shrink-0" />
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/categoria/${slug}?sort=${opt.value}${page > 1 ? `&page=1` : ""}`}
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
        )}
      </div>

      {/* Category intelligence summary */}
      {products.length > 0 && (() => {
        const prices = products.map(p => p.bestOffer.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const withDiscount = products.filter(p => p.bestOffer.discount && p.bestOffer.discount > 0).length;
        const withFreeShipping = products.filter(p => p.bestOffer.isFreeShipping).length;
        const avgScore = Math.round(products.reduce((sum, p) => sum + p.bestOffer.offerScore, 0) / products.length);
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="card p-3 border-l-2 border-l-accent-blue flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4.5 h-4.5 text-accent-blue" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wide">Score medio</p>
                <p className="text-base font-extrabold text-text-primary">{avgScore}<span className="text-xs font-normal text-text-muted">/100</span></p>
              </div>
            </div>
            <div className="card p-3 border-l-2 border-l-accent-green flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-accent-green/10 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4.5 h-4.5 text-accent-green" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wide">Com desconto</p>
                <p className="text-base font-extrabold text-accent-green">{withDiscount}</p>
              </div>
            </div>
            <div className="card p-3 border-l-2 border-l-accent-purple flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-4.5 h-4.5 text-accent-purple" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wide">Frete gratis</p>
                <p className="text-base font-extrabold text-accent-purple">{withFreeShipping}</p>
              </div>
            </div>
            <div className="card p-3 border-l-2 border-l-accent-orange flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-accent-orange/10 flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal className="w-4.5 h-4.5 text-accent-orange" />
              </div>
              <div>
                <p className="text-[11px] text-text-muted uppercase tracking-wide">Faixa de preco</p>
                <p className="text-xs font-bold text-text-primary">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(minPrice)} — {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(maxPrice)}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Product grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((p) => (
              <OfferCard key={p.id} product={p} railSource="category" page="category" />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginação">
              {page > 1 && (
                <Link
                  href={`/categoria/${slug}?sort=${sort}&page=${page - 1}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                >
                  Anterior
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  if (totalPages <= 7) return true;
                  if (p === 1 || p === totalPages) return true;
                  if (Math.abs(p - page) <= 1) return true;
                  return false;
                })
                .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
                    acc.push("ellipsis");
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "ellipsis" ? (
                    <span key={`e${i}`} className="px-2 text-text-muted">
                      ...
                    </span>
                  ) : (
                    <Link
                      key={item}
                      href={`/categoria/${slug}?sort=${sort}&page=${item}`}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                        item === page
                          ? "bg-accent-blue text-white"
                          : "bg-surface-100 text-text-secondary hover:bg-surface-200"
                      }`}
                    >
                      {item}
                    </Link>
                  )
                )}

              {page < totalPages && (
                <Link
                  href={`/categoria/${slug}?sort=${sort}&page=${page + 1}`}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                >
                  Próxima
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          icon={SlidersHorizontal}
          title="Nenhum produto encontrado"
          description={`Ainda estamos indexando ofertas para ${name}. Volte em breve!`}
          ctaLabel="Ver todas as ofertas"
          ctaHref="/ofertas"
        />
      )}

      {/* Oportunidades Imperdiveis — top deals by offerScore */}
      {products.length >= 3 && (() => {
        const topDeals = [...products]
          .sort((a, b) => b.bestOffer.offerScore - a.bestOffer.offerScore)
          .slice(0, 5);
        return (
          <section className="mt-10">
            <h2 className="text-lg font-bold font-display text-text-primary mb-4 flex items-center gap-2">
              <Flame className="w-5 h-5 text-accent-orange" /> Oportunidades Imperdiveis em {name}
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
              {topDeals.map((p) => (
                <Link
                  key={p.id}
                  href={`/produto/${p.slug}`}
                  className="card p-0 overflow-hidden flex-shrink-0 w-[220px] sm:w-[240px] snap-start group hover:border-accent-orange/40 transition-colors"
                >
                  {p.imageUrl && (
                    <div className="relative h-40 bg-surface-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={p.imageUrl}
                        alt={p.name}
                        className="max-h-full max-w-full object-contain p-2 group-hover:scale-105 transition-transform"
                        loading="lazy"
                      />
                      <span className="absolute top-2 left-2 bg-accent-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        Score {p.bestOffer.offerScore}
                      </span>
                    </div>
                  )}
                  <div className="p-3">
                    <p className="text-xs font-semibold text-text-primary line-clamp-2 leading-tight group-hover:text-accent-orange transition-colors">
                      {p.name}
                    </p>
                    {p.brand && (
                      <p className="text-[10px] text-text-muted mt-1">{p.brand}</p>
                    )}
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-base font-extrabold text-accent-green">
                        {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(p.bestOffer.price)}
                      </span>
                      {p.bestOffer.discount && p.bestOffer.discount > 0 && (
                        <span className="text-[10px] font-semibold text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded">
                          -{p.bestOffer.discount}%
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Faixas de Preco — price range navigation */}
      {products.length >= 5 && (() => {
        const priceRanges = [
          { label: "Ate R$ 500", min: 0, max: 500 },
          { label: "R$ 500 - R$ 1.000", min: 500, max: 1000 },
          { label: "R$ 1.000 - R$ 2.000", min: 1000, max: 2000 },
          { label: "R$ 2.000 - R$ 5.000", min: 2000, max: 5000 },
          { label: "Acima de R$ 5.000", min: 5000, max: Infinity },
        ];
        const ranges = priceRanges
          .map((r) => ({
            ...r,
            count: products.filter(
              (p) => p.bestOffer.price >= r.min && p.bestOffer.price < r.max
            ).length,
          }))
          .filter((r) => r.count > 0);
        if (ranges.length < 2) return null;
        return (
          <section className="mt-10">
            <h2 className="text-lg font-bold font-display text-text-primary mb-4 flex items-center gap-2">
              <BadgePercent className="w-5 h-5 text-accent-blue" /> Faixas de Preco
            </h2>
            <div className="flex flex-wrap gap-2">
              {ranges.map((r) => (
                <Link
                  key={r.label}
                  href={`/busca?q=${encodeURIComponent(name)}&minPrice=${r.min}${r.max < Infinity ? `&maxPrice=${r.max}` : ""}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-100 hover:bg-accent-blue/10 hover:border-accent-blue/30 border border-transparent text-sm font-medium text-text-secondary hover:text-accent-blue transition-colors"
                >
                  <span>{r.label}</span>
                  <span className="text-[10px] bg-surface-200 text-text-muted px-1.5 py-0.5 rounded-full font-semibold">
                    {r.count}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Marcas Populares — brand distribution */}
      {products.length >= 3 && (() => {
        const brandMap = new Map<string, number>();
        for (const p of products) {
          if (p.brand) {
            brandMap.set(p.brand, (brandMap.get(p.brand) || 0) + 1);
          }
        }
        const topBrands = [...brandMap.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6);
        if (topBrands.length < 2) return null;
        return (
          <section className="mt-10">
            <h2 className="text-lg font-bold font-display text-text-primary mb-4 flex items-center gap-2">
              <Tag className="w-5 h-5 text-accent-purple" /> Marcas Populares
            </h2>
            <div className="flex flex-wrap gap-2">
              {topBrands.map(([brandName, count]) => (
                <Link
                  key={brandName}
                  href={`/marca/${brandName.toLowerCase().replace(/\s+/g, "-")}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-100 hover:bg-accent-purple/10 hover:border-accent-purple/30 border border-transparent text-sm font-medium text-text-secondary hover:text-accent-purple transition-colors"
                >
                  <span>{brandName}</span>
                  <span className="text-[10px] bg-surface-200 text-text-muted px-1.5 py-0.5 rounded-full font-semibold">
                    {count}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Category Hub — cross-links to guides, comparisons, rankings */}
      <div className="mt-8">
        <CategoryHub categorySlug={slug} categoryName={name} />
      </div>

      {/* Comparativos nesta Categoria */}
      {(() => {
        const categoryComparisons = COMPARISON_LIST.filter(
          (c) =>
            c.productA.query.toLowerCase().includes(name.toLowerCase()) ||
            c.productB.query.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.productA.query.toLowerCase()) ||
            name.toLowerCase().includes(c.productB.query.toLowerCase())
        );
        if (categoryComparisons.length === 0) return null;
        return (
          <section className="mt-8">
            <h2 className="text-lg font-bold font-display text-text-primary mb-3 flex items-center gap-2">
              <Scale className="w-5 h-5 text-brand-500" /> Comparativos nesta Categoria
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryComparisons.map((c) => (
                <Link
                  key={c.slug}
                  href={`/comparar/${c.slug}`}
                  className="card p-4 hover:border-brand-500/30 transition-colors group"
                >
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-500 transition-colors">
                    {c.title}
                  </p>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">
                    {c.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Guias de Compra */}
      {(() => {
        const guides = Object.entries(BEST_PAGES).filter(([, def]) =>
          def.query.categories?.includes(slug)
        );
        if (guides.length === 0) return null;
        return (
          <section className="mt-8">
            <h2 className="text-lg font-bold font-display text-text-primary mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-accent-orange" /> Guias de Compra
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {guides.map(([bpSlug, def]) => (
                <Link
                  key={bpSlug}
                  href={`/melhores/${bpSlug}`}
                  className="card p-4 hover:border-brand-500/30 transition-colors group"
                >
                  <p className="text-sm font-semibold text-text-primary group-hover:text-brand-500 transition-colors">
                    {def.title}
                  </p>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2">
                    {def.description}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Related searches */}
      <RelatedSearches searches={buildCategoryRelatedSearches(slug, name)} />
    </div>
  );
}
