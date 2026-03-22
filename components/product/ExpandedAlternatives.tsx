"use client"

import { useState, useEffect } from "react"
import { Sparkles, Store, ExternalLink, ChevronRight, ShoppingBag } from "lucide-react"
import Image from "next/image"
import { formatPrice } from "@/lib/utils"
import { analytics } from "@/lib/analytics/events"

interface AlternativeResult {
  id: string
  title: string
  price: number
  originalPrice?: number
  discount?: number
  imageUrl?: string
  affiliateUrl: string
  marketplace: string
  storeName: string
  affiliateStatus: string
}

interface ExpandedAlternativesProps {
  productName: string
  productSlug: string
  categorySlug?: string
}

const STORE_COLORS: Record<string, string> = {
  "amazon-br": "text-[#FF9900]",
  "mercadolivre": "text-[#2D3277]",
  "shopee": "text-[#EE4D2D]",
  "shein": "text-surface-800",
  "magalu": "text-[#0086FF]",
  "kabum": "text-[#FF6500]",
  "casasbahia": "text-[#0066CC]",
}

/**
 * Expanded alternatives for PDP — shows external marketplace options.
 * Mega-prompt-03 Bloco 1, item 26: "alternativas ampliadas" on product page.
 * Fetches from /api/search/expanded on client to avoid blocking SSR.
 * Feature-flagged: only renders if FF_EXPANDED_SEARCH is enabled (checked server-side via API).
 */
export default function ExpandedAlternatives({
  productName,
  productSlug,
  categorySlug,
}: ExpandedAlternativesProps) {
  const [results, setResults] = useState<AlternativeResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchAlternatives() {
      try {
        // Short query from product name (first 4-5 meaningful words)
        const shortQuery = productName.split(/\s+/).slice(0, 5).join(" ")
        const params = new URLSearchParams({
          q: shortQuery,
          limit: "6",
          ...(categorySlug ? { category: categorySlug } : {}),
        })

        const res = await fetch(`/api/search/expanded?${params}`, {
          signal: controller.signal,
          headers: { "x-source": "pdp-alternatives" },
        })

        if (!res.ok) {
          setLoading(false)
          return
        }

        const data = await res.json()

        // Filter to only external results, exclude current product
        const alternatives = (data.results || [])
          .filter((r: any) =>
            r.sourceType === "expanded" &&
            r.localProductSlug !== productSlug
          )
          .slice(0, 4)

        if (alternatives.length > 0) {
          setResults(alternatives)
        }
      } catch {
        // Silently fail — PDP alternatives are non-critical
      } finally {
        setLoading(false)
      }
    }

    fetchAlternatives()
    return () => controller.abort()
  }, [productName, productSlug, categorySlug])

  // Don't render anything during loading or if no results
  if (loading || results.length === 0) return null

  return (
    <section className="mt-8">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
        </div>
        <h3 className="font-display font-semibold text-sm text-text-primary">
          Alternativas em outras lojas
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {results.map((result, i) => (
          <a
            key={result.id}
            href={result.affiliateUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() => {
              analytics.expandedResultClick({
                query: productName,
                resultId: result.id,
                marketplace: result.marketplace,
                price: result.price,
                position: i,
                affiliateStatus: result.affiliateStatus,
              })
            }}
            className="card group hover:shadow-card-hover transition-all duration-200 overflow-hidden flex flex-col
                       hover:border-brand-500/20 active:scale-[0.98]"
          >
            {/* Image */}
            <div className="relative aspect-square bg-surface-50 overflow-hidden">
              {result.imageUrl ? (
                <Image
                  src={result.imageUrl}
                  alt={result.title}
                  fill
                  sizes="(max-width: 640px) 50vw, 25vw"
                  className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShoppingBag className="w-6 h-6 text-surface-300" />
                </div>
              )}

              {result.discount && result.discount > 5 && result.discount <= 85 && (
                <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-accent-red text-white">
                  -{result.discount}%
                </span>
              )}
            </div>

            {/* Content */}
            <div className="p-2 flex-1 flex flex-col">
              <div className="flex items-center gap-1 mb-0.5">
                <Store className="w-2.5 h-2.5 text-surface-400 flex-shrink-0" />
                <span className={`text-[9px] font-semibold truncate ${STORE_COLORS[result.marketplace] || "text-text-secondary"}`}>
                  {result.storeName}
                </span>
              </div>

              <p className="text-[10px] md:text-[11px] text-text-primary line-clamp-2 font-medium leading-tight flex-1">
                {result.title}
              </p>

              <div className="mt-1">
                <span className="text-xs font-bold text-accent-green">
                  {formatPrice(result.price)}
                </span>
              </div>

              <span className="mt-1.5 inline-flex items-center justify-center gap-0.5 text-[9px] font-semibold
                               text-brand-600 px-2 py-1 rounded-md bg-brand-50 border border-brand-500/10
                               group-hover:bg-brand-500 group-hover:text-white transition-colors">
                <ExternalLink className="w-2.5 h-2.5" />
                Ver oferta
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}
