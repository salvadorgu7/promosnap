/**
 * One-time script: Estimate sales count for listings based on clickout data
 * and popularity score. This populates salesCountEstimate so the
 * "Mais Vendidos" page has data to display.
 *
 * Logic:
 * - Products with clickouts in last 30d get estimated sales based on
 *   clickout count * conversion rate estimate (3-5%)
 * - Products with high popularity scores get a minimum baseline
 * - Mercado Livre listings with "Mais vendido" or high ratings get boosted
 *
 * Usage: node scripts/estimate-sales.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get clickout counts per product in last 30 days
  const clickoutData = await prisma.$queryRaw`
    SELECT
      l.id as "listingId",
      l."productId",
      p."popularityScore",
      COUNT(c.id)::int as clickouts
    FROM listings l
    JOIN products p ON l."productId" = p.id
    LEFT JOIN offers o ON o."listingId" = l.id
    LEFT JOIN clickouts c ON c."offerId" = o.id AND c."clickedAt" > NOW() - INTERVAL '30 days'
    WHERE l.status = 'ACTIVE'
      AND p.status = 'ACTIVE'
      AND l."salesCountEstimate" IS NULL OR l."salesCountEstimate" = 0
    GROUP BY l.id, l."productId", p."popularityScore"
    HAVING COUNT(c.id) > 0 OR p."popularityScore" > 20
    ORDER BY COUNT(c.id) DESC
    LIMIT 200
  `

  console.log(`Found ${clickoutData.length} listings to estimate sales for`)

  let updated = 0
  for (const row of clickoutData) {
    // Estimate: clickouts * ~4% conversion rate, minimum from popularity
    const fromClickouts = Math.round(row.clickouts * 0.04 * 30) // monthly estimate
    const fromPopularity = Math.max(0, Math.round((row.popularityScore || 0) * 2))
    const estimate = Math.max(fromClickouts, fromPopularity, 10) // minimum 10

    await prisma.listing.update({
      where: { id: row.listingId },
      data: { salesCountEstimate: estimate },
    })
    updated++
  }

  // Also set a baseline for listings with high-score offers but no clickouts
  const highScoreListings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      salesCountEstimate: 0,
      offers: {
        some: {
          isActive: true,
          offerScore: { gte: 40 },
        },
      },
      product: {
        status: 'ACTIVE',
        popularityScore: { gte: 15 },
      },
    },
    select: {
      id: true,
      product: { select: { popularityScore: true } },
    },
    take: 300,
  })

  for (const listing of highScoreListings) {
    const estimate = Math.max(10, Math.round((listing.product.popularityScore || 0) * 1.5))
    await prisma.listing.update({
      where: { id: listing.id },
      data: { salesCountEstimate: estimate },
    })
    updated++
  }

  console.log(`Updated ${updated} listings with estimated sales counts`)

  // Verify
  const total = await prisma.listing.count({ where: { status: 'ACTIVE', salesCountEstimate: { gt: 0 } } })
  console.log(`Total active listings with salesCountEstimate > 0: ${total}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
