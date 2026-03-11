import { Flame } from "lucide-react";
import OfferCard from "@/components/cards/OfferCard";
import { buildMetadata } from "@/lib/seo/metadata";
import { MOCK_HOT_OFFERS } from "@/lib/mock-data";

export const metadata = buildMetadata({ title: "Ofertas Quentes", path: "/ofertas" });

export default function OfertasPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Flame className="h-6 w-6 text-accent-red" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">Ofertas Quentes</h1>
          <p className="text-sm text-text-muted">As melhores promoções verificadas do momento</p>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {MOCK_HOT_OFFERS.map((p) => <OfferCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}
