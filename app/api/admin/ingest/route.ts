import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { MercadoLivreAdapter } from '@/adapters/mercadolivre'
import { validateAdmin } from '@/lib/auth/admin'
import type { RawListing } from '@/types'

// ─── helpers ─────────────────────────────────────────────────────────────────

async function upsertListings(listings: RawListing[]) {
  const adapter = new MercadoLivreAdapter()

  const source = await prisma.source.findUnique({ where: { slug: 'mercadolivre' } })
  if (!source) throw new Error('Source "mercadolivre" not found — run db:seed first')

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
          rawPayloadJson: raw.rawPayload ? (raw.rawPayload as Prisma.InputJsonValue) : Prisma.DbNull,
          lastSeenAt: new Date(),
        },
        update: {
          rawTitle: raw.title,
          rawBrand: raw.brand ?? null,
          imageUrl: raw.imageUrl ?? null,
          productUrl: raw.productUrl,
          salesCountEstimate: raw.salesCount ?? null,
          rawPayloadJson: raw.rawPayload ? (raw.rawPayload as Prisma.InputJsonValue) : Prisma.DbNull,
          lastSeenAt: new Date(),
        },
      })

      const affiliateUrl = adapter.buildAffiliateUrl(raw.productUrl)

      const offer = await prisma.offer.upsert({
        where: {
          id: (await prisma.offer.findFirst({ where: { listingId: listing.id, isActive: true } }))?.id ?? '',
        },
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

  return results
}

// ─── GET /api/admin/ingest?q=... ─────────────────────────────────────────────
// Mantido para quando o search for aprovado pelo ML

export async function GET(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || 'smartphone'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

  const adapter = new MercadoLivreAdapter()
  let listings: RawListing[]

  try {
    listings = await adapter.searchProducts(q, { limit })
  } catch (err) {
    return NextResponse.json({ error: 'ML API fetch failed', detail: String(err) }, { status: 502 })
  }

  try {
    const results = await upsertListings(listings)
    return NextResponse.json({ mode: 'search', query: q, fetched: listings.length, ...results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

// ─── POST /api/admin/ingest ───────────────────────────────────────────────────
// Ingere por lista de IDs ou URLs do ML
// Body: { ids: ["MLB123", "https://www.mercadolivre.com.br/.../MLB456/..."] }

export async function POST(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  let body: { ids?: string[] }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 })
  }

  const ids = body?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Envie { ids: ["MLB123", ...] }' }, { status: 400 })
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: 'Máximo 100 IDs por chamada' }, { status: 400 })
  }

  const adapter = new MercadoLivreAdapter()
  let listings: RawListing[]

  try {
    listings = await adapter.fetchByItemIds(ids)
  } catch (err) {
    return NextResponse.json({ error: 'ML API fetch failed', detail: String(err) }, { status: 502 })
  }

  if (listings.length === 0) {
    return NextResponse.json({ error: 'Nenhum item encontrado para os IDs fornecidos' }, { status: 404 })
  }

  try {
    const results = await upsertListings(listings)
    return NextResponse.json({ mode: 'items', submitted: ids.length, fetched: listings.length, ...results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
