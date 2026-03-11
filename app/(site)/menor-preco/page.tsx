import { TrendingDown } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata } from "@/lib/seo/metadata";
import { getLowestPrices } from "@/lib/db/queries";
import { MOCK_LOWEST } from "@/lib/mock-data";

export const revalidate = 300;
export const metadata = buildMetadata({ title: "Menor Preço Histórico", path: "/menor-preco" });

export default async function MenorPrecoPage() {
  let offers = await getLowestPrices(40).catch(() => []);
  if (offers.length === 0) offers = MOCK_LOWEST;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingDown className="h-6 w-6 text-accent-blue" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">Menor Preço Histórico</h1>
          <p className="text-sm text-text-muted">Nunca estiveram tão baratos — dados reais</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {offers.map((p) => <OfferCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
