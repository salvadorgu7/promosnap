"use client"

import { ExternalLink, TrendingDown, TrendingUp, Minus, Bell, Star } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import ImageWithFallback from "@/components/ui/ImageWithFallback"

interface PriceContext {
  avg30d: number
  min90d: number
  allTimeMin: number
  trend: "up" | "down" | "stable"
  position: number
  isHistoricalLow: boolean
  pctBelowAvg: number | null
}

interface ExtractedSpec {
  key: string
  label: string
  value: string | number
  unit?: string
}

interface BuySignalInfo {
  level: "excelente" | "bom" | "neutro" | "aguarde"
  headline: string
  color: "green" | "blue" | "gray" | "orange"
}

interface Product {
  name: string
  price?: number
  originalPrice?: number
  discount?: number
  source: string
  url: string
  affiliateUrl: string
  imageUrl?: string
  isFromCatalog: boolean
  confidence?: "verified" | "resolved" | "raw"
  dealScore?: number
  priceContext?: PriceContext
  buySignal?: BuySignalInfo
  specs?: ExtractedSpec[]
  sourceCredibility?: number
}

const SIGNAL_STYLES = {
  excelente: "bg-emerald-100 text-emerald-700 border-emerald-200",
  bom: "bg-blue-100 text-blue-700 border-blue-200",
  neutro: "bg-gray-100 text-gray-600 border-gray-200",
  aguarde: "bg-amber-100 text-amber-700 border-amber-200",
}

const TrendIcon = ({ direction }: { direction: "up" | "down" | "stable" }) => {
  if (direction === "down") return <TrendingDown className="w-3 h-3 text-emerald-500" />
  if (direction === "up") return <TrendingUp className="w-3 h-3 text-red-400" />
  return <Minus className="w-3 h-3 text-gray-400" />
}

export default function SmartProductCard({ product, rank }: { product: Product; rank?: number }) {
  const { priceContext, buySignal, specs, dealScore } = product

  return (
    <a
      href={product.affiliateUrl || product.url}
      target="_blank"
      rel="noopener noreferrer nofollow sponsored"
      className="group flex flex-col sm:flex-row gap-3 p-3 rounded-xl bg-white border border-surface-200 hover:border-brand-500/40 hover:shadow-md transition-all"
    >
      {/* Image */}
      <div className="w-full sm:w-20 h-20 rounded-lg overflow-hidden bg-surface-50 flex-shrink-0 relative">
        {product.imageUrl ? (
          <ImageWithFallback
            src={product.imageUrl}
            alt={product.name}
            width={80}
            height={80}
            className="w-full h-full object-contain"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-surface-300 text-xs">
            Sem imagem
          </div>
        )}
        {/* Deal score badge */}
        {dealScore && dealScore >= 70 && (
          <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-brand-500 text-white text-[9px] font-bold">
            {dealScore}/100
          </div>
        )}
        {rank && rank <= 3 && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-amber-400 text-white text-[10px] font-bold flex items-center justify-center">
            {rank}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title + Source */}
        <p className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-brand-600 transition-colors">
          {product.name}
        </p>

        {/* Specs chips */}
        {specs && specs.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {specs.slice(0, 4).map((s) => (
              <span
                key={s.key}
                className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-text-muted font-medium"
              >
                {s.value}{s.unit || ""}
              </span>
            ))}
          </div>
        )}

        {/* Price row */}
        <div className="flex items-center gap-2 mt-2">
          {product.price && (
            <span className="text-base font-bold text-accent-green">
              {formatPrice(product.price)}
            </span>
          )}
          {product.originalPrice && product.originalPrice > (product.price || 0) && (
            <span className="text-xs text-text-muted line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
          {product.discount && product.discount > 0 && (
            <span className="text-[10px] font-bold text-white bg-accent-red px-1.5 py-0.5 rounded">
              -{product.discount}%
            </span>
          )}
        </div>

        {/* Source + Credibility */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[11px] text-text-muted">{product.source}</span>
          {product.confidence === "verified" && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 font-medium border border-emerald-200">
              Verificado
            </span>
          )}
          <ExternalLink className="w-3 h-3 text-surface-400 ml-auto flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        {/* Buy signal + Price context */}
        {(buySignal || priceContext) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {buySignal && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${SIGNAL_STYLES[buySignal.level]}`}>
                {buySignal.headline}
              </span>
            )}
            {priceContext && (
              <span className="text-[10px] text-text-muted flex items-center gap-0.5">
                <TrendIcon direction={priceContext.trend} />
                {priceContext.isHistoricalLow
                  ? "Menor preço histórico!"
                  : priceContext.pctBelowAvg && priceContext.pctBelowAvg > 0
                    ? `${priceContext.pctBelowAvg}% abaixo da média`
                    : priceContext.trend === "down"
                      ? "Preço em queda"
                      : priceContext.trend === "up"
                        ? "Preço subindo"
                        : "Preço estável"
                }
              </span>
            )}
          </div>
        )}
      </div>
    </a>
  )
}
