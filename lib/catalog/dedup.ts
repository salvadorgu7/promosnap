// ============================================================================
// Product Deduplication — finds and merges duplicate products across sources
// ============================================================================

import prisma from '@/lib/db/prisma'
import { normalizeForMatch, tokenSimilarity } from '@/lib/catalog/normalize'
import { logger } from '@/lib/logger'

// ── Types ───────────────────────────────────────────────────────────────────

export interface DuplicatePair {
  primaryId: string
  primaryName: string
  primarySlug: string
  duplicateId: string
  duplicateName: string
  duplicateSlug: string
  similarity: number
  sameBrand: boolean
  sameCategory: boolean
  priceOverlap: boolean
}

// ── Core Functions ──────────────────────────────────────────────────────────

/**
 * Find candidate duplicate product pairs.
 * Uses token similarity on normalized titles + brand/category matching.
 */
export async function findDuplicateCandidates(limit = 50): Promise<DuplicatePair[]> {
  const products = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      name: true,
      slug: true,
      brandId: true,
      categoryId: true,
      listings: {
        where: { status: 'ACTIVE' },
        select: {
          offers: {
            where: { isActive: true },
            select: { currentPrice: true },
            take: 1,
          },
        },
        take: 1,
      },
    },
    orderBy: { popularityScore: 'desc' },
    take: 500, // Analyze top 500 products
  })

  // Pre-compute normalized names
  const normalized = products.map(p => ({
    ...p,
    norm: normalizeForMatch(p.name),
    price: p.listings[0]?.offers[0]?.currentPrice ?? 0,
  }))

  const pairs: DuplicatePair[] = []

  for (let i = 0; i < normalized.length; i++) {
    for (let j = i + 1; j < normalized.length; j++) {
      const a = normalized[i]
      const b = normalized[j]

      // Quick skip: different brands (if both have brands)
      if (a.brandId && b.brandId && a.brandId !== b.brandId) continue

      const similarity = tokenSimilarity(a.norm, b.norm)
      if (similarity < 0.75) continue

      const sameBrand = !!(a.brandId && b.brandId && a.brandId === b.brandId)
      const sameCategory = !!(a.categoryId && b.categoryId && a.categoryId === b.categoryId)

      // Price overlap: within 30% of each other
      const priceOverlap = a.price > 0 && b.price > 0
        ? Math.abs(a.price - b.price) / Math.max(a.price, b.price) < 0.3
        : false

      // Boost similarity with context signals
      let adjustedSim = similarity
      if (sameBrand) adjustedSim += 0.1
      if (sameCategory) adjustedSim += 0.05
      if (priceOverlap) adjustedSim += 0.05

      if (adjustedSim >= 0.80) {
        pairs.push({
          primaryId: a.id,
          primaryName: a.name,
          primarySlug: a.slug,
          duplicateId: b.id,
          duplicateName: b.name,
          duplicateSlug: b.slug,
          similarity: Math.round(adjustedSim * 100) / 100,
          sameBrand,
          sameCategory,
          priceOverlap,
        })
      }
    }

    if (pairs.length >= limit) break
  }

  return pairs.sort((a, b) => b.similarity - a.similarity).slice(0, limit)
}

/**
 * Merge duplicate products: move listings from duplicate to primary, mark duplicate as MERGED.
 */
export async function mergeDuplicates(primaryId: string, duplicateIds: string[]): Promise<{ merged: number }> {
  let merged = 0

  for (const dupId of duplicateIds) {
    try {
      // Move all listings from duplicate to primary
      await prisma.listing.updateMany({
        where: { productId: dupId },
        data: { productId: primaryId },
      })

      // Mark duplicate as MERGED
      await prisma.product.update({
        where: { id: dupId },
        data: { status: 'MERGED' },
      })

      merged++
      logger.info('dedup.merged', { primaryId, duplicateId: dupId })
    } catch (err) {
      logger.warn('dedup.merge-failed', { primaryId, duplicateId: dupId, error: err })
    }
  }

  return { merged }
}
