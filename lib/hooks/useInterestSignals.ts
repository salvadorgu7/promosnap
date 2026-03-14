"use client"

import { useState, useEffect, useCallback, useMemo } from "react"

// ============================================
// INTEREST SIGNAL MODEL — Block 1 Personalization OS
// ============================================

export interface DecisionEntry {
  type: "clickout" | "compare" | "save" | "alert"
  productId: string
  timestamp: number
  metadata?: Record<string, string>
}

export interface InterestProfile {
  topCategories: string[]
  topBrands: string[]
  recentSearchTerms: string[]
  viewedProductSlugs: string[]
  favoriteCount: number
  engagementLevel: "new" | "casual" | "engaged" | "power"
}

// localStorage keys
const KEY_FAVORITES = "ps_favorites"
const KEY_RECENTLY_VIEWED = "ps_recently_viewed"
const KEY_SEARCHES = "ps_searches"
const KEY_FAV_CATEGORIES = "promosnap_fav_categories"
const KEY_FAV_BRANDS = "promosnap_fav_brands"
const KEY_LAST_VISIT = "promosnap_last_visit"
const KEY_DECISIONS = "ps_decisions"

const MAX_SEARCHES = 30
const MAX_DECISIONS = 50

function readJsonArray<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function readNumber(key: string): number | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const n = Number(raw)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

function computeEngagementLevel(
  favCount: number,
  viewCount: number,
  searchCount: number,
  lastVisit: number | null
): InterestProfile["engagementLevel"] {
  const total = favCount + viewCount + searchCount

  // Recency bonus: visited within last 24h
  const isRecent =
    lastVisit !== null && Date.now() - lastVisit < 24 * 60 * 60 * 1000

  if (total >= 20 || (total >= 15 && isRecent)) return "power"
  if (total >= 10 || (total >= 7 && isRecent)) return "engaged"
  if (total >= 3) return "casual"
  return "new"
}

export function useInterestSignals() {
  const [favorites, setFavorites] = useState<string[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<string[]>([])
  const [searches, setSearches] = useState<string[]>([])
  const [favCategories, setFavCategories] = useState<string[]>([])
  const [favBrands, setFavBrands] = useState<string[]>([])
  const [lastVisit, setLastVisit] = useState<number | null>(null)

  // Read all signals on mount
  useEffect(() => {
    setFavorites(readJsonArray<string>(KEY_FAVORITES))
    setRecentlyViewed(readJsonArray<string>(KEY_RECENTLY_VIEWED))
    setSearches(readJsonArray<string>(KEY_SEARCHES))
    setFavCategories(readJsonArray<string>(KEY_FAV_CATEGORIES))
    setFavBrands(readJsonArray<string>(KEY_FAV_BRANDS))
    setLastVisit(readNumber(KEY_LAST_VISIT))
  }, [])

  const profile = useMemo<InterestProfile>(() => {
    return {
      topCategories: favCategories.slice(0, 5),
      topBrands: favBrands.slice(0, 5),
      recentSearchTerms: searches.slice(0, 10),
      viewedProductSlugs: recentlyViewed,
      favoriteCount: favorites.length,
      engagementLevel: computeEngagementLevel(
        favorites.length,
        recentlyViewed.length,
        searches.length,
        lastVisit
      ),
    }
  }, [favorites, recentlyViewed, searches, favCategories, favBrands, lastVisit])

  const logSearch = useCallback((query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    try {
      const prev = readJsonArray<string>(KEY_SEARCHES)
      const next = [trimmed, ...prev.filter((s) => s !== trimmed)].slice(
        0,
        MAX_SEARCHES
      )
      localStorage.setItem(KEY_SEARCHES, JSON.stringify(next))
      setSearches(next)
    } catch {
      // localStorage unavailable
    }
  }, [])

  const logDecision = useCallback(
    (
      type: DecisionEntry["type"],
      productId: string,
      metadata?: Record<string, string>
    ) => {
      try {
        const entry: DecisionEntry = {
          type,
          productId,
          timestamp: Date.now(),
          metadata,
        }
        const prev = readJsonArray<DecisionEntry>(KEY_DECISIONS)
        const next = [entry, ...prev].slice(0, MAX_DECISIONS)
        localStorage.setItem(KEY_DECISIONS, JSON.stringify(next))
      } catch {
        // localStorage unavailable
      }
    },
    []
  )

  return {
    profile,
    logSearch,
    logDecision,
  }
}
