/**
 * One-time script: Reject all PENDING CatalogCandidates from unwanted sources
 * (tempromo.app.br, casa.promos.app.br short links that couldn't be expanded)
 *
 * These are from "Tem Promô" and "Casa Promo" WhatsApp groups that have been
 * excluded from the Evolution API webhook filter.
 *
 * Usage: node scripts/reject-unwanted-pending.mjs
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Find all PENDING candidates where the affiliate/product URL contains
  // tempromo or casa.promos domains, or sourceSlug is 'unknown' with
  // enrichedData showing whatsapp-group source
  const pending = await prisma.catalogCandidate.findMany({
    where: {
      status: 'PENDING',
      sourceSlug: 'promosapp',
    },
    select: {
      id: true,
      title: true,
      affiliateUrl: true,
      externalId: true,
      enrichedData: true,
    },
  })

  console.log(`Found ${pending.length} PENDING promosapp candidates`)

  let rejected = 0
  for (const item of pending) {
    const data = item.enrichedData
    const productUrl = typeof data === 'object' && data !== null ? data.productUrl : null
    const canonicalUrl = typeof data === 'object' && data !== null ? data.canonicalUrl : null
    const url = item.affiliateUrl || productUrl || canonicalUrl || ''

    // Reject items from unwanted domains (tempromo, casa.promos)
    const isUnwanted =
      url.includes('tempromo.app.br') ||
      url.includes('casa.promos.app.br') ||
      url.includes('tem.promo') ||
      // Also reject items with sourceSlug unknown that have no real marketplace
      (item.externalId?.startsWith('hash:') && typeof data === 'object' && data !== null && data.sourceChannel === 'whatsapp-group')

    if (isUnwanted) {
      await prisma.catalogCandidate.update({
        where: { id: item.id },
        data: { status: 'REJECTED' },
      })
      rejected++
      console.log(`  REJECTED: ${item.title?.substring(0, 60)}`)
    }
  }

  console.log(`\nDone: ${rejected}/${pending.length} rejected`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
