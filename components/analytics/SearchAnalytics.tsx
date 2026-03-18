"use client"

import { useEffect } from "react"
import { analytics } from "@/lib/analytics/events"

interface SearchAnalyticsProps {
  query: string
  resultCount: number
}

/**
 * Fires GA4 search analytics events on mount.
 * - Always fires `search` (search_performed) with result count.
 * - Fires `search_zero_results` if no results found.
 *
 * Drop into search results page as an invisible tracker.
 */
export default function SearchAnalytics({ query, resultCount }: SearchAnalyticsProps) {
  useEffect(() => {
    if (!query) return

    // Standard GA4 search event
    analytics.searchPerformed({ query, resultCount })

    // Extra signal: zero results — critical for content gap detection
    if (resultCount === 0) {
      analytics.searchZeroResults({ query })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
