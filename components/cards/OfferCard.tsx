"use client";

import Link from "next/link";
import { ExternalLink, Star, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
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
  return <span className={`${styles[badge.type] || "badge-deal"} text-[10px] sm:text-xs`}>{badge.label}</span>;
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

  // Use clickout tracking URL when we have a real offer
  const ctaUrl = bestOffer.affiliateUrl && bestOffer.affiliateUrl !== "#"
    ? bestOffer.affiliateUrl
    : "#";

  return (
    <div className="card group flex flex-col w-full overflow-hidden hover:-translate-y-1 transition-transform duration-300">
      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex items-center gap-1 px-3 pt-3 flex-wrap">
          {badges.slice(0, 3).map((b, i) => (
            <BadgeChip key={i} badge={b} />
          ))}
        </div>
      )}

      {/* Image */}
      <Link href={`/produto/${product.slug}`} className="block px-3 pt-3">
        <div className="relative aspect-square rounded-lg bg-surface-100 overflow-hidden">
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
            width={300}
            height={300}
          />
          <div className="absolute top-2 right-2">
            <ScorePill score={bestOffer.offerScore} />
          </div>
          {discount && discount >= 40 && (
            <div className="absolute top-2 left-2 bg-accent-red text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
              MEGA OFERTA
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col px-3 pt-3 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
          <span>{bestOffer.sourceName}</span>
          {product.offersCount > 1 && (
            <span className="text-surface-400">+{product.offersCount - 1}</span>
          )}
          {bestOffer.isFreeShipping && (
            <span className="flex items-center gap-0.5 text-accent-green">
              <Truck className="w-3 h-3" /> Grátis
            </span>
          )}
        </div>

        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-xs sm:text-sm font-medium text-surface-800 leading-snug line-clamp-2 group-hover:text-accent-blue transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.brand && (
          <Link href={`/marca/${product.brand.toLowerCase().replace(/\s+/g, '-')}`} className="text-xs text-text-muted mt-1 hover:text-accent-blue transition-colors">
            {product.brand}
          </Link>
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
          <div className="price-big mt-0.5">{formatPrice(bestOffer.price)}</div>
          {bestOffer.price > 100 && (
            <p className="text-[10px] text-text-muted mt-0.5">
              ou 12x de {formatPrice(bestOffer.price / 12)}
            </p>
          )}
        </div>

        {/* CTA */}
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 flex items-center justify-center gap-2 h-9 sm:h-10 rounded-lg
                     bg-gradient-to-r from-accent-blue to-brand-500 text-white
                     text-xs sm:text-sm font-semibold hover:shadow-glow transition-all"
        >
          Ver oferta
          <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
        </a>
      </div>
    </div>
  );
}
