"use client"

import { useEffect, useRef, useState } from "react"

interface EconometroProps {
  value: number
}

export default function Econometro({ value }: EconometroProps) {
  const [display, setDisplay] = useState(value)
  const animated = useRef(false)

  useEffect(() => {
    // On client mount, animate from current display to value
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
    <div className="px-4 py-2 rounded-xl bg-accent-green/10 border border-accent-green/20">
      <div className="font-display font-extrabold text-xl md:text-2xl text-accent-green">
        R$ {formatted}
      </div>
      <div className="text-[10px] text-accent-green/80 font-medium">Economia gerada</div>
    </div>
  )
}
