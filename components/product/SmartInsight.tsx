import { TrendingDown, TrendingUp, Minus, Sparkles, AlertTriangle, Check, Clock } from "lucide-react"
import type { PriceStats } from "@/types"

interface SmartInsightProps {
  priceStats: PriceStats
  productName: string
  offerScore: number
  hasFreShipping: boolean
  discount: number | null
}

type Verdict = "great_buy" | "good_buy" | "wait" | "neutral"

function getVerdict(stats: PriceStats, offerScore: number, discount: number | null): { verdict: Verdict; reason: string } {
  // Near all-time low
  if (stats.current <= stats.allTimeMin * 1.05) {
    return { verdict: "great_buy", reason: "Preco proximo do minimo historico" }
  }
  // Below 30d average with good score
  if (stats.trend === "down" && offerScore >= 70) {
    return { verdict: "great_buy", reason: "Preco em queda com oferta forte" }
  }
  // Below 30d average
  if (stats.current < stats.avg30d * 0.95) {
    return { verdict: "good_buy", reason: "Abaixo da media dos ultimos 30 dias" }
  }
  // Above 30d average significantly
  if (stats.current > stats.avg30d * 1.10) {
    return { verdict: "wait", reason: "Acima da media recente — pode valer esperar" }
  }
  // Trending up
  if (stats.trend === "up") {
    return { verdict: "wait", reason: "Preco subindo — considere criar um alerta" }
  }
  return { verdict: "neutral", reason: "Preco estavel nos ultimos 30 dias" }
}

const VERDICT_CONFIG = {
  great_buy: {
    label: "Otima hora para comprar",
    icon: Check,
    color: "text-accent-green",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  good_buy: {
    label: "Bom momento",
    icon: TrendingDown,
    color: "text-accent-blue",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  wait: {
    label: "Considere esperar",
    icon: Clock,
    color: "text-accent-orange",
    bg: "bg-orange-50",
    border: "border-orange-200",
  },
  neutral: {
    label: "Preco estavel",
    icon: Minus,
    color: "text-text-muted",
    bg: "bg-surface-50",
    border: "border-surface-200",
  },
}

export default function SmartInsight({ priceStats, productName, offerScore, hasFreShipping, discount }: SmartInsightProps) {
  const { verdict, reason } = getVerdict(priceStats, offerScore, discount)
  const config = VERDICT_CONFIG[verdict]
  const Icon = config.icon

  // Build context chips
  const chips: string[] = []
  if (discount && discount >= 10) chips.push(`${discount}% off`)
  if (hasFreShipping) chips.push("Frete gratis")
  if (priceStats.trend === "down") chips.push("Em queda")

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} p-4`}>
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-accent-orange" />
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Analise PromoSnap
        </span>
      </div>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={`w-7 h-7 rounded-lg ${config.bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${config.color}`} />
        </div>
        <span className={`text-sm font-bold ${config.color}`}>
          {config.label}
        </span>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">
        {reason}
      </p>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {chips.map(chip => (
            <span key={chip} className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/80 text-text-secondary border border-surface-200">
              {chip}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
