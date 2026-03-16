"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import {
  Heart,
  ShoppingBag,
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownUp,
  SortAsc,
  Clock,
  Search,
  Sparkles,
  BellRing,
} from "lucide-react"
import { useWatchlist } from "@/lib/hooks/useWatchlist"
import OfferCard from "@/components/cards/OfferCard"
import EmptyState from "@/components/ui/EmptyState"
import ErrorState from "@/components/ui/ErrorState"
import { OfferCardSkeleton } from "@/components/ui/Skeleton"
import { formatPrice } from "@/lib/utils"
import type { ProductCard } from "@/types"

type GroupMode = "all" | "category"
type SortMode = "recent" | "price_drop" | "alphabetical"

const ALERTS_KEY = "promosnap_price_alerts"

function readAlerts(): Record<string, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(ALERTS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setAlert(productId: string) {
  try {
    const alerts = readAlerts()
    alerts[productId] = true
    localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts))
  } catch {}
}

export default function FavoritosPage() {
  const { favorites, getPriceChange, updatePriceCacheBatch } = useWatchlist()
  const [products, setProducts] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [groupMode, setGroupMode] = useState<GroupMode>("all")
  const [sortMode, setSortMode] = useState<SortMode>("recent")
  const [alerts, setAlerts] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setAlerts(readAlerts())
  }, [])

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

  // Sort products
  const sortedProducts = useMemo(() => {
    const sorted = [...products]
    switch (sortMode) {
      case "price_drop":
        sorted.sort((a, b) => {
          const changeA = getPriceChange(a.id, a.bestOffer.price)
          const changeB = getPriceChange(b.id, b.bestOffer.price)
          // Products with drops first (negative diff), then by how much they dropped
          const scoreA = changeA.change === "down" ? -changeA.diffPercent : changeA.change === "up" ? changeA.diffPercent : 0
          const scoreB = changeB.change === "down" ? -changeB.diffPercent : changeB.change === "up" ? changeB.diffPercent : 0
          return scoreA - scoreB
        })
        break
      case "alphabetical":
        sorted.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
        break
      case "recent":
      default:
        // Keep original order (most recently added first)
        break
    }
    return sorted
  }, [products, sortMode, getPriceChange])

  // Group products by category
  const grouped = useMemo(() => {
    if (groupMode !== "category") return null
    const groups: Record<string, ProductCard[]> = {}
    for (const p of sortedProducts) {
      const cat = p.category || "Outros"
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(p)
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [sortedProducts, groupMode])

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

  function handleCreateAlert(productId: string) {
    setAlert(productId)
    setAlerts((prev) => ({ ...prev, [productId]: true }))
  }

  function PriceChangeIndicator({ product }: { product: ProductCard }) {
    const { change, diff, diffPercent } = getPriceChange(product.id, product.bestOffer.price)

    if (change === "unknown" || change === "same") {
      return (
        <span className="inline-flex items-center gap-1 text-xs text-text-muted">
          <Minus className="w-3 h-3" /> Sem mudança
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
    const hasAlert = alerts[product.id] === true

    return (
      <div className="relative">
        <OfferCard product={product} />
        {/* Price change overlay at bottom of card */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-surface-100 px-3 py-2 rounded-b-xl">
          <div className="flex items-center justify-between gap-2">
            <PriceChangeIndicator product={product} />
            <div className="flex items-center gap-1.5">
              {hasAlert ? (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-accent-green font-semibold bg-green-50 px-1.5 py-0.5 rounded-full border border-green-100">
                  <BellRing className="w-2.5 h-2.5" />
                  Alerta ativo
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCreateAlert(product.id)
                  }}
                  className="inline-flex items-center gap-0.5 text-[10px] text-accent-orange hover:text-accent-orange/80 font-medium transition-colors bg-orange-50 px-1.5 py-0.5 rounded-full border border-orange-100 hover:bg-orange-100"
                >
                  <Bell className="w-2.5 h-2.5" />
                  Criar alerta
                </button>
              )}
            </div>
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

        {/* Controls row */}
        {products.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort selector */}
            <div className="flex items-center gap-1 p-1 bg-surface-100 rounded-lg">
              <button
                onClick={() => setSortMode("recent")}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  sortMode === "recent" ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                }`}
                title="Recentes"
              >
                <Clock className="w-3 h-3" />
                <span className="hidden sm:inline">Recentes</span>
              </button>
              <button
                onClick={() => setSortMode("price_drop")}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  sortMode === "price_drop" ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                }`}
                title="Queda de preço"
              >
                <ArrowDownUp className="w-3 h-3" />
                <span className="hidden sm:inline">Preço</span>
              </button>
              <button
                onClick={() => setSortMode("alphabetical")}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${
                  sortMode === "alphabetical" ? "bg-white text-text-primary shadow-sm" : "text-text-muted hover:text-text-secondary"
                }`}
                title="Alfabético"
              >
                <SortAsc className="w-3 h-3" />
                <span className="hidden sm:inline">A-Z</span>
              </button>
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
        )}
      </div>

      {/* Quick stats bar */}
      {!loading && products.length > 0 && (stats.drops > 0 || stats.rises > 0) && (
        <div className="flex items-center gap-4 mb-5 p-3 rounded-xl bg-surface-50 border border-surface-100">
          {stats.drops > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-accent-green font-medium">
              <TrendingDown className="w-4 h-4" />
              {stats.drops} {stats.drops === 1 ? "queda" : "quedas"} de preço
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
          title="Não foi possível carregar seus favoritos"
          message="Houve um problema ao buscar seus produtos salvos. Verifique sua conexão e tente novamente."
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
            {sortedProducts.map((p) => (
              <WatchlistCard key={p.id} product={p} />
            ))}
          </div>
        )
      ) : (
        <EmptyState
          icon={Heart}
          title="Nenhum favorito ainda"
          description="Explore nossas ofertas e toque no coração para salvar os produtos que mais gostar. Seus favoritos aparecerão aqui com acompanhamento de preço."
          ctaLabel="Explorar Ofertas"
          ctaHref="/ofertas"
        >
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-center gap-6 text-xs text-text-muted">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Compare preços
              </span>
              <span className="flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Acompanhe histórico
              </span>
              <span className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5" /> Crie alertas
              </span>
            </div>

            {/* Suggestions */}
            <div className="pt-4 border-t border-surface-100">
              <p className="text-sm font-medium text-text-secondary mb-3 flex items-center justify-center gap-1.5">
                <Sparkles className="w-4 h-4 text-accent-purple" />
                Sugestões para começar
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Link
                  href="/ofertas?sort=score"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-blue/5 text-accent-blue text-xs font-medium hover:bg-accent-blue/10 transition-colors border border-accent-blue/10"
                >
                  <TrendingDown className="w-3.5 h-3.5" /> Melhores ofertas
                </Link>
                <Link
                  href="/ofertas?badge=price_drop"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-green/5 text-accent-green text-xs font-medium hover:bg-accent-green/10 transition-colors border border-accent-green/10"
                >
                  <ArrowDownRight className="w-3.5 h-3.5" /> Quedas de preço
                </Link>
                <Link
                  href="/busca"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent-purple/5 text-accent-purple text-xs font-medium hover:bg-accent-purple/10 transition-colors border border-accent-purple/10"
                >
                  <Search className="w-3.5 h-3.5" /> Buscar produto
                </Link>
              </div>
            </div>
          </div>
        </EmptyState>
      )}
    </div>
  )
}
