"use client";

import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Truck, Zap } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { ProductCard, Badge } from "@/types";

function BadgeChip({ badge }: { badge: Badge }) {
  const styles: Record<string, string> = {
    hot_deal: "badge-hot",
    lowest_price: "badge-lowest",
    best_seller: "badge-deal",
    price_drop: "badge-lowest",
    coupon: "badge-coupon",
    free_shipping: "badge-shipping",
    trending: "badge-deal",
  };
  return <span className={styles[badge.type] || "badge-deal"}>{badge.label}</span>;
}

function ScorePill({ score }: { score: number }) {
  const color = score >= 75
    ? "text-accent-green border-accent-green/20"
    : score >= 50
    ? "text-accent-orange border-accent-orange/20"
    : "text-surface-400 border-surface-200";
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-white/90 backdrop-blur border ${color}`}>
      {Math.round(score)}
    </span>
  );
}

export default function OfferCard({ product }: { product: ProductCard }) {
  const { bestOffer, badges } = product;
  const discount = bestOffer.discount;
  const isMegaDeal = (discount ?? 0) >= 40;

  return (
    <div className="card group flex flex-col w-full overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-card-hover">
      {/* Badges */}
      <div className="flex items-center gap-1 px-3 pt-3 flex-wrap">
        {isMegaDeal && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-accent-red/10 text-accent-red border border-accent-red/20 animate-pulse-glow">
            <Zap className="w-3 h-3" /> MEGA OFERTA
          </span>
        )}
        {bestOffer.isFreeShipping && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
            <Truck className="w-3 h-3" /> Frete grátis
          </span>
        )}
        {badges.filter(b => b.type !== 'free_shipping').slice(0, 2).map((b, i) => (
          <BadgeChip key={i} badge={b} />
        ))}
      </div>

      {/* Image */}
      <Link href={`/produto/${product.slug}`} className="block px-3 pt-3">
        <div className="relative aspect-square rounded-lg bg-surface-100 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-300 text-4xl">
              📦
            </div>
          )}
          <div className="absolute top-2 right-2">
            <ScorePill score={bestOffer.offerScore} />
          </div>
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col px-3 pt-3 pb-3">
        <span className="text-[10px] sm:text-xs text-surface-500 mb-1">
          {bestOffer.sourceName}
          {product.offersCount > 1 && (
            <span className="text-surface-400"> +{product.offersCount - 1}</span>
          )}
        </span>

        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-xs sm:text-sm font-medium text-surface-800 leading-snug line-clamp-2 group-hover:text-accent-blue transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.brand && (
          <span className="text-[10px] sm:text-xs text-surface-500 mt-1">{product.brand}</span>
        )}

        {/* Price block */}
        <div className="mt-auto pt-3">
          <div className="flex items-end gap-2">
            {bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.price && (
              <span className="text-surface-400 line-through text-xs sm:text-sm">{formatPrice(bestOffer.originalPrice)}</span>
            )}
            {discount && discount > 0 && (
              <span className="text-accent-green font-bold text-xs sm:text-sm">-{discount}%</span>
            )}
          </div>
          <div className="text-xl sm:text-2xl font-extrabold font-display text-surface-900 tracking-tight mt-0.5">
            {formatPrice(bestOffer.price)}
          </div>
        </div>

        {/* CTA */}
        <a
          href={bestOffer.affiliateUrl || "#"}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 flex items-center justify-center gap-2 h-9 sm:h-10 rounded-lg
                     bg-gradient-to-r from-accent-blue to-accent-purple text-white
                     text-xs sm:text-sm font-semibold
                     group-hover:shadow-glow-blue group-hover:from-accent-blue group-hover:to-accent-blue
                     transition-all duration-300"
        >
          Ver oferta
          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </a>
      </div>
    </div>
  );
}
