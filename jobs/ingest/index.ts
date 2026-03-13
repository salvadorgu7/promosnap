import prisma from '@/lib/db/prisma'
import { getEnabledAdapters } from '@/adapters/shared/registry'
// slugify and normalizeText available from '@/lib/utils' when needed
import type { RawListing } from '@/types'

// ============================================
// Ingest Job
// ============================================
// Busca produtos dos adapters e salva no banco.
// Cria listings, ofertas e snapshots de preço.

export async function runIngest(options?: { query?: string; sourceSlug?: string }) {
  const jobRun = await prisma.jobRun.create({
    data: { jobName: 'ingest', status: 'RUNNING', metadata: options || {} },
  })

  console.log(`[Ingest] Job started: ${jobRun.id}`)

  try {
    const adapters = getEnabledAdapters().filter(
      (a) => !options?.sourceSlug || a.slug === options.sourceSlug
    )

    if (adapters.length === 0) {
      console.log('[Ingest] No enabled adapters found')
      await prisma.jobRun.update({
        where: { id: jobRun.id },
        data: { status: 'SUCCESS', endedAt: new Date(), metadata: { message: 'No adapters enabled' } },
      })
      return
    }

    let totalProcessed = 0
    let totalErrors = 0

    for (const adapter of adapters) {
      console.log(`[Ingest] Processing adapter: ${adapter.slug}`)

      try {
        // Search popular terms
        const queries = options?.query
          ? [options.query]
          : ['smartphone', 'fone bluetooth', 'air fryer', 'notebook', 'cadeira gamer', 'smart tv']

        for (const query of queries) {
          const listings = await adapter.searchProducts(query, { limit: 20 })
          console.log(`[Ingest:${adapter.slug}] "${query}" returned ${listings.length} results`)

          for (const raw of listings) {
            if (!adapter.validateListing(raw)) {
              totalErrors++
              continue
            }

            try {
              await processRawListing(raw, adapter.slug)
              totalProcessed++
            } catch (error) {
              console.error(`[Ingest:${adapter.slug}] Error processing listing:`, error)
              totalErrors++
            }
          }
        }
      } catch (error) {
        console.error(`[Ingest:${adapter.slug}] Adapter error:`, error)
        totalErrors++
      }
    }

    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'SUCCESS',
        endedAt: new Date(),
        metadata: { totalProcessed, totalErrors },
      },
    })

    console.log(`[Ingest] Complete: ${totalProcessed} processed, ${totalErrors} errors`)
  } catch (error) {
    console.error('[Ingest] Job failed:', error)
    await prisma.jobRun.update({
      where: { id: jobRun.id },
      data: {
        status: 'FAILED',
        endedAt: new Date(),
        errorLog: error instanceof Error ? error.message : 'Unknown error',
      },
    })
  }
}

async function processRawListing(raw: RawListing, adapterSlug: string) {
  // Find or get source
  const source = await prisma.source.findUnique({ where: { slug: adapterSlug } })
  if (!source) throw new Error(`Source not found: ${adapterSlug}`)

  // Upsert listing
  const listing = await prisma.listing.upsert({
    where: {
      sourceId_externalId: {
        sourceId: source.id,
        externalId: raw.externalId,
      },
    },
    update: {
      rawTitle: raw.title,
      rawDescription: raw.description,
      rawBrand: raw.brand,
      rawCategory: raw.category,
      imageUrl: raw.imageUrl,
      productUrl: raw.productUrl,
      availability: raw.availability === 'in_stock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
      rating: raw.rating,
      reviewsCount: raw.reviewsCount,
      salesCountEstimate: raw.salesCount,
      rawPayloadJson: raw.rawPayload ? JSON.parse(JSON.stringify(raw.rawPayload)) : undefined,
      lastSeenAt: new Date(),
    },
    create: {
      sourceId: source.id,
      externalId: raw.externalId,
      rawTitle: raw.title,
      rawDescription: raw.description,
      rawBrand: raw.brand,
      rawCategory: raw.category,
      imageUrl: raw.imageUrl,
      productUrl: raw.productUrl,
      availability: raw.availability === 'in_stock' ? 'IN_STOCK' : 'OUT_OF_STOCK',
      rating: raw.rating,
      reviewsCount: raw.reviewsCount,
      salesCountEstimate: raw.salesCount,
      rawPayloadJson: raw.rawPayload ? JSON.parse(JSON.stringify(raw.rawPayload)) : undefined,
    },
  })

  // Build affiliate URL
  const adapter = (await import(`@/adapters/${adapterSlug}`)).default || 
    (await import(`@/adapters/${adapterSlug}`))
  let affiliateUrl = raw.productUrl
  if (adapter && typeof adapter.buildAffiliateUrl === 'function') {
    affiliateUrl = adapter.buildAffiliateUrl(raw.productUrl)
  }

  // Upsert offer
  const existingOffer = await prisma.offer.findFirst({
    where: { listingId: listing.id },
  })

  const offer = existingOffer
    ? await prisma.offer.update({
        where: { id: existingOffer.id },
        data: {
          currentPrice: raw.currentPrice,
          originalPrice: raw.originalPrice,
          couponText: raw.coupon,
          shippingPrice: raw.shippingPrice,
          isFreeShipping: raw.isFreeShipping || false,
          affiliateUrl,
          lastSeenAt: new Date(),
          isActive: true,
        },
      })
    : await prisma.offer.create({
        data: {
          listingId: listing.id,
          currentPrice: raw.currentPrice,
          originalPrice: raw.originalPrice,
          couponText: raw.coupon,
          shippingPrice: raw.shippingPrice,
          isFreeShipping: raw.isFreeShipping || false,
          affiliateUrl,
          isActive: true,
        },
      })

  // Create price snapshot
  await prisma.priceSnapshot.create({
    data: {
      offerId: offer.id,
      price: raw.currentPrice,
      originalPrice: raw.originalPrice,
    },
  })
}
