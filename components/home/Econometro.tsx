"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { TrendingUp, ShoppingBag, Package, Store, Zap } from "lucide-react"

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

/** Formats a number with Brazilian locale dots */
function formatBRL(n: number): string {
  return n.toLocaleString("pt-BR")
}

export default function Econometro({ value, offers, products, stores }: EconometroProps) {
  const [display, setDisplay] = useState(value)
  const [mounted, setMounted] = useState(false)
  const animationRef = useRef<number | null>(null)
  const startedRef = useRef(false)

  // Initial count-up animation
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    setMounted(true)

    const from = Math.round(value * 0.7)
    const duration = 1400
    const start = performance.now()

    function tick(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(tick)
      }
    }
    animationRef.current = requestAnimationFrame(tick)

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [value])

  // Continuous micro-increment — gives the impression of live activity
  useEffect(() => {
    if (!mounted) return
    const interval = setInterval(() => {
      setDisplay(prev => prev + Math.floor(Math.random() * 3) + 1)
    }, 2800)
    return () => clearInterval(interval)
  }, [mounted])

  const formatted = formatBRL(display)

  // Split digits for individual animation
  const digits = useMemo(() => {
    return formatted.split("").map((char, i) => ({ char, key: `${i}-${char}` }))
  }, [formatted])

  return (
    <div className="econometro-container max-w-lg mx-auto rounded-2xl overflow-hidden relative">
      {/* Animated gradient background */}
      <div className="absolute inset-0 econometro-bg" />
      {/* Shimmer sweep */}
      <div className="absolute inset-0 econometro-shimmer pointer-events-none" />

      <div className="relative p-4 md:p-5">
        {/* Main value row */}
        <div className="flex items-center justify-center gap-2.5">
          {/* Pulsing icon */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
              <Zap className="w-4 h-4 md:w-5 md:h-5 text-white" />
            </div>
            {/* Ping dot */}
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-white/40" />
            </span>
          </div>

          <div>
            {/* Value with digit transition */}
            <div className="flex items-baseline gap-0.5">
              <span className="text-white/80 font-semibold text-sm md:text-base">R$</span>
              <span className="font-display font-extrabold text-2xl md:text-3xl text-white tracking-tight tabular-nums econometro-value">
                {digits.map((d, i) => (
                  <span key={i} className="inline-block transition-all duration-300 ease-out">
                    {d.char}
                  </span>
                ))}
              </span>
            </div>
            <div className="text-[10px] md:text-xs text-white/70 font-medium leading-tight">
              economia gerada esta semana
            </div>
          </div>
        </div>

        {/* Stats chips — compact row */}
        {(offers || products || stores) && (
          <div className="mt-3 flex items-center justify-center gap-1.5 md:gap-2 flex-wrap">
            {offers != null && offers > 0 && (
              <div className="econometro-chip">
                <ShoppingBag className="w-3 h-3 text-emerald-300" />
                <span className="font-bold text-white">{formatStat(offers)}</span>
                <span className="text-white/60">ofertas</span>
              </div>
            )}
            {products != null && products > 0 && (
              <div className="econometro-chip">
                <Package className="w-3 h-3 text-amber-300" />
                <span className="font-bold text-white">{formatStat(products)}</span>
                <span className="text-white/60">produtos</span>
              </div>
            )}
            {stores != null && stores > 0 && (
              <div className="econometro-chip">
                <Store className="w-3 h-3 text-blue-300" />
                <span className="font-bold text-white">{formatStat(stores)}</span>
                <span className="text-white/60">lojas</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
