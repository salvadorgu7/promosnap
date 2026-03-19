/**
 * Backfill ReviewAggregate for all products with rating data.
 * Safe to run multiple times (upsert-based).
 *
 * Usage: npx tsx scripts/backfill-review-aggregates.ts
 */

import prisma from "../lib/db/prisma"
import { refreshReviewAggregate } from "../lib/reviews/aggregate"

async function main() {
  console.log("🔄 Starting ReviewAggregate backfill...")

  // Find all products that have at least one listing with a rating
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      listings: {
        some: {
          rating: { not: null },
          status: "ACTIVE",
        },
      },
    },
    select: { id: true, name: true },
  })

  console.log(`📦 Found ${products.length} products with ratings`)

  let created = 0
  let failed = 0

  for (const product of products) {
    try {
      const result = await refreshReviewAggregate(product.id)
      if (result) {
        created++
        if (created % 50 === 0) {
          console.log(`  ✅ ${created}/${products.length} processed...`)
        }
      }
    } catch (err) {
      failed++
      console.error(`  ❌ Failed for ${product.name}: ${err}`)
    }
  }

  console.log(`\n✅ Backfill complete: ${created} aggregates created/updated, ${failed} failed`)
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Backfill failed:", err)
  process.exit(1)
})
