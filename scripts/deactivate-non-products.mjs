/**
 * One-time script: Deactivate products created from non-product URLs
 * (seller profiles, store pages, etc.)
 *
 * Usage: node scripts/deactivate-non-products.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Patterns that indicate a non-product entry
const NON_PRODUCT_PATTERNS = [
  'perfil-social',
  'perfil-do-vendedor',
  'perfil-da-loja',
  'loja-oficial',
  'seller-profile',
]

async function main() {
  // Find products with slugs matching non-product patterns
  const products = await prisma.product.findMany({
    where: {
      OR: NON_PRODUCT_PATTERNS.map(pattern => ({
        slug: { contains: pattern },
      })),
    },
    select: { id: true, name: true, slug: true, status: true },
  })

  console.log(`Found ${products.length} non-product entries`)

  for (const p of products) {
    console.log(`  Deactivating: ${p.name} (${p.slug}) [status=${p.status}]`)

    // Deactivate product
    await prisma.product.update({
      where: { id: p.id },
      data: { status: 'INACTIVE', hidden: true },
    })

    // Deactivate all related listings and offers
    const listings = await prisma.listing.findMany({
      where: { productId: p.id },
      select: { id: true },
    })
    if (listings.length > 0) {
      await prisma.listing.updateMany({
        where: { productId: p.id },
        data: { status: 'INACTIVE' },
      })
      await prisma.offer.updateMany({
        where: { listingId: { in: listings.map(l => l.id) } },
        data: { isActive: false },
      })
    }
  }

  console.log(`\nDone: ${products.length} non-product entries deactivated`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
