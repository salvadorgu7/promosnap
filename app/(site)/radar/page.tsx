"use client"

import { useState, useEffect, useMemo } from "react"
import { Radar, Heart, TrendingDown, Sparkles, Bell, Tag, ArrowRight } from "lucide-react"
import Link from "next/link"
import OfferCard from "@/components/cards/OfferCard"
import { OfferCardSkeleton } from "@/components/ui/Skeleton"
import { useWatchlist } from "@/lib/hooks/useWatchlist"
import { formatPrice } from "@/lib/utils"
import type { ProductCard } from "@/types"

export default function RadarPage() {
  const { favorites, favCategories, getPriceChange, updatePriceCacheBatch } = useWatchlist()
  const [products, setProducts] = useState<ProductCard[]>([])
  const [opportunities, setOpportunities] = useState<ProductCard[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (favorites.length === 0 && favCategories.length === 0) {
      setProducts([])
      setOpportunities([])
      setLoading(false)
      return
    }

    setLoading(true)
    const params = new URLSearchParams()
    if (favorites.length > 0) params.set("ids", favorites.join(","))
    if (favCategories.length > 0) params.set("categories", favCategories.join(","))
    params.set("limit", "8")

    fetch(`/api/radar?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.json()
      })
      .then((data: { favorites: ProductCard[]; opportunities: ProductCard[] }) => {
        setProducts(data.favorites)
        setOpportunities(data.opportunities)
        // Update price cache with current prices
        if (data.favorites.length > 0) {
          updatePriceCacheBatch(
            data.favorites.map((p) => ({ id: p.id, price: p.bestOffer.price }))
          )
        }
      })
      .catch(() => {
        setProducts([])
        setOpportunities([])
      })
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites, favCategories])

  // Detect price drops
  const priceDrops = useMemo(() => {
    return products.filter((p) => {
      const { change } = getPriceChange(p.id, p.bestOffer.price)
      return change === "down"
    })
  }, [products, getPriceChange])

  // Stats
  const stats = useMemo(() => ({
    monitored: products.length,
    drops: priceDrops.length,
    categories: favCategories.length,
  }), [products.length, priceDrops.length, favCategories.length])

  // Empty state — no favorites at all
  if (!loading && favorites.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
            <Radar className="h-5 w-5 text-accent-blue" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">
              Meu Radar
            </h1>
            <p className="text-sm text-text-muted">Seu painel pessoal de oportunidades</p>
          </div>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-accent-red" />
          </div>
          <h2 className="text-lg font-bold font-display text-text-primary mb-2">
            Comece adicionando produtos ao seu radar
          </h2>
          <p className="text-sm text-text-muted max-w-md mb-6">
            Favorite produtos para monitorar precos e receber oportunidades personalizadas.
          </p>
          <Link
            href="/ofertas"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold"
          >
            Explorar Ofertas
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <Radar className="h-5 w-5 text-accent-blue" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary">
            Meu Radar
          </h1>
          <p className="text-sm text-text-muted">Seu painel pessoal de oportunidades</p>
        </div>
      </div>

      {/* Stats banner */}
      {!loading && (stats.monitored > 0 || stats.categories > 0) && (
        <div className="flex items-center gap-4 sm:gap-6 mb-6 p-3 rounded-xl bg-surface-50 border border-surface-100 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary font-medium">
            <Heart className="w-4 h-4 text-accent-red" />
            {stats.monitored} {stats.monitored === 1 ? "monitorado" : "monitorados"}
          </span>
          {stats.drops > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-accent-green font-medium">
              <TrendingDown className="w-4 h-4" />
              {stats.drops} {stats.drops === 1 ? "queda" : "quedas"}
            </span>
          )}
          {stats.categories > 0 && (
            <span className="inline-flex items-center gap-1.5 text-sm text-text-secondary font-medium">
              <Tag className="w-4 h-4 text-accent-purple" />
              {stats.categories} {stats.categories === 1 ? "categoria" : "categorias"}
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="space-y-8">
          <div>
            <div className="h-6 w-48 bg-surface-100 rounded mb-3 animate-pulse" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <OfferCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Seus Produtos Monitorados */}
          {products.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4.5 h-4.5 text-accent-red" />
                <h2 className="text-lg font-bold font-display text-text-primary">
                  Seus Produtos Monitorados
                </h2>
                <span className="text-sm text-text-muted">({products.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {products.map((p) => (
                  <OfferCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Quedas de Preco */}
          {priceDrops.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingDown className="w-4.5 h-4.5 text-accent-green" />
                <h2 className="text-lg font-bold font-display text-text-primary">
                  Quedas de Preco
                </h2>
                <span className="text-sm text-text-muted">({priceDrops.length})</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {priceDrops.map((p) => {
                  const { diff, diffPercent } = getPriceChange(p.id, p.bestOffer.price)
                  return (
                    <div key={p.id} className="relative">
                      <OfferCard product={p} />
                      <div className="absolute top-1.5 left-1.5 bg-accent-green text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md shadow-sm z-10">
                        -{diffPercent}% ({formatPrice(diff)})
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Oportunidades para Voce */}
          {opportunities.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4.5 h-4.5 text-accent-purple" />
                <h2 className="text-lg font-bold font-display text-text-primary">
                  Oportunidades para Voce
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {opportunities.map((p) => (
                  <OfferCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Categorias que Voce Acompanha */}
          {favCategories.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4.5 h-4.5 text-accent-blue" />
                <h2 className="text-lg font-bold font-display text-text-primary">
                  Categorias que Voce Acompanha
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {favCategories.map((slug) => (
                  <Link
                    key={slug}
                    href={`/categoria/${slug}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-50 border border-surface-100 text-sm font-medium text-text-secondary hover:bg-surface-100 hover:text-text-primary transition-colors"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    {slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    <ArrowRight className="w-3 h-3 text-text-muted" />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
