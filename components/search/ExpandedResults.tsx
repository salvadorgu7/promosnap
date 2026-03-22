"use client"

import { useState, useEffect, useRef } from "react"
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShoppingBag,
  Store,
  Shield,
  TrendingDown,
  Zap,
  Truck,
} from "lucide-react"
import Image from "next/image"
import { formatPrice } from "@/lib/utils"
import { analytics } from "@/lib/analytics/events"

// ── Types ───────────────────────────────────────────────────────────────────

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
  query?: string
  /** "complement" = after internal results, "rescue" = zero internal results */
  mode?: "complement" | "rescue"
}

// ── Store Branding ──────────────────────────────────────────────────────────

const STORE_BRAND: Record<string, { color: string; label: string }> = {
  "amazon-br": { color: "text-[#FF9900]", label: "Amazon" },
  "mercadolivre": { color: "text-[#2D3277]", label: "Mercado Livre" },
  "shopee": { color: "text-[#EE4D2D]", label: "Shopee" },
  "shein": { color: "text-surface-800", label: "Shein" },
  "magalu": { color: "text-[#0086FF]", label: "Magalu" },
  "kabum": { color: "text-[#FF6500]", label: "KaBuM!" },
  "casasbahia": { color: "text-[#0066CC]", label: "Casas Bahia" },
  "americanas": { color: "text-[#E60014]", label: "Americanas" },
  "carrefour": { color: "text-[#004E9A]", label: "Carrefour" },
}

// ── Smart Badge Logic ───────────────────────────────────────────────────────

function computeBadges(result: ExpandedResult, allResults: ExpandedResult[]) {
  const badges: { label: string; variant: "green" | "blue" | "orange" | "neutral" }[] = []

  // Cheapest expanded result
  const cheapest = allResults.reduce((a, b) => (a.price < b.price ? a : b))
  if (result.id === cheapest.id && allResults.length > 1) {
    badges.push({ label: "Mais barato", variant: "green" })
  }

  // High quality score
  if (result.qualityScore >= 70 && badges.length === 0) {
    badges.push({ label: "Boa opção", variant: "blue" })
  }

  // Big real discount (not fake)
  if (result.discount && result.discount >= 15 && result.discount <= 80 && badges.length === 0) {
    badges.push({ label: `${result.discount}% OFF`, variant: "orange" })
  }

  return badges.slice(0, 1) // Max 1 badge per card to keep clean
}

// ── CTA Text by Context ────────────────────────────────────────────────────

function getCtaText(result: ExpandedResult, mode: "complement" | "rescue"): string {
  if (mode === "rescue") return "Ver oferta"
  if (result.affiliateStatus === "verified") return "Ver oferta"
  return "Ver opção"
}

// ── Badge Variant Styles ────────────────────────────────────────────────────

const BADGE_STYLES = {
  green: "bg-accent-green/10 text-accent-green",
  blue: "bg-accent-blue/10 text-accent-blue",
  orange: "bg-accent-orange/10 text-accent-orange",
  neutral: "bg-surface-100 text-text-muted",
}

// ── Component ───────────────────────────────────────────────────────────────

