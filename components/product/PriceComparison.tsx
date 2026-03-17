import { ExternalLink, Star, Tag, Truck, TrendingDown, Award, ShieldCheck, Crown, Zap, Timer, Clock } from "lucide-react";
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
  /** Optional: decision value score from smart comparison */
  decisionScore?: number;
  /** Optional: whether fast delivery is available */
  fastDelivery?: boolean;
  /** Optional: shipping price */
  shippingPrice?: number | null;
  /** Optional: estimated delivery days */
  deliveryDays?: number | null;
}

interface PriceComparisonProps {
  offers: ComparisonOffer[];
  productName: string;
}

/**
 * Determine the best cost-benefit offer using decision score or computed score.
 */
function getBestValueId(offers: ComparisonOffer[]): string | null {
  if (offers.length === 0) return null;

  // If decision scores are available, use them
  const hasDecisionScores = offers.some((o) => o.decisionScore !== undefined);
  if (hasDecisionScores) {
    return offers.reduce((best, o) =>
      (o.decisionScore ?? 0) > (best.decisionScore ?? 0) ? o : best
    , offers[0]).id;
  }

  // Fallback: compute a simple composite score
  const bestPrice = Math.min(...offers.map((o) => o.price));
  return offers.reduce((best, o) => {
    const priceScore = bestPrice > 0 ? (bestPrice / o.price) * 40 : 0;
    const trustScore = (o.offerScore / 100) * 30;
    const shippingBonus = o.isFreeShipping ? 15 : 0;
    const ratingScore = o.rating ? (o.rating / 5) * 15 : 0;
    const total = priceScore + trustScore + shippingBonus + ratingScore;

    const bestPriceScore = bestPrice > 0 ? (bestPrice / best.price) * 40 : 0;
    const bestTrustScore = (best.offerScore / 100) * 30;
    const bestShippingBonus = best.isFreeShipping ? 15 : 0;
    const bestRatingScore = best.rating ? (best.rating / 5) * 15 : 0;
    const bestTotal = bestPriceScore + bestTrustScore + bestShippingBonus + bestRatingScore;

    return total > bestTotal ? o : best;
  }, offers[0]).id;
}

function DeliveryInfo({ offer }: { offer: ComparisonOffer }) {
  if (offer.isFreeShipping) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent-purple bg-purple-50 px-1.5 py-0.5 rounded-full">
        <Truck className="h-2.5 w-2.5" /> Frete gratis
        {offer.deliveryDays != null && offer.deliveryDays > 0 && (
          <span className="text-text-muted ml-0.5">({offer.deliveryDays}d)</span>
        )}
      </span>
    );
  }
  if (offer.fastDelivery) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
        <Timer className="h-2.5 w-2.5" /> Entrega rapida
        {offer.deliveryDays != null && offer.deliveryDays > 0 && (
          <span className="text-text-muted ml-0.5">({offer.deliveryDays}d)</span>
        )}
      </span>
    );
  }
  if (offer.shippingPrice != null && offer.shippingPrice > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-text-muted">
        <Truck className="h-2.5 w-2.5" /> Frete {formatPrice(offer.shippingPrice)}
        {offer.deliveryDays != null && offer.deliveryDays > 0 && (
          <span className="ml-0.5">({offer.deliveryDays}d)</span>
        )}
      </span>
    );
  }
  if (offer.deliveryDays != null && offer.deliveryDays > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-text-muted">
        <Clock className="h-2.5 w-2.5" /> Entrega em {offer.deliveryDays} dias
      </span>
    );
  }
  return null;
}

function VerifiedBadge({ score }: { score: number }) {
  if (score < 70) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-accent-green bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
      <ShieldCheck className="h-3 w-3" /> Verificado
    </span>
  );
}

