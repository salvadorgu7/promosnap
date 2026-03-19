"use client"

import { useEffect, useRef, useState } from "react"
import { TrendingUp, ShoppingBag, Package, Store } from "lucide-react"

interface EconometroProps {
  value: number
  offers?: number
  products?: number
  stores?: number
}

function formatStat(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

export default function Econometro({ value, offers, products, stores }: EconometroProps) {
  const [display, setDisplay] = useState(value)
  const animated = useRef(false)

  useEffect(() => {
    if (animated.current || display === value) return
    animated.current = true

    const from = Math.round(value * 0.7)
    const duration = 1200
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [value, display])

  const formatted = display.toLocaleString("pt-BR")

  return (
    <div className="max-w-lg mx-auto rounded-2xl bg-gradient-to-br from-accent-green/5 to-accent-green/10 border border-accent-green/15 p-5 md:p-6 shadow-card">
      {/* Main value */}
      <div className="flex items-center justify-center gap-3">
        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-accent-green/15 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-accent-green" />
        </div>
        <div>
          <div className="font-display font-extrabold text-3xl md:text-4xl text-accent-green tracking-tight">
            R$ {formatted}
          </div>
          <div className="text-xs text-accent-green/70 font-medium">
            economia gerada para compradores esta semana
          </div>
        </div>
      </div>

      {/* Stats chips */}
      {(offers || products || stores) && (
        <div className="mt-4 flex items-center justify-center gap-2 md:gap-3 flex-wrap">
          {offers != null && offers > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-surface-200/60 text-xs font-medium text-text-secondary">
              <ShoppingBag className="w-3 h-3 text-accent-blue" />
              <span className="font-bold text-accent-blue">{formatStat(offers)}</span> ofertas
            </div>
          )}
          {products != null && products > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-surface-200/60 text-xs font-medium text-text-secondary">
              <Package className="w-3 h-3 text-accent-orange" />
              <span className="font-bold text-accent-orange">{formatStat(products)}</span> produtos
            </div>
          )}
          {stores != null && stores > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 border border-surface-200/60 text-xs font-medium text-text-secondary">
              <Store className="w-3 h-3 text-surface-600" />
              <span className="font-bold text-surface-700">{formatStat(stores)}</span> lojas
            </div>
          )}
        </div>
      )}
    </div>
  )
}
