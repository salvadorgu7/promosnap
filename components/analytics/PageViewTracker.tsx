"use client"

import { useEffect } from "react"
import { analytics } from "@/lib/analytics/events"

/**
 * Invisible client component that fires GA4 pageview events.
 * Drop into server-rendered pages that need tracking.
 */

interface ProductViewProps {
  type: "product"
  productId: string
  slug: string
  category?: string
  price?: number
}

interface CategoryViewProps {
  type: "category"
  categorySlug: string
  productCount?: number
}

type PageViewTrackerProps = ProductViewProps | CategoryViewProps

export default function PageViewTracker(props: PageViewTrackerProps) {
  useEffect(() => {
    if (props.type === "product") {
      analytics.productView({
        productId: props.productId,
        slug: props.slug,
        category: props.category,
        price: props.price,
      })
    } else if (props.type === "category") {
      analytics.categoryView({
        categorySlug: props.categorySlug,
        productCount: props.productCount,
      })
    }
    // Fire once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
