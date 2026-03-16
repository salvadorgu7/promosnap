// Job: backfill-images
// Finds products without images and tries to heal them from:
// 1. Their own listings (listing.imageUrl)
// 2. ML API lookup (fetch item details by externalId)

import prisma from '@/lib/db/prisma'
import { runJob } from './runner'
import { isValidImageUrl } from '@/lib/images'

const BATCH_SIZE = 50

export async function backfillImages() {
  return runJob('backfill-images', async (ctx) => {
    // Find products without valid imageUrl
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { imageUrl: null },
          { imageUrl: '' },
        ],
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        listings: {
          select: {
            imageUrl: true,
            externalId: true,
          },
          where: { status: 'ACTIVE' },
          take: 5,
        },
      },
      take: BATCH_SIZE,
      orderBy: { updatedAt: 'desc' },
    })

    if (products.length === 0) {
      ctx.log('All products have images - nothing to backfill')
      return { itemsTotal: 0, itemsDone: 0, metadata: { healed: 0 } }
    }

    ctx.log(`Found ${products.length} products without images`)

    let healed = 0
    let mlFetched = 0

    for (const product of products) {
      // Strategy 1: Check listing images
      const listingImage = product.listings.find(l => l.imageUrl && isValidImageUrl(l.imageUrl))
      if (listingImage?.imageUrl) {
        await prisma.product.update({
          where: { id: product.id },
          data: { imageUrl: listingImage.imageUrl },
        })
        healed++
        ctx.log(`[listing] Healed "${product.name}" from listing image`)
        continue
      }

      // Strategy 2: Try ML API for items with ML external IDs
      const mlListing = product.listings.find(l => l.externalId?.startsWith('MLB'))
      if (mlListing?.externalId) {
        try {
          const res = await fetch(
            `https://api.mercadolibre.com/items/${mlListing.externalId}?attributes=pictures,thumbnail`,
            { signal: AbortSignal.timeout(5000) }
          )
          if (res.ok) {
            const data = await res.json()
            const imageUrl =
              data.pictures?.[0]?.secure_url ||
              data.pictures?.[0]?.url ||
              (data.thumbnail ? data.thumbnail.replace(/-I\.jpg$/, '-O.jpg') : null)

            if (imageUrl && isValidImageUrl(imageUrl)) {
              await prisma.product.update({
                where: { id: product.id },
                data: { imageUrl },
              })
              // Also update the listing
              await prisma.listing.updateMany({
                where: { productId: product.id, imageUrl: null },
                data: { imageUrl },
              })
              healed++
              mlFetched++
              ctx.log(`[ml-api] Healed "${product.name}" from ML item ${mlListing.externalId}`)
              continue
            }
          }
        } catch (err) {
          ctx.warn(`ML API failed for ${mlListing.externalId}: ${err instanceof Error ? err.message : err}`)
        }
      }

      ctx.warn(`Could not heal "${product.name}" — no image source found`)
    }

    ctx.log(`Backfill complete: ${healed}/${products.length} healed (${mlFetched} from ML API)`)

    return {
      itemsTotal: products.length,
      itemsDone: healed,
      metadata: { healed, mlFetched, remaining: products.length - healed },
    }
  })
}
