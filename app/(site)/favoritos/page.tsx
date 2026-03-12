"use client"

import { useEffect, useState } from "react"
import { Heart } from "lucide-react"
import { useFavorites } from "@/lib/hooks/useFavorites"
import OfferCard from "@/components/cards/OfferCard"
import EmptyState from "@/components/ui/EmptyState"
import type { ProductCard } from "@/types"

export default function FavoritosPage() {
  const { favorites } = useFavorites()
  const [products, setProducts] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (favorites.length === 0) {
      setProducts([])
      setLoading(false)
      return
    }

    const ids = favorites.join(",")
    fetch(`/api/favorites?ids=${encodeURIComponent(ids)}`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
  }, [favorites])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-6">
        <Heart className="h-6 w-6 text-accent-red" />
        <div>
          <h1 className="text-3xl font-bold font-display text-text-primary">
            Meus Favoritos
          </h1>
          {favorites.length > 0 && (
            <p className="text-sm text-text-muted">
              {favorites.length} {favorites.length === 1 ? "produto salvo" : "produtos salvos"}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="card animate-pulse h-80 bg-surface-100"
            />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {products.map((p) => (
            <OfferCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="Nenhum favorito ainda"
          description="Explore ofertas e salve seus favoritos"
          ctaLabel="Ver Ofertas"
          ctaHref="/ofertas"
        />
      )}
    </div>
  )
}
