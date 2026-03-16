"use client"

import { useEffect } from "react"
import { logger } from "@/lib/logger"

const STORAGE_KEY = "ps_decisions"
const MAX_DECISIONS = 50

interface DecisionEntry {
  type: "clickout" | "compare" | "save" | "alert" | "view_price"
  productId: string
  productSlug?: string
  productName?: string
  timestamp: number
  metadata?: Record<string, string>
}

function logDecisionToStorage(entry: Omit<DecisionEntry, "timestamp">) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const prev: DecisionEntry[] = raw ? JSON.parse(raw) : []
    const next = [{ ...entry, timestamp: Date.now() }, ...prev].slice(0, MAX_DECISIONS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch (err) { logger.debug("decision-tracker.failed", { error: err }) }
}

// Expose globally so clickout links can call it
if (typeof window !== "undefined") {
  (window as any).__promosnap_logDecision = logDecisionToStorage
}

export default function DecisionTracker({
  productId,
  productSlug,
  productName,
}: {
  productId: string
  productSlug: string
  productName: string
}) {
  useEffect(() => {
    // Log view_price on page load (deduped: don't log if last decision was same product view_price within 5 min)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const prev: DecisionEntry[] = raw ? JSON.parse(raw) : []
      const lastSame = prev.find(
        d => d.type === "view_price" && d.productId === productId
      )
      if (lastSame && Date.now() - lastSame.timestamp < 5 * 60 * 1000) return
    } catch (err) { logger.debug("decision-tracker.failed", { error: err }) }

    logDecisionToStorage({
      type: "view_price",
      productId,
      productSlug,
      productName,
    })
  }, [productId, productSlug, productName])

  return null // invisible component
}
