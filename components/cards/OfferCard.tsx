"use client";

import Link from "next/link";
import { ExternalLink, Star, ShieldCheck, Store, Truck, Flame as FireIcon } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import FavoriteButton from "@/components/ui/FavoriteButton";
import ShippingBadge from "@/components/product/ShippingBadge";
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
  const cls = score >= 75 ? "score-high" : score >= 50 ? "score-mid" : "score-low";
  return <span className={`score-pill ${cls}`}>{Math.round(score)}</span>;
}

function TrustBadge({ score }: { score: number }) {
  if (score < 70) return null;
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent-green">
      <ShieldCheck className="h-3 w-3" />
      <span className="hidden sm:inline">Verificado</span>
    </span>
  );
}

function MiniStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <span className="inline-flex items-center gap-px">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`h-2.5 w-2.5 ${
            i < full
              ? "text-accent-orange fill-current"
              : i === full && half
                ? "text-accent-orange fill-current opacity-50"
                : "text-surface-300"
          }`}
        />
      ))}
    </span>
  );
}

export default function OfferCard({ product, railSource, page }: { product: ProductCard; railSource?: string; page?: string }) {
  const { bestOffer, badges } = product;
  const discount = bestOffer.discount;

  // Build clickout URL with tracking params
  const buildCtaUrl = () => {
    if (!bestOffer.affiliateUrl || bestOffer.affiliateUrl === "#") {
      return `/produto/${product.slug}`;
    }
    const base = bestOffer.affiliateUrl;
    const params = new URLSearchParams();
    if ((product as any).originType) params.set('origin', (product as any).originType);
    if (railSource) params.set('rail', railSource);
    if (page) params.set('page', page);
    const sep = base.includes('?') ? '&' : '?';
    const paramStr = params.toString();
    return paramStr ? `${base}${sep}${paramStr}` : base;
  };
  const ctaUrl = buildCtaUrl();
  const hasDirectLink = bestOffer.affiliateUrl && bestOffer.affiliateUrl !== "#";
  const isHotDiscount = discount && discount >= 20;

  return (
    <div className="card group flex flex-col w-full overflow-hidden">
      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 pt-3 flex-wrap">
          {badges.slice(0, 3).map((b, i) => (
            <BadgeChip key={i} badge={b} />
          ))}
        </div>
      )}

      {/* Image */}
      <Link href={`/produto/${product.slug}`} className="block px-3 pt-3">
        <div className="relative aspect-square rounded-lg overflow-hidden image-container">
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500 ease-out"
            width={300}
            height={300}
          />
          <div className="absolute top-2 right-2 flex items-center gap-1.5">
            <FavoriteButton productId={product.id} size="sm" />
            <ScorePill score={bestOffer.offerScore} />
          </div>
          {discount && discount >= 40 && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-accent-red to-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-sm">
              MEGA OFERTA
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col px-3 pt-2.5 pb-3">
        <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1.5 flex-wrap">
          <span className="font-medium">{bestOffer.sourceName}</span>
          {product.offersCount > 1 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-surface-100 text-[9px] font-medium text-text-muted">
              <Store className="h-2.5 w-2.5" />
              {product.offersCount} lojas
            </span>
          )}
          {bestOffer.isFreeShipping && (
            <ShippingBadge freeShipping compact />
          )}
          <TrustBadge score={bestOffer.offerScore} />
          {product.popularityScore > 60 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent-orange">
              <FireIcon className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Popular</span>
            </span>
          )}
        </div>

        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-sm font-medium text-text-primary leading-snug line-clamp-2 group-hover:text-accent-blue transition-colors duration-200">
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
              <span className="price-old">{formatPrice(bestOffer.originalPrice)}</span>
            )}
            {discount && discount > 0 && (
              <span className={`discount-tag font-display font-bold ${
                isHotDiscount
                  ? "text-base text-accent-red bg-accent-red/10 px-2 py-0.5 rounded-md"
                  : "text-sm"
              }`}>-{discount}%</span>
            )}
          </div>
          <div className="price-big mt-0.5">{formatPrice(bestOffer.price)}</div>
          {bestOffer.price > 100 && (
            <p className="text-[10px] text-text-muted mt-0.5">
              ou 12x de {formatPrice(bestOffer.price / 12)}
            </p>
          )}
          {bestOffer.isFreeShipping && (
            <p className="text-[10px] text-accent-green font-semibold mt-0.5 flex items-center gap-0.5">
              <Truck className="h-2.5 w-2.5" />
              Frete Gratis
            </p>
          )}
        </div>

        {/* CTA */}
        {hasDirectLink ? (
          <a
            href={ctaUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="btn-offer mt-3 h-9 sm:h-10 text-xs sm:text-sm"
          >
            Ver Oferta
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        ) : (
          <Link
            href={`/produto/${product.slug}`}
            className="btn-offer mt-3 h-9 sm:h-10 text-xs sm:text-sm flex items-center justify-center gap-1.5"
          >
            Comparar Precos
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}
