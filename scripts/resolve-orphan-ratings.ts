/**
 * Resolve orphaned listings with rating data → link to existing products.
 * Uses the V19 canonical matching engine (batchCanonicalMatch).
 *
 * Quality gates:
 * - score >= 0.7 → auto-link (strong/probable match)
 * - score < 0.7 → leave orphan (log for manual review)
 * - Storage divergence penalized by V19 engine (built-in)
 *
 * Usage: npx tsx scripts/resolve-orphan-ratings.ts
 */

import prisma from "../lib/db/prisma"
import { batchCanonicalMatch } from "../lib/catalog/canonical-match"
import { refreshReviewAggregate } from "../lib/reviews/aggregate"

const LINK_THRESHOLD = 0.7

async function main() {
  console.log("🔗 Resolving orphaned listings with ratings...\n")

  // 1. Fetch orphaned listings with rating data
  const orphans = await prisma.listing.findMany({
    where: {
      productId: null,
      rating: { not: null },
      status: "ACTIVE",
    },
    select: {
      id: true,
      rawTitle: true,
      rating: true,
      reviewsCount: true,
      source: { select: { slug: true } },
    },
  })

  console.log(`📦 Found ${orphans.length} orphaned listings with ratings`)
  if (orphans.length === 0) {
    console.log("Nothing to do.")
    await prisma.$disconnect()
    return
  }

  // 2. Batch canonical match
  const results = await batchCanonicalMatch(
    orphans.map(o => o.id),
    orphans.length
  )

  let linked = 0
  let skipped = 0
  const linkedProductIds = new Set<string>()

  for (const result of results) {
    const orphan = orphans.find(o => o.id === result.listingId)
    if (!orphan) continue

    if (result.match && result.match.score >= LINK_THRESHOLD) {
      // Auto-link
      await prisma.listing.update({
        where: { id: result.listingId },
        data: {
          productId: result.match.productId,
          matchConfidence: result.match.score,
        },
      })

      linkedProductIds.add(result.match.productId)
      linked++

      const conf = result.match.score >= 0.85 ? "HIGH" : "MEDIUM"
      console.log(
        `  ✅ [${conf}] ${orphan.rawTitle.slice(0, 50)} → ${result.match.productName.slice(0, 40)} (score: ${result.match.score.toFixed(2)}, matched: ${result.match.matchedOn.join(",")})`
      )
    } else {
      skipped++
      const bestScore = result.match?.score?.toFixed(2) || "none"
      console.log(
        `  ⏭️  SKIP ${orphan.rawTitle.slice(0, 60)} (best: ${bestScore}, candidates: ${result.candidatesCount})`
      )
    }
  }

  console.log(`\n📊 Results: ${linked} linked, ${skipped} skipped`)

  // 3. Refresh review aggregates for linked products
  if (linkedProductIds.size > 0) {
    console.log(`\n🔄 Refreshing ReviewAggregate for ${linkedProductIds.size} products...`)
    let aggregated = 0

    for (const productId of linkedProductIds) {
      const agg = await refreshReviewAggregate(productId)
      if (agg) {
        aggregated++
        console.log(
          `  ⭐ ${agg.rating.toFixed(1)}/5 (${agg.totalReviews} reviews, confidence: ${agg.confidence})`
        )
      }
    }

    console.log(`\n✅ ${aggregated} review aggregates created/updated`)
  }

  // 4. Final stats
  const remainingOrphans = await prisma.listing.count({
    where: { productId: null, rating: { not: null }, status: "ACTIVE" },
  })
  const totalAggregates = await prisma.reviewAggregate.count()

  console.log(`\n📈 Final state:`)
  console.log(`  Orphans with rating remaining: ${remainingOrphans}`)
  console.log(`  Total review aggregates: ${totalAggregates}`)

  await prisma.$disconnect()
}

main().catch(err => {
  console.error("Failed:", err)
  process.exit(1)
})
