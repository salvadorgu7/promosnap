import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/reviews/:externalId
 *
 * Fetches product reviews from Mercado Livre API.
 * Returns rating, review count, and sample reviews.
 * Cached in-memory for 1 hour.
 */

type RouteParams = { params: Promise<{ externalId: string }> }

const reviewCache = new Map<string, { data: any; expiresAt: number }>()

export async function GET(req: NextRequest, { params }: RouteParams) {
  const rl = rateLimit(req, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  const { externalId } = await params

  if (!externalId || !externalId.startsWith('MLB')) {
    return NextResponse.json({ error: 'Invalid ML external ID' }, { status: 400 })
  }

  // Check cache
  const cached = reviewCache.get(externalId)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    })
  }

  try {
    // Fetch from ML API (public endpoint, no auth needed)
    const res = await fetch(
      `https://api.mercadolibre.com/reviews/item/${externalId}?limit=5`,
      {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8000),
      }
    )

    if (!res.ok) {
      logger.warn('reviews.fetch-failed', { externalId, status: res.status })
      return NextResponse.json(
        { rating: null, reviewCount: 0, reviews: [] },
        { headers: { 'Cache-Control': 'public, s-maxage=300' } }
      )
    }

    const data = await res.json()

    const result = {
      rating: data.rating_average || null,
      reviewCount: data.paging?.total || 0,
      reviews: (data.reviews || []).slice(0, 5).map((r: any) => ({
        title: r.title,
        content: r.content,
        rating: r.rate,
        date: r.date_created,
        likes: r.valorization,
      })),
    }

    // Cache for 1 hour
    reviewCache.set(externalId, { data: result, expiresAt: Date.now() + 3_600_000 })

    // Cleanup old entries
    if (reviewCache.size > 500) {
      const now = Date.now()
      for (const [key, val] of reviewCache) {
        if (val.expiresAt < now) reviewCache.delete(key)
      }
    }

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=3600' },
    })
  } catch (err) {
    logger.error('reviews.error', { externalId, error: err })
    return NextResponse.json(
      { rating: null, reviewCount: 0, reviews: [] },
      { status: 200 }
    )
  }
}
