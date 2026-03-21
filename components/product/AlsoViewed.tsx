"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Eye } from "lucide-react"
import ImageWithFallback from "@/components/ui/ImageWithFallback"
import { formatPrice } from "@/lib/utils"

interface ViewedProduct {
  slug: string
  name: string
  imageUrl?: string
  price: number
  source: string
}

/**
 * "Quem viu este produto também viu" — based on browsing history stored in localStorage.
 * Records which products the user viewed and shows related ones on product pages.
 */
export default function AlsoViewed({ currentSlug, categorySlug }: { currentSlug: string; categorySlug?: string }) {
  const [products, setProducts] = useState<ViewedProduct[]>([])

  useEffect(() => {
    try {
      const key = "ps_viewed_products"
      const raw = localStorage.getItem(key)
      if (!raw) return

      const viewed: ViewedProduct[] = JSON.parse(raw)
      // Filter: same category (if available), exclude current product, max 4
      const related = viewed
        .filter(p => p.slug !== currentSlug)
        .slice(-6) // Most recent first (reversed later)
        .reverse()
        .slice(0, 4)

      if (related.length >= 2) setProducts(related)
    } catch {
      // localStorage not available or corrupted
    }
  }, [currentSlug, categorySlug])

  if (products.length < 2) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">
          Quem viu este produto também viu
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {products.map((p) => (
          <Link
            key={p.slug}
            href={`/produto/${p.slug}`}
            className="flex flex-col p-2 rounded-lg bg-white border border-surface-200 hover:border-brand-500/30 hover:shadow-sm transition-all"
          >
            {p.imageUrl && (
              <div className="aspect-square rounded-md overflow-hidden bg-surface-50 mb-2">
                <ImageWithFallback
                  src={p.imageUrl}
                  alt={p.name}
                  width={120}
                  height={120}
                  className="w-full h-full object-contain"
                />
              </div>
            )}
            <p className="text-[11px] text-text-secondary line-clamp-2 mb-1">{p.name}</p>
            <span className="text-sm font-bold text-accent-green mt-auto">{formatPrice(p.price)}</span>
            <span className="text-[9px] text-text-muted">{p.source}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

/**
 * Call this on product page load to record the viewed product.
 * Uses localStorage — no backend needed.
 */
export function recordProductView(product: ViewedProduct) {
  try {
    const key = "ps_viewed_products"
    const raw = localStorage.getItem(key)
    const viewed: ViewedProduct[] = raw ? JSON.parse(raw) : []

    // Remove duplicate
    const filtered = viewed.filter(p => p.slug !== product.slug)
    filtered.push(product)

    // Keep last 20
    const trimmed = filtered.slice(-20)
    localStorage.setItem(key, JSON.stringify(trimmed))
  } catch {
    // localStorage not available
  }
}
