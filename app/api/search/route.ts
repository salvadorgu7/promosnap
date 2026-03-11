import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import type { ProductCard, Badge } from '@/types'

function computeBadges(offerScore: number, discount: number, isFreeShipping: boolean): Badge[] {
  const badges: Badge[] = []
  if (offerScore >= 80) badges.push({ type: 'hot_deal', label: '🔥 Oferta Quente', color: 'hot_deal' })
  if (discount >= 30) badges.push({ type: 'price_drop', label: `📉 -${discount}%`, color: 'price_drop' })
  if (isFreeShipping) badges.push({ type: 'free_shipping', label: '🚚 Frete grátis', color: 'free_shipping' })
  return badges
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') || '20'))
  const sort = searchParams.get('sort') || 'score'

  if (!q.trim()) {
    return NextResponse.json({ products: [], total: 0, page, hasMore: false })
  }

  const where = {
    status: 'ACTIVE' as const,
    rawTitle: { contains: q, mode: 'insensitive' as const },
    offers: { some: { isActive: true } },
  }

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        source: true,
        _count: { select: { offers: true } },
        offers: {
          where: { isActive: true },
          orderBy: { offerScore: 'desc' },
          take: 1,
        },
      },
      orderBy: sort === 'price'
        ? undefined
        : sort === 'sales'
        ? { salesCountEstimate: 'desc' }
        : undefined,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.listing.count({ where }),
  ])

  await prisma.searchLog.create({
    data: {
      query: q,
      normalizedQuery: q.toLowerCase().trim(),
      resultsCount: total,
    },
  }).catch(() => {}) // non-critical

  const products: ProductCard[] = listings
    .filter((l) => l.offers.length > 0)
    .map((l) => {
      const offer = l.offers[0]
      const discount = offer.originalPrice && offer.originalPrice > offer.currentPrice
        ? Math.round((1 - offer.currentPrice / offer.originalPrice) * 100)
        : undefined

      return {
        id: l.id,
        name: l.rawTitle,
        slug: l.externalId,
        imageUrl: l.imageUrl ?? undefined,
        brand: l.rawBrand ?? undefined,
        category: l.rawCategory ?? undefined,
        bestOffer: {
          price: offer.currentPrice,
          originalPrice: offer.originalPrice ?? undefined,
          discount,
          sourceSlug: l.source.slug,
          sourceName: l.source.name,
          affiliateUrl: offer.affiliateUrl || l.productUrl,
          isFreeShipping: offer.isFreeShipping,
          offerScore: offer.offerScore,
        },
        offersCount: l._count.offers,
        popularityScore: l.salesCountEstimate ?? 0,
        badges: computeBadges(offer.offerScore, discount ?? 0, offer.isFreeShipping),
      }
    })

  if (sort === 'price') {
    products.sort((a, b) => a.bestOffer.price - b.bestOffer.price)
  }

  return NextResponse.json({
    products,
    total,
    page,
    hasMore: page * limit < total,
    query: q,
  })
}
