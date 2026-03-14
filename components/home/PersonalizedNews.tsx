"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Sparkles, Heart, Eye, Search, ChevronRight } from "lucide-react"
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

type RecommendationReason = "favorites" | "category" | "brand" | "viewed" | "search"

interface EnrichedProduct extends ProductCard {
  _reason?: RecommendationReason
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

function getReasonLabel(reason?: RecommendationReason): { text: string; icon: typeof Heart } | null {
  switch (reason) {
    case "favorites":
      return { text: "Baseado nos seus favoritos", icon: Heart }
    case "category":
      return { text: "Categoria que voce acompanha", icon: Sparkles }
    case "brand":
      return { text: "Marca de interesse", icon: Sparkles }
    case "viewed":
      return { text: "Voce visualizou similar", icon: Eye }
    case "search":
      return { text: "Relacionado a suas buscas", icon: Search }
    default:
      return null
  }
}

export default function PersonalizedNews() {
  const [products, setProducts] = useState<EnrichedProduct[]>([])
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
    const categories = signals.favCategories.slice(0, 3)
    const brands = signals.favBrands.slice(0, 2)

    const params = new URLSearchParams({ limit: "6" })
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
        const items: ProductCard[] = Array.isArray(data) ? data : data.products || []
        // Enrich with recommendation reason
        const enriched: EnrichedProduct[] = items.slice(0, 6).map((p) => {
          let reason: RecommendationReason = "category"
          if (signals.favBrands.some((b) => p.brand?.toLowerCase().includes(b.toLowerCase()))) {
            reason = "brand"
          }
          if (signals.favCategories.some((c) => p.categorySlug?.includes(c) || p.category?.toLowerCase().includes(c.toLowerCase()))) {
            reason = "category"
          }
          if (signals.favorites.length > 0) {
            reason = "favorites"
          }
          return { ...p, _reason: reason }
        })
        setProducts(enriched)
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
        href="/ofertas"
      >
        {products.map((p) => {
          const reasonInfo = getReasonLabel(p._reason)
          return (
            <div key={p.id} className="w-[200px] md:w-[240px] flex-shrink-0">
              <div className="relative">
                <OfferCard product={p} />
                {/* Recommendation reason tag */}
                {reasonInfo && (
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center gap-0.5 text-[9px] font-medium text-text-muted bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-surface-100 shadow-sm">
                      <reasonInfo.icon className="h-2.5 w-2.5" />
                      {reasonInfo.text}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </RailSection>

      {/* "Ver mais" link */}
      {products.length >= 6 && (
        <div className="max-w-7xl mx-auto px-4 -mt-2 pb-2">
          <Link
            href="/ofertas"
            className="inline-flex items-center gap-1 text-sm text-accent-blue hover:text-brand-500 transition-colors font-medium"
          >
            Ver mais recomendacoes
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  )
}
