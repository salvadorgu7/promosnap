import {
  Store,
  ExternalLink,
  Star,
  ShieldCheck,
  Truck,
  Tag,
  Layers,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import MiniCluster from "@/components/product/MiniCluster";

interface ListingOffer {
  id: string;
  currentPrice: number;
  originalPrice: number | null;
  isFreeShipping: boolean;
  couponText: string | null;
  offerScore: number;
  affiliateUrl: string | null;
}

interface ListingSource {
  name: string;
  slug: string;
}

interface ListingData {
  id: string;
  rawTitle: string;
  rating: number | null;
  reviewsCount: number | null;
  source: ListingSource;
  offers: ListingOffer[];
}

interface VariantData {
  id: string;
  variantName: string;
  color: string | null;
  size: string | null;
  storage: string | null;
}

interface CanonicalViewProps {
  listings: ListingData[];
  variants: VariantData[];
  productName: string;
  selectedVariantId?: string | null;
}

export default function CanonicalView({
  listings,
  variants,
  productName,
  selectedVariantId,
}: CanonicalViewProps) {
  // Flatten all offers with source info
  const allOffers = listings.flatMap((listing) =>
    listing.offers.map((offer) => ({
      ...offer,
      listingId: listing.id,
      sourceName: listing.source.name,
      sourceSlug: listing.source.slug,
      rawTitle: listing.rawTitle,
      rating: listing.rating,
      reviewsCount: listing.reviewsCount,
    }))
  );

  if (allOffers.length === 0) return null;

  // Group by source
  const bySource = new Map<string, typeof allOffers>();
  for (const offer of allOffers) {
    const key = offer.sourceSlug;
    if (!bySource.has(key)) bySource.set(key, []);
    bySource.get(key)!.push(offer);
  }

  // Sort each source group by price
  for (const offers of bySource.values()) {
    offers.sort((a, b) => a.currentPrice - b.currentPrice);
  }

  // Sort sources by best price
  const sortedSources = Array.from(bySource.entries()).sort(
    (a, b) => a[1][0].currentPrice - b[1][0].currentPrice
  );

  const bestPrice = sortedSources[0]?.[1][0]?.currentPrice ?? 0;
  const sourceCount = sortedSources.length;
  const totalOffers = allOffers.length;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold font-display text-text-primary flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent-blue" />
          Visao Canonica
        </h2>
        <MiniCluster
          stores={sourceCount}
          variants={variants.length}
          offers={totalOffers}
        />
      </div>

      <p className="text-xs text-text-muted mb-4">
        {sourceCount} {sourceCount === 1 ? "loja com" : "lojas com"} este produto
        {variants.length > 0 && ` em ${variants.length} ${variants.length === 1 ? "versao" : "versoes"}`}
      </p>

      {/* Best price highlight */}
      <div className="flex items-center gap-2 px-3 py-2 bg-accent-green/5 rounded-lg border border-accent-green/10 mb-4">
        <ShieldCheck className="h-4 w-4 text-accent-green flex-shrink-0" />
        <p className="text-xs text-text-secondary">
          Melhor preco:{" "}
          <span className="font-bold text-accent-green">{formatPrice(bestPrice)}</span>{" "}
          em {sortedSources[0]?.[1][0]?.sourceName}
        </p>
      </div>

      {/* Sources grouped */}
      <div className="space-y-3">
        {sortedSources.map(([sourceSlug, offers], sourceIdx) => {
          const sourceName = offers[0].sourceName;
          const sourceBest = offers[0].currentPrice;
          const isOverallBest = sourceBest === bestPrice;

          return (
            <div
              key={sourceSlug}
              className={`rounded-xl border p-3 ${
                isOverallBest
                  ? "border-accent-blue/30 bg-accent-blue/5"
                  : "border-surface-200 bg-white"
              }`}
            >
              {/* Source header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Store className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-sm font-semibold text-text-primary">
                    {sourceName}
                  </span>
                  {isOverallBest && (
                    <span className="px-1.5 py-0.5 bg-accent-blue text-white text-[10px] font-bold rounded-full">
                      Melhor
                    </span>
                  )}
                </div>
                <span className="text-xs text-text-muted">
                  {offers.length} {offers.length === 1 ? "oferta" : "ofertas"}
                </span>
              </div>

              {/* Offers from this source */}
              <div className="space-y-1.5">
                {offers.map((offer, i) => {
                  const discount =
                    offer.originalPrice && offer.originalPrice > offer.currentPrice
                      ? Math.round(
                          ((offer.originalPrice - offer.currentPrice) /
                            offer.originalPrice) *
                            100
                        )
                      : null;

                  return (
                    <div
                      key={offer.id}
                      className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-lg bg-surface-50/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary truncate">
                          {offer.rawTitle}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {offer.rating != null && (
                            <span className="flex items-center gap-0.5 text-[10px] text-accent-orange">
                              <Star className="h-2.5 w-2.5 fill-current" />
                              {offer.rating.toFixed(1)}
                            </span>
                          )}
                          {offer.isFreeShipping && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-accent-purple">
                              <Truck className="h-2.5 w-2.5" /> Frete gratis
                            </span>
                          )}
                          {offer.couponText && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-orange font-medium">
                              <Tag className="h-2.5 w-2.5" /> {offer.couponText}
                            </span>
                          )}
                          {offer.offerScore >= 70 && (
                            <ShieldCheck className="h-2.5 w-2.5 text-accent-green" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="text-right">
                          {offer.originalPrice &&
                            offer.originalPrice > offer.currentPrice && (
                              <p className="text-[10px] text-text-muted line-through">
                                {formatPrice(offer.originalPrice)}
                              </p>
                            )}
                          <p
                            className={`text-sm font-bold font-display ${
                              offer.currentPrice === bestPrice
                                ? "text-accent-blue"
                                : "text-text-primary"
                            }`}
                          >
                            {formatPrice(offer.currentPrice)}
                          </p>
                          {discount && (
                            <p className="text-[10px] text-accent-green font-medium">
                              -{discount}%
                            </p>
                          )}
                        </div>

                        <a
                          href={offer.affiliateUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold btn-secondary"
                        >
                          <ExternalLink className="h-3 w-3" /> Ver
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
