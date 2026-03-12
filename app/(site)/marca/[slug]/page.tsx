import Link from "next/link";
import { notFound } from "next/navigation";
import { SlidersHorizontal, Building2 } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import Breadcrumb from "@/components/ui/Breadcrumb";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata, breadcrumbSchema } from "@/lib/seo/metadata";
import { getProductsByBrand, getBrandBySlug } from "@/lib/db/queries";

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
  const brand = await getBrandBySlug(slug);
  const name = brand?.name || slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return buildMetadata({
    title: `${name} - Melhores Ofertas`,
    description: `Encontre as melhores ofertas de ${name}. Compare preços, veja descontos reais e economize.`,
    path: `/marca/${slug}`,
  });
}

export default async function MarcaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const brand = await getBrandBySlug(slug);
  if (!brand) notFound();

  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const sort = sp.sort || "score";

  const { products, total } = await getProductsByBrand(slug, {
    page,
    sort,
    limit: ITEMS_PER_PAGE,
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);
  const name = brand.name;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* SEO breadcrumb schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbSchema([
              { name: "Home", url: "/" },
              { name: "Marcas", url: "/marcas" },
              { name, url: `/marca/${slug}` },
            ])
          ),
        }}
      />

      <Breadcrumb
        items={[
          { label: "Home", href: "/" },
          { label: "Marcas", href: "/marcas" },
          { label: name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-100 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-surface-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold font-display text-text-primary">
              {name}
            </h1>
            <p className="text-sm text-text-muted mt-0.5">
              {total > 0
                ? `${total} produto${total !== 1 ? "s" : ""} com preço comparado`
                : "Nenhum produto encontrado"}
            </p>
          </div>
        </div>

        {/* Sort pills */}
        {total > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-text-muted flex-shrink-0" />
            {SORT_OPTIONS.map((opt) => (
              <Link
                key={opt.value}
                href={`/marca/${slug}?sort=${opt.value}${page > 1 ? `&page=1` : ""}`}
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

      {/* Product grid */}
      {products.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((p) => (
              <OfferCard key={p.id} product={p} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginação">
              {page > 1 && (
                <Link
                  href={`/marca/${slug}?sort=${sort}&page=${page - 1}`}
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
                      href={`/marca/${slug}?sort=${sort}&page=${item}`}
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
                  href={`/marca/${slug}?sort=${sort}&page=${page + 1}`}
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
          icon={Building2}
          title="Nenhum produto encontrado"
          description={`Ainda estamos indexando ofertas de ${name}. Volte em breve!`}
          ctaLabel="Ver todas as ofertas"
          ctaHref="/ofertas"
        />
      )}
    </div>
  );
}
