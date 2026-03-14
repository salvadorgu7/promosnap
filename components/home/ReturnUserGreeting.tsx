"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkles, Radar } from "lucide-react"

export default function ReturnUserGreeting() {
  const [greeting, setGreeting] = useState<{ message: string; cta: string; href: string; icon: typeof Sparkles } | null>(null)

  useEffect(() => {
    const lastVisit = parseInt(localStorage.getItem("promosnap_last_visit") || "0", 10)
    const favorites = JSON.parse(localStorage.getItem("ps_favorites") || "[]")
    const viewed = JSON.parse(localStorage.getItem("ps_recently_viewed") || "[]")

    // Only show for returning users who visited at least 2 hours ago
    if (!lastVisit || Date.now() - lastVisit < 2 * 60 * 60 * 1000) return
    // Need some signal
    if (favorites.length === 0 && viewed.length < 3) return

    const hours = Math.floor((Date.now() - lastVisit) / (1000 * 60 * 60))
    const timeStr = hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`

    if (favorites.length >= 3) {
      setGreeting({
        message: `Voce tem ${favorites.length} produtos no radar — veja o que mudou desde ${timeStr} atras`,
        cta: "Ver Radar",
        href: "/radar",
        icon: Radar,
      })
    } else {
      setGreeting({
        message: `Bom te ver de volta! Confira as novidades desde ${timeStr} atras`,
        cta: "Ver ofertas",
        href: "/ofertas",
        icon: Sparkles,
      })
    }
  }, [])

  if (!greeting) return null

  const Icon = greeting.icon

  return (
    <div className="max-w-7xl mx-auto px-4 pt-2 pb-1">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-brand-50 to-accent-blue/5 border border-brand-500/10">
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-brand-500" />
        </div>
        <p className="text-sm text-text-secondary flex-1 min-w-0 truncate sm:whitespace-normal">
          {greeting.message}
        </p>
        <Link
          href={greeting.href}
          className="flex-shrink-0 text-xs font-semibold text-brand-500 hover:text-brand-600 transition-colors"
        >
          {greeting.cta} →
        </Link>
      </div>
    </div>
  )
}
