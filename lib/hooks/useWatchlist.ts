"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useFavorites } from "./useFavorites"
import { logger } from "@/lib/logger"

// ============================================
// WATCHLIST HOOK — Enhanced favorites with price tracking
// ============================================

const LAST_VISIT_KEY = "promosnap_last_visit"
const PRICE_CACHE_KEY = "promosnap_price_cache"
const FAV_CATEGORIES_KEY = "promosnap_fav_categories"
const FAV_BRANDS_KEY = "promosnap_fav_brands"
const SEARCHES_KEY = "ps_searches"
const RECENTLY_VIEWED_KEY = "ps_recently_viewed"

export interface PriceCacheEntry {
  productId: string
  price: number
  timestamp: number
}

export interface WatchlistProduct {
  id: string
  name: string
  slug: string
  imageUrl?: string
  brand?: string
  category?: string
  categorySlug?: string
  currentPrice: number
  originalPrice?: number
  cachedPrice?: number
  priceChange: "up" | "down" | "same" | "unknown"
  priceDiff: number
  priceDiffPercent: number
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (err) { logger.debug("watchlist.failed", { error: err }) }
}

export function useWatchlist() {
  const { favorites, addFavorite, removeFavorite, toggleFavorite, isFavorite } = useFavorites()
  const [lastVisit, setLastVisit] = useState<number>(0)
  const [priceCache, setPriceCache] = useState<Record<string, PriceCacheEntry>>({})
  const [favCategories, setFavCategories] = useState<string[]>([])
  const [favBrands, setFavBrands] = useState<string[]>([])

  // Load persisted state on mount
  useEffect(() => {
    const storedVisit = readJson<number>(LAST_VISIT_KEY, 0)
    setLastVisit(storedVisit)

    const storedCache = readJson<Record<string, PriceCacheEntry>>(PRICE_CACHE_KEY, {})
    setPriceCache(storedCache)

    setFavCategories(readJson<string[]>(FAV_CATEGORIES_KEY, []))
    setFavBrands(readJson<string[]>(FAV_BRANDS_KEY, []))
  }, [])

  // Record current visit timestamp (update on each page load)
  useEffect(() => {
    const now = Date.now()
    // Only update if last visit was more than 5 minutes ago (avoids rapid refreshes)
    if (now - lastVisit > 5 * 60 * 1000) {
      writeJson(LAST_VISIT_KEY, now)
    }
  }, [lastVisit])

  // Update price cache when we receive product data
  const updatePriceCache = useCallback((productId: string, price: number) => {
    setPriceCache((prev) => {
      const next = {
        ...prev,
        [productId]: { productId, price, timestamp: Date.now() },
      }
      writeJson(PRICE_CACHE_KEY, next)
      return next
    })
  }, [])

  // Batch update price cache from product list
  const updatePriceCacheBatch = useCallback((products: Array<{ id: string; price: number }>) => {
    setPriceCache((prev) => {
      const next = { ...prev }
      const now = Date.now()
      for (const p of products) {
        next[p.id] = { productId: p.id, price: p.price, timestamp: now }
      }
      writeJson(PRICE_CACHE_KEY, next)
      return next
    })
  }, [])

  // Track category/brand from viewed products
  const trackInterest = useCallback((category?: string, brand?: string) => {
    if (category) {
      setFavCategories((prev) => {
        const next = [category, ...prev.filter((c) => c !== category)].slice(0, 10)
        writeJson(FAV_CATEGORIES_KEY, next)
        return next
      })
    }
    if (brand) {
      setFavBrands((prev) => {
        const next = [brand, ...prev.filter((b) => b !== brand)].slice(0, 10)
        writeJson(FAV_BRANDS_KEY, next)
        return next
      })
    }
  }, [])

  // Compute price change for a product
  const getPriceChange = useCallback(
    (productId: string, currentPrice: number): { change: "up" | "down" | "same" | "unknown"; diff: number; diffPercent: number } => {
      const cached = priceCache[productId]
      if (!cached || !lastVisit) {
        return { change: "unknown", diff: 0, diffPercent: 0 }
      }

      // Only compare if cache entry is older than last visit
      if (cached.timestamp > lastVisit) {
        return { change: "unknown", diff: 0, diffPercent: 0 }
      }

      const diff = currentPrice - cached.price
      const diffPercent = cached.price > 0 ? Math.round((diff / cached.price) * 100) : 0

      if (Math.abs(diffPercent) < 1) return { change: "same", diff: 0, diffPercent: 0 }
      return {
        change: diff < 0 ? "down" : "up",
        diff: Math.abs(diff),
        diffPercent: Math.abs(diffPercent),
      }
    },
    [priceCache, lastVisit]
  )

  // Get all personalization signals
  const signals = useMemo(() => {
    const searches = readJson<string[]>(SEARCHES_KEY, [])
    const recentlyViewed = readJson<string[]>(RECENTLY_VIEWED_KEY, [])
    return {
      favorites,
      favCategories,
      favBrands,
      searches,
      recentlyViewed,
      lastVisit,
      hasEnoughSignal: favorites.length >= 3 || recentlyViewed.length >= 5,
    }
  }, [favorites, favCategories, favBrands, lastVisit])

  return {
    // Core favorites
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    // Watchlist enhancements
    lastVisit,
    priceCache,
    updatePriceCache,
    updatePriceCacheBatch,
    getPriceChange,
    trackInterest,
    // Personalization signals
    signals,
    favCategories,
    favBrands,
  }
}