export default function PriceComparison({ offers, productName }: PriceComparisonProps) {
  if (offers.length <= 1) return null;

  const bestPrice = Math.min(...offers.map((o) => o.price));
  const worstPrice = Math.max(...offers.map((o) => o.price));
  const savings = worstPrice - bestPrice;

  // Determine "best choice" (highest offerScore)
  const bestChoiceId = offers.reduce((best, o) => (o.offerScore > best.offerScore ? o : best), offers[0]).id;

  // Determine best cost-benefit (decision value based)
  const bestValueId = getBestValueId(offers);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold font-display text-text-primary flex items-center gap-2">
          <Award className="h-4 w-4 text-accent-blue" /> Comparar Fontes
        </h2>
        {savings > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent-green bg-green-50 px-2.5 py-1 rounded-full">
            <TrendingDown className="h-3 w-3" />
            Economize ate {formatPrice(savings)}
          </span>
        )}
      </div>

      {/* Desktop table-like layout */}
      <div className="hidden sm:block space-y-2">
        {offers.map((offer, i) => {
          const discount =
            offer.originalPrice && offer.originalPrice > offer.price
              ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)
              : null;
          const isBest = offer.price === bestPrice;
          const isBestChoice = offer.id === bestChoiceId;
          const isBestValue = offer.id === bestValueId && bestValueId !== bestChoiceId;
          const priceDiff = offer.price - bestPrice;

          return (
            <div
              key={offer.id}
              className={`relative flex items-center gap-3 p-4 rounded-xl border transition-all ${
                isBestChoice
                  ? "border-accent-green/40 bg-gradient-to-r from-accent-green/5 to-transparent shadow-sm ring-1 ring-accent-green/20"
                  : isBest
                    ? "border-accent-blue/40 bg-gradient-to-r from-accent-blue/5 to-transparent shadow-sm"
                    : "border-surface-200 bg-white hover:border-surface-300"
              }`}
            >
              {/* Best choice badge — most prominent */}
              {isBestChoice && (
                <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 bg-accent-green text-white text-[10px] font-bold uppercase tracking-wide rounded-full flex items-center gap-1 shadow-sm">
                  <Crown className="h-2.5 w-2.5" /> Melhor Escolha
                </div>
              )}

              {/* Best price badge (when different from best choice) */}
              {isBest && !isBestChoice && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-accent-blue text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
                  Melhor Preco
                </div>
              )}

              {/* Best cost-benefit badge */}
              {isBestValue && !isBest && !isBestChoice && (
                <div className="absolute -top-2.5 left-4 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" /> Melhor Custo-Beneficio
                </div>
              )}

              {/* Rank */}
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold flex-shrink-0 ${
                  isBestChoice ? "bg-accent-green text-white" : isBest ? "bg-accent-blue text-white" : "bg-surface-100 text-text-muted"
                }`}
              >
                {i + 1}
              </div>

              {/* Source info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-text-primary">{offer.sourceName}</p>
                  <VerifiedBadge score={offer.offerScore} />
                </div>
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
                  <DeliveryInfo offer={offer} />
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
                <p className={`text-lg font-bold font-display ${isBestChoice ? "text-accent-green" : isBest ? "text-accent-blue" : "text-text-primary"}`}>
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
                href={`/api/clickout/${offer.id}?page=product&origin=comparison&rail=price-comparison`}
                target="_blank"
                rel="noopener noreferrer nofollow sponsored"
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isBestChoice ? "btn-primary" : isBest ? "btn-primary" : "btn-secondary"
                }`}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Ver
              </a>
            </div>
          );
        })}
      </div>

      {/* Mobile stacked cards — improved with all key info visible */}
      <div className="sm:hidden space-y-3">
        {offers.map((offer, i) => {
          const discount =
            offer.originalPrice && offer.originalPrice > offer.price
              ? Math.round(((offer.originalPrice - offer.price) / offer.originalPrice) * 100)
              : null;
          const isBest = offer.price === bestPrice;
          const isBestChoice = offer.id === bestChoiceId;
          const isBestValue = offer.id === bestValueId && bestValueId !== bestChoiceId;
          const priceDiff = offer.price - bestPrice;

          return (
            <div
              key={offer.id}
              className={`relative rounded-xl border p-4 ${
                isBestChoice
                  ? "border-accent-green/40 bg-gradient-to-br from-accent-green/5 to-transparent shadow-sm ring-1 ring-accent-green/20"
                  : isBest
                    ? "border-accent-blue/40 bg-gradient-to-br from-accent-blue/5 to-transparent shadow-sm"
                    : "border-surface-200 bg-white"
              }`}
            >
              {/* Badge */}
              {isBestChoice && (
                <div className="absolute -top-2.5 left-3 px-2.5 py-0.5 bg-accent-green text-white text-[10px] font-bold uppercase tracking-wide rounded-full flex items-center gap-1 shadow-sm">
                  <Crown className="h-2.5 w-2.5" /> Melhor Escolha
                </div>
              )}
              {isBest && !isBestChoice && (
                <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-accent-blue text-white text-[10px] font-bold uppercase tracking-wide rounded-full">
                  Melhor Preco
                </div>
              )}
              {isBestValue && !isBest && !isBestChoice && (
                <div className="absolute -top-2.5 left-3 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wide rounded-full flex items-center gap-1">
                  <Zap className="h-2.5 w-2.5" /> Melhor Custo-Beneficio
                </div>
              )}

              {/* Header: source + rank + verified */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                      isBestChoice ? "bg-accent-green text-white" : isBest ? "bg-accent-blue text-white" : "bg-surface-100 text-text-muted"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-text-primary">{offer.sourceName}</p>
                    </div>
                  </div>
                </div>
                <VerifiedBadge score={offer.offerScore} />
              </div>

              {/* Info grid — compact, all visible */}
              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-3">
                {/* Rating */}
                <div className="flex items-center gap-1">
                  {offer.rating != null ? (
                    <span className="flex items-center gap-0.5 text-xs text-accent-orange">
                      <Star className="h-3 w-3 fill-current" />
                      {offer.rating.toFixed(1)}
                      {offer.reviewsCount != null && (
                        <span className="text-text-muted">({offer.reviewsCount.toLocaleString("pt-BR")})</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[10px] text-text-muted">Sem avaliacao</span>
                  )}
                </div>

                {/* Shipping/Delivery */}
                <div className="flex items-center justify-end">
                  <DeliveryInfo offer={offer} />
                </div>

                {/* Coupon */}
                {offer.couponText && (
                  <div className="col-span-2">
                    <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-orange font-medium bg-orange-50 px-1.5 py-0.5 rounded-full">
                      <Tag className="h-2.5 w-2.5" /> {offer.couponText}
                    </span>
                  </div>
                )}
              </div>

              {/* Price + CTA row */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-100">
                <div>
                  {offer.originalPrice && offer.originalPrice > offer.price && (
                    <p className="text-xs text-text-muted line-through">{formatPrice(offer.originalPrice)}</p>
                  )}
                  <p className={`text-xl font-bold font-display ${isBestChoice ? "text-accent-green" : isBest ? "text-accent-blue" : "text-text-primary"}`}>
                    {formatPrice(offer.price)}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {discount && (
                      <span className="text-xs font-medium text-accent-green">-{discount}%</span>
                    )}
                    {!isBest && priceDiff > 0 && (
                      <span className="text-[10px] text-text-muted">+{formatPrice(priceDiff)}</span>
                    )}
                  </div>
                </div>
                <a
                  href={`/api/clickout/${offer.id}?page=product&origin=comparison&rail=price-comparison`}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isBestChoice ? "btn-primary" : isBest ? "btn-primary" : "btn-secondary"
                  }`}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Ver
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
