"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Truck, Zap, ShieldCheck, BadgeCheck, Percent } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import type { ProductCard } from "@/types";

interface OfferCarouselProps {
  offers: ProductCard[];
}

const AUTOPLAY_INTERVAL = 5000;

export default function OfferCarousel({ offers }: OfferCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [direction, setDirection] = useState<"right" | "left">("right");
  const [progressKey, setProgressKey] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const total = Math.min(offers.length, 5);
  const slides = offers.slice(0, total);

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setDirection(index > current ? "right" : "left");
      setCurrent(index);
      setProgressKey((k) => k + 1);
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [current, isTransitioning]
  );

  const next = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection("right");
    setCurrent((c) => (c + 1) % total);
    setProgressKey((k) => k + 1);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [total, isTransitioning]);

  const prev = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setDirection("left");
    setCurrent((c) => (c - 1 + total) % total);
    setProgressKey((k) => k + 1);
    setTimeout(() => setIsTransitioning(false), 400);
  }, [total, isTransitioning]);

  // Auto-rotate
  useEffect(() => {
    if (paused || total <= 1) return;
    const timer = setInterval(next, AUTOPLAY_INTERVAL);
    return () => clearInterval(timer);
  }, [paused, next, total]);

  if (slides.length === 0) return null;

  const offer = slides[current];
  const discount = offer.bestOffer.discount;
  const isVerified = offer.bestOffer.offerScore >= 70;
  const ctaUrl =
    offer.bestOffer.offerId && offer.bestOffer.affiliateUrl && offer.bestOffer.affiliateUrl !== "#"
      ? `/api/clickout/${offer.bestOffer.offerId}?page=home&origin=carousel&rail=carousel`
      : `/produto/${offer.slug}`;

  const slideClass =
    direction === "right" ? "carousel-slide-right" : "carousel-slide-left";

  // Calculate savings amount
  const savingsAmount =
    offer.bestOffer.originalPrice && offer.bestOffer.originalPrice > offer.bestOffer.price
      ? offer.bestOffer.originalPrice - offer.bestOffer.price
      : 0;

  return (
    <section className="py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div
          className="carousel-container relative rounded-2xl overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-accent-blue/10 via-transparent to-brand-500/10" />
          {/* Subtle pattern overlay */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />

          {/* Content */}
          <div
            key={`slide-${current}`}
            className={`relative flex flex-col md:flex-row items-center gap-4 md:gap-12 p-4 md:p-10 lg:p-12 ${slideClass}`}
          >
            {/* Image — larger on desktop */}
            <div className="relative w-36 h-36 md:w-64 md:h-64 flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-sm" />
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center p-4 shadow-lg">
                <ImageWithFallback
                  src={offer.imageUrl}
                  alt={offer.name}
                  className="w-full h-full object-contain"
                  width={256}
                  height={256}
                />
              </div>
              {/* Discount badge — larger and more prominent */}
              {discount && discount > 0 && (
                <div className="absolute -top-3 -right-3 bg-gradient-to-br from-accent-red to-red-600 text-white font-display font-bold text-base px-3 py-1.5 rounded-xl shadow-lg shadow-red-500/25 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  -{discount}%
                </div>
              )}
              {/* Verified badge */}
              {isVerified && (
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent-green/90 text-white text-[10px] font-bold shadow-lg backdrop-blur-sm">
                  <BadgeCheck className="w-3 h-3" />
                  Oferta verificada
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 text-center md:text-left min-w-0">
              {/* Trust indicators bar */}
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2 md:mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent-blue/20 text-accent-blue text-xs font-bold tracking-wide uppercase">
                  <Zap className="w-3.5 h-3.5" /> Destaque
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-surface-400">
                  <ShieldCheck className="w-3 h-3" />
                  {offer.bestOffer.sourceName}
                </span>
                {offer.bestOffer.offerScore >= 70 && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent-green/20 text-accent-green text-[10px] font-semibold">
                    Score {offer.bestOffer.offerScore}
                  </span>
                )}
              </div>

              <Link href={`/produto/${offer.slug}`}>
                <h3 className="font-display font-bold text-lg md:text-2xl text-white leading-snug line-clamp-2 hover:text-accent-blue transition-colors">
                  {offer.name}
                </h3>
              </Link>

              {offer.brand && (
                <p className="text-sm text-surface-400 mt-1.5">{offer.brand}</p>
              )}

              {/* Price — more prominent */}
              <div className="mt-3 md:mt-5">
                {offer.bestOffer.originalPrice &&
                  offer.bestOffer.originalPrice > offer.bestOffer.price && (
                    <div className="flex items-center justify-center md:justify-start gap-2">
                      <span className="text-surface-500 line-through text-base">
                        {formatPrice(offer.bestOffer.originalPrice)}
                      </span>
                      {savingsAmount > 0 && (
                        <span className="text-accent-green text-xs font-bold">
                          Economia de {formatPrice(savingsAmount)}
                        </span>
                      )}
                    </div>
                  )}
                <div className="font-display font-extrabold text-3xl md:text-5xl text-white tracking-tight">
                  {formatPrice(offer.bestOffer.price)}
                </div>
                <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
                  {offer.bestOffer.isFreeShipping && (
                    <span className="inline-flex items-center gap-1 text-accent-green text-xs font-semibold">
                      <Truck className="w-3.5 h-3.5" /> Frete gratis
                    </span>
                  )}
                  {offer.bestOffer.price > 100 && (
                    <span className="text-xs text-surface-500">
                      ou 12x de {formatPrice(offer.bestOffer.price / 12)}
                    </span>
                  )}
                </div>
              </div>

              {/* CTA — improved styling */}
              <div className="mt-4 md:mt-6 flex items-center justify-center md:justify-start gap-4">
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow sponsored"
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-gradient-to-r from-accent-blue to-brand-500 text-white font-bold text-sm shadow-lg shadow-accent-blue/25 hover:shadow-xl hover:shadow-accent-blue/30 hover:from-accent-blue/90 hover:to-brand-600 active:scale-[0.97] transition-all duration-200"
                >
                  Ver oferta <ExternalLink className="w-4 h-4" />
                </a>
                <Link
                  href={`/produto/${offer.slug}`}
                  className="text-sm text-surface-400 hover:text-white transition-colors font-medium"
                >
                  Comparar precos
                </Link>
              </div>
            </div>
          </div>

          {/* Navigation arrows — larger, better placement */}
          {total > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/25 flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md text-white hover:bg-white/25 flex items-center justify-center transition-all duration-200 hover:scale-110"
                aria-label="Proximo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dots + slide counter */}
          {total > 1 && (
            <div className="absolute bottom-3 md:bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  className={`carousel-dot rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-7 h-2.5 bg-gradient-to-r from-accent-blue to-brand-500 shadow-sm shadow-accent-blue/30"
                      : "w-2.5 h-2.5 bg-white/25 hover:bg-white/50"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}

          {/* Progress bar */}
          {total > 1 && !paused && (
            <div className="carousel-progress">
              <div
                key={progressKey}
                className="carousel-progress-fill"
              />
            </div>
          )}
          {total > 1 && paused && (
            <div className="carousel-progress">
              <div
                className="carousel-progress-bar"
                style={{ width: `${((current + 1) / total) * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
