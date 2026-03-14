"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bell, Radar, Calendar } from "lucide-react"

type HookType = "price_alert" | "radar_update" | "weekly_check"

interface ReturnHookData {
  type: HookType
  message: string
  cta: string
  href: string
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch { return fallback }
}

export default function ReturnHook() {
  const [hook, setHook] = useState<ReturnHookData | null>(null)

  useEffect(() => {
    const favorites = readJson<string[]>("ps_favorites", [])
    const lastVisit = parseInt(localStorage.getItem("promosnap_last_visit") || "0", 10)
    const viewed = readJson<string[]>("ps_recently_viewed", [])

    // Don't show for first-time visitors
    if (!lastVisit && favorites.length === 0) return

    // Pick the most relevant hook
    if (favorites.length >= 2) {
      setHook({
        type: "radar_update",
        message: `Voce tem ${favorites.length} produtos no radar. Monitore quedas de preco.`,
        cta: "Abrir Radar",
        href: "/radar",
      })
    } else if (viewed.length >= 3) {
      setHook({
        type: "price_alert",
        message: "Crie alertas de preco e seja avisado quando cair.",
        cta: "Ver produtos",
        href: "/ofertas",
      })
    } else {
      setHook({
        type: "weekly_check",
        message: "Volte sempre para conferir novas ofertas e quedas de preco.",
        cta: "Ver ofertas",
        href: "/ofertas",
      })
    }
  }, [])

  if (!hook) return null

  return (
    <div className="border-t border-surface-200 bg-gradient-to-r from-surface-50 to-brand-50/30">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          {hook.type === "radar_update" && <Radar className="w-4 h-4 text-brand-500" />}
          {hook.type === "price_alert" && <Bell className="w-4 h-4 text-brand-500" />}
          {hook.type === "weekly_check" && <Calendar className="w-4 h-4 text-brand-500" />}
        </div>
        <p className="text-sm text-text-secondary flex-1 min-w-0 truncate sm:whitespace-normal">
          {hook.message}
        </p>
        <Link
          href={hook.href}
          className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-brand-500 text-white text-xs font-semibold hover:bg-brand-600 transition-colors"
        >
          {hook.cta}
        </Link>
      </div>
    </div>
  )
}
