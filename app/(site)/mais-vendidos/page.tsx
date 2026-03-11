import { Trophy } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata } from "@/lib/seo/metadata";
import { getBestSellers } from "@/lib/db/queries";
import { MOCK_BEST_SELLERS } from "@/lib/mock-data";

export const revalidate = 300;
export const metadata = buildMetadata({ title: "Mais Vendidos", path: "/mais-vendidos" });

export default async function MaisVendidosPage() {
  let offers = await getBestSellers(40).catch(() => []);
  if (offers.length === 0) offers = MOCK_BEST_SELLERS;

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Trophy className="h-6 w-6 text-accent-orange" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">Mais Vendidos</h1>
          <p className="text-sm text-text-muted">Os produtos mais populares do momento</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {offers.map((p) => <OfferCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
