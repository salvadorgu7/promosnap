"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, TrendingDown, Truck, ShoppingBag, Shield } from "lucide-react"
import type { BuySignal } from "@/lib/decision/buy-signal"

interface MobileDecisionCompactProps {
  buySignal: BuySignal | null
  offersCount: number
  discount: number | null
  isFreeShipping: boolean
  sourceSlug: string
  offerScore: number
  children: React.ReactNode
}

export default function MobileDecisionCompact({
  buySignal,
  offersCount,
  discount,
  isFreeShipping,
  offerScore,
  children,
}: MobileDecisionCompactProps) {
  const [expanded, setExpanded] = useState(false)

  const chips: { label: string; icon: typeof TrendingDown; positive: boolean }[] = []

  if (discount && discount >= 10)
    chips.push({ label: `-${discount}%`, icon: TrendingDown, positive: true })
  if (isFreeShipping)
    chips.push({ label: "Frete gratis", icon: Truck, positive: true })
  if (offersCount > 1)
    chips.push({ label: `${offersCount} lojas`, icon: ShoppingBag, positive: true })
  if (offerScore >= 70)
    chips.push({ label: `Score ${offerScore}`, icon: Shield, positive: true })

  return (
    <div className="lg:hidden">
      {/* Compact chips row */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {chips.map((chip) => (
            <span
              key={chip.label}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${
                chip.positive
                  ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
                  : "bg-surface-100 text-text-muted border border-surface-200"
              }`}
            >
              <chip.icon className="h-3 w-3" />
              {chip.label}
            </span>
          ))}
        </div>
      )}

      {/* Expandable full analysis */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-600 transition-colors mb-2"
      >
        {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        {expanded ? "Ocultar analise" : "Ver analise completa"}
      </button>

      {expanded && (
        <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
          {children}
        </div>
      )}
    </div>
  )
}
