"use client"

import { useEffect } from "react"

const STORAGE_KEY = "ps_decisions"
const MAX_DECISIONS = 50

interface DecisionEntry {
  type: string
  productId: string
  productSlug?: string
  productName?: string
  timestamp: number
  metadata?: Record<string, string>
}

export default function ComparisonTracker({ slug, title }: { slug: string; title: string }) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const prev: DecisionEntry[] = raw ? JSON.parse(raw) : []
      // Dedupe: don't log if same comparison within 5 min
      const lastSame = prev.find(d => d.type === "compare" && d.metadata?.slug === slug)
      if (lastSame && Date.now() - lastSame.timestamp < 5 * 60 * 1000) return
      const next = [{
        type: "compare",
        productId: slug,
        productName: title,
        timestamp: Date.now(),
        metadata: { slug },
      }, ...prev].slice(0, MAX_DECISIONS)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch { /* silent fail */ }
  }, [slug, title])

  return null
}
