import Link from "next/link";
import { Flame, ArrowUpDown, Zap, TrendingDown, Sparkles } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata } from "@/lib/seo/metadata";
import { getHotOffers } from "@/lib/db/queries";
import { formatPrice } from "@/lib/utils";
import type { ProductCard } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: "Ofertas Quentes",
    description:
      "As melhores ofertas verificadas do momento. Descontos reais com histórico de preços.",
    path: "/ofertas",
  });
}

const SORT_OPTIONS = [
  { value: "score", label: "Melhor Oferta" },
  { value: "price_asc", label: "Menor Preço" },
  { value: "discount", label: "Maior Desconto" },
];

const ITEMS_PER_PAGE = 30;

function sortProducts(products: ProductCard[], sort: string): ProductCard[] {
  const sorted = [...products];
  if (sort === "price_asc") {
    sorted.sort((a, b) => a.bestOffer.price - b.bestOffer.price);
  } else if (sort === "discount") {
    sorted.sort((a, b) => (b.bestOffer.discount || 0) - (a.bestOffer.discount || 0));
  } else {
    sorted.sort((a, b) => b.bestOffer.offerScore - a.bestOffer.offerScore);
  }
  return sorted;
}

export default async function OfertasPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort || "score";
  const page = Math.max(1, parseInt(params.page || "1", 10) || 1);

  // Fetch a larger batch to enable pagination
  const allProducts = await getHotOffers(120);
  const sorted = sortProducts(allProducts, sort);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const pageProducts = sorted.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  // Build sort URL helper
  const buildUrl = (overrides: { sort?: string; page?: number }) => {
    const p = new URLSearchParams();
    const s = overrides.sort ?? sort;
    const pg = overrides.page ?? page;
    if (s !== "score") p.set("sort", s);
    if (pg > 1) p.set("page", String(pg));
    const qs = p.toString();
    return `/ofertas${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-accent-red" />
          <div>
            <h1 className="text-3xl font-bold font-display text-text-primary">Ofertas Quentes</h1>
            <p className="text-sm text-text-muted">
              {sorted.length} ofertas verificadas com score real
            </p>
          </div>
        </div>

        {/* Sort pills */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-white border border-surface-200 shadow-sm">
          <ArrowUpDown className="h-3.5 w-3.5 text-brand-500" />
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={buildUrl({ sort: opt.value, page: 1 })}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                sort === opt.value
                  ? "bg-brand-50 text-brand-600"
                  : "text-text-muted hover:bg-surface-200"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Quick summary bar */}
      {sorted.length > 0 && (() => {
        const bestScore = sorted[0];
        const cheapest = sorted.reduce((b, p) => p.bestOffer.price < b.bestOffer.price ? p : b, sorted[0]);
        const withDiscount = sorted.filter(p => p.bestOffer.discount && p.bestOffer.discount > 0).length;
        return (
          <div className="flex items-center gap-4 flex-wrap mb-5 p-3 rounded-xl bg-gradient-to-r from-accent-red/5 to-accent-orange/5 border border-accent-red/10">
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <Zap className="w-3.5 h-3.5 text-accent-orange" />
              Top score: <span className="font-bold text-accent-orange">{bestScore.bestOffer.offerScore}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
              <TrendingDown className="w-3.5 h-3.5 text-accent-green" />
              A partir de <span className="font-bold text-accent-green">{formatPrice(cheapest.bestOffer.price)}</span>
            </span>
            {withDiscount > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                <Sparkles className="w-3.5 h-3.5 text-brand-500" />
                {withDiscount} com desconto real
              </span>
            )}
          </div>
        );
      })()}

      {pageProducts.length > 0 ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {pageProducts.map((p) => (
              <OfferCard key={p.id} product={p} railSource="offers" page="offer" />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="flex items-center justify-center gap-2 mt-8" aria-label="Paginacao">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: page - 1 })}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                >
                  Anterior
                </Link>
              )}

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={buildUrl({ page: p })}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                    page === p
                      ? "bg-brand-500 text-white shadow-sm"
                      : "bg-surface-100 text-text-muted hover:bg-surface-200"
                  }`}
                >
                  {p}
                </Link>
              ))}

              {page < totalPages && (
                <Link
                  href={buildUrl({ page: page + 1 })}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-surface-100 text-text-secondary hover:bg-surface-200 transition-colors"
                >
                  Próximo
                </Link>
              )}
            </nav>
          )}
        </>
      ) : (
        <EmptyState
          title="Nenhuma oferta disponível"
          description="Estamos buscando as melhores ofertas. Volte em breve!"
          ctaLabel="Ir para Home"
          ctaHref="/"
        />
      )}
    </div>
  );
}
