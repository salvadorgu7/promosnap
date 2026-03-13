import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import prisma from '@/lib/db/prisma'
import { MercadoLivreSourceAdapter } from '@/lib/adapters/mercadolivre'

export const dynamic = 'force-dynamic'

const ml = new MercadoLivreSourceAdapter()

// POST /api/admin/ml/import
// Body: { query: string, limit?: number } or { externalIds: string[] }
// Searches ML, creates Source/Product/Listing/Offer records
export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  let body: { query?: string; limit?: number; externalIds?: string[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  if (!body.query && !body.externalIds?.length) {
    return NextResponse.json({ error: 'Envie query ou externalIds' }, { status: 400 })
  }

  try {
    // Ensure "Mercado Livre" source exists
    let source = await prisma.source.findUnique({ where: { slug: 'mercadolivre' } })
    if (!source) {
      source = await prisma.source.create({
        data: {
          name: 'Mercado Livre',
          slug: 'mercadolivre',
          status: 'ACTIVE',
        },
      })
    }

    // Get results — either by search or by individual IDs
    let results: import('@/lib/adapters/types').AdapterResult[] = []
    if (body.externalIds?.length) {
      const fetched = await Promise.all(
        body.externalIds.map((id) => ml.getProduct(id))
      )
      results = fetched.filter((r): r is import('@/lib/adapters/types').AdapterResult => r !== null)
    } else if (body.query) {
      results = await ml.search(body.query, { limit: body.limit ?? 20 })
    }

    if (results.length === 0) {
      return NextResponse.json({ imported: 0, message: 'Nenhum resultado encontrado' })
    }

    let imported = 0
    let skipped = 0
    const errors: string[] = []

    for (const item of results) {
      try {
        // Check if listing already exists
        const existing = await prisma.listing.findUnique({
          where: { sourceId_externalId: { sourceId: source.id, externalId: item.externalId } },
        })

        if (existing) {
          // Update offer price
          const offers = await prisma.offer.findMany({
            where: { listingId: existing.id, isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 1,
          })

          if (offers.length > 0) {
            const lastOffer = offers[0]
            if (lastOffer.currentPrice !== item.currentPrice) {
              // Price changed — create new snapshot and update offer
              await prisma.offer.update({
                where: { id: lastOffer.id },
                data: {
                  currentPrice: item.currentPrice,
                  originalPrice: item.originalPrice ?? null,
                  isFreeShipping: item.isFreeShipping ?? false,
                  affiliateUrl: item.affiliateUrl ?? null,
                  lastSeenAt: new Date(),
                },
              })
              await prisma.priceSnapshot.create({
                data: {
                  offerId: lastOffer.id,
                  price: item.currentPrice,
                  originalPrice: item.originalPrice ?? null,
                },
              })
            } else {
              // Same price — just update lastSeenAt
              await prisma.offer.update({
                where: { id: lastOffer.id },
                data: { lastSeenAt: new Date() },
              })
            }
          }

          skipped++
          continue
        }

        // Extract brand from title (simple heuristic)
        const titleLower = item.title.toLowerCase()
        const knownBrands = ['apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony', 'jbl', 'philips', 'dell', 'lenovo', 'asus', 'hp', 'acer']
        const detectedBrand = knownBrands.find((b) => titleLower.includes(b))

        // Find or create brand
        let brandId: string | null = null
        if (detectedBrand) {
          const brand = await prisma.brand.upsert({
            where: { slug: detectedBrand },
            create: { name: detectedBrand.charAt(0).toUpperCase() + detectedBrand.slice(1), slug: detectedBrand },
            update: {},
          })
          brandId = brand.id
        }

        // Create slug from title
        const slug = item.title
          .toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 120)

        // Check if product with similar slug exists
        let product = await prisma.product.findFirst({
          where: { slug: { startsWith: slug.slice(0, 60) } },
        })

        if (!product) {
          product = await prisma.product.create({
            data: {
              name: item.title,
              slug: slug + '-' + item.externalId.slice(-6).toLowerCase(),
              imageUrl: item.imageUrl ?? null,
              brandId,
              status: 'ACTIVE',
            },
          })
        }

        // Create listing
        const listing = await prisma.listing.create({
          data: {
            sourceId: source.id,
            productId: product.id,
            externalId: item.externalId,
            rawTitle: item.title,
            productUrl: item.productUrl,
            imageUrl: item.imageUrl ?? null,
            availability: item.availability === 'in_stock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
            status: 'ACTIVE',
          },
        })

        // Create offer
        const offer = await prisma.offer.create({
          data: {
            listingId: listing.id,
            currentPrice: item.currentPrice,
            originalPrice: item.originalPrice ?? null,
            isFreeShipping: item.isFreeShipping ?? false,
            affiliateUrl: item.affiliateUrl ?? null,
            isActive: true,
          },
        })

        // Create initial price snapshot
        await prisma.priceSnapshot.create({
          data: {
            offerId: offer.id,
            price: item.currentPrice,
            originalPrice: item.originalPrice ?? null,
          },
        })

        imported++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`${item.externalId}: ${msg}`)
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      total: results.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${imported} produtos importados, ${skipped} atualizados`,
    })
  } catch (error) {
    console.error('[ml-import] Error:', error)
    return NextResponse.json(
      { error: 'Falha na importacao', detail: String(error) },
      { status: 500 }
    )
  }
}
