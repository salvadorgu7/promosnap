import { Trophy } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import EmptyState from "@/components/ui/EmptyState";
import { buildMetadata } from "@/lib/seo/metadata";
import { getBestSellers } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  return buildMetadata({
    title: "Mais Vendidos",
    description:
      "Os produtos mais populares e vendidos do momento. Rankings reais com dados de vendas.",
    path: "/mais-vendidos",
  });
}

export default async function MaisVendidosPage() {
  const products = await getBestSellers(40);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6 text-accent-orange" />
        <div>
          <h1 className="text-3xl font-bold font-display text-surface-900">Mais Vendidos</h1>
          <p className="text-sm text-surface-500">Os produtos mais populares do momento</p>
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
          description="Estamos compilando os mais vendidos. Volte em breve!"
          ctaLabel="Ir para Home"
          ctaHref="/"
        />
      )}
    </div>
  );
}
