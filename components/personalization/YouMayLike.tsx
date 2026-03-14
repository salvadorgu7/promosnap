"use client"

import { useState, useEffect } from "react"
import OfferCard from "@/components/cards/OfferCard"
import { getComplementaryProducts } from "@/lib/personalization/recommendations"
import type { ProductCard } from "@/types"

interface YouMayLikeProps {
  /** Current product context (for product pages) */
  currentProduct?: {
    name: string
    categorySlug: string
    brandSlug: string
    slug: string
  }
  /** Override category slugs instead of inferring */
  categorySlugs?: string[]
  /** Title override */
  title?: string
}

function readLocalStorageArray(key: string): string[] {
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

function inferCategoriesFromSignals(): string[] {
  const recentlyViewed = readLocalStorageArray("ps_recently_viewed")
  const favorites = readLocalStorageArray("ps_favorites")
  const searches = readLocalStorageArray("ps_searches")

  // Combine all signals — these are slugs/ids so we use them as category hints
  // For searches, they may contain category-like terms
  const allSignals = [...recentlyViewed, ...favorites, ...searches]

  if (allSignals.length === 0) return []

  // Try to get complementary categories from recently viewed product names
  // Since we only have slugs, use them as product name hints
  const categories = new Set<string>()
  for (const slug of recentlyViewed.slice(0, 5)) {
    const complementary = getComplementaryProducts({
      name: slug.replace(/-/g, " "),
      categorySlug: "",
      brandSlug: "",
    })
    for (const cat of complementary) {
      categories.add(cat)
    }
  }

  return Array.from(categories).slice(0, 6)
}

export default function YouMayLike({ currentProduct, categorySlugs, title }: YouMayLikeProps) {
  const [products, setProducts] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchRecommendations() {
      try {
        let cats: string[]

        if (categorySlugs && categorySlugs.length > 0) {
          cats = categorySlugs
        } else if (currentProduct) {
          cats = getComplementaryProducts(currentProduct)
        } else {
          cats = inferCategoriesFromSignals()
        }

        if (cats.length === 0) {
          setLoading(false)
          return
        }

        const params = new URLSearchParams()
        params.set("categories", cats.join(","))
        params.set("limit", "8")
        if (currentProduct?.slug) {
          params.set("exclude", currentProduct.slug)
        }

        const res = await fetch(`/api/recommendations?${params.toString()}`)
        if (!res.ok) throw new Error("Failed to fetch")

        const data = await res.json()
        if (!cancelled && Array.isArray(data)) {
          setProducts(data)
        }
      } catch {
        // Graceful fallback: show nothing
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchRecommendations()
    return () => { cancelled = true }
  }, [currentProduct, categorySlugs])

  // Graceful fallback: don't render if no products
  if (!loading && products.length === 0) return null

  return (
    <section className="py-6">
      <h2 className="text-lg font-bold text-text-primary mb-4">
        {title || "Voce pode gostar"}
      </h2>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-[200px] md:w-[220px] h-[340px] rounded-xl bg-surface-100 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[200px] md:w-[220px]">
              <OfferCard product={product} />
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
