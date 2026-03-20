"use client"

import { useEffect } from "react"

/**
 * Tracks product views in localStorage for the retention rail.
 * Also fires a CRM event for server-side segmentation.
 */
export default function ViewTracker({ slug, productId }: { slug: string; productId: string }) {
  useEffect(() => {
    // 1. Store in localStorage for retention rail
    try {
      const KEY = 'ps:recently_viewed'
      const raw = localStorage.getItem(KEY)
      const slugs: string[] = raw ? JSON.parse(raw) : []
      const filtered = slugs.filter(s => s !== slug)
      filtered.unshift(slug)
      localStorage.setItem(KEY, JSON.stringify(filtered.slice(0, 20)))
    } catch { /* silently fail */ }

    // 2. Fire CRM event (non-blocking)
    fetch('/api/crm/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventType: 'view_product',
        payload: { productId, productSlug: slug },
      }),
    }).catch(() => {})
  }, [slug, productId])

  return null
}
