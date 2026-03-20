// ============================================================================
// Variant Parser — extracts color, storage, size from product titles
// ============================================================================

import { extractColor, extractStorage, extractScreenSize, extractCapacity, extractGender } from '@/lib/catalog/normalize'
import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export interface ParsedVariant {
  color: string | null
  storage: string | null
  size: string | null
  capacity: string | null
  gender: string | null
  variantName: string
}

/**
 * Parse variant attributes from a product title.
 */
export function parseVariantFromTitle(title: string): ParsedVariant {
  const color = extractColor(title)
  const storage = extractStorage(title)
  const size = extractScreenSize(title)
  const capacity = extractCapacity(title)
  const gender = extractGender(title)

  // Build variant name from detected attributes
  const parts: string[] = []
  if (color) parts.push(color)
  if (storage) parts.push(storage)
  if (size) parts.push(size)
  if (capacity) parts.push(capacity)

  const variantName = parts.length > 0 ? parts.join(' / ') : title.slice(0, 50)

  return { color, storage, size, capacity, gender, variantName }
}

/**
 * Auto-populate ProductVariant records for products that have detectable variants.
 * Runs as a batch job.
 */
export async function populateVariants(batchSize = 200): Promise<{ created: number; skipped: number }> {
  // Find products without variants that have listings
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      variants: { none: {} },
    },
    select: { id: true, name: true },
    take: batchSize,
  })

  let created = 0
  let skipped = 0

  for (const p of products) {
    const parsed = parseVariantFromTitle(p.name)

    // Only create variant if we detected at least one attribute
    if (!parsed.color && !parsed.storage && !parsed.size && !parsed.capacity) {
      skipped++
      continue
    }

    try {
      const variant = await prisma.productVariant.create({
        data: {
          productId: p.id,
          variantName: parsed.variantName,
          color: parsed.color,
          storage: parsed.storage,
          size: parsed.size,
        },
      })

      // Link unlinked listings to this variant
      await prisma.listing.updateMany({
        where: { productId: p.id, variantId: null },
        data: { variantId: variant.id },
      })

      created++
    } catch (err) {
      logger.debug('variant-parser.skip', { productId: p.id, error: err })
      skipped++
    }
  }

  logger.info('variant-parser.complete', { created, skipped, total: products.length })

  return { created, skipped }
}
