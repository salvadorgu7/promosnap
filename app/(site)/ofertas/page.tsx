import Link from "next/link";
import { Flame, ArrowUpDown } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata } from "@/lib/seo/metadata";
import { getHotOffers } from "@/lib/db/queries";
import type { ProductCard } from "@/types";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: "Ofertas Quentes",
    description:
      "As melhores ofertas verificadas do momento. Descontos reais com historico de precos.",
    path: "/ofertas",
  });
}

const SORT_OPTIONS = [
  { value: "score", label: "Melhor Oferta" },
  { value: "price_asc", label: "Menor Preco" },
  { value: "discount", label: "Maior Desconto" },
];

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
  searchParams: Promise<{ sort?: string }>;
}) {
  const params = await searchParams;
  const sort = params.sort || "score";

  const products = await getHotOffers(40);
  const sorted = sortProducts(products, sort);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <Flame className="h-6 w-6 text-accent-red" />
          <div>
            <h1 className="text-3xl font-bold font-display text-text-primary">Ofertas Quentes</h1>
            <p className="text-sm text-text-muted">
              As melhores promocoes verificadas do momento
            </p>
          </div>
        </div>

        {/* Sort pills */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-100 border border-surface-200">
          <ArrowUpDown className="h-3.5 w-3.5 text-text-muted" />
          {SORT_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={`/ofertas${opt.value !== "score" ? `?sort=${opt.value}` : ""}`}
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

      {sorted.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {sorted.map((p) => (
            <OfferCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma oferta disponivel"
          description="Estamos buscando as melhores ofertas. Volte em breve!"
          ctaLabel="Ir para Home"
          ctaHref="/"
        />
      )}
    </div>
  );
}
