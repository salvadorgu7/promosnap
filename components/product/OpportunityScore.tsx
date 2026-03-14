import { Sparkles, Check, Minus } from "lucide-react"
import type { PriceStats } from "@/types"

interface OpportunityScoreProps {
  priceStats: PriceStats
  offerScore: number
  discount: number | null
  isFreeShipping: boolean
  offersCount: number
  sourceSlug: string
}

export default function OpportunityScore({
  priceStats, offerScore, discount, isFreeShipping, offersCount, sourceSlug,
}: OpportunityScoreProps) {
  // Score components (0-100 each)
  const pricePosition = priceStats.current <= priceStats.avg30d ? 100
    : priceStats.current <= priceStats.avg30d * 1.05 ? 70
    : priceStats.current <= priceStats.avg30d * 1.15 ? 40
    : 10

  const discountReal = discount && discount >= 10 ? Math.min(100, discount * 3) : 0
  const shippingBonus = isFreeShipping ? 100 : 0
  const sourceBonus = ['amazon-br', 'mercadolivre'].includes(sourceSlug) ? 100 : 50
  const multiSource = offersCount >= 3 ? 100 : offersCount >= 2 ? 70 : 30

  // Weighted total
  const total = Math.round(
    pricePosition * 0.30 +
    offerScore * 0.25 +
    discountReal * 0.15 +
    shippingBonus * 0.10 +
    sourceBonus * 0.10 +
    multiSource * 0.10
  )

  const level = total >= 75 ? "alta" : total >= 50 ? "media" : total >= 30 ? "baixa" : "fraca"
  const config = {
    alta: { label: "Oportunidade forte", color: "text-accent-green", bg: "bg-green-50", border: "border-green-200" },
    media: { label: "Oportunidade moderada", color: "text-accent-blue", bg: "bg-blue-50", border: "border-blue-200" },
    baixa: { label: "Oportunidade leve", color: "text-accent-orange", bg: "bg-orange-50", border: "border-orange-200" },
    fraca: { label: "Sem oportunidade clara", color: "text-text-muted", bg: "bg-surface-50", border: "border-surface-200" },
  }[level]

  const factors = [
    { label: "Preço vs média 30d", pass: pricePosition >= 70 },
    { label: "Score de oferta", pass: offerScore >= 60 },
    { label: "Desconto real", pass: discountReal > 0 },
    { label: "Frete grátis", pass: isFreeShipping },
    { label: "Fonte confiável", pass: sourceBonus >= 80 },
    { label: "Comparado entre fontes", pass: offersCount >= 2 },
  ]

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-accent-orange" />
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Avaliação de Oportunidade
        </span>
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className={`text-sm font-bold ${config.color}`}>
          {config.label}
        </span>
        <span className="text-xs text-text-muted">({total}/100)</span>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {factors.map((f, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[11px]">
            {f.pass ? (
              <Check className="w-3 h-3 text-accent-green flex-shrink-0" />
            ) : (
              <Minus className="w-3 h-3 text-surface-300 flex-shrink-0" />
            )}
            <span className={f.pass ? "text-text-secondary" : "text-text-muted"}>
              {f.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
