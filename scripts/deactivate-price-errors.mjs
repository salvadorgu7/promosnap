/**
 * One-time script: Deactivate products with absurd prices (parse errors)
 * Products where currentPrice < R$10 but originalPrice > R$100 (90%+ "discount")
 * These are typically shipping/installment values grabbed as product price.
 *
 * Usage: node scripts/deactivate-price-errors.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find offers with absurd discounts (price < R$10, original > R$100, ratio < 0.10)
  const badOffers = await prisma.offer.findMany({
    where: {
      isActive: true,
      currentPrice: { lt: 10 },
      originalPrice: { gt: 100 },
    },
    select: {
      id: true,
      currentPrice: true,
      originalPrice: true,
      listing: {
        select: {
          id: true,
          product: {
            select: { id: true, name: true, slug: true, status: true },
          },
        },
      },
    },
  })

  // Filter for ratio < 10% (90%+ discount = parse error)
  const parseErrors = badOffers.filter(o => {
    if (!o.originalPrice) return false
    return (o.currentPrice / o.originalPrice) < 0.10
  })

  console.log(`Found ${parseErrors.length} offers with absurd prices (parse errors)`)

  const productIds = new Set()

  for (const o of parseErrors) {
    const p = o.listing.product
    const ratio = ((o.currentPrice / o.originalPrice) * 100).toFixed(1)
    console.log(`  ${p.name} — R$${o.currentPrice} (was R$${o.originalPrice}, ${ratio}% of original)`)
    console.log(`    slug: ${p.slug} | product status: ${p.status}`)

    // Deactivate the offer
    await prisma.offer.update({
      where: { id: o.id },
      data: { isActive: false },
    })

    productIds.add(p.id)
  }

  // For products that now have NO active offers, deactivate the product too
  for (const pid of productIds) {
    const activeOffers = await prisma.offer.count({
      where: {
        listing: { productId: pid },
        isActive: true,
      },
    })
    if (activeOffers === 0) {
      await prisma.product.update({
        where: { id: pid },
        data: { status: 'INACTIVE', hidden: true },
      })
      console.log(`  → Product ${pid} fully deactivated (no remaining active offers)`)
    }
  }

  console.log(`\nDone: ${parseErrors.length} price-error offers deactivated`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
