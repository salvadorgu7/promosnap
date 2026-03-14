"use client"

import { useEffect, useState, useMemo } from "react"
import { History } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useDecisionMemory } from "@/lib/hooks/useDecisionMemory"
import type { ProductCard } from "@/types"

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000

export default function DecisionMemoryBanner() {
  const { decisions } = useDecisionMemory()
  const [products, setProducts] = useState<ProductCard[]>([])

  // Filter decisions from last 7 days
  const recentDecisions = useMemo(() => {
    const cutoff = Date.now() - SEVEN_DAYS
    return decisions.filter((d) => d.timestamp > cutoff)
  }, [decisions])

  // Get unique product IDs from recent decisions (up to 4)
  const productIds = useMemo(() => {
    const seen = new Set<string>()
    const ids: string[] = []
    for (const d of recentDecisions) {
      if (!seen.has(d.productId)) {
        seen.add(d.productId)
        ids.push(d.productId)
      }
      if (ids.length >= 4) break
    }
    return ids
  }, [recentDecisions])

  useEffect(() => {
    if (productIds.length === 0) return

    fetch(`/api/radar?ids=${encodeURIComponent(productIds.join(","))}&limit=4`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch")
        return res.json()
      })
      .then((data: { favorites: ProductCard[] }) => {
        setProducts(data.favorites || [])
      })
      .catch(() => setProducts([]))
  }, [productIds])

  // Only show if user has >= 2 decisions in the last 7 days
  if (recentDecisions.length < 2 || products.length === 0) return null

  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4.5 h-4.5 text-text-muted" />
        <h2 className="text-base font-bold font-display text-text-primary">
          Voce estava pesquisando
        </h2>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
        {products.map((p) => (
          <Link
            key={p.id}
            href={`/produto/${p.slug}`}
            className="flex items-center gap-3 min-w-[220px] max-w-[260px] p-3 rounded-xl bg-surface-50 border border-surface-100 hover:border-surface-200 hover:bg-surface-100 transition-colors flex-shrink-0"
          >
            {p.imageUrl && (
              <div className="w-10 h-10 rounded-lg bg-white border border-surface-100 overflow-hidden flex-shrink-0">
                <Image
                  src={p.imageUrl}
                  alt={p.name}
                  width={40}
                  height={40}
                  className="object-contain w-full h-full"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {p.name}
              </p>
              <span className="text-xs text-accent-blue font-medium">
                Continuar
              </span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
