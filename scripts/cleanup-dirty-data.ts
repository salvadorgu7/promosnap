/**
 * Cleanup script — Remove dirty data from the site
 *
 * 1. Deactivate products without images
 * 2. Deactivate offers with bad/blocked URLs
 * 3. Deactivate stale offers (not seen in 7+ days)
 * 4. Clean orphan listings
 *
 * Run: npx tsx scripts/cleanup-dirty-data.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Competitor/tracker domains — never valid as product URLs
const BLOCKED_DOMAINS = [
  'tempromo.app.br', 'tempromo.com.br',
  'pelando.com.br', 'promobit.com.br', 'gatry.com',
  'ctt.cx', 'bit.ly', 'cutt.ly', 'is.gd', 't.co', 'tinyurl.com', 'encurt.me',
]

function getHostname(url: string): string {
  try { return new URL(url).hostname.toLowerCase() } catch { return '' }
}

function isBadUrl(url: string): boolean {
  if (!url || url.length < 10) return true
  const host = getHostname(url)
  if (!host) return true
  return BLOCKED_DOMAINS.some(d => host.includes(d))
}

async function main() {
  console.log('🧹 PromoSnap Cleanup — Starting...\n')

  // ── 1. Products without images ──
  console.log('── Step 1: Products without images ──')
  const noImageProducts = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { imageUrl: null },
        { imageUrl: '' },
      ],
    },
    select: { id: true, name: true, slug: true },
  })

  console.log(`  Found ${noImageProducts.length} active products without images`)

  if (noImageProducts.length > 0) {
    const result = await prisma.product.updateMany({
      where: {
        id: { in: noImageProducts.map(p => p.id) },
      },
      data: { status: 'INACTIVE' },
    })
    console.log(`  ✅ Deactivated ${result.count} products without images`)

    // Also deactivate their offers
    const listings = await prisma.listing.findMany({
      where: { productId: { in: noImageProducts.map(p => p.id) } },
      select: { id: true },
    })
    if (listings.length > 0) {
      const offersResult = await prisma.offer.updateMany({
        where: {
          listingId: { in: listings.map(l => l.id) },
          isActive: true,
        },
        data: { isActive: false },
      })
      console.log(`  ✅ Deactivated ${offersResult.count} associated offers`)
    }
  }

  // ── 2. Offers with bad/blocked URLs ──
  console.log('\n── Step 2: Offers with bad/blocked URLs ──')
  const activeOffers = await prisma.offer.findMany({
    where: { isActive: true },
    select: {
      id: true,
      affiliateUrl: true,
      listing: {
        select: {
          productUrl: true,
          externalId: true,
          product: { select: { name: true } },
        },
      },
    },
  })

  let badUrlCount = 0
  const badOfferIds: string[] = []

  for (const offer of activeOffers) {
    const url = offer.affiliateUrl || offer.listing.productUrl
    if (url && isBadUrl(url)) {
      badOfferIds.push(offer.id)
      badUrlCount++
    }
  }

  console.log(`  Found ${badUrlCount} offers with bad URLs`)
  if (badOfferIds.length > 0) {
    const result = await prisma.offer.updateMany({
      where: { id: { in: badOfferIds } },
      data: { isActive: false },
    })
    console.log(`  ✅ Deactivated ${result.count} offers with bad URLs`)
  }

  // ── 3. Stale offers (not seen in 7+ days) ──
  console.log('\n── Step 3: Stale offers (>7 days old) ──')
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const staleOffers = await prisma.offer.updateMany({
    where: {
      isActive: true,
      lastSeenAt: { lt: sevenDaysAgo },
      // Don't touch imported products (they may not have lastSeenAt updates)
      listing: {
        product: {
          originType: { not: 'imported' },
        },
      },
    },
    data: { isActive: false },
  })
  console.log(`  ✅ Deactivated ${staleOffers.count} stale offers`)

  // ── 4. Offers without any valid product URL ──
  console.log('\n── Step 4: Offers without product URL ──')
  const noUrlOffers = await prisma.offer.updateMany({
    where: {
      isActive: true,
      affiliateUrl: null,
      listing: {
        productUrl: '',
      },
    },
    data: { isActive: false },
  })
  console.log(`  ✅ Deactivated ${noUrlOffers.count} offers without URLs`)

  // ── 5. Products with invalid image URLs ──
  console.log('\n── Step 5: Products with invalid image URLs ──')
  const productsWithImages = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      imageUrl: { not: null },
    },
    select: { id: true, name: true, imageUrl: true },
  })

  const invalidImageIds: string[] = []
  for (const p of productsWithImages) {
    if (p.imageUrl && !p.imageUrl.startsWith('http')) {
      invalidImageIds.push(p.id)
    }
  }

  if (invalidImageIds.length > 0) {
    const result = await prisma.product.updateMany({
      where: { id: { in: invalidImageIds } },
      data: { status: 'INACTIVE' },
    })
    console.log(`  ✅ Deactivated ${result.count} products with invalid image URLs`)
  } else {
    console.log(`  ✅ All active products have valid image URLs`)
  }

  // ── 6. Summary ──
  console.log('\n── Final Counts ──')
  const activeProducts = await prisma.product.count({ where: { status: 'ACTIVE' } })
  const activeOffersCount = await prisma.offer.count({ where: { isActive: true } })
  const inactiveProducts = await prisma.product.count({ where: { status: 'INACTIVE' } })
  const productsNoImage = await prisma.product.count({
    where: {
      status: 'ACTIVE',
      OR: [{ imageUrl: null }, { imageUrl: '' }],
    },
  })

  console.log(`  Active products:   ${activeProducts}`)
  console.log(`  Inactive products: ${inactiveProducts}`)
  console.log(`  Active offers:     ${activeOffersCount}`)
  console.log(`  Still no image:    ${productsNoImage}`)
  console.log('\n✅ Cleanup complete!')

  await prisma.$disconnect()
}

main().catch(async (err) => {
  console.error('❌ Cleanup failed:', err)
  await prisma.$disconnect()
  process.exit(1)
})
