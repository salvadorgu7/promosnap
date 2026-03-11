import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { MercadoLivreAdapter } from '@/adapters/mercadolivre'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || 'smartphone'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

  const adapter = new MercadoLivreAdapter()
  let listings

  try {
    listings = await adapter.searchProducts(q, { limit })
  } catch (err) {
    return NextResponse.json({ error: 'ML API fetch failed', detail: String(err) }, { status: 502 })
  }

  const source = await prisma.source.findUnique({ where: { slug: 'mercadolivre' } })
  if (!source) {
    return NextResponse.json({ error: 'Source "mercadolivre" not found — run db:seed first' }, { status: 500 })
  }

  const results = { upserted: 0, failed: 0, errors: [] as string[] }

  for (const raw of listings) {
    if (!adapter.validateListing(raw)) {
      results.failed++
      continue
    }

    try {
      const listing = await prisma.listing.upsert({
        where: { sourceId_externalId: { sourceId: source.id, externalId: raw.externalId } },
        create: {
          sourceId: source.id,
          externalId: raw.externalId,
          rawTitle: raw.title,
          rawBrand: raw.brand ?? null,
          imageUrl: raw.imageUrl ?? null,
          productUrl: raw.productUrl,
          availability: raw.availability === 'in_stock' ? 'IN_STOCK'
            : raw.availability === 'out_of_stock' ? 'OUT_OF_STOCK'
            : raw.availability === 'pre_order' ? 'PRE_ORDER'
            : 'UNKNOWN',
          salesCountEstimate: raw.salesCount ?? null,
          rating: raw.rating ?? null,
          reviewsCount: raw.reviewsCount ?? null,
          rawPayloadJson: raw.rawPayload ?? {},
          lastSeenAt: new Date(),
        },
        update: {
          rawTitle: raw.title,
          rawBrand: raw.brand ?? null,
          imageUrl: raw.imageUrl ?? null,
          productUrl: raw.productUrl,
          salesCountEstimate: raw.salesCount ?? null,
          rawPayloadJson: raw.rawPayload ?? {},
          lastSeenAt: new Date(),
        },
      })

      const affiliateUrl = adapter.buildAffiliateUrl(raw.productUrl)

      const offer = await prisma.offer.upsert({
        where: { id: (await prisma.offer.findFirst({ where: { listingId: listing.id, isActive: true } }))?.id ?? '' },
        create: {
          listingId: listing.id,
          currentPrice: raw.currentPrice,
          originalPrice: raw.originalPrice ?? null,
          isFreeShipping: raw.isFreeShipping ?? false,
          installmentText: raw.installment ?? null,
          affiliateUrl,
          isActive: true,
          offerScore: raw.originalPrice && raw.originalPrice > raw.currentPrice
            ? Math.min(100, Math.round((1 - raw.currentPrice / raw.originalPrice) * 100 + 20))
            : 30,
        },
        update: {
          currentPrice: raw.currentPrice,
          originalPrice: raw.originalPrice ?? null,
          isFreeShipping: raw.isFreeShipping ?? false,
          installmentText: raw.installment ?? null,
          affiliateUrl,
          lastSeenAt: new Date(),
          offerScore: raw.originalPrice && raw.originalPrice > raw.currentPrice
            ? Math.min(100, Math.round((1 - raw.currentPrice / raw.originalPrice) * 100 + 20))
            : 30,
        },
      })

      await prisma.priceSnapshot.create({
        data: {
          offerId: offer.id,
          price: raw.currentPrice,
          originalPrice: raw.originalPrice ?? null,
        },
      })

      results.upserted++
    } catch (err) {
      results.failed++
      results.errors.push(`${raw.externalId}: ${String(err)}`)
    }
  }

  return NextResponse.json({
    query: q,
    fetched: listings.length,
    ...results,
  })
}
