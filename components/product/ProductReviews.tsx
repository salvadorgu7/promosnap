"use client"

import { useState, useEffect } from "react"
import { Star, ThumbsUp, MessageSquare } from "lucide-react"

interface Review {
  title: string
  content: string
  rating: number
  date: string
  likes: number
}

interface ReviewData {
  rating: number | null
  reviewCount: number
  reviews: Review[]
}

export default function ProductReviews({ externalId }: { externalId: string }) {
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!externalId || !externalId.startsWith("MLB")) {
      setLoading(false)
      return
    }

    fetch(`/api/reviews/${externalId}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [externalId])

  if (loading) return null
  if (!data || !data.rating || data.reviewCount === 0) return null

  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-4">
        <MessageSquare className="w-5 h-5 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary">
          Avaliações do Mercado Livre
        </h3>
      </div>

      {/* Rating summary */}
      <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-surface-50 border border-surface-200">
        <div className="text-center">
          <span className="text-3xl font-bold text-text-primary">{data.rating.toFixed(1)}</span>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map(i => (
              <Star
                key={i}
                className={`w-3.5 h-3.5 ${i <= Math.round(data.rating!) ? "text-amber-400 fill-amber-400" : "text-surface-300"}`}
              />
            ))}
          </div>
        </div>
        <div className="text-xs text-text-muted">
          {data.reviewCount.toLocaleString("pt-BR")} avaliações
        </div>
      </div>

      {/* Individual reviews */}
      {data.reviews.length > 0 && (
        <div className="space-y-3">
          {data.reviews.slice(0, 3).map((r, i) => (
            <div key={i} className="p-3 rounded-lg bg-white border border-surface-200">
              <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(j => (
                    <Star
                      key={j}
                      className={`w-3 h-3 ${j <= r.rating ? "text-amber-400 fill-amber-400" : "text-surface-300"}`}
                    />
                  ))}
                </div>
                {r.title && <span className="text-xs font-medium text-text-primary">{r.title}</span>}
              </div>
              {r.content && (
                <p className="text-xs text-text-secondary line-clamp-3">{r.content}</p>
              )}
              {r.likes > 0 && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-text-muted">
                  <ThumbsUp className="w-3 h-3" />
                  {r.likes} acharam útil
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
