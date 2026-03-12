"use client"

import { useEffect, useState } from "react"
import { Heart, ShoppingBag, TrendingUp } from "lucide-react"
import { useFavorites } from "@/lib/hooks/useFavorites"
import OfferCard from "@/components/cards/OfferCard"
import EmptyState from "@/components/ui/EmptyState"
import ErrorState from "@/components/ui/ErrorState"
import { OfferCardSkeleton } from "@/components/ui/Skeleton"
import type { ProductCard } from "@/types"

export default function FavoritosPage() {
  const { favorites } = useFavorites()
  const [products, setProducts] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const fetchFavorites = () => {
    if (favorites.length === 0) {
      setProducts([])
      setLoading(false)
      setError(false)
      return
    }

    setLoading(true)
    setError(false)
    const ids = favorites.join(",")
    fetch(`/api/favorites?ids=${encodeURIComponent(ids)}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.json()
      })
      .then((data) => setProducts(data))
      .catch(() => {
        setProducts([])
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchFavorites()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites])

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
          <Heart className="h-5 w-5 text-accent-red" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">
            Meus Favoritos
          </h1>
          {!loading && favorites.length > 0 && (
            <p className="text-sm text-text-muted">
              {favorites.length} {favorites.length === 1 ? "produto salvo" : "produtos salvos"}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {Array.from({ length: Math.min(favorites.length || 4, 8) }).map((_, i) => (
            <OfferCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          variant="network"
          title="Nao foi possivel carregar seus favoritos"
          message="Houve um problema ao buscar seus produtos salvos. Verifique sua conexao e tente novamente."
          onRetry={fetchFavorites}
        />
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
          description="Explore nossas ofertas e toque no coracao para salvar os produtos que mais gostar. Seus favoritos aparecerao aqui."
          ctaLabel="Explorar Ofertas"
          ctaHref="/ofertas"
        >
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5" /> Compare precos
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Acompanhe historico
            </span>
          </div>
        </EmptyState>
      )}
    </div>
  )
}
