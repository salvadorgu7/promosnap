"use client"

import { useState, useEffect } from "react"
import { inferSegment, type UserSegment, type UserSignals } from "@/lib/personalization/segmentation"
import { getPersonalizedOrder } from "@/lib/personalization/recommendations"

interface PersonalizedRailsProps {
  /** Section keys in default order */
  sections: string[]
  /** Render function that receives the reordered section keys */
  children: (orderedSections: string[], segment: UserSegment) => React.ReactNode
}

function readLocalStorageArray(key: string): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function gatherSignals(): UserSignals {
  const favorites = readLocalStorageArray("ps_favorites")
  const searches = readLocalStorageArray("ps_searches")
  const recentlyViewed = readLocalStorageArray("ps_recently_viewed")

  // Extract category-like and brand-like hints from recently viewed slugs
  const recentCategories: string[] = []
  const recentBrands: string[] = []

  for (const slug of recentlyViewed.slice(0, 10)) {
    // Slugs often contain category or brand hints, e.g. "iphone-15-pro-max"
    recentCategories.push(slug)
  }

  return {
    favorites,
    searches,
    recentCategories,
    recentBrands,
  }
}

const SEGMENT_LABELS: Partial<Record<UserSegment, string>> = {
  tech_enthusiast: "Tech",
  bargain_hunter: "Ofertas",
  gamer: "Gamer",
  casa_cozinha: "Casa",
  mobile_first: "Mobile",
  beauty_fashion: "Beleza",
}

export default function PersonalizedRails({ sections, children }: PersonalizedRailsProps) {
  const [segment, setSegment] = useState<UserSegment>("general")
  const [orderedSections, setOrderedSections] = useState<string[]>(sections)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const signals = gatherSignals()
    const inferred = inferSegment(signals)
    setSegment(inferred)

    if (inferred !== "general") {
      setOrderedSections(getPersonalizedOrder(sections, inferred))
    } else {
      setOrderedSections(sections)
    }

    setMounted(true)
  }, [sections])

  return (
    <div>
      {/* Personalization indicator — light touch */}
      {mounted && segment !== "general" && (
        <div className="flex items-center gap-2 mb-4 px-1">
          <span className="inline-flex items-center gap-1.5 text-xs text-text-muted bg-surface-100 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent-blue animate-pulse" />
            Personalizado para voce
            {SEGMENT_LABELS[segment] && (
              <span className="text-accent-blue font-medium">
                &middot; {SEGMENT_LABELS[segment]}
              </span>
            )}
          </span>
        </div>
      )}

      {children(orderedSections, segment)}
    </div>
  )
}
