import { Store, Shield, Truck, TrendingDown, ExternalLink } from "lucide-react"
import type { CrossSourceAnalysis, CrossSourceOffer } from "@/lib/source/cross-source"
import { formatPrice } from "@/lib/utils"

interface SourceComparisonProps {
  analysis: CrossSourceAnalysis
  offers: CrossSourceOffer[]
  productSlug: string
}

export default function SourceComparison({ analysis, offers, productSlug }: SourceComparisonProps) {
  if (offers.length <= 1) return null

  return (
    <div className="rounded-xl border border-surface-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-surface-50 border-b border-surface-200">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-text-primary">
            Comparação entre {analysis.sourceCount} lojas
          </h3>
          {analysis.priceRange.spreadPercent > 0 && (
            <span className="text-[10px] font-medium text-accent-green bg-green-50 px-1.5 py-0.5 rounded-full">
              até {analysis.priceRange.spreadPercent}% de diferença
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted mt-0.5">{analysis.recommendation}</p>
      </div>

      {/* Offer rows */}
      <div className="divide-y divide-surface-100">
        {[...offers].sort((a, b) => a.price - b.price).map((offer, i) => {
          const isCheapest = offer.offerId === analysis.cheapest?.offerId
          const isMostTrusted = offer.offerId === analysis.mostTrusted?.offerId
          const isBestOverall = offer.offerId === analysis.bestOverall?.offerId

          return (
            <div
              key={offer.offerId}
              className={`flex items-center gap-3 px-4 py-3 ${isBestOverall ? "bg-brand-50/30" : "bg-white"}`}
            >
              {/* Rank */}
              <div className="w-6 h-6 rounded-full bg-surface-100 flex items-center justify-center text-xs font-bold text-text-muted flex-shrink-0">
                {i + 1}
              </div>

              {/* Source info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-text-primary">{offer.sourceName}</span>
                  {/* Badges */}
                  {isCheapest && (
                    <span className="text-[9px] font-semibold text-accent-green bg-green-50 px-1.5 py-0.5 rounded-full">Menor preço</span>
                  )}
                  {isMostTrusted && !isCheapest && (
                    <span className="text-[9px] font-semibold text-accent-blue bg-blue-50 px-1.5 py-0.5 rounded-full">Mais confiável</span>
                  )}
                  {isBestOverall && !isCheapest && !isMostTrusted && (
                    <span className="text-[9px] font-semibold text-brand-500 bg-brand-50 px-1.5 py-0.5 rounded-full">Melhor geral</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-text-muted">
                  <span className="flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    {offer.trustLevel === 'high' ? 'Alta confiança' : offer.trustLevel === 'medium' ? 'Média' : 'Básica'}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <Truck className="w-2.5 h-2.5" />
                    {offer.isFreeShipping ? 'Frete grátis' : `~${offer.avgDeliveryDays}d`}
                  </span>
                  {offer.discount > 0 && (
                    <span className="flex items-center gap-0.5 text-accent-green">
                      <TrendingDown className="w-2.5 h-2.5" />
                      -{offer.discount}%
                    </span>
                  )}
                </div>
              </div>

              {/* Price + CTA */}
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-text-primary">{formatPrice(offer.price)}</p>
                {offer.originalPrice && offer.originalPrice > offer.price && (
                  <p className="text-[10px] text-text-muted line-through">{formatPrice(offer.originalPrice)}</p>
                )}
              </div>

              <a
                href={`/api/clickout/${offer.offerId}?page=produto&rail=source_comparison`}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex-shrink-0 p-2 rounded-lg bg-brand-500 text-white hover:bg-brand-600 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )
        })}
      </div>
    </div>
  )
}
