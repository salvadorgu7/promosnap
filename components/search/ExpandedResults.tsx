"use client"

import { useState } from "react"
import { Sparkles, ChevronDown, ChevronUp, ExternalLink, ShoppingBag, Store, Shield } from "lucide-react"
import Image from "next/image"
import { formatPrice } from "@/lib/utils"

// ── Types (client-side mirror of server types) ───────────────────────────────

interface ExpandedResult {
  id: string
  title: string
  price: number
  originalPrice?: number
  discount?: number
  imageUrl?: string
  href: string
  affiliateUrl: string
  sourceType: "internal" | "expanded"
  marketplace: string
  storeName: string
  brand?: string
  affiliateStatus: "verified" | "best_effort" | "none"
  qualityScore: number
  isMonetizable: boolean
  isFreeShipping?: boolean
}

interface ExpandedResultsProps {
  results: ExpandedResult[]
  framing?: string
  coverageScore: number
  onClickout?: (result: ExpandedResult, position: number) => void
}

// ── Store Colors ─────────────────────────────────────────────────────────────

const STORE_COLORS: Record<string, string> = {
  "amazon-br": "text-[#FF9900]",
  "mercadolivre": "text-[#2D3277]",
  "shopee": "text-[#EE4D2D]",
  "shein": "text-surface-800",
  "magalu": "text-[#0086FF]",
  "kabum": "text-[#FF6500]",
  "casasbahia": "text-[#0066CC]",
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ExpandedResults({ results, framing, coverageScore, onClickout }: ExpandedResultsProps) {
  const [showAll, setShowAll] = useState(false)

  // Only expanded (external) results
  const expanded = results.filter(r => r.sourceType === "expanded")

  if (expanded.length === 0) return null

  const visible = showAll ? expanded : expanded.slice(0, 4)
  const hasMore = expanded.length > 4

  return (
    <div className="mt-4">
      {/* Section header with framing text */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm text-text-primary truncate">
            {framing || "Mais opções em lojas parceiras"}
          </h3>
          <p className="text-[10px] text-text-muted">
            Resultados de lojas verificadas com link seguro
          </p>
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-50 border border-brand-500/15">
          <ShoppingBag className="w-3 h-3 text-brand-500" />
          <span className="text-[10px] font-semibold text-brand-500">{expanded.length}</span>
        </div>
      </div>

      {/* Results grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
        {visible.map((result, i) => (
          <ExpandedCard
            key={result.id}
            result={result}
            position={i}
            onClick={() => onClickout?.(result, i)}
          />
        ))}
      </div>

      {/* Show more / less */}
      {hasMore && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 text-xs font-medium text-text-secondary transition-colors"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Mostrar menos
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Ver mais {expanded.length - 4} opções
            </>
          )}
        </button>
      )}
    </div>
  )
}

// ── Card Component ───────────────────────────────────────────────────────────

function ExpandedCard({
  result,
  position,
  onClick,
}: {
  result: ExpandedResult
  position: number
  onClick?: () => void
}) {
  const storeColor = STORE_COLORS[result.marketplace] || "text-text-secondary"

  return (
    <a
      href={result.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={onClick}
      className="card group hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col"
    >
      {/* Image */}
      <div className="relative aspect-square bg-surface-50 overflow-hidden">
        {result.imageUrl ? (
          <Image
            src={result.imageUrl}
            alt={result.title}
            fill
            sizes="(max-width: 640px) 50vw, 25vw"
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-surface-300" />
          </div>
        )}

        {/* Discount badge */}
        {result.discount && result.discount > 0 && result.discount <= 85 && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-red text-white">
            -{result.discount}%
          </span>
        )}

        {/* External badge */}
        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-brand-50 text-brand-600 border border-brand-500/15">
          <ExternalLink className="w-2.5 h-2.5 inline mr-0.5" />
          Parceiro
        </span>
      </div>

      {/* Content */}
      <div className="p-2 flex-1 flex flex-col">
        {/* Store name */}
        <div className="flex items-center gap-1 mb-1">
          <Store className="w-3 h-3 text-surface-400 flex-shrink-0" />
          <span className={`text-[10px] font-semibold truncate ${storeColor}`}>
            {result.storeName}
          </span>
          {result.affiliateStatus === "verified" && (
            <Shield className="w-2.5 h-2.5 text-accent-green flex-shrink-0" />
          )}
        </div>

        {/* Title */}
        <p className="text-[11px] md:text-xs text-text-primary line-clamp-2 font-medium leading-tight flex-1">
          {result.title}
        </p>

        {/* Price */}
        <div className="mt-1.5">
          {result.originalPrice && result.originalPrice > result.price && (
            <span className="text-[10px] text-text-muted line-through block">
              {formatPrice(result.originalPrice)}
            </span>
          )}
          <span className="text-sm font-bold text-accent-green">
            {formatPrice(result.price)}
          </span>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {result.isFreeShipping && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-green/10 text-accent-green font-medium">
              Frete grátis
            </span>
          )}
          {result.brand && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-100 text-text-muted">
              {result.brand}
            </span>
          )}
        </div>
      </div>
    </a>
  )
}
