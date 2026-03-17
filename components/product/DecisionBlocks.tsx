/**
 * DecisionBlocks — Commercial decision layer for product pages.
 *
 * Shows 5 ranked offer categories (best price, best value, best trust,
 * best shipping, best rated) with reasoning and clickout links.
 *
 * Uses data from smart-comparison.ts (getCanonicalComparison + getBestChoice).
 */

import { Crown, TrendingDown, Shield, Truck, Star, Zap, CheckCircle } from "lucide-react"
import type { ComparisonResult, BestChoiceResult, ComparisonEntry } from "@/lib/catalog/smart-comparison"
import { buildClickoutUrl, type RecommendationType } from "@/lib/clickout/build-url"

// ── Types ───────────────────────────────────────────────────────────────────

interface DecisionBlocksProps {
  comparison: ComparisonResult
  bestChoice: BestChoiceResult | null
  productSlug: string
}

interface BlockDef {
  key: RecommendationType
  label: string
  icon: typeof Crown
  color: string
  bgColor: string
  borderColor: string
  entry: ComparisonEntry | null
  reason: string
}

// ── Format helpers ──────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function formatDiscount(entry: ComparisonEntry): string {
  if (entry.discount > 0) return `${entry.discount}% off`
  return ""
}

// ── Component ───────────────────────────────────────────────────────────────

export default function DecisionBlocks({ comparison, bestChoice, productSlug }: DecisionBlocksProps) {
  const { bestPrice, bestValue, bestTrust, bestShipping, bestRated, matrix } = comparison

  if (matrix.length === 0) return null

  // Build blocks array — only include ones that exist and are distinct
  const blocks: BlockDef[] = []
  const usedOfferIds = new Set<string>()

  if (bestPrice) {
    blocks.push({
      key: "best-price",
      label: "Menor Preco",
      icon: TrendingDown,
      color: "text-blue-700",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      entry: bestPrice,
      reason: bestPrice.isFreeShipping
        ? `${formatPrice(bestPrice.price)} com frete gratis`
        : `${formatPrice(bestPrice.price)} na ${bestPrice.sourceName}`,
    })
    usedOfferIds.add(bestPrice.offerId)
  }

  if (bestValue && !usedOfferIds.has(bestValue.offerId)) {
    blocks.push({
      key: "best-value",
      label: "Melhor Custo-Beneficio",
      icon: Zap,
      color: "text-amber-700",
      bgColor: "bg-amber-50",
      borderColor: "border-amber-200",
      entry: bestValue,
      reason: buildValueReason(bestValue),
    })
    usedOfferIds.add(bestValue.offerId)
  }

  if (bestTrust && !usedOfferIds.has(bestTrust.offerId)) {
    blocks.push({
      key: "best-trust",
      label: "Mais Confiavel",
      icon: Shield,
      color: "text-green-700",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      entry: bestTrust,
      reason: `Score ${bestTrust.offerScore}/100 na ${bestTrust.sourceName}`,
    })
    usedOfferIds.add(bestTrust.offerId)
  }

  if (bestShipping && !usedOfferIds.has(bestShipping.offerId)) {
    blocks.push({
      key: "best-shipping",
      label: "Melhor Frete",
      icon: Truck,
      color: "text-purple-700",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      entry: bestShipping,
      reason: bestShipping.isFreeShipping
        ? "Frete gratis"
        : bestShipping.fastDelivery
          ? "Entrega mais rapida"
          : `Melhor custo de frete`,
    })
    usedOfferIds.add(bestShipping.offerId)
  }

  if (bestRated && !usedOfferIds.has(bestRated.offerId) && bestRated.rating) {
    blocks.push({
      key: "best-rated",
      label: "Melhor Avaliado",
      icon: Star,
      color: "text-yellow-700",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-200",
      entry: bestRated,
      reason: `${bestRated.rating.toFixed(1)}/5 (${bestRated.reviewsCount ?? 0} avaliacoes)`,
    })
  }

  if (blocks.length === 0) return null

  return (
    <div className="space-y-4">
      {/* Best Choice Hero */}
      {bestChoice && (
        <div className="relative p-5 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-green-800">Melhor Escolha</p>
              <p className="text-lg font-bold text-green-900 mt-0.5">
                {formatPrice(bestChoice.entry.price)}
                <span className="text-sm font-normal text-green-700 ml-2">
                  na {bestChoice.entry.sourceName}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {bestChoice.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {reason}
                  </span>
                ))}
              </div>
            </div>
            <a
              href={buildClickoutUrl({
                offerId: bestChoice.entry.offerId,
                page: "product",
                block: "decision-summary",
                position: 0,
                recommendation: "best-overall",
                product: productSlug,
                label: "Melhor Escolha",
              })}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex-shrink-0 px-5 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors"
            >
              Ver oferta
            </a>
          </div>
          {formatDiscount(bestChoice.entry) && (
            <span className="absolute top-3 right-3 text-xs font-bold text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
              {formatDiscount(bestChoice.entry)}
            </span>
          )}
        </div>
      )}

      {/* Decision Grid */}
      {blocks.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {blocks.map((block, i) => {
            const Icon = block.icon
            return (
              <a
                key={block.key}
                href={buildClickoutUrl({
                  offerId: block.entry!.offerId,
                  page: "product",
                  block: "recommendation",
                  position: i,
                  recommendation: block.key,
                  product: productSlug,
                  label: block.label,
                })}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className={`block p-4 rounded-xl border ${block.borderColor} ${block.bgColor} hover:shadow-sm transition-all group`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${block.color}`} />
                  <span className={`text-xs font-bold uppercase tracking-wide ${block.color}`}>
                    {block.label}
                  </span>
                </div>
                <p className="text-lg font-bold text-text-primary">
                  {formatPrice(block.entry!.price)}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  {block.reason}
                </p>
                <p className="text-xs font-medium text-text-secondary mt-2 group-hover:underline">
                  Ver na {block.entry!.sourceName} →
                </p>
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildValueReason(entry: ComparisonEntry): string {
  const parts: string[] = []
  if (entry.isFreeShipping) parts.push("frete gratis")
  if (entry.offerScore >= 70) parts.push("vendedor confiavel")
  if (entry.discount >= 15) parts.push(`${entry.discount}% off`)
  if (entry.rating && entry.rating >= 4.0) parts.push(`nota ${entry.rating.toFixed(1)}`)

  if (parts.length === 0) return `Melhor equilibrio na ${entry.sourceName}`
  return `${formatPrice(entry.price)} — ${parts.join(", ")}`
}
