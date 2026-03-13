"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Clock,
  TrendingDown,
  TrendingUp,
  Sparkles,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  ChevronRight,
} from "lucide-react"
import RailSection from "@/components/home/RailSection"
import OfferCard from "@/components/cards/OfferCard"
import { formatPrice } from "@/lib/utils"
import type { ProductCard } from "@/types"

const LAST_VISIT_KEY = "promosnap_last_visit"

interface UpdatesResponse {
  priceDrops?: ProductCard[]
  newProducts?: ProductCard[]
  newGuides?: Array<{ slug: string; title: string; publishedAt: string }>
}

function readLastVisit(): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = localStorage.getItem(LAST_VISIT_KEY)
    return raw ? parseInt(raw, 10) : 0
  } catch {
    return 0
  }
}

function formatTimeSince(timestamp: number): string {
  const diff = Date.now() - timestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 24) return `${hours}h atras`
  const days = Math.floor(hours / 24)
  if (days === 1) return "ontem"
  return `${days} dias atras`
}

export default function SinceLastVisit() {
  const [priceDrops, setPriceDrops] = useState<ProductCard[]>([])
  const [newProducts, setNewProducts] = useState<ProductCard[]>([])
  const [newGuides, setNewGuides] = useState<Array<{ slug: string; title: string; publishedAt: string }>>([])
  const [lastVisitTime, setLastVisitTime] = useState(0)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const lastVisit = readLastVisit()
    setLastVisitTime(lastVisit)

    // Only show for returning users (visited at least 1 hour ago)
    if (!lastVisit || Date.now() - lastVisit < 60 * 60 * 1000) {
      setLoaded(true)
      return
    }

    // Gather categories from recently viewed for relevance
    let categories: string[] = []
    try {
      const favCats = localStorage.getItem("promosnap_fav_categories")
      if (favCats) categories = JSON.parse(favCats).slice(0, 5)
    } catch {}

    const params = new URLSearchParams({ since: String(lastVisit), limit: "10" })
    if (categories.length > 0) {
      params.set("categories", categories.join(","))
    }

    fetch(`/api/updates?${params}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed")
        return res.json()
      })
      .then((data: UpdatesResponse) => {
        if (data.priceDrops) setPriceDrops(data.priceDrops)
        if (data.newProducts) setNewProducts(data.newProducts)
        if (data.newGuides) setNewGuides(data.newGuides)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  const hasDrops = priceDrops.length > 0
  const hasNew = newProducts.length > 0
  const hasGuides = newGuides.length > 0

  if (!hasDrops && !hasNew && !hasGuides) return null

  return (
    <>
      {/* Timeline header */}
      <div className="max-w-7xl mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center">
            <Clock className="w-4 h-4 text-text-muted" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary tracking-tight">
              Desde sua ultima visita
            </h2>
            {lastVisitTime > 0 && (
              <p className="text-xs text-text-muted">
                Ultima visita: {formatTimeSince(lastVisitTime)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline connector */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="ml-[15px] border-l-2 border-surface-200 pl-6 space-y-1 pb-2">

          {/* Price drops section */}
          {hasDrops && (
            <div className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-accent-green border-2 border-white" />
              <div className="section-highlight rounded-xl -ml-2">
                <RailSection
                  title="Quedas de preco"
                  subtitle={`${priceDrops.length} ${priceDrops.length === 1 ? "produto baixou" : "produtos baixaram"}`}
                  icon={TrendingDown}
                  iconColor="text-accent-green"
                >
                  {priceDrops.map((p) => (
                    <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
                      <div className="relative">
                        <OfferCard product={p} />
                        {/* Price drop indicator */}
                        {p.minPrice30d && p.bestOffer.price < p.minPrice30d && (
                          <div className="absolute top-2 right-2 z-10">
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold text-accent-green bg-green-50/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-green-100">
                              <ArrowDownRight className="h-2.5 w-2.5" />
                              Baixou
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </RailSection>
              </div>
            </div>
          )}

          {/* New products section */}
          {hasNew && (
            <div className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-accent-purple border-2 border-white" />
              <div className="section-alt rounded-xl -ml-2">
                <RailSection
                  title="Novos produtos"
                  subtitle="Adicionados recentemente"
                  icon={Sparkles}
                  iconColor="text-accent-purple"
                >
                  {newProducts.map((p) => (
                    <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
                      <OfferCard product={p} />
                    </div>
                  ))}
                </RailSection>
              </div>
            </div>
          )}

          {/* New guides section */}
          {hasGuides && (
            <div className="relative">
              {/* Timeline dot */}
              <div className="absolute -left-[31px] top-1 w-3 h-3 rounded-full bg-accent-blue border-2 border-white" />
              <div className="rounded-xl -ml-2 py-4">
                <div className="max-w-7xl mx-auto px-4">
                  <div className="flex items-center gap-2 mb-3">
                    <BookOpen className="w-4 h-4 text-accent-blue" />
                    <h3 className="font-display font-bold text-base text-text-primary">
                      Novos guias
                    </h3>
                  </div>
                  <div className="space-y-2">
                    {newGuides.slice(0, 3).map((guide) => (
                      <Link
                        key={guide.slug}
                        href={`/guia/${guide.slug}`}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white border border-surface-100 hover:border-accent-blue/30 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-accent-blue/5 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4 text-accent-blue" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary truncate group-hover:text-accent-blue transition-colors">
                            {guide.title}
                          </p>
                          <p className="text-[10px] text-text-muted">
                            {new Date(guide.publishedAt).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-surface-300 group-hover:text-accent-blue flex-shrink-0 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
