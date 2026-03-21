"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Loader2 } from "lucide-react"

interface Props {
  /** Called when user scrolls near bottom. Return false to stop loading. */
  onLoadMore: () => Promise<boolean>
  /** Whether there are more items to load */
  hasMore: boolean
  /** Pixel threshold before bottom to trigger load (default 300) */
  threshold?: number
  children: React.ReactNode
}

export default function InfiniteScroll({ onLoadMore, hasMore, threshold = 300, children }: Props) {
  const [loading, setLoading] = useState(false)
  const observerRef = useRef<HTMLDivElement>(null)

  const handleIntersection = useCallback(async (entries: IntersectionObserverEntry[]) => {
    if (!entries[0]?.isIntersecting || loading || !hasMore) return
    setLoading(true)
    try {
      await onLoadMore()
    } finally {
      setLoading(false)
    }
  }, [onLoadMore, loading, hasMore])

  useEffect(() => {
    const el = observerRef.current
    if (!el) return

    const observer = new IntersectionObserver(handleIntersection, {
      rootMargin: `${threshold}px`,
    })
    observer.observe(el)

    return () => observer.disconnect()
  }, [handleIntersection, threshold])

  return (
    <>
      {children}

      {/* Sentinel element */}
      <div ref={observerRef} className="h-1" />

      {loading && (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
        </div>
      )}

      {!hasMore && (
        <p className="text-center text-xs text-text-muted py-4">
          Todos os resultados carregados
        </p>
      )}
    </>
  )
}
