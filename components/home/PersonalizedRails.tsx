"use client"

import { useEffect, useState, useMemo } from "react"
import { Heart, TrendingDown, Sparkles } from "lucide-react"
import RailSection from "@/components/home/RailSection"
import OfferCard from "@/components/cards/OfferCard"
import {
  getTopPicksParams,
  getCategoryRecommendationParams,
} from "@/lib/personalization/recommendations"
import type { ProductCard } from "@/types"

// ============================================
// PERSONALIZED RAILS — renders based on user signals
// "Para voce" — top picks
// "Quedas recentes" — price drops on viewed/similar items
// "Baseado nos seus favoritos" — similar to favorited items
// Only renders when user has enough signal
// ============================================

const FAV_CATEGORIES_KEY = "promosnap_fav_categories"
const FAV_BRANDS_KEY = "promosnap_fav_brands"
const FAVORITES_KEY = "ps_favorites"
const RECENTLY_VIEWED_KEY = "ps_recently_viewed"

const MIN_FAVORITES = 3
const MIN_VIEWS = 5

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

async function fetchRecommendations(params: URLSearchParams): Promise<ProductCard[]> {
  try {
    const res = await fetch(`/api/recommendations?${params}`)
    if (!res.ok) return []
    const data = await res.json()
    return Array.isArray(data) ? data : data.products || []
  } catch {
    return []
  }
}

export default function PersonalizedRails() {
  const [topPicks, setTopPicks] = useState<ProductCard[]>([])
  const [priceDrops, setPriceDrops] = useState<ProductCard[]>([])
  const [favBased, setFavBased] = useState<ProductCard[]>([])
  const [loaded, setLoaded] = useState(false)

  const hasSignal = useMemo(() => {
    if (typeof window === "undefined") return false
    const favorites = readJson<string[]>(FAVORITES_KEY, [])
    const recentlyViewed = readJson<string[]>(RECENTLY_VIEWED_KEY, [])
    return favorites.length >= MIN_FAVORITES || recentlyViewed.length >= MIN_VIEWS
  }, [])

  useEffect(() => {
    if (!hasSignal) {
      setLoaded(true)
      return
    }

    const favorites = readJson<string[]>(FAVORITES_KEY, [])
    const categories = readJson<string[]>(FAV_CATEGORIES_KEY, [])
    const brands = readJson<string[]>(FAV_BRANDS_KEY, [])

    const fetches: Promise<void>[] = []

    // 1. "Para voce" — top picks from all signals
    const topParams = getTopPicksParams(categories, brands, favorites, 10)
    if (topParams) {
      fetches.push(
        fetchRecommendations(topParams).then((data) => setTopPicks(data.slice(0, 10)))
      )
    }

    // 2. "Quedas recentes" — price drops in favorite categories
    const dropParams = new URLSearchParams({ type: "price_drops", limit: "8" })
    if (categories.length > 0) dropParams.set("categories", categories.slice(0, 5).join(","))
    if (favorites.length > 0) dropParams.set("exclude", favorites.slice(0, 20).join(","))
    fetches.push(
      fetchRecommendations(dropParams).then((data) => setPriceDrops(data.slice(0, 8)))
    )

    // 3. "Baseado nos seus favoritos" — products in same categories as favorites
    const favParams = getCategoryRecommendationParams(categories, favorites, 8)
    if (favParams) {
      fetches.push(
        fetchRecommendations(favParams).then((data) => setFavBased(data.slice(0, 8)))
      )
    }

    Promise.allSettled(fetches).finally(() => setLoaded(true))
  }, [hasSignal])

  if (!loaded || !hasSignal) return null

  const hasTopPicks = topPicks.length > 0
  const hasPriceDrops = priceDrops.length > 0
  const hasFavBased = favBased.length > 0

  if (!hasTopPicks && !hasPriceDrops && !hasFavBased) return null

  return (
    <>
      {/* Para voce */}
      {hasTopPicks && (
        <div className="section-warm">
          <RailSection
            title="Para voce"
            subtitle="Selecao baseada nos seus interesses"
            icon={Sparkles}
            iconColor="text-accent-orange"
          >
            {topPicks.map((p) => (
              <div key={p.id} className="w-[200px] md:w-[240px] flex-shrink-0">
                <OfferCard product={p} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* Quedas recentes */}
      {hasPriceDrops && (
        <div className="section-highlight">
          <RailSection
            title="Quedas recentes"
            subtitle="Precos em queda em categorias do seu interesse"
            icon={TrendingDown}
            iconColor="text-accent-green"
          >
            {priceDrops.map((p) => (
              <div key={p.id} className="w-[200px] md:w-[240px] flex-shrink-0">
                <OfferCard product={p} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {/* Baseado nos seus favoritos */}
      {hasFavBased && (
        <div className="section-alt">
          <RailSection
            title="Baseado nos seus favoritos"
            subtitle="Produtos similares aos que voce curtiu"
            icon={Heart}
            iconColor="text-accent-red"
          >
            {favBased.map((p) => (
              <div key={p.id} className="w-[200px] md:w-[240px] flex-shrink-0">
                <OfferCard product={p} />
              </div>
            ))}
          </RailSection>
        </div>
      )}
    </>
  )
}
