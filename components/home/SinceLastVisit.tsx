"use client"

import { useEffect, useState } from "react"
import { Clock, TrendingDown, Sparkles } from "lucide-react"
import RailSection from "@/components/home/RailSection"
import OfferCard from "@/components/cards/OfferCard"
import type { ProductCard } from "@/types"

const LAST_VISIT_KEY = "promosnap_last_visit"

function readLastVisit(): number {
  if (typeof window === "undefined") return 0
  try {
    const raw = localStorage.getItem(LAST_VISIT_KEY)
    return raw ? parseInt(raw, 10) : 0
  } catch {
    return 0
  }
}

export default function SinceLastVisit() {
  const [priceDrops, setPriceDrops] = useState<ProductCard[]>([])
  const [newProducts, setNewProducts] = useState<ProductCard[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const lastVisit = readLastVisit()
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
      .then((data) => {
        if (data.priceDrops) setPriceDrops(data.priceDrops)
        if (data.newProducts) setNewProducts(data.newProducts)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  if (!loaded) return null

  const hasDrops = priceDrops.length > 0
  const hasNew = newProducts.length > 0

  if (!hasDrops && !hasNew) return null

  return (
    <>
      {hasDrops && (
        <div className="section-highlight">
          <RailSection
            title="Desde sua ultima visita"
            subtitle="Produtos que baixaram de preco"
            icon={TrendingDown}
            iconColor="text-accent-green"
          >
            {priceDrops.map((p) => (
              <div key={p.id} className="w-[240px] md:w-[260px] flex-shrink-0">
                <OfferCard product={p} />
              </div>
            ))}
          </RailSection>
        </div>
      )}

      {hasNew && (
        <div className="section-alt">
          <RailSection
            title="Novos desde sua visita"
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
      )}
    </>
  )
}
