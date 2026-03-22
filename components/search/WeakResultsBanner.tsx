"use client"

import { useEffect, useRef } from "react"
import { Search, ArrowDown, Sparkles } from "lucide-react"
import { analytics } from "@/lib/analytics/events"

interface WeakResultsBannerProps {
  query: string
  internalCount: number
  expandedCount: number
}

/**
 * Shown when internal results are weak (1-4) but expanded found more.
 * Invites the user to scroll down to see expanded results.
 * Mega-prompt-03 Bloco 12: "Weak result precisa virar oportunidade."
 * Copy framing: help, not failure.
 */
export default function WeakResultsBanner({
  query,
  internalCount,
  expandedCount,
}: WeakResultsBannerProps) {
  const trackedRef = useRef(false)

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true
      analytics.weakResultsExpand({ query, internalCount })
    }
  }, [query, internalCount])

  const scrollToExpanded = () => {
    analytics.weakResultsCtaClick({ query, internalCount, expandedCount })
    const el = document.querySelector("[data-expanded-results]")
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <div className="mb-4 px-3 py-2.5 rounded-xl bg-gradient-to-r from-brand-50/80 to-accent-blue/5 border border-brand-500/10">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-brand-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-text-primary font-medium leading-tight">
            {internalCount === 0
              ? "Não encontramos no catálogo principal, mas ampliamos a busca."
              : `Poucos resultados no catálogo. Ampliamos a busca e encontramos mais ${expandedCount} opções.`}
          </p>
        </div>
        <button
          onClick={scrollToExpanded}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg
                     bg-brand-500 text-white text-[10px] font-semibold
                     hover:bg-brand-600 transition-colors flex-shrink-0
                     active:scale-95"
        >
          <ArrowDown className="w-3 h-3" />
          <span className="hidden sm:inline">Ver opções</span>
        </button>
      </div>
    </div>
  )
}
