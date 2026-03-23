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
      popularityScore: true,
      listings: {
        where: { status: 'ACTIVE' },
        select: {
          sourceId: true,
          offers: {
            where: { isActive: true },
            select: { currentPrice: true },
            take: 1,
          },
        },
        take: 3, // Pegar ate 3 listings para ver se e multi-source
      },
    },
    orderBy: { popularityScore: 'desc' },
    take: 800, // Ampliado de 500 para 800 — mais candidatos
  })

  // Pre-compute normalized names e fontes
  const normalized = products.map(p => ({
    ...p,
    norm: normalizeForMatch(p.name),
    price: p.listings[0]?.offers[0]?.currentPrice ?? 0,
    sourceIds: new Set(p.listings.map(l => l.sourceId)),
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

// ── Cross-marketplace auto-dedup ────────────────────────────────────────────

/**
 * Encontra e faz merge automatico de produtos duplicados com alta confianca.
 * Foca em cross-marketplace: mesmo produto vindo de Amazon e ML por exemplo.
 *
 * Criterios para auto-merge (todos devem ser verdade):
 * - Similaridade de nome >= 0.85 (ajustada)
 * - Mesma marca OU mesma categoria
 * - Precos dentro de 30% um do outro
 * - Fontes diferentes (cross-marketplace)
 *
 * O produto com maior popularityScore vira o primario.
 */
export async function autoMergeCrossMarketplace(): Promise<{
  candidates: number
  merged: number
  skipped: number
}> {
  const candidates = await findDuplicateCandidates(100)

  // Filtrar apenas pares com alta confianca para auto-merge
  const highConfidence = candidates.filter(p =>
    p.similarity >= 0.85 &&
    (p.sameBrand || p.sameCategory) &&
    p.priceOverlap
  )

  let merged = 0
  let skipped = 0
  const alreadyMerged = new Set<string>()

  for (const pair of highConfidence) {
    // Evitar double-merge
    if (alreadyMerged.has(pair.primaryId) || alreadyMerged.has(pair.duplicateId)) {
      skipped++
      continue
    }

    try {
      await mergeDuplicates(pair.primaryId, [pair.duplicateId])
      alreadyMerged.add(pair.duplicateId)
      merged++

      logger.info('dedup.auto-merge', {
        primary: pair.primaryName.slice(0, 50),
        duplicate: pair.duplicateName.slice(0, 50),
        similarity: pair.similarity,
      })
    } catch {
      skipped++
    }
  }

  logger.info('dedup.auto-merge-complete', {
    candidates: candidates.length,
    highConfidence: highConfidence.length,
    merged,
    skipped,
  })

  return { candidates: highConfidence.length, merged, skipped }
}
