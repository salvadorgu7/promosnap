"use client";

import Link from "next/link";
import { ExternalLink, Star, ShieldCheck, Store, Truck, Flame as FireIcon, ThumbsUp } from "lucide-react";
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

  // Build clickout URL via tracking API
  const buildCtaUrl = () => {
    if (!bestOffer.offerId || !bestOffer.affiliateUrl || bestOffer.affiliateUrl === "#") {
      return `/produto/${product.slug}`;
    }
    const params = new URLSearchParams();
    if (product.originType) params.set('origin', product.originType);
    if (railSource) params.set('rail', railSource);
    if (page) params.set('page', page);
    const paramStr = params.toString();
    return `/api/clickout/${bestOffer.offerId}${paramStr ? `?${paramStr}` : ''}`;
  };
  const ctaUrl = buildCtaUrl();
  const hasDirectLink = bestOffer.affiliateUrl && bestOffer.affiliateUrl !== "#";
  const isHotDiscount = discount && discount >= 20;

  return (
    <div className="card group flex flex-col w-full h-full overflow-hidden">
      {/* Badges */}
      {badges.length > 0 && (
        <div className="flex items-center gap-1 px-1.5 pt-1.5 flex-wrap">
          {badges.slice(0, 3).map((b, i) => (
            <BadgeChip key={i} badge={b} />
          ))}
        </div>
      )}

      {/* Image */}
      <Link href={`/produto/${product.slug}`} className="block px-1.5 pt-1.5">
        <div className="relative aspect-[5/4] rounded-lg overflow-hidden image-container">
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-contain p-2 group-hover:scale-105 transition-transform duration-500 ease-out drop-shadow-sm"
            width={300}
            height={300}
          />
          <div className="absolute top-1.5 right-1.5 flex items-center gap-1">
            <FavoriteButton productId={product.id} size="sm" />
            <ScorePill score={bestOffer.offerScore} />
          </div>
          {discount && discount >= 40 && (
            <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-accent-red to-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm">
              MEGA OFERTA
            </div>
          )}
        </div>
      </Link>

      {/* Content */}
      <div className="flex-1 flex flex-col px-1.5 pt-1.5 pb-2">
        <div className="flex items-center gap-1 text-[11px] text-text-muted mb-1 flex-wrap">
          <span className="inline-flex items-center gap-0.5 font-semibold text-text-secondary">
            <Store className="h-2.5 w-2.5" />
            {bestOffer.sourceName}
          </span>
          {product.offersCount > 1 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-surface-100 text-[9px] font-medium text-text-muted">
              {product.offersCount} lojas
            </span>
          )}
          {bestOffer.isFreeShipping && (
            <ShippingBadge freeShipping compact />
          )}
          <TrustBadge score={bestOffer.offerScore} />
          {bestOffer.offerScore > 70 && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-accent-green/10 text-[10px] font-semibold text-accent-green border border-accent-green/15">
              <ThumbsUp className="h-2.5 w-2.5" />
              Boa oferta
            </span>
          )}
          {product.popularityScore > 60 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent-orange">
              <FireIcon className="h-2.5 w-2.5" />
              <span className="hidden sm:inline">Popular</span>
            </span>
          )}
        </div>

        <Link href={`/produto/${product.slug}`}>
          <h3 className="text-xs font-medium text-text-primary leading-snug line-clamp-2 group-hover:text-accent-blue transition-colors duration-200">
            {product.name}
          </h3>
        </Link>

        {product.brand && (
          <Link href={`/marca/${product.brand.toLowerCase().replace(/\s+/g, '-')}`} className="text-[11px] text-text-muted mt-0.5 hover:text-accent-blue transition-colors">
            {product.brand}
          </Link>
        )}

        {/* Price block */}
        <div className="mt-auto pt-2">
          <div className="flex items-center gap-1.5">
            {bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.price && (
              <span className="price-old-vibrant">{formatPrice(bestOffer.originalPrice)}</span>
            )}
            {discount && discount > 0 && (
              <span className={`font-display font-extrabold ${
                isHotDiscount
                  ? "text-sm text-white bg-gradient-to-r from-accent-red to-red-600 px-2 py-0.5 rounded-md shadow-sm"
                  : "text-xs discount-tag-vibrant"
              }`}>-{discount}%</span>
            )}
          </div>
          <div className="price-big-prominent mt-0.5">{formatPrice(bestOffer.price)}</div>
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
            className="btn-offer mt-2 h-9 sm:h-8 text-xs font-semibold"
          >
            Ver Oferta
            <ExternalLink className="w-3 h-3" />
          </a>
        ) : (
          <Link
            href={`/produto/${product.slug}`}
            className="btn-offer mt-2 h-9 sm:h-8 text-xs font-semibold flex items-center justify-center gap-1.5"
          >
            Comparar Precos
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}
