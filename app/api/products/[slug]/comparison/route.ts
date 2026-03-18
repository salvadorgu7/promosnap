import { NextRequest, NextResponse } from 'next/server'
import { rateLimit, rateLimitResponse, withRateLimitHeaders } from '@/lib/security/rate-limit'
import { getProductBySlug } from '@/lib/db/queries'
import { getCanonicalComparison, getBestChoice } from '@/lib/catalog/smart-comparison'
import { analyzeCrossSource, buildCrossSourceOffer } from '@/lib/source/cross-source'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rl = rateLimit(request, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  try {
    const { slug } = await params
    const product = await getProductBySlug(slug)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Build all offers (already filtered to isActive by query)
    const allOffers = product.listings.flatMap((listing) =>
      listing.offers
        .map((o) => ({
          id: o.id,
          price: o.currentPrice,
          originalPrice: o.originalPrice,
          offerScore: o.offerScore,
          sourceSlug: listing.source.slug,
          sourceName: listing.source.name,
          affiliateUrl: o.affiliateUrl,
          isFreeShipping: o.isFreeShipping,
          couponText: o.couponText,
          rating: listing.rating,
          reviewsCount: listing.reviewsCount,
        }))
    )

    // Smart comparison
    const smartComparison = await getCanonicalComparison(product.id)
    const bestChoice = smartComparison ? getBestChoice(smartComparison.matrix) : null

    // Cross-source
    const crossSourceOffers = allOffers.map((o) =>
      buildCrossSourceOffer({
        id: o.id,
        currentPrice: o.price,
        originalPrice: o.originalPrice ?? undefined,
        offerScore: o.offerScore,
        sourceSlug: o.sourceSlug,
        sourceName: o.sourceName,
        affiliateUrl: o.affiliateUrl ?? '',
        isFreeShipping: o.isFreeShipping,
      })
    )
    const crossSource = analyzeCrossSource(crossSourceOffers)

    const response = NextResponse.json({
      slug,
      sourceCount: new Set(product.listings.map((l) => l.source.slug)).size,
      smartComparison: smartComparison
        ? {
            matrix: smartComparison.matrix.map((e) => ({
              offerId: e.offerId,
              sourceName: e.sourceName,
              sourceSlug: e.sourceSlug,
              price: e.price,
              discount: e.discount,
              offerScore: e.offerScore,
              isFreeShipping: e.isFreeShipping,
              rating: e.rating,
              decisionScore: e.decisionScore,
            })),
            bestChoice: bestChoice
              ? {
                  offerId: bestChoice.entry.offerId,
                  sourceName: bestChoice.entry.sourceName,
                  price: bestChoice.entry.price,
                  reasons: bestChoice.reasons,
                }
              : null,
          }
        : null,
      crossSource: crossSource
        ? {
            sourceCount: crossSource.sourceCount,
            priceRange: crossSource.priceRange,
            recommendation: crossSource.recommendation,
          }
        : null,
    })

    return withRateLimitHeaders(response, rl)
  } catch (err) {
    logger.error('comparison-api.error', { error: String(err) })
    return NextResponse.json(
      { error: 'Failed to compute comparison' },
      { status: 500 }
    )
  }
}
