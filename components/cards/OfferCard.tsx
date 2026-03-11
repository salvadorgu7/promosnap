"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
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
    : "text-surface-400 border-white/10";
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-bold font-mono bg-surface-950/80 backdrop-blur border ${color}`}>
      {Math.round(score)}
    </span>
  );
}

export default function OfferCard({ product }: { product: ProductCard }) {
  const { bestOffer, badges } = product;
  const discount = bestOffer.discount;

  return (
    <div className="card group flex flex-col w-full overflow-hidden transition-all duration-200">
      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 pt-3 flex-wrap">
          {badges.map((b, i) => (
            <BadgeChip key={i} badge={b} />
          ))}
        </div>
      )}

      {/* Image */}
      <Link href={`/produto/${product.slug}`} className="block px-3 pt-3">
        <div className="relative aspect-square rounded-lg bg-surface-800 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-600 text-4xl">
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
        <span className="text-xs text-surface-500 mb-1">
          {bestOffer.sourceName}
          {product.offersCount > 1 && (
            <span className="text-surface-600"> +{product.offersCount - 1}</span>
          )}
        </span>

        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-sm font-medium text-surface-200 leading-snug line-clamp-2 group-hover:text-accent-blue transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.brand && (
          <span className="text-xs text-surface-500 mt-1">{product.brand}</span>
        )}

        {/* Price block */}
        <div className="mt-auto pt-3">
          <div className="flex items-end gap-2">
            {bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.price && (
              <span className="text-surface-500 line-through text-sm">{formatPrice(bestOffer.originalPrice)}</span>
            )}
            {discount && discount > 0 && (
              <span className="text-accent-green font-bold text-sm">-{discount}%</span>
            )}
          </div>
          <div className="text-2xl font-extrabold font-display text-accent-green tracking-tight mt-0.5">
            {formatPrice(bestOffer.price)}
          </div>
        </div>

        {/* CTA */}
        <a
          href={bestOffer.affiliateUrl || "#"}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 flex items-center justify-center gap-2 h-10 rounded-lg
                     bg-gradient-to-r from-accent-blue to-accent-purple text-white
                     text-sm font-semibold hover:shadow-glow-blue transition-all duration-200"
        >
          Ver oferta
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
