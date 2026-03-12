import { ExternalLink, Star, Tag, Truck, TrendingDown, Award } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface ComparisonOffer {
  id: string;
  sourceName: string;
  sourceSlug: string;
  price: number;
  originalPrice: number | null;
  isFreeShipping: boolean;
  couponText: string | null;
  rating: number | null;
  reviewsCount: number | null;
  affiliateUrl: string;
  offerScore: number;
}

interface PriceComparisonProps {
  offers: ComparisonOffer[];
  productName: string;
}

export default function PriceComparison({ offers, productName }: PriceComparisonProps) {
  if (offers.length <= 1) return null;

  const bestPrice = Math.min(...offers.map((o) => o.price));
  const worstPrice = Math.max(...offers.map((o) => o.price));
  const savings = worstPrice - bestPrice;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold font-display text-text-primary flex items-center gap-2">
          <Award className="h-4 w-4 text-accent-blue" /> Comparar Fontes
        </h2>
        {savings > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-green bg-green-50 px-2.5 py-1 rounded-full">
            <TrendingDown className="h-3 w-3" />
            Economize até {formatPrice(savings)}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {offers.map((offer, i) => {
          const discount =
            offer.originalPrice && offer.originalPrice > offer.price
              ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)
              : null;
          const isBest = offer.price === bestPrice;
          const priceDiff = offer.price - bestPrice;

          return (
            <div
              key={offer.id}
              className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isBest
                  ? "border-accent-blue/40 bg-gradient-to-r from-accent-blue/5 to-transparent shadow-sm"
                  : "border-surface-200 bg-white hover:border-surface-300"
              }`}
            >
              {/* Best badge */}
              {isBest && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-accent-blue text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
                  Melhor Preço
                </div>
              )}

              {/* Rank */}
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                  isBest ? "bg-accent-blue text-white" : "bg-surface-100 text-text-muted"
                }`}
              >
                {i + 1}
              </div>

              {/* Source info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary">{offer.sourceName}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {offer.rating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-accent-orange">
                      <Star className="h-3 w-3 fill-current" />
                      {offer.rating.toFixed(1)}
                      {offer.reviewsCount != null && (
                        <span className="text-text-muted">({offer.reviewsCount.toLocaleString("pt-BR")})</span>
                      )}
                    </span>
                  )}
                  {offer.isFreeShipping && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent-purple bg-purple-50 px-1.5 py-0.5 rounded-full">
                      <Truck className="h-2.5 w-2.5" /> Frete grátis
                    </span>
                  )}
                  {offer.couponText && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-orange font-medium">
                      <Tag className="h-2.5 w-2.5" /> {offer.couponText}
                    </span>
                  )}
                </div>
              </div>

              {/* Price */}
              <div className="text-right flex-shrink-0">
                {offer.originalPrice && offer.originalPrice > offer.price && (
                  <p className="text-xs text-text-muted line-through">{formatPrice(offer.originalPrice)}</p>
                )}
                <p className={`text-lg font-bold font-display ${isBest ? "text-accent-blue" : "text-text-primary"}`}>
                  {formatPrice(offer.price)}
                </p>
                <div className="flex items-center gap-1.5 justify-end">
                  {discount && (
                    <span className="text-xs font-medium text-accent-green">-{discount}%</span>
                  )}
                  {!isBest && priceDiff > 0 && (
                    <span className="text-[10px] text-text-muted">+{formatPrice(priceDiff)}</span>
                  )}
                </div>
              </div>

              {/* CTA */}
              <a
                href={offer.affiliateUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isBest ? "btn-primary" : "btn-secondary"
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ver
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
