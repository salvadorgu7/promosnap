"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TrendingDown, Scale, BookOpen, ChevronRight, Lightbulb } from "lucide-react"

interface SmartSuggestion {
  type: "price_drop" | "comparison" | "guide"
  title: string
  description: string
  href: string
  icon: typeof TrendingDown
  iconColor: string
  bgColor: string
}

// Hardcoded popular comparisons — will be replaced by COMPARISON_LIST from @/lib/seo/comparisons when available
const POPULAR_COMPARISONS: {
  slug: string
  productA: { name: string; query: string }
  productB: { name: string; query: string }
}[] = [
  { slug: "iphone-15-vs-galaxy-s24", productA: { name: "iPhone 15", query: "iphone 15" }, productB: { name: "Galaxy S24", query: "galaxy s24" } },
  { slug: "airpods-pro-vs-galaxy-buds", productA: { name: "AirPods Pro", query: "airpods pro" }, productB: { name: "Galaxy Buds", query: "galaxy buds" } },
  { slug: "ps5-vs-xbox-series-x", productA: { name: "PS5", query: "ps5" }, productB: { name: "Xbox Series X", query: "xbox series x" } },
  { slug: "kindle-vs-kobo", productA: { name: "Kindle", query: "kindle" }, productB: { name: "Kobo", query: "kobo" } },
]

// Hardcoded popular guide pages — will be replaced by BEST_PAGES from @/lib/seo/best-pages when available
const POPULAR_GUIDES: {
  slug: string
  title: string
  tokens: string[]
}[] = [
  { slug: "fones-bluetooth", title: "Melhores Fones Bluetooth", tokens: ["fones", "bluetooth", "fone", "earbuds", "headphone"] },
  { slug: "notebooks", title: "Melhores Notebooks", tokens: ["notebook", "notebooks", "laptop", "laptops"] },
  { slug: "air-fryers", title: "Melhores Air Fryers", tokens: ["air fryer", "airfryer", "fritadeira"] },
  { slug: "smartwatches", title: "Melhores Smartwatches", tokens: ["smartwatch", "relogio", "watch"] },
  { slug: "smartphones", title: "Melhores Smartphones", tokens: ["smartphone", "celular", "celulares", "iphone", "galaxy"] },
]

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

export default function SmartSuggestions() {
  const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([])

  useEffect(() => {
    const viewed = readJson<string[]>("ps_recently_viewed", [])
    const searches = readJson<string[]>("ps_searches", [])
    const categories = readJson<string[]>("promosnap_fav_categories", [])
    const favorites = readJson<string[]>("ps_favorites", [])

    // Need at least some signal
    if (viewed.length === 0 && searches.length === 0 && categories.length === 0) return

    const result: SmartSuggestion[] = []

    // 1. Price drop suggestion if user has favorites or viewed
    if (favorites.length >= 2 || viewed.length >= 3) {
      result.push({
        type: "price_drop",
        title: "Produtos que voce acompanha",
        description: `${favorites.length > 0 ? `${favorites.length} favoritos` : `${viewed.length} vistos`} — confira se algum baixou`,
        href: "/radar",
        icon: TrendingDown,
        iconColor: "text-accent-green",
        bgColor: "bg-green-50",
      })
    }

    // 2. Comparison suggestion based on searches/categories
    const tokens = [...searches.slice(0, 5), ...categories.slice(0, 3)].map(s => s.toLowerCase())
    if (tokens.length > 0) {
      const match = POPULAR_COMPARISONS.find(c =>
        tokens.some(t =>
          c.productA.query.toLowerCase().includes(t) ||
          c.productB.query.toLowerCase().includes(t) ||
          c.productA.name.toLowerCase().includes(t) ||
          c.productB.name.toLowerCase().includes(t)
        )
      )
      if (match) {
        result.push({
          type: "comparison",
          title: `${match.productA.name} vs ${match.productB.name}`,
          description: "Comparativo completo com pros, contras e veredicto",
          href: `/comparar/${match.slug}`,
          icon: Scale,
          iconColor: "text-accent-blue",
          bgColor: "bg-blue-50",
        })
      }
    }

    // 3. Guide suggestion based on categories
    if (categories.length > 0) {
      const matchGuide = POPULAR_GUIDES.find(guide =>
        categories.some(cat =>
          guide.tokens.some(pt => pt.includes(cat.toLowerCase()) || cat.toLowerCase().includes(pt))
        )
      )
      if (matchGuide) {
        result.push({
          type: "guide",
          title: matchGuide.title,
          description: "Guia completo para ajudar na sua decisao",
          href: `/melhores/${matchGuide.slug}`,
          icon: BookOpen,
          iconColor: "text-brand-500",
          bgColor: "bg-brand-50",
        })
      }
    }

    setSuggestions(result.slice(0, 3))
  }, [])

  if (suggestions.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-4 py-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-accent-orange" />
        <h2 className="font-display font-bold text-base text-text-primary">
          Sugestoes para voce
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {suggestions.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="group flex items-center gap-3 p-4 rounded-xl border border-surface-200 bg-white hover:border-accent-blue/30 hover:shadow-sm transition-all"
          >
            <div className={`w-10 h-10 rounded-xl ${s.bgColor} flex items-center justify-center flex-shrink-0`}>
              <s.icon className={`w-5 h-5 ${s.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary group-hover:text-accent-blue transition-colors truncate">
                {s.title}
              </p>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {s.description}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-accent-blue flex-shrink-0 transition-colors" />
          </Link>
        ))}
      </div>
    </section>
  )
}
