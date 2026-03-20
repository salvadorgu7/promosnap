"use client"

import { useState, useEffect } from "react"
import { Zap, ArrowRight } from "lucide-react"
import Link from "next/link"
import { formatPrice } from "@/lib/utils"

interface OpportunityProduct {
  productId: string
  productName: string
  productSlug: string
  score: number
  signals: Array<{ type: string; count: number }>
  category?: string
}

export default function OpportunityRail() {
  const [products, setProducts] = useState<OpportunityProduct[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/home/opportunities")
      .then(r => r.ok ? r.json() : { products: [] })
      .then(d => setProducts(d.products ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || products.length === 0) return null

  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-lg bg-accent-orange/12 flex items-center justify-center border border-accent-orange/15">
            <Zap className="w-4 h-4 text-accent-orange" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg text-text-primary">Em Alta</h2>
            <p className="text-xs text-text-muted">Produtos com maior demanda agora</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {products.slice(0, 4).map(p => (
            <Link
              key={p.productId}
              href={`/produto/${p.productSlug}`}
              className="p-3 rounded-xl border border-surface-200 bg-surface-50 hover:bg-surface-100 transition-colors group"
            >
              <p className="text-sm font-medium text-text-primary line-clamp-2 mb-2 group-hover:text-brand-500">
                {p.productName}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                {p.signals.slice(0, 2).map((s, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange font-medium">
                    {s.type === 'alert' ? `${s.count} alertas` :
                     s.type === 'clickout' ? `${s.count} cliques` :
                     s.type === 'search' ? `${s.count} buscas` : s.type}
                  </span>
                ))}
              </div>
              {p.category && (
                <p className="text-[10px] text-text-muted mt-1">{p.category}</p>
              )}
              <div className="flex items-center gap-1 mt-2 text-xs text-brand-500 font-medium">
                Ver produto <ArrowRight className="w-3 h-3" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
