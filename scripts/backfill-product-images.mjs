/**
 * One-time script: Backfill Product.imageUrl from Listing.imageUrl
 *
 * Many products imported via WhatsApp messages have null imageUrl on the
 * Product record, but the enrichment pipeline populated it on the Listing.
 * This script copies the first valid listing image to the product.
 *
 * Usage: node scripts/backfill-product-images.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find active products without images that have listings WITH images
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { imageUrl: null },
        { imageUrl: '' },
      ],
      listings: {
        some: {
          imageUrl: { not: null },
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      listings: {
        where: { imageUrl: { not: null } },
        select: { imageUrl: true },
        take: 1,
      },
    },
  })

  console.log(`Found ${products.length} products missing images (but listings have them)`)

  let updated = 0
  for (const p of products) {
    const listingImage = p.listings[0]?.imageUrl
    if (!listingImage) continue

    await prisma.product.update({
      where: { id: p.id },
      data: { imageUrl: listingImage },
    })
    updated++
    console.log(`  ✓ ${p.name.slice(0, 60)} → ${listingImage.slice(0, 80)}`)
  }

  console.log(`\nDone: ${updated} products updated with images from listings`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
