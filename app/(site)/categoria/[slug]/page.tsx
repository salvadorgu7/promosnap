import Link from "next/link";
import { notFound } from "next/navigation";
import { SlidersHorizontal, Brain, TrendingDown, Truck } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getProductsByCategory, getCategoryBySlug } from "@/lib/db/queries";

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
    title: `${name} - Melhores Ofertas`,
    description: `Compare preços e encontre as melhores ofertas de ${name}. Histórico de preços, cupons e frete grátis.`,
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
            <div className="card p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center flex-shrink-0">
                <Brain className="w-4 h-4 text-accent-blue" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Score medio</p>
                <p className="text-sm font-bold text-text-primary">{avgScore}/100</p>
              </div>
            </div>
            <div className="card p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-green/10 flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4 h-4 text-accent-green" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Com desconto</p>
                <p className="text-sm font-bold text-text-primary">{withDiscount} produtos</p>
              </div>
            </div>
            <div className="card p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-purple/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-4 h-4 text-accent-purple" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Frete gratis</p>
                <p className="text-sm font-bold text-text-primary">{withFreeShipping} produtos</p>
              </div>
            </div>
            <div className="card p-3 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent-orange/10 flex items-center justify-center flex-shrink-0">
                <SlidersHorizontal className="w-4 h-4 text-accent-orange" />
              </div>
              <div>
                <p className="text-xs text-text-muted">Faixa de preco</p>
                <p className="text-[11px] font-bold text-text-primary">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(minPrice)} - {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(maxPrice)}
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
    </div>
  );
}
