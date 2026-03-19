// Job: backfill-images
// Finds products without images and tries to heal them from:
// 1. Their own listings (listing.imageUrl)
// 2. ML API lookup (fetch item details by externalId)
// 3. og:image scraping from product URL (Amazon, Shopee, Shein, any source)

import prisma from '@/lib/db/prisma'
import { runJob } from './runner'
import { isValidImageUrl } from '@/lib/images'

const BATCH_SIZE = 50
// og:image scraping is slow — limit per run to stay within Vercel's 60s timeout
const MAX_OG_SCRAPES_PER_RUN = 15

/** WhatsApp/Meta CDN URLs expire in ~14 days — never use them as permanent images */
function isExpirableUrl(url: string): boolean {
  const lower = url.toLowerCase()
  return lower.includes('whatsapp.net') || lower.includes('mmg.') || lower.includes('fbcdn.net')
}

/** Check if an image URL is valid AND not from an expiring CDN */
function isDurableImageUrl(url: string | null | undefined): boolean {
  if (!url || !isValidImageUrl(url)) return false
  return !isExpirableUrl(url)
}

/**
 * Scrapes the og:image meta tag from a product URL.
 * Works for Amazon, Shopee, ML, Shein — no API key needed.
 * Returns null if scraping fails or no valid image found.
 */
async function scrapeOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(4000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    })

    if (!res.ok) return null

    const html = await res.text()

    // Try og:image first (most reliable)
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
    if (ogMatch?.[1] && isValidImageUrl(ogMatch[1])) return ogMatch[1]

    // Fallback: twitter:image
    const twitterMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i)
    if (twitterMatch?.[1] && isValidImageUrl(twitterMatch[1])) return twitterMatch[1]

    return null
  } catch {
    return null
  }
}

export async function backfillImages() {
  return runJob('backfill-images', async (ctx) => {
    // Find products without valid imageUrl
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { imageUrl: null },
          { imageUrl: '' },
          // WhatsApp CDN URLs expire in ~14 days — treat them as missing
          { imageUrl: { contains: 'whatsapp.net' } },
          { imageUrl: { contains: 'mmg.' } },
          { imageUrl: { contains: 'fbcdn.net' } },
        ],
        // Include INACTIVE products — they may have been deactivated BECAUSE they had no image.
        // When we find an image, we reactivate them.
        status: { in: ['ACTIVE', 'INACTIVE'] },
      },
      select: {
        id: true,
        name: true,
        status: true,
        listings: {
          select: {
            imageUrl: true,
            externalId: true,
            productUrl: true,
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

    ctx.log(`Found ${products.length} products without valid images (null, empty, or expired WhatsApp URLs)`)

    let healed = 0
    let mlFetched = 0
    let ogScraped = 0

    for (const product of products) {
      // Stop og scraping once we hit the per-run limit (prevent Vercel timeout)
      const ogBudgetExhausted = ogScraped >= MAX_OG_SCRAPES_PER_RUN
      // Strategy 1: Check listing images (skip WhatsApp/Meta CDN — they expire)
      const listingImage = product.listings.find(l => l.imageUrl && isDurableImageUrl(l.imageUrl))
      if (listingImage?.imageUrl) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            imageUrl: listingImage.imageUrl,
            // Reactivate if was deactivated due to missing image
            ...(product.status === 'INACTIVE' ? { status: 'ACTIVE' } : {}),
          },
        })
        healed++
        ctx.log(`[listing] Healed "${product.name}" from listing image${product.status === 'INACTIVE' ? ' (reactivated)' : ''}`)
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
                data: {
                  imageUrl,
                  ...(product.status === 'INACTIVE' ? { status: 'ACTIVE' } : {}),
                },
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

      // Strategy 3: Scrape og:image from product URL (Amazon, Shopee, Shein, etc.)
      // Limited to MAX_OG_SCRAPES_PER_RUN to prevent Vercel timeout
      const listingWithUrl = product.listings.find(l => l.productUrl)
      if (!ogBudgetExhausted && listingWithUrl?.productUrl) {
        const imageUrl = await scrapeOgImage(listingWithUrl.productUrl)
        if (imageUrl) {
          await prisma.product.update({
            where: { id: product.id },
            data: {
              imageUrl,
              ...(product.status === 'INACTIVE' ? { status: 'ACTIVE' } : {}),
            },
          })
          await prisma.listing.updateMany({
            where: { productId: product.id, imageUrl: null },
            data: { imageUrl },
          })
          healed++
          ogScraped++
          ctx.log(`[og-scrape] Healed "${product.name}" from ${new URL(listingWithUrl.productUrl).hostname}`)
          continue
        }
      }

      ctx.warn(`Could not heal "${product.name}" — no image source found`)
    }

    ctx.log(`Backfill complete: ${healed}/${products.length} healed (${mlFetched} from ML API, ${ogScraped} from og:image scraping)`)

    return {
      itemsTotal: products.length,
      itemsDone: healed,
      metadata: { healed, mlFetched, ogScraped, remaining: products.length - healed },
    }
  })
}
