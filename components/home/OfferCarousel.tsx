"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Truck, Zap } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import type { ProductCard } from "@/types";

interface OfferCarouselProps {
  offers: ProductCard[];
}

export default function OfferCarousel({ offers }: OfferCarouselProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = Math.min(offers.length, 5);
  const slides = offers.slice(0, total);

  const next = useCallback(() => {
    setCurrent((c) => (c + 1) % total);
  }, [total]);

  const prev = useCallback(() => {
    setCurrent((c) => (c - 1 + total) % total);
  }, [total]);

  // Auto-rotate every 5s
  useEffect(() => {
    if (paused || total <= 1) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next, total]);

  if (slides.length === 0) return null;

  const offer = slides[current];
  const discount = offer.bestOffer.discount;
  const ctaUrl =
    offer.bestOffer.affiliateUrl && offer.bestOffer.affiliateUrl !== "#"
      ? offer.bestOffer.affiliateUrl
      : "#";

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

          {/* Content */}
          <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-10">
            {/* Image */}
            <div className="relative w-40 h-40 md:w-56 md:h-56 flex-shrink-0">
              <div className="absolute inset-0 rounded-2xl bg-white/10 backdrop-blur-sm" />
              <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center p-4">
                <ImageWithFallback
                  src={offer.imageUrl}
                  alt={offer.name}
                  className="w-full h-full object-contain carousel-image-enter"
                  width={224}
                  height={224}
                  key={offer.id}
                />
              </div>
              {/* Discount badge */}
              {discount && discount > 0 && (
                <div className="absolute -top-2 -right-2 bg-accent-red text-white font-display font-bold text-sm px-2.5 py-1 rounded-lg shadow-lg">
                  -{discount}%
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 text-center md:text-left min-w-0">
              <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-blue/20 text-accent-blue text-xs font-semibold">
                  <Zap className="w-3 h-3" /> Oferta em destaque
                </span>
                <span className="text-xs text-surface-400">{offer.bestOffer.sourceName}</span>
              </div>

              <Link href={`/produto/${offer.slug}`}>
                <h3 className="font-display font-bold text-lg md:text-xl text-white leading-snug line-clamp-2 hover:text-accent-blue transition-colors">
                  {offer.name}
                </h3>
              </Link>

              {offer.brand && (
                <p className="text-sm text-surface-400 mt-1">{offer.brand}</p>
              )}

              {/* Price */}
              <div className="mt-4">
                {offer.bestOffer.originalPrice &&
                  offer.bestOffer.originalPrice > offer.bestOffer.price && (
                    <div className="text-surface-500 line-through text-sm">
                      {formatPrice(offer.bestOffer.originalPrice)}
                    </div>
                  )}
                <div className="font-display font-extrabold text-3xl md:text-4xl text-white tracking-tight">
                  {formatPrice(offer.bestOffer.price)}
                </div>
                {offer.bestOffer.isFreeShipping && (
                  <div className="flex items-center justify-center md:justify-start gap-1 mt-1 text-accent-green text-xs font-medium">
                    <Truck className="w-3.5 h-3.5" /> Frete gratis
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="mt-5 flex items-center justify-center md:justify-start gap-3">
                <a
                  href={ctaUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="btn-primary px-6 py-2.5 text-sm"
                >
                  Ver oferta <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <Link
                  href={`/produto/${offer.slug}`}
                  className="text-sm text-surface-400 hover:text-white transition-colors"
                >
                  Ver detalhes
                </Link>
              </div>
            </div>
          </div>

          {/* Navigation arrows */}
          {total > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Anterior"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Proximo"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dots */}
          {total > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`carousel-dot rounded-full transition-all duration-300 ${
                    i === current
                      ? "w-6 h-2 bg-accent-blue"
                      : "w-2 h-2 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
