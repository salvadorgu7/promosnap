import {
  ExternalLink,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Minus,
  Star,
  Truck,
  Sparkles,
  BarChart3,
  Clock,
  ArrowDown,
  ArrowUp,
  DollarSign,
  Target,
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

  // Savings vs highest recent price
  const highestRecent = priceStats
    ? Math.max(priceStats.avg30d, bestPrice.price)
    : avgHistorical ?? 0;
  const savingsVsHighest = highestRecent > bestPrice.price
    ? highestRecent - bestPrice.price
    : null;

  // Savings vs historical avg
  const savings = avgHistorical && avgHistorical > bestPrice.price
    ? avgHistorical - bestPrice.price
    : null;

  // "Momento de compra" indicator
  const avg = priceStats?.avg30d ?? avgHistorical ?? 0;
  let momento: { label: string; color: string; bgColor: string; icon: typeof Clock } | null = null;
  if (avg > 0) {
    const ratio = bestPrice.price / avg;
    if (ratio < 0.95) {
      momento = { label: "Bom momento", color: "text-accent-green", bgColor: "bg-green-50", icon: Target };
    } else if (ratio > 1.05) {
      momento = { label: "Espere", color: "text-accent-red", bgColor: "bg-red-50", icon: Clock };
    } else {
      momento = { label: "Neutro", color: "text-accent-orange", bgColor: "bg-orange-50", icon: Minus };
    }
  }

  // Price trend
  const trend = priceStats?.trend ?? null;

  // Confidence level
  const dataPoints = [
    offers.length >= 2,
    ratedOffers.length > 0,
    priceStats !== null && priceStats !== undefined,
    bestPrice.offerScore >= 60,
  ].filter(Boolean).length;
  const confidenceLabel = dataPoints >= 3 ? "Dados verificados" : dataPoints >= 2 ? "Dados parciais" : "Coletando dados";
  const confidenceColor =
    dataPoints >= 3
      ? "text-accent-green bg-green-50"
      : dataPoints >= 2
        ? "text-accent-blue bg-blue-50"
        : "text-surface-500 bg-surface-100";

  // Price verification
  const isVerified = bestPrice.offerScore >= 60;

  return (
    <div className="card-premium p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-blue" />
          Vale a pena comprar?
        </h3>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${confidenceColor}`}
        >
          <BarChart3 className="h-2.5 w-2.5" />
          {confidenceLabel}
        </span>
      </div>

      {/* Momento de compra + price trend */}
      {(momento || trend) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {momento && (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${momento.color} ${momento.bgColor}`}>
              <momento.icon className="h-3.5 w-3.5" />
              Momento: {momento.label}
            </span>
          )}
          {trend && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
              trend === "down" ? "text-accent-green bg-green-50" :
              trend === "up" ? "text-accent-red bg-red-50" :
              "text-text-muted bg-surface-50"
            }`}>
              {trend === "down" ? <ArrowDown className="h-3 w-3" /> :
               trend === "up" ? <ArrowUp className="h-3 w-3" /> :
               <Minus className="h-3 w-3" />}
              Tendencia {trend === "down" ? "de queda" : trend === "up" ? "de alta" : "estavel"}
            </span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Best Price */}
        <div className="bg-accent-blue/5 rounded-lg p-3 border border-accent-blue/10">
          <div className="flex items-center gap-1 mb-1">
            <DollarSign className="h-3 w-3 text-accent-blue" />
            <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
              Melhor Preço
            </p>
          </div>
          <p className="text-lg font-bold font-display text-accent-blue">
            {formatPrice(bestPrice.price)}
          </p>
          <p className="text-[10px] text-text-muted mt-0.5">em {bestPrice.sourceName}</p>
          {isVerified && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-green mt-1">
              <ShieldCheck className="h-3 w-3" /> Preço verificado
            </span>
          )}
        </div>

        {/* Best Value */}
        {bestValue.id !== bestPrice.id && (
          <div className="bg-accent-green/5 rounded-lg p-3 border border-accent-green/10">
            <div className="flex items-center gap-1 mb-1">
              <Star className="h-3 w-3 text-accent-green" />
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Melhor Custo-Beneficio
              </p>
            </div>
            <p className="text-lg font-bold font-display text-accent-green">
              {formatPrice(bestValue.price)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">em {bestValue.sourceName}</p>
            <span className="inline-flex items-center gap-0.5 text-[10px] text-text-muted mt-1">
              Melhor preco = melhor valor
            </span>
          </div>
        )}
        {bestValue.id === bestPrice.id && bestRated && bestRated.id !== bestPrice.id && (
          <div className="bg-accent-orange/5 rounded-lg p-3 border border-accent-orange/10">
            <div className="flex items-center gap-1 mb-1">
              <Star className="h-3 w-3 text-accent-orange" />
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Melhor Avaliado
              </p>
            </div>
            <p className="text-lg font-bold font-display text-accent-orange">
              {(bestRated.rating ?? 0).toFixed(1)} <Star className="h-3 w-3 inline fill-current" />
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">{formatPrice(bestRated.price)} em {bestRated.sourceName}</p>
          </div>
        )}
        {bestValue.id === bestPrice.id && (!bestRated || bestRated.id === bestPrice.id) && fastestShipping && fastestShipping.id !== bestPrice.id && (
          <div className="bg-accent-purple/5 rounded-lg p-3 border border-accent-purple/10">
            <div className="flex items-center gap-1 mb-1">
              <Truck className="h-3 w-3 text-accent-purple" />
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Entrega Mais Rapida
              </p>
            </div>
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
            <div className="flex items-center gap-1 mb-1">
              <Star className="h-3 w-3 text-accent-green" />
              <p className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Melhor Custo-Beneficio
              </p>
            </div>
            <p className="text-lg font-bold font-display text-accent-green">
              {formatPrice(bestPrice.price)}
            </p>
            <p className="text-[10px] text-text-muted mt-0.5">Melhor preco = melhor valor</p>
          </div>
        )}
      </div>

      {/* Economia estimada */}
      {savingsVsHighest && savingsVsHighest > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-green/5 rounded-lg border border-accent-green/10 mb-3">
          <TrendingDown className="h-4 w-4 text-accent-green flex-shrink-0" />
          <p className="text-xs text-text-secondary">
            Economia estimada de{" "}
            <span className="font-bold text-accent-green">{formatPrice(savingsVsHighest)}</span>{" "}
            vs preco mais alto recente
          </p>
        </div>
      )}

      {/* Savings vs historical avg */}
      {savings && savings > 0 && !savingsVsHighest && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-green/5 rounded-lg border border-accent-green/10 mb-3">
          <TrendingDown className="h-4 w-4 text-accent-green flex-shrink-0" />
          <p className="text-xs text-text-secondary">
            Economia de <span className="font-bold text-accent-green">{formatPrice(savings)}</span>{" "}
            vs media historica
          </p>
        </div>
      )}

      {/* Price at all-time low indicator */}
      {priceStats && bestPrice.price <= priceStats.allTimeMin * 1.02 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-blue/5 rounded-lg border border-accent-blue/10 mb-3">
          <TrendingDown className="h-4 w-4 text-accent-blue flex-shrink-0" />
          <p className="text-xs text-text-secondary font-medium">
            Preco proximo ao <span className="text-accent-blue">minimo historico</span>!
          </p>
        </div>
      )}

      {/* Below 30-day average indicator */}
      {priceStats && bestPrice.price < priceStats.avg30d && !(bestPrice.price <= priceStats.allTimeMin * 1.02) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-50 rounded-lg border border-brand-100 mb-3">
          <ArrowDown className="h-4 w-4 text-brand-600 flex-shrink-0" />
          <p className="text-xs text-text-secondary font-medium">
            <span className="text-brand-600">{Math.round((1 - bestPrice.price / priceStats.avg30d) * 100)}% abaixo</span> da media dos ultimos 30 dias
          </p>
        </div>
      )}

      {/* CTA — routed through clickout API for tracking */}
      <a
        href={`/api/clickout/${bestPrice.id}?page=product&origin=decision`}
        target="_blank"
        rel="noopener noreferrer nofollow sponsored"
        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
      >
        <ExternalLink className="h-4 w-4" />
        Ver melhor oferta em {bestPrice.sourceName}
      </a>
    </div>
  );
}
