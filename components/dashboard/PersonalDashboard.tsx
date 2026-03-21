"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Clock, Bell, Heart, TrendingDown, Search, ArrowRight } from "lucide-react"
import { formatPrice } from "@/lib/utils"
import ImageWithFallback from "@/components/ui/ImageWithFallback"

interface ViewedProduct {
  slug: string
  name: string
  imageUrl?: string
  price: number
  source: string
}

interface SavedAlert {
  productName: string
  targetPrice: number
  slug: string
  createdAt: string
}

interface RecentSearch {
  query: string
  timestamp: number
}

/**
 * Personal Dashboard — localStorage-based, no login required.
 * Shows: recent searches, viewed products, saved alerts, favorites.
 */
export default function PersonalDashboard() {
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([])
  const [viewedProducts, setViewedProducts] = useState<ViewedProduct[]>([])
  const [tab, setTab] = useState<"recentes" | "vistos" | "alertas">("recentes")

  useEffect(() => {
    try {
      // Load recent searches
      const searches = localStorage.getItem("ps_recent_searches")
      if (searches) setRecentSearches(JSON.parse(searches).slice(-10).reverse())

      // Load viewed products
      const viewed = localStorage.getItem("ps_viewed_products")
      if (viewed) setViewedProducts(JSON.parse(viewed).slice(-12).reverse())
    } catch {
      // localStorage unavailable
    }
  }, [])

  const hasData = recentSearches.length > 0 || viewedProducts.length > 0

  if (!hasData) return null

  return (
    <div className="bg-white dark:bg-surface-900 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-surface-200 dark:border-surface-700">
        {[
          { key: "recentes" as const, icon: Search, label: "Buscas", count: recentSearches.length },
          { key: "vistos" as const, icon: Clock, label: "Vistos", count: viewedProducts.length },
        ].map(({ key, icon: Icon, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-semibold transition-colors ${
              tab === key
                ? "text-brand-600 border-b-2 border-brand-500 bg-brand-50/50"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
            {count > 0 && (
              <span className="bg-surface-100 text-text-muted px-1.5 py-0.5 rounded-full text-[10px]">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3">
        {tab === "recentes" && (
          <div className="space-y-1">
            {recentSearches.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4">Nenhuma busca recente</p>
            ) : (
              recentSearches.slice(0, 8).map((s, i) => (
                <Link
                  key={i}
                  href={`/busca?q=${encodeURIComponent(s.query)}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-surface-50 transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-surface-400" />
                  <span className="text-sm text-text-secondary flex-1">{s.query}</span>
                  <ArrowRight className="w-3 h-3 text-surface-400" />
                </Link>
              ))
            )}
          </div>
        )}

        {tab === "vistos" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {viewedProducts.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-4 col-span-full">Nenhum produto visto</p>
            ) : (
              viewedProducts.slice(0, 6).map((p) => (
                <Link
                  key={p.slug}
                  href={`/produto/${p.slug}`}
                  className="flex flex-col p-2 rounded-lg border border-surface-200 hover:border-brand-500/30 transition-all"
                >
                  {p.imageUrl && (
                    <div className="aspect-square rounded-md overflow-hidden bg-surface-50 mb-1.5">
                      <ImageWithFallback
                        src={p.imageUrl}
                        alt={p.name}
                        width={100}
                        height={100}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-text-muted line-clamp-2">{p.name}</p>
                  <span className="text-xs font-bold text-accent-green mt-auto pt-1">{formatPrice(p.price)}</span>
                </Link>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Record a search query to localStorage for the personal dashboard.
 */
export function recordSearch(query: string) {
  try {
    const key = "ps_recent_searches"
    const raw = localStorage.getItem(key)
    const searches: RecentSearch[] = raw ? JSON.parse(raw) : []

    // Deduplicate
    const filtered = searches.filter(s => s.query.toLowerCase() !== query.toLowerCase())
    filtered.push({ query, timestamp: Date.now() })

    // Keep last 20
    localStorage.setItem(key, JSON.stringify(filtered.slice(-20)))
  } catch {
    // localStorage unavailable
  }
}