export default function ExpandedResults({
  results,
  framing,
  coverageScore,
  query = "",
  mode = "complement",
}: ExpandedResultsProps) {
  const [showAll, setShowAll] = useState(false)
  const [mounted, setMounted] = useState(false)
  const trackedRef = useRef(false)

  // Only expanded (external) results
  const expanded = results.filter(r => r.sourceType === "expanded")

  // Smooth mount animation
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(timer)
  }, [])

  // Track impression once on mount
  useEffect(() => {
    if (expanded.length > 0 && !trackedRef.current) {
      trackedRef.current = true
      analytics.expandedResultImpression({
        query,
        resultCount: expanded.length,
        visibleCount: Math.min(expanded.length, 4),
        coverageScore,
      })
      analytics.expandedSearchTriggered({
        query,
        internalCount: results.filter(r => r.sourceType === "internal").length,
        expandedCount: expanded.length,
        coverageScore,
      })
    }
  }, [expanded.length, query, coverageScore, results])

  if (expanded.length === 0) return null

  const visible = showAll ? expanded : expanded.slice(0, 4)
  const hasMore = expanded.length > 4

  const handleCardClick = (result: ExpandedResult, position: number) => {
    analytics.expandedResultClick({
      query,
      resultId: result.id,
      marketplace: result.marketplace,
      price: result.price,
      position,
      affiliateStatus: result.affiliateStatus,
    })
  }

  const handleShowMore = () => {
    if (!showAll) {
      analytics.expandedShowMore({
        query,
        totalResults: expanded.length,
      })
    }
    setShowAll(!showAll)
  }

  return (
    <div
      className={`mt-6 transition-all duration-500 ease-out ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
      }`}
    >
      {/* ── Visual separator ─────────────────────────────────── */}
      {mode === "complement" && (
        <div className="flex items-center gap-3 mb-4">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-200 to-transparent" />
          <span className="text-[10px] font-medium text-text-muted/70 uppercase tracking-wider">
            Mais opções
          </span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-surface-200 to-transparent" />
        </div>
      )}

      {/* ── Section header ───────────────────────────────────── */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500/15 to-accent-blue/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-semibold text-sm text-text-primary leading-tight">
            {framing || "Mais opções em lojas parceiras"}
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5 hidden sm:block">
            Resultados verificados com link seguro para a loja
          </p>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-50 border border-brand-500/10">
          <ShoppingBag className="w-3 h-3 text-brand-500" />
          <span className="text-[10px] font-bold text-brand-600">{expanded.length}</span>
        </div>
      </div>

      {/* ── Results grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 md:gap-3">
        {visible.map((result, i) => (
          <ExpandedCard
            key={result.id}
            result={result}
            allResults={expanded}
            position={i}
            mode={mode}
            onClick={() => handleCardClick(result, i)}
          />
        ))}
      </div>

      {/* ── Show more / less ─────────────────────────────────── */}
      {hasMore && (
        <button
          onClick={handleShowMore}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                     border border-surface-200 bg-white hover:bg-surface-50
                     text-xs font-medium text-text-secondary
                     transition-all duration-200 hover:border-brand-500/20 hover:text-brand-600
                     active:scale-[0.98]"
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

// ── Card Component ──────────────────────────────────────────────────────────

function ExpandedCard({
  result,
  allResults,
  position,
  mode,
  onClick,
}: {
  result: ExpandedResult
  allResults: ExpandedResult[]
  position: number
  mode: "complement" | "rescue"
  onClick?: () => void
}) {
  const brand = STORE_BRAND[result.marketplace]
  const storeColor = brand?.color || "text-text-secondary"
  const storeLabel = brand?.label || result.storeName
  const badges = computeBadges(result, allResults)
  const ctaText = getCtaText(result, mode)

  return (
    <a
      href={result.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer nofollow"
      onClick={onClick}
      className="card group hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col
                 hover:border-brand-500/20 active:scale-[0.98]"
    >
      {/* Image */}
      <div className="relative aspect-square bg-surface-50 overflow-hidden">
        {result.imageUrl ? (
          <Image
            src={result.imageUrl}
            alt={result.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-surface-300" />
          </div>
        )}

        {/* Discount badge (top-left) */}
        {result.discount && result.discount > 0 && result.discount <= 85 && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent-red text-white shadow-sm">
            -{result.discount}%
          </span>
        )}

        {/* Source badge (top-right) — subtle, not scary */}
        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[8px] font-medium
                         bg-white/90 backdrop-blur-sm text-text-muted border border-surface-200/50">
          Parceiro
        </span>

        {/* Smart badge overlay (bottom-left) */}
        {badges.length > 0 && (
          <span className={`absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold shadow-sm ${BADGE_STYLES[badges[0].variant]}`}>
            {badges[0].variant === "green" && <TrendingDown className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
            {badges[0].variant === "blue" && <Zap className="w-2.5 h-2.5 inline mr-0.5 -mt-px" />}
            {badges[0].label}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-2.5 flex-1 flex flex-col">
        {/* Store name + trust */}
        <div className="flex items-center gap-1 mb-1">
          <Store className="w-3 h-3 text-surface-400 flex-shrink-0" />
          <span className={`text-[10px] font-semibold truncate ${storeColor}`}>
            {storeLabel}
          </span>
          {result.affiliateStatus === "verified" && (
            <Shield className="w-2.5 h-2.5 text-accent-green flex-shrink-0" aria-label="Link verificado" />
          )}
        </div>

        {/* Title */}
        <p className="text-[11px] md:text-xs text-text-primary line-clamp-2 font-medium leading-tight flex-1">
          {result.title}
        </p>

        {/* Price block */}
        <div className="mt-auto pt-1.5">
          {result.originalPrice && result.originalPrice > result.price && (
            <span className="text-[10px] text-text-muted line-through block leading-none">
              {formatPrice(result.originalPrice)}
            </span>
          )}
          <span className="text-sm font-bold text-accent-green leading-tight">
            {formatPrice(result.price)}
          </span>
        </div>

        {/* Micro-badges row */}
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          {result.isFreeShipping && (
            <span className="inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded-full bg-accent-green/10 text-accent-green font-medium">
              <Truck className="w-2.5 h-2.5" />
              Frete grátis
            </span>
          )}
        </div>

        {/* CTA — visible on hover (desktop), always visible (mobile) */}
        <div className="mt-2 text-center">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-brand-600
                           px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-500/10
                           group-hover:bg-brand-500 group-hover:text-white
                           transition-colors duration-200 w-full justify-center">
            <ExternalLink className="w-3 h-3" />
            {ctaText}
          </span>
        </div>
      </div>
    </a>
  )
}
