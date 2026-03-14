import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react"
import type { PriceStats } from "@/types"

interface PriceStabilityBadgeProps {
  priceStats: PriceStats
}

export default function PriceStabilityBadge({ priceStats }: PriceStabilityBadgeProps) {
  const { current, avg30d, min30d, max30d, trend } = priceStats
  const volatility = avg30d > 0 ? Math.round(((max30d - min30d) / avg30d) * 100) : 0

  let label: string
  let icon: typeof Activity
  let color: string
  let bg: string

  if (volatility <= 5) {
    label = "Preço estável"
    icon = Minus
    color = "text-accent-blue"
    bg = "bg-blue-50"
  } else if (volatility <= 15) {
    if (trend === "down") {
      label = "Em queda gradual"
      icon = TrendingDown
      color = "text-accent-green"
      bg = "bg-green-50"
    } else if (trend === "up") {
      label = "Subindo levemente"
      icon = TrendingUp
      color = "text-accent-orange"
      bg = "bg-orange-50"
    } else {
      label = "Oscilação leve"
      icon = Activity
      color = "text-text-muted"
      bg = "bg-surface-50"
    }
  } else {
    label = `Oscilação de ${volatility}%`
    icon = Activity
    color = "text-accent-orange"
    bg = "bg-orange-50"
  }

  const Icon = icon

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${bg} text-[11px] font-medium ${color}`}>
      <Icon className="w-3 h-3" />
      {label}
    </div>
  )
}
