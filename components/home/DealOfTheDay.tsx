"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Award, Truck, ExternalLink, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { analytics } from "@/lib/analytics/events";

interface DealProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  sourceName: string;
  offerScore: number;
  isFreeShipping: boolean;
  offerId?: string;
}

interface Props {
  /** Server-rendered initial deals (SSR fallback) */
  product?: DealProduct;
  extraDeals?: DealProduct[];
}

const ROTATE_INTERVAL = 6000; // Rotate deal every 6s
const REFRESH_INTERVAL = 2 * 60 * 1000; // Fetch fresh deals every 2 min

export default function DealOfTheDay({ product, extraDeals = [] }: Props) {
  // Start with server-provided data (if any), then replace with API data
  const serverDeals = product ? [product, ...extraDeals] : [];
  const [deals, setDeals] = useState<DealProduct[]>(serverDeals);
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [fadeClass, setFadeClass] = useState("opacity-100");
  const refreshTimerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // Fetch top deals from API
  const fetchDeals = useCallback(async (isInitial = false) => {
    try {
      if (!isInitial) setIsRefreshing(true);
      const res = await fetch("/api/deals/top?limit=6", { next: { revalidate: 60 } });
      if (!res.ok) return;
      const data: DealProduct[] = await res.json();
      if (data.length > 0) {
        // Smooth transition: fade out → swap → fade in
        setFadeClass("opacity-0");
        await new Promise((r) => setTimeout(r, 300));
        setDeals(data);
        setCurrent(0);
        setFadeClass("opacity-100");
      }
    } catch {
      // Silently fail — keep showing current deals
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch on mount (replaces server data with fresh API data)
  useEffect(() => {
    fetchDeals(true);
  }, [fetchDeals]);

  // Periodic refresh — always show freshest top-scoring deals
  useEffect(() => {
    refreshTimerRef.current = setInterval(() => fetchDeals(false), REFRESH_INTERVAL);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchDeals]);

  // Auto-rotate through deals
  const total = deals.length;

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  useEffect(() => {
    if (paused || total <= 1) return;
    const timer = setInterval(next, ROTATE_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, next, total]);

  // Nothing to show
  if (deals.length === 0) return null;

  const deal = deals[current] || deals[0];

  const scoreClass =
    deal.offerScore >= 75
      ? "score-high"
      : deal.offerScore >= 50
        ? "score-mid"
        : "score-low";

  return (
    <div
      className="rounded-2xl overflow-hidden bg-gradient-to-br from-brand-500 via-primary-700 to-primary-900 shadow-lg relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 md:mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Award className="w-4 h-4 md:w-5 md:h-5 text-accent-yellow" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base md:text-lg text-white">
                Oferta do Dia
              </h2>
              <p className="text-[10px] md:text-xs text-white/60">
                Atualizado em tempo real • Maiores scores
                {isRefreshing && (
                  <RefreshCw className="inline w-2.5 h-2.5 ml-1 animate-spin" />
                )}
              </p>
            </div>
          </div>
          {total > 1 && (
            <div className="flex items-center gap-1.5">
              {deals.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-6 h-2 bg-accent-yellow"
                      : "w-2 h-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Deal ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className={`flex flex-col md:flex-row gap-4 md:gap-8 items-center transition-opacity duration-300 ${fadeClass}`}>
          {/* Image */}
          <Link
            href={`/produto/${deal.slug}`}
            className="w-40 md:w-64 flex-shrink-0"
          >
            <div className="relative aspect-square rounded-xl bg-white/10 backdrop-blur overflow-hidden">
              <ImageWithFallback
                src={deal.imageUrl}
                alt={deal.name}
                className="w-full h-full object-contain p-3 md:p-6 hover:scale-105 transition-transform duration-500"
                width={300}
                height={300}
              />
              {deal.discount && deal.discount >= 30 && (
                <div className="absolute top-3 left-3 bg-accent-red text-white text-xs font-bold px-2 py-1 rounded">
                  -{deal.discount}%
                </div>
              )}
            </div>
          </Link>

          {/* Info */}
          <div className="flex-1 text-white">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`score-pill ${scoreClass}`}>
                {Math.round(deal.offerScore)}
              </span>
              <span className="text-xs text-white/60">{deal.sourceName}</span>
              {deal.isFreeShipping && (
                <span className="flex items-center gap-1 text-xs text-accent-green">
                  <Truck className="w-3.5 h-3.5" /> Frete gratis
                </span>
              )}
            </div>

            <Link href={`/produto/${deal.slug}`}>
              <h3 className="font-display font-bold text-lg md:text-2xl leading-tight hover:text-accent-yellow transition-colors">
                {deal.name}
              </h3>
            </Link>

            {/* Price */}
            <div className="mt-2 md:mt-4">
              {deal.originalPrice && deal.originalPrice > deal.price && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-white/50 line-through">
                    {formatPrice(deal.originalPrice)}
                  </span>
                  {deal.discount && deal.discount > 0 && (
                    <span className="text-sm font-bold text-accent-green">
                      -{deal.discount}%
                    </span>
                  )}
                </div>
              )}
              <div className="font-display font-extrabold text-2xl md:text-4xl text-accent-yellow">
                {formatPrice(deal.price)}
              </div>
              {deal.price > 100 && (
                <p className="text-xs text-white/50 mt-1">
                  ou 12x de {formatPrice(deal.price / 12)}
                </p>
              )}
            </div>

            {/* CTA */}
            <div className="mt-3 md:mt-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 md:gap-4">
              {deal.offerId ? (
                <a
                  href={`/api/clickout/${deal.offerId}?page=home&origin=deal-of-day`}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  onClick={() => analytics.offerClick({
                    offerId: deal.offerId || "",
                    productId: deal.id,
                    store: deal.sourceName,
                    price: deal.price,
                  })}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-yellow text-surface-900 font-display font-bold text-sm hover:bg-yellow-300 transition-colors shadow-lg"
                >
                  Ver Oferta
                  <ExternalLink className="w-4 h-4" />
                </a>
              ) : (
                <Link
                  href={`/produto/${deal.slug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-yellow text-surface-900 font-display font-bold text-sm hover:bg-yellow-300 transition-colors shadow-lg"
                >
                  Ver Oferta
                  <ExternalLink className="w-4 h-4" />
                </Link>
              )}
              {total > 1 && (
                <span className="text-xs text-white/40">{current + 1} de {total} ofertas</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation arrows */}
      {total > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/25 flex items-center justify-center transition-all"
            aria-label="Anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/10 backdrop-blur text-white hover:bg-white/25 flex items-center justify-center transition-all"
            aria-label="Proximo"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
