// ============================================================================
// Brand Fill — auto-assigns brands to products without brandId
// ============================================================================

import prisma from '@/lib/db/prisma'
import { extractBrand } from '@/lib/catalog/normalize'
import { logger } from '@/lib/logger'

const BATCH_SIZE = 500

export async function brandFill() {
  const unbranded = await prisma.product.findMany({
    where: { status: 'ACTIVE', brandId: null },
    select: { id: true, name: true },
    take: BATCH_SIZE,
  })

  let filled = 0
  let skipped = 0

  for (const p of unbranded) {
    const brandName = extractBrand(p.name)
    if (!brandName) {
      skipped++
      continue
    }

    try {
      const slug = brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

      const brand = await prisma.brand.upsert({
        where: { slug },
        create: { name: brandName, slug },
        update: {},
      })

      await prisma.product.update({
        where: { id: p.id },
        data: { brandId: brand.id },
      })

      filled++
    } catch (err) {
      logger.debug('brand-fill.skip', { product: p.name, error: err })
      skipped++
    }
  }

  logger.info('brand-fill.complete', { filled, skipped, total: unbranded.length })

  return {
    status: 'SUCCESS',
    itemsTotal: unbranded.length,
    itemsDone: filled,
    metadata: { filled, skipped },
  }
}
