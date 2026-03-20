"use client"

import { useState, useEffect } from "react"
import { TrendingDown } from "lucide-react"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"

interface PriceDrop {
  id: string
  name: string
  slug: string
  imageUrl: string | null
  currentPrice: number
  previousPrice: number
  discountPct: number
}

export default function PriceDropRail() {
  const [drops, setDrops] = useState<PriceDrop[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/home/price-drops")
      .then(r => r.ok ? r.json() : { drops: [] })
      .then(d => setDrops(d.drops ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || drops.length === 0) return null

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-accent-red/12 flex items-center justify-center border border-accent-red/15">
            <TrendingDown className="w-4 h-4 text-accent-red" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-bold text-lg text-text-primary">Caiu Agora</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-red/10 text-accent-red border border-accent-red/20">
                24h
              </span>
            </div>
            <p className="text-xs text-text-muted">Quedas de preco detectadas nas ultimas horas</p>
          </div>
          <Link href="/vale-esperar" className="ml-auto text-xs text-brand-500 hover:text-brand-600 font-medium">
            Ver todas →
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {drops.map(drop => (
            <Link
              key={drop.id}
              href={`/produto/${drop.slug}`}
              className="flex-shrink-0 w-[180px] p-3 rounded-xl border border-accent-red/15 bg-accent-red/5 hover:bg-accent-red/10 transition-colors"
            >
              {drop.imageUrl && (
                <img
                  src={drop.imageUrl}
                  alt={drop.name}
                  className="w-full h-24 object-contain rounded-lg bg-white mb-2"
                  loading="lazy"
                />
              )}
              <p className="text-xs font-medium text-text-primary line-clamp-2 mb-1">{drop.name}</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-bold font-display text-text-primary">
                  {formatPrice(drop.currentPrice)}
                </span>
                <span className="text-[10px] text-accent-red font-bold">
                  -{drop.discountPct}%
                </span>
              </div>
              <p className="text-[10px] text-text-muted line-through">
                {formatPrice(drop.previousPrice)}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
