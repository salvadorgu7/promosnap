"use client"

import { useEffect, useState, useMemo } from "react"
import { Sparkles } from "lucide-react"
import RailSection from "@/components/home/RailSection"
import OfferCard from "@/components/cards/OfferCard"
import type { ProductCard } from "@/types"

// ============================================
// "Novidades para voce" — personalized recommendations
// Based on favorites, recently viewed, search history
// Shows nothing for cold users (no signals)
// ============================================

const FAV_CATEGORIES_KEY = "promosnap_fav_categories"
const FAV_BRANDS_KEY = "promosnap_fav_brands"
const FAVORITES_KEY = "ps_favorites"
const SEARCHES_KEY = "ps_searches"
const RECENTLY_VIEWED_KEY = "ps_recently_viewed"
const MIN_SIGNAL_THRESHOLD = 3 // need at least 3 total signals to show

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

export default function PersonalizedNews() {
  const [products, setProducts] = useState<ProductCard[]>([])
  const [loaded, setLoaded] = useState(false)

  // Gather signals client-side
  const signals = useMemo(() => {
    if (typeof window === "undefined") return null

    const favorites = readJson<string[]>(FAVORITES_KEY, [])
    const searches = readJson<string[]>(SEARCHES_KEY, [])
    const recentlyViewed = readJson<string[]>(RECENTLY_VIEWED_KEY, [])
    const favCategories = readJson<string[]>(FAV_CATEGORIES_KEY, [])
    const favBrands = readJson<string[]>(FAV_BRANDS_KEY, [])

    const totalSignals = favorites.length + recentlyViewed.length + searches.length
    if (totalSignals < MIN_SIGNAL_THRESHOLD) return null

    return { favorites, searches, recentlyViewed, favCategories, favBrands }
  }, [])

  useEffect(() => {
    if (!signals) {
      setLoaded(true)
      return
    }

    // Build a search query from signals
    // Use favorite categories and brands as hints
    const categories = signals.favCategories.slice(0, 3)
    const brands = signals.favBrands.slice(0, 2)

    // Try recommendations endpoint first, fallback to search
    const params = new URLSearchParams({ limit: "10" })
    if (categories.length > 0) params.set("categories", categories.join(","))
    if (brands.length > 0) params.set("brands", brands.join(","))
    if (signals.favorites.length > 0) {
      params.set("exclude", signals.favorites.slice(0, 10).join(","))
    }

    fetch(`/api/recommendations?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed")
        return res.json()
      })
      .then((data) => {
        const items = Array.isArray(data) ? data : data.products || []
        setProducts(items.slice(0, 10))
      })
      .catch(() => {
        // Silent fail — this is an enhancement, not critical
      })
      .finally(() => setLoaded(true))
  }, [signals])

  if (!loaded || products.length === 0) return null

  return (
    <div className="section-warm">
      <RailSection
        title="Novidades para voce"
        subtitle="Baseado nos seus interesses"
        icon={Sparkles}
        iconColor="text-accent-orange"
      >
        {products.map((p) => (
          <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
            <OfferCard product={p} />
          </div>
        ))}
      </RailSection>
    </div>
  )
}
