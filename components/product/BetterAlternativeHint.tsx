import Link from "next/link"
import { ArrowRight, Zap } from "lucide-react"
import type { ProductCard } from "@/types"

interface BetterAlternativeHintProps {
  alternatives: ProductCard[]
  currentPrice: number
  currentScore: number
}

export default function BetterAlternativeHint({ alternatives, currentPrice, currentScore }: BetterAlternativeHintProps) {
  // Find an alternative that is cheaper with a similar or better score
  const better = alternatives.find(
    a => a.bestOffer.price < currentPrice * 0.9 && (a.bestOffer.offerScore || 0) >= currentScore * 0.8
  )

  if (!better) return null

  const savings = currentPrice - better.bestOffer.price
  const savingsPercent = Math.round((savings / currentPrice) * 100)

  return (
    <div className="rounded-xl border border-accent-blue/20 bg-accent-blue/5 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap className="w-4 h-4 text-accent-blue" />
        <span className="text-xs font-semibold text-accent-blue">
          Alternativa mais barata
        </span>
      </div>
      <Link
        href={`/produto/${better.slug}`}
        className="group flex items-center gap-3"
      >
        {better.imageUrl && (
          <img
            src={better.imageUrl}
            alt={better.name}
            className="w-12 h-12 object-contain rounded-lg bg-white flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary group-hover:text-accent-blue transition-colors truncate">
            {better.name}
          </p>
          <p className="text-xs text-accent-green font-semibold">
            {savingsPercent}% mais barato (economize R$ {savings.toFixed(2).replace(".", ",")})
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-accent-blue flex-shrink-0 transition-colors" />
      </Link>
    </div>
  )
}
