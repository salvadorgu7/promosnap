"use client"

import { Sparkles } from "lucide-react"

/** Shows "Novidade" badge for products imported in the last 24h */
export default function BadgeNovidade({ createdAt }: { createdAt: string | Date }) {
  const created = new Date(createdAt)
  const hoursAgo = (Date.now() - created.getTime()) / 3_600_000

  if (hoursAgo > 48) return null

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 text-[10px] font-semibold border border-brand-200 animate-pulse">
      <Sparkles className="w-3 h-3" />
      {hoursAgo < 24 ? "Novidade" : "Recente"}
    </span>
  )
}
