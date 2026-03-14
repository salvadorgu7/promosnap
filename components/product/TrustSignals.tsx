import { Shield, Clock, TrendingDown, Store, Award, Truck } from "lucide-react"
import type { PriceStats } from "@/types"

interface TrustSignalsProps {
  priceStats: PriceStats
  sourceName: string
  sourceSlug: string
  offerScore: number
  isFreeShipping: boolean
  offersCount: number
  hasHistory: boolean
}

export default function TrustSignals({
  priceStats, sourceName, sourceSlug, offerScore,
  isFreeShipping, offersCount, hasHistory,
}: TrustSignalsProps) {
  const signals: Array<{ icon: typeof Shield; label: string; color: string; bg: string }> = []

  // Price position
  if (priceStats.current <= priceStats.allTimeMin * 1.05) {
    signals.push({ icon: TrendingDown, label: "Mínimo histórico", color: "text-accent-green", bg: "bg-green-50" })
  } else if (priceStats.trend === "down") {
    signals.push({ icon: TrendingDown, label: "Em queda", color: "text-accent-green", bg: "bg-green-50" })
  } else if (priceStats.current < priceStats.avg30d) {
    signals.push({ icon: TrendingDown, label: "Abaixo da média", color: "text-accent-blue", bg: "bg-blue-50" })
  }

  // Source quality
  const SOURCE_TRUST: Record<string, string> = {
    'amazon-br': 'Amazon — alta confiança',
    'mercadolivre': 'Mercado Livre — confiável',
    'shopee': 'Shopee — verifique avaliações',
    'shein': 'Shein — entrega longa',
  }
  const sourceTrust = SOURCE_TRUST[sourceSlug]
  if (sourceTrust) {
    const isHigh = sourceSlug === 'amazon-br' || sourceSlug === 'mercadolivre'
    signals.push({
      icon: Store,
      label: sourceTrust,
      color: isHigh ? "text-accent-blue" : "text-text-muted",
      bg: isHigh ? "bg-blue-50" : "bg-surface-50",
    })
  }

  // Offer score
  if (offerScore >= 80) {
    signals.push({ icon: Award, label: `Score ${offerScore}/100`, color: "text-accent-orange", bg: "bg-orange-50" })
  }

  // Free shipping
  if (isFreeShipping) {
    signals.push({ icon: Truck, label: "Frete grátis", color: "text-accent-green", bg: "bg-green-50" })
  }

  // Multi-source
  if (offersCount > 1) {
    signals.push({ icon: Shield, label: `${offersCount} ofertas comparadas`, color: "text-brand-500", bg: "bg-brand-50" })
  }

  // History verified
  if (hasHistory) {
    signals.push({ icon: Clock, label: "Histórico verificado", color: "text-text-muted", bg: "bg-surface-50" })
  }

  if (signals.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {signals.slice(0, 4).map((s, i) => (
        <div key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${s.bg} text-[11px] font-medium ${s.color}`}>
          <s.icon className="w-3 h-3" />
          {s.label}
        </div>
      ))}
    </div>
  )
}
