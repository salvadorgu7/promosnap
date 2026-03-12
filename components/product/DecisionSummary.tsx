import {
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  Star,
  Truck,
  Sparkles,
  BarChart3,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Offer {
  id: string;
  sourceName: string;
  price: number;
  originalPrice: number | null;
  isFreeShipping: boolean;
  rating: number | null;
  reviewsCount: number | null;
  affiliateUrl: string;
  offerScore: number;
}

interface DecisionSummaryProps {
  offers: Offer[];
  productName: string;
  avgHistorical?: number;
  priceStats?: {
    avg30d: number;
    min30d: number;
    allTimeMin: number;
    trend: "up" | "down" | "stable";
  } | null;
}

export default function DecisionSummary({
  offers,
  productName,
  avgHistorical,
  priceStats,
}: DecisionSummaryProps) {
  if (offers.length === 0) return null;

  // Best price offer
  const bestPrice = offers.reduce((best, o) => (o.price < best.price ? o : best), offers[0]);

  // Best rated offer
  const ratedOffers = offers.filter((o) => o.rating != null && o.rating > 0);
  const bestRated = ratedOffers.length > 0
    ? ratedOffers.reduce((best, o) => ((o.rating ?? 0) > (best.rating ?? 0) ? o : best), ratedOffers[0])
    : null;

  // Best value (highest offerScore)
  const bestValue = offers.reduce((best, o) => (o.offerScore > best.offerScore ? o : best), offers[0]);

  // Fastest shipping (free + highest score)
  const freeShippingOffers = offers.filter((o) => o.isFreeShipping);
  const fastestShipping = freeShippingOffers.length > 0
    ? freeShippingOffers.reduce((best, o) => (o.offerScore > best.offerScore ? o : best), freeShippingOffers[0])
    : null;

  // Savings calculation
  const savings = avgHistorical && avgHistorical > bestPrice.price
    ? avgHistorical - bestPrice.price
    : null;

  // Confidence level
  const dataPoints = [
    offers.length >= 2,
    ratedOffers.length > 0,
    priceStats !== null && priceStats !== undefined,
    bestPrice.offerScore >= 60,
  ].filter(Boolean).length;
  const confidence = dataPoints >= 3 ? "alta" : dataPoints >= 2 ? "media" : "baixa";
  const confidenceColor =
    confidence === "alta"
      ? "text-accent-green bg-green-50"
      : confidence === "media"
        ? "text-accent-blue bg-blue-50"
        : "text-accent-orange bg-orange-50";

  // Price verification
  const isVerified = bestPrice.offerScore >= 60;

  return (
    <div className="card-premium p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-blue" />
          Vale a pena comprar?
        </h3>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${confidenceColor}`}
        >
          <BarChart3 className="h-2.5 w-2.5" />
          Confianca {confidence}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Best Price */}
        <div className="bg-accent-blue/5 rounded-lg p-3 border border-accent-blue/10">
          <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">
            Melhor Preco
          </p>
          <p className="text-lg font-bold font-display text-accent-blue">
            {formatPrice(bestPrice.price)}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">em {bestPrice.sourceName}</p>
          {isVerified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-green mt-1">
              <ShieldCheck className="h-3 w-3" /> Preco verificado
            </span>
          )}
        </div>

        {/* Best Value */}
        {bestValue.id !== bestPrice.id && (
          <div className="bg-accent-green/5 rounded-lg p-3 border border-accent-green/10">
            <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">
              Melhor Custo-Beneficio
            </p>
            <p className="text-lg font-bold font-display text-accent-green">
              {formatPrice(bestValue.price)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">em {bestValue.sourceName}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-text-muted mt-1">
              Score: {Math.round(bestValue.offerScore)}
            </span>
          </div>
        )}
        {bestValue.id === bestPrice.id && bestRated && bestRated.id !== bestPrice.id && (
          <div className="bg-accent-orange/5 rounded-lg p-3 border border-accent-orange/10">
            <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">
              Melhor Avaliado
            </p>
            <p className="text-lg font-bold font-display text-accent-orange">
              {(bestRated.rating ?? 0).toFixed(1)} <Star className="h-3 w-3 inline fill-current" />
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">{formatPrice(bestRated.price)} em {bestRated.sourceName}</p>
          </div>
        )}
        {bestValue.id === bestPrice.id && (!bestRated || bestRated.id === bestPrice.id) && fastestShipping && fastestShipping.id !== bestPrice.id && (
          <div className="bg-accent-purple/5 rounded-lg p-3 border border-accent-purple/10">
            <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">
              Entrega Mais Rapida
            </p>
            <p className="text-lg font-bold font-display text-accent-purple">
              {formatPrice(fastestShipping.price)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">
              <Truck className="h-3 w-3 inline" /> Frete gratis
            </p>
          </div>
        )}
        {bestValue.id === bestPrice.id && (!bestRated || bestRated.id === bestPrice.id) && (!fastestShipping || fastestShipping.id === bestPrice.id) && (
          <div className="bg-accent-green/5 rounded-lg p-3 border border-accent-green/10">
            <p className="text-[10px] font-medium text-text-muted mb-1 uppercase tracking-wider">
              Melhor Custo-Beneficio
            </p>
            <p className="text-lg font-bold font-display text-accent-green">
              {formatPrice(bestPrice.price)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">Melhor preco = melhor valor</p>
          </div>
        )}
      </div>

      {/* Savings indicator */}
      {savings && savings > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-green/5 rounded-lg border border-accent-green/10 mb-4">
          <TrendingDown className="h-4 w-4 text-accent-green flex-shrink-0" />
          <p className="text-xs text-text-secondary">
            Economia de <span className="font-bold text-accent-green">{formatPrice(savings)}</span>{" "}
            vs media historica
          </p>
        </div>
      )}

      {/* CTA */}
      <a
        href={bestPrice.affiliateUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
      >
        <ExternalLink className="h-4 w-4" />
        Ver melhor oferta em {bestPrice.sourceName}
      </a>
    </div>
  );
}
