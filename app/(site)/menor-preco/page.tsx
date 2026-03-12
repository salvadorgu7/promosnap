import { TrendingDown } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata } from "@/lib/seo/metadata";
import { getLowestPrices } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: "Menor Preco Historico",
    description:
      "Produtos que estao no menor preco historico. Dados reais de acompanhamento de precos.",
    path: "/menor-preco",
  });
}

export default async function MenorPrecoPage() {
  const products = await getLowestPrices(40);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingDown className="h-6 w-6 text-accent-blue" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Menor Preco Historico
          </h1>
          <p className="text-sm text-text-muted">
            Nunca estiveram tao baratos &mdash; dados reais
          </p>
        </div>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((p) => (
            <OfferCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum produto encontrado"
          description="Estamos monitorando precos para encontrar as maiores quedas. Volte em breve!"
          ctaLabel="Ir para Home"
          ctaHref="/"
        />
      )}
    </div>
  );
}
