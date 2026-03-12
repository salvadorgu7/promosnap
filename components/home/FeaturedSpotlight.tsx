"use client";

import Link from "next/link";
import { ExternalLink, Truck, ShieldCheck, TrendingDown, Star, Award } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import type { ProductCard } from "@/types";

interface FeaturedSpotlightProps {
  product: ProductCard;
  /** Label shown as spotlight type badge */
  label?: string;
  /** Style variant */
  variant?: "deal-of-day" | "editors-pick" | "trending";
}

const VARIANT_CONFIG = {
  "deal-of-day": {
    badge: "Oferta do Dia",
    icon: TrendingDown,
    gradient: "from-surface-900 via-indigo-950 to-surface-900",
    accentGlow: "rgba(99,102,241,0.15)",
  },
  "editors-pick": {
    badge: "Escolha do Editor",
    icon: Award,
    gradient: "from-surface-900 via-purple-950 to-surface-900",
    accentGlow: "rgba(139,92,246,0.15)",
  },
  trending: {
    badge: "Em Alta",
    icon: Star,
    gradient: "from-surface-900 via-amber-950 to-surface-900",
    accentGlow: "rgba(245,158,11,0.15)",
  },
};

export default function FeaturedSpotlight({
  product,
  label,
  variant = "deal-of-day",
}: FeaturedSpotlightProps) {
  const config = VARIANT_CONFIG[variant];
  const BadgeIcon = config.icon;
  const { bestOffer } = product;
  const discount = bestOffer.discount;

  const ctaUrl =
    bestOffer.affiliateUrl && bestOffer.affiliateUrl !== "#"
      ? bestOffer.affiliateUrl
      : "#";

  return (
    <div className={`featured-slot relative rounded-2xl overflow-hidden bg-gradient-to-br ${config.gradient}`}>
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 30% 50%, ${config.accentGlow}, transparent)`,
        }}
      />

      <div className="relative flex flex-col md:flex-row items-center gap-6 md:gap-10 p-6 md:p-10">
        {/* Image side */}
        <div className="relative w-48 h-48 md:w-72 md:h-72 flex-shrink-0 group">
          <div className="absolute inset-0 rounded-2xl bg-white/5 backdrop-blur-sm" />
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center p-5 shadow-xl">
            <ImageWithFallback
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
              width={288}
              height={288}
            />
          </div>

          {/* Discount badge */}
          {discount && discount > 0 && (
            <div className="absolute -top-3 -right-3 bg-gradient-to-br from-accent-red to-red-600 text-white font-display font-bold text-lg px-3.5 py-1.5 rounded-xl shadow-lg shadow-red-500/30">
              -{discount}%
            </div>
          )}

          {/* Score pill */}
          {bestOffer.offerScore >= 60 && (
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-green/90 text-white text-xs font-bold shadow-lg">
              <Star className="w-3 h-3 fill-current" />
              Score {Math.round(bestOffer.offerScore)}
            </div>
          )}
        </div>

        {/* Content side */}
        <div className="flex-1 text-center md:text-left min-w-0">
          {/* Variant badge */}
          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-bold uppercase tracking-wider backdrop-blur-sm border border-white/10">
              <BadgeIcon className="w-3.5 h-3.5" />
              {label || config.badge}
            </span>
          </div>

          {/* Title */}
          <Link href={`/produto/${product.slug}`}>
            <h3 className="font-display font-bold text-2xl md:text-3xl text-white leading-snug line-clamp-2 hover:text-accent-blue transition-colors">
              {product.name}
            </h3>
          </Link>

          {product.brand && (
            <p className="text-sm text-surface-400 mt-2">{product.brand}</p>
          )}

          {/* Trust indicators */}
          <div className="flex items-center justify-center md:justify-start gap-3 mt-3">
            <span className="inline-flex items-center gap-1 text-xs text-surface-300">
              <ShieldCheck className="w-3.5 h-3.5 text-accent-green" />
              Preco verificado
            </span>
            {product.offersCount > 1 && (
              <span className="text-xs text-surface-400">
                {product.offersCount} ofertas
              </span>
            )}
          </div>

          {/* Price block */}
          <div className="mt-5">
            {bestOffer.originalPrice &&
              bestOffer.originalPrice > bestOffer.price && (
                <div className="text-surface-500 line-through text-base">
                  {formatPrice(bestOffer.originalPrice)}
                </div>
              )}
            <div className="font-display font-extrabold text-4xl md:text-5xl text-white tracking-tight">
              {formatPrice(bestOffer.price)}
            </div>
            <div className="flex items-center justify-center md:justify-start gap-3 mt-2">
              {bestOffer.isFreeShipping && (
                <span className="inline-flex items-center gap-1 text-accent-green text-sm font-semibold">
                  <Truck className="w-4 h-4" /> Frete gratis
                </span>
              )}
              {bestOffer.price > 100 && (
                <span className="text-xs text-surface-400">
                  12x de {formatPrice(bestOffer.price / 12)} sem juros
                </span>
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-7 flex items-center justify-center md:justify-start gap-4">
            <a
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent-blue to-brand-500 text-white font-bold text-sm shadow-lg shadow-accent-blue/30 hover:shadow-xl hover:shadow-accent-blue/40 hover:from-accent-blue/90 hover:to-brand-600 active:scale-[0.97] transition-all duration-200"
            >
              Ver oferta <ExternalLink className="w-4 h-4" />
            </a>
            <Link
              href={`/produto/${product.slug}`}
              className="text-sm text-surface-400 hover:text-white transition-colors font-medium underline-offset-2 hover:underline"
            >
              Comparar precos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
