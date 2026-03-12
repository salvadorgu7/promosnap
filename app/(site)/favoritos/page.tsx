"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { Heart, ShoppingBag, TrendingUp, TrendingDown, Minus, Bell, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { useWatchlist } from "@/lib/hooks/useWatchlist"
import OfferCard from "@/components/cards/OfferCard"
import EmptyState from "@/components/ui/EmptyState"
import ErrorState from "@/components/ui/ErrorState"
import { OfferCardSkeleton } from "@/components/ui/Skeleton"
import { formatPrice } from "@/lib/utils"
import type { ProductCard } from "@/types"

type GroupMode = "all" | "category"

export default function FavoritosPage() {
  const { favorites, getPriceChange, updatePriceCacheBatch } = useWatchlist()
  const [products, setProducts] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [groupMode, setGroupMode] = useState<GroupMode>("all")

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
      .then((data: ProductCard[]) => {
        setProducts(data)
        // Update price cache with current prices
        updatePriceCacheBatch(
          data.map((p) => ({ id: p.id, price: p.bestOffer.price }))
        )
      })
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

  // Group products by category
  const grouped = useMemo(() => {
    if (groupMode !== "category") return null
    const groups: Record<string, ProductCard[]> = {}
    for (const p of products) {
      const cat = p.category || "Outros"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [products, groupMode])

  // Summary stats
  const stats = useMemo(() => {
    let drops = 0
    let rises = 0
    for (const p of products) {
      const { change } = getPriceChange(p.id, p.bestOffer.price)
      if (change === "down") drops++
      if (change === "up") rises++
    }
    return { drops, rises }
  }, [products, getPriceChange])

  function PriceChangeIndicator({ product }: { product: ProductCard }) {
    const { change, diff, diffPercent } = getPriceChange(product.id, product.bestOffer.price)

    if (change === "unknown" || change === "same") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
          <Minus className="w-3 h-3" /> Sem mudanca
        </span>
      )
    }

    if (change === "down") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-accent-green font-medium">
          <ArrowDownRight className="w-3.5 h-3.5" />
          Baixou {diffPercent}% ({formatPrice(diff)})
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 text-xs text-accent-red font-medium">
        <ArrowUpRight className="w-3.5 h-3.5" />
        Subiu {diffPercent}% ({formatPrice(diff)})
      </span>
    )
  }

  function WatchlistCard({ product }: { product: ProductCard }) {
    return (
      <div className="relative">
        <OfferCard product={product} />
        {/* Price change overlay at bottom of card */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-surface-100 px-3 py-2 rounded-b-xl">
          <div className="flex items-center justify-between gap-2">
            <PriceChangeIndicator product={product} />
            <Link
              href={`/produto/${product.slug}#alerta`}
              className="inline-flex items-center gap-1 text-[10px] text-accent-orange hover:text-accent-orange/80 font-medium transition-colors"
            >
              <Bell className="w-3 h-3" />
              Alerta
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
            <Heart className="h-5 w-5 text-accent-red" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">
              Minha Watchlist
            </h1>
            {!loading && favorites.length > 0 && (
              <p className="text-sm text-text-muted">
                {favorites.length} {favorites.length === 1 ? "produto monitorado" : "produtos monitorados"}
              </p>
            )}
          </div>
        </div>

        {/* Group toggle */}
        {products.length > 3 && (
          <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-lg">
            <button
              onClick={() => setGroupMode("all")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                groupMode === "all" ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setGroupMode("category")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                groupMode === "category" ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              Por categoria
            </button>
          </div>
        )}
      </div>

      {/* Quick stats bar */}
      {!loading && products.length > 0 && (stats.drops > 0 || stats.rises > 0) && (
        <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-surface-50 border border-surface-100">
          {stats.drops > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-accent-green font-medium">
              <TrendingDown className="w-4 h-4" />
              {stats.drops} {stats.drops === 1 ? "queda" : "quedas"} de preco
            </span>
          )}
          {stats.rises > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-accent-red font-medium">
              <TrendingUp className="w-4 h-4" />
              {stats.rises} {stats.rises === 1 ? "aumento" : "aumentos"}
            </span>
          )}
        </div>
      )}

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
        groupMode === "category" && grouped ? (
          <div className="space-y-8">
            {grouped.map(([category, items]) => (
              <div key={category}>
                <h2 className="text-lg font-bold font-display text-text-primary mb-3">
                  {category}
                  <span className="text-sm font-normal text-text-muted ml-2">({items.length})</span>
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {items.map((p) => (
                    <WatchlistCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {products.map((p) => (
              <WatchlistCard key={p.id} product={p} />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={Heart}
          title="Nenhum favorito ainda"
          description="Explore nossas ofertas e toque no coracao para salvar os produtos que mais gostar. Seus favoritos aparecerao aqui com acompanhamento de preco."
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
            <span className="flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5" /> Crie alertas
            </span>
          </div>
        </EmptyState>
      )}
    </div>
  )
}
