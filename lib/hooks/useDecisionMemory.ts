"use client"

import { useState, useEffect, useCallback } from "react"

const STORAGE_KEY = "ps_decisions"
const MAX_DECISIONS = 50

export interface DecisionEntry {
  type: "clickout" | "compare" | "save" | "alert" | "view_price"
  productId: string
  productSlug?: string
  productName?: string
  timestamp: number
  metadata?: Record<string, string>
}

function readDecisions(): DecisionEntry[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

function writeDecisions(entries: DecisionEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {}
}

export function useDecisionMemory() {
  const [decisions, setDecisions] = useState<DecisionEntry[]>([])

  useEffect(() => {
    setDecisions(readDecisions())
  }, [])

  const logDecision = useCallback((entry: Omit<DecisionEntry, "timestamp">) => {
    setDecisions((prev) => {
      const next = [{ ...entry, timestamp: Date.now() }, ...prev].slice(0, MAX_DECISIONS)
      writeDecisions(next)
      return next
    })
  }, [])

  const getRecentDecisions = useCallback(
    (type?: DecisionEntry["type"], limit = 10) => {
      const filtered = type ? decisions.filter((d) => d.type === type) : decisions
      return filtered.slice(0, limit)
    },
    [decisions]
  )

  const getDecisionProducts = useCallback(
    (type?: DecisionEntry["type"]) => {
      const filtered = type ? decisions.filter((d) => d.type === type) : decisions
      const seen = new Set<string>()
      return filtered.filter((d) => {
        if (seen.has(d.productId)) return false
        seen.add(d.productId)
        return true
      })
    },
    [decisions]
  )

  return { decisions, logDecision, getRecentDecisions, getDecisionProducts }
}
