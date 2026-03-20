"use client"

import { useState, useEffect } from "react"

interface LiveViewersProps {
  popularityScore: number
}

export default function LiveViewers({ popularityScore }: LiveViewersProps) {
  const [viewers, setViewers] = useState(0)

  useEffect(() => {
    if (popularityScore < 50) return

    // Base viewers from popularity
    const base = popularityScore > 80 ? 5 + Math.floor(Math.random() * 8) :
                 popularityScore > 60 ? 2 + Math.floor(Math.random() * 5) :
                 1 + Math.floor(Math.random() * 3)

    setViewers(base)

    // Update every 30s with ±1 variation
    const interval = setInterval(() => {
      setViewers(prev => {
        const delta = Math.random() > 0.5 ? 1 : -1
        return Math.max(1, Math.min(prev + delta, base + 5))
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [popularityScore])

  if (viewers <= 0) return null

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-text-muted">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-red opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-red" />
      </span>
      {viewers} {viewers === 1 ? "pessoa vendo" : "pessoas vendo"} agora
    </span>
  )
}
