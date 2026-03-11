"use client";

import Link from "next/link";
import { ExternalLink, Star } from "lucide-react";
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
  const cls = score >= 75 ? "score-high" : score >= 50 ? "score-mid" : "score-low";
  return <span className={`score-pill ${cls}`}>{Math.round(score)}</span>;
}

export default function OfferCard({ product }: { product: ProductCard }) {
  const { bestOffer, badges } = product;
  const discount = bestOffer.discount;

  return (
    <div className="card group flex flex-col w-full overflow-hidden">
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
        <div className="relative aspect-square rounded-lg bg-surface-100 overflow-hidden">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-surface-400 text-4xl">
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
        <span className="text-xs text-text-muted mb-1">
          {bestOffer.sourceName}
          {product.offersCount > 1 && (
            <span className="text-surface-400"> +{product.offersCount - 1}</span>
          )}
        </span>

        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-sm font-medium text-text-primary leading-snug line-clamp-2 group-hover:text-accent-blue transition-colors">
            {product.name}
          </h3>
        </Link>

        {product.brand && (
          <span className="text-xs text-text-muted mt-1">{product.brand}</span>
        )}

        {/* Price block */}
        <div className="mt-auto pt-3">
          <div className="flex items-end gap-2">
            {bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.price && (
              <span className="price-old">{formatPrice(bestOffer.originalPrice)}</span>
            )}
            {discount && discount > 0 && (
              <span className="discount-tag text-sm">-{discount}%</span>
            )}
          </div>
          <div className="price-big mt-0.5">{formatPrice(bestOffer.price)}</div>
        </div>

        {/* CTA */}
        <a
          href={bestOffer.affiliateUrl || "#"}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-3 flex items-center justify-center gap-2 h-10 rounded-lg
                     bg-gradient-to-r from-accent-blue to-brand-500 text-white
                     text-sm font-semibold hover:shadow-glow transition-all"
        >
          Ver oferta
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
