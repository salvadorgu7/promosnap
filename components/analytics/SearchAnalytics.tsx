"use client"

import { useEffect } from "react"
import { analytics } from "@/lib/analytics/events"

interface SearchAnalyticsProps {
  query: string
  resultCount: number
  /** Number of expanded (external) results, when Busca Ampliada is active */
  expandedCount?: number
  /** Coverage score from Busca Ampliada pipeline */
  coverageScore?: number
}

/**
 * Fires GA4 search analytics events on mount.
 * - Always fires `search` (search_performed) with result count.
 * - Fires `search_zero_results` if no results found.
 * - Fires `expanded_search_triggered` when Busca Ampliada returns results.
 *
 * Drop into search results page as an invisible tracker.
 */
export default function SearchAnalytics({ query, resultCount, expandedCount, coverageScore }: SearchAnalyticsProps) {
  useEffect(() => {
    if (!query) return

    // Standard GA4 search event — includes expanded count when available
    analytics.searchPerformed({
      query,
      resultCount: resultCount + (expandedCount || 0),
    })

    // Extra signal: zero results — critical for content gap detection
    if (resultCount === 0 && !expandedCount) {
      analytics.searchZeroResults({ query })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
