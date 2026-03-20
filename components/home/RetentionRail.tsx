"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Clock, TrendingDown, Eye, Bell, ArrowRight } from "lucide-react"
import type { ProductCard } from "@/types"
import OfferCard from "@/components/cards/OfferCard"

interface RetentionItem {
  type: 'recently_viewed' | 'price_dropped' | 'still_comparing' | 'alert_suggestion'
  product: ProductCard
  context?: string
}

/**
 * On-site retention rail — shows personalised blocks:
 * - "Continue de onde parou"
 * - "Isso caiu de preço"
 * - "Você ainda está comparando isso"
 * - "Ative alerta aqui"
 */
export default function RetentionRail() {
  const [items, setItems] = useState<RetentionItem[]>([])

  useEffect(() => {
    // Load recently viewed products from localStorage
    const viewed = getRecentlyViewed()
    if (viewed.length === 0) return

    // Fetch current data for viewed products
    fetchRetentionData(viewed).then(setItems).catch(() => {})
  }, [])

  if (items.length === 0) return null

  const grouped = {
    recently_viewed: items.filter(i => i.type === 'recently_viewed'),
    price_dropped: items.filter(i => i.type === 'price_dropped'),
  }

  return (
    <div className="space-y-6">
      {/* Price dropped items — highest priority */}
      {grouped.price_dropped.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-accent-green/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-accent-green" />
            </div>
            <h2 className="font-display font-bold text-base text-text-primary">
              Isso caiu de preco
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {grouped.price_dropped.slice(0, 4).map(item => (
              <OfferCard key={item.product.id} product={item.product} railSource="retention_price_drop" />
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed — continue where left off */}
      {grouped.recently_viewed.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-accent-blue/10 flex items-center justify-center">
              <Eye className="w-4 h-4 text-accent-blue" />
            </div>
            <h2 className="font-display font-bold text-base text-text-primary">
              Continue de onde parou
            </h2>
            <Link
              href="/favoritos"
              className="ml-auto text-xs text-brand-500 hover:text-brand-600 flex items-center gap-1"
            >
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {grouped.recently_viewed.slice(0, 4).map(item => (
              <OfferCard key={item.product.id} product={item.product} railSource="retention_recently_viewed" />
            ))}
          </div>
        </section>
      )}

      {/* Alert suggestion nudge */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-50 border border-brand-100">
          <Bell className="w-5 h-5 text-brand-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text-primary">
              Quer saber quando o preco cair?
            </p>
            <p className="text-xs text-text-muted">
              Crie alertas gratuitos e receba quando seus produtos ficarem mais baratos.
            </p>
          </div>
          <Link
            href="/alertas"
            className="text-xs font-semibold text-brand-500 hover:text-brand-600 whitespace-nowrap"
          >
            Criar alerta
          </Link>
        </div>
      )}
    </div>
  )
}

// ============================================
// HELPERS
// ============================================

function getRecentlyViewed(): string[] {
  try {
    const raw = localStorage.getItem('ps:recently_viewed')
    if (!raw) return []
    const slugs = JSON.parse(raw) as string[]
    return slugs.slice(0, 8)
  } catch {
    return []
  }
}

async function fetchRetentionData(slugs: string[]): Promise<RetentionItem[]> {
  try {
    const res = await fetch(`/api/retention/viewed?slugs=${slugs.join(',')}`)
    if (!res.ok) return []
    const data = await res.json()
    return data.items || []
  } catch {
    return []
  }
}
