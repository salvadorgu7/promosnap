/**
 * Batch populate specsJson for products in priority categories.
 * Uses extractAndStoreAttributes() — frequency-voted, non-destructive.
 *
 * Usage: npx tsx scripts/populate-specs.ts
 */

import prisma from "../lib/db/prisma"
import { extractAndStoreAttributes, attributeCompleteness } from "../lib/catalog/product-attributes"

const PRIORITY_CATEGORIES = [
  "celulares", "notebooks", "audio", "smart-tvs",
  "informatica", "gamer", "casa",
]

const BATCH_SIZE = 30
const DELAY_MS = 300

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

async function main() {
  console.log("📦 Populating specsJson for priority categories...\n")

  const beforeCount = await prisma.product.count({
    where: { status: "ACTIVE", specsJson: { not: undefined } },
  })
  console.log(`Before: ${beforeCount} products with specsJson\n`)

  let totalProcessed = 0
  let totalEnriched = 0

  for (const catSlug of PRIORITY_CATEGORIES) {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        category: { slug: catSlug },
        // Process all — extractAndStoreAttributes does non-destructive merge
      },
      select: { id: true, name: true },
      orderBy: { popularityScore: "desc" },
      take: 200,
    })

    if (products.length === 0) {
      console.log(`  [${catSlug}] No products found`)
      continue
    }

    console.log(`  [${catSlug}] Processing ${products.length} products...`)
    let catEnriched = 0

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE)

      for (const product of batch) {
        try {
          const result = await extractAndStoreAttributes(product.id)
          if (result) {
            const filled = Object.values(result).filter(v => v !== null).length
            if (filled > 2) catEnriched++ // brand + at least 1 more attribute
          }
        } catch (err) {
          // Skip individual failures
        }
        totalProcessed++
      }

      if (i + BATCH_SIZE < products.length) {
        await sleep(DELAY_MS)
      }
    }

    console.log(`    ✅ ${catEnriched}/${products.length} enriched with specs`)
    totalEnriched += catEnriched
  }

  // Final stats
  const afterCount = await prisma.product.count({
    where: { status: "ACTIVE", specsJson: { not: undefined } },
  })

  console.log(`\n📊 Results:`)
  console.log(`  Processed: ${totalProcessed}`)
  console.log(`  Enriched (2+ attrs): ${totalEnriched}`)
  console.log(`  specsJson before: ${beforeCount}`)
  console.log(`  specsJson after: ${afterCount}`)
  console.log(`  Delta: +${afterCount - beforeCount}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error("Failed:", err)
  process.exit(1)
})
