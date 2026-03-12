"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"
import { useRecentlyViewed } from "@/lib/hooks/useRecentlyViewed"
import RailSection from "@/components/home/RailSection"
import OfferCard from "@/components/cards/OfferCard"
import type { ProductCard } from "@/types"

export default function RecentlyViewedRail() {
  const { viewed } = useRecentlyViewed()
  const [products, setProducts] = useState<ProductCard[]>([])

  useEffect(() => {
    if (viewed.length === 0) return

    const slugs = viewed.join(",")
    fetch(`/api/recently-viewed?slugs=${encodeURIComponent(slugs)}`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
  }, [viewed])

  if (viewed.length === 0 || products.length === 0) return null

  return (
    <RailSection
      title="Vistos Recentemente"
      icon={Clock}
      iconColor="text-text-muted"
    >
      {products.map((p) => (
        <OfferCard key={p.id} product={p} />
      ))}
    </RailSection>
  )
}
