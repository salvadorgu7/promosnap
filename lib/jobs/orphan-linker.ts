/**
 * lib/jobs/orphan-linker.ts — Auto-link orphan listings to existing products
 *
 * Finds listings with productId = null and attempts to match them
 * to existing canonical products using the canonical-match engine.
 * Only links with "strong" or "probable" confidence (score >= 0.6).
 *
 * Safe to re-run — idempotent, only updates null productId.
 */

import prisma from '@/lib/db/prisma'
import { runJob, type JobResult } from '@/lib/jobs/runner'
import { canonicalMatch } from '@/lib/catalog/canonical-match'
import { logger } from '@/lib/logger'

const BATCH_SIZE = 200

export async function linkOrphanListings(): Promise<JobResult> {
  return runJob('orphan-linker', async (ctx) => {
    ctx.log('Starting orphan listing linker...')

    // Fetch orphan listings (no product assigned)
    const orphans = await prisma.listing.findMany({
      where: {
        productId: null,
        status: { in: ['ACTIVE', 'UNMATCHED'] },
      },
      select: {
        id: true,
        rawTitle: true,
        rawBrand: true,
        rawCategory: true,
        rawPayloadJson: true,
      },
      take: BATCH_SIZE,
      orderBy: { updatedAt: 'desc' },
    })

    ctx.log(`Found ${orphans.length} orphan listings to process`)

    if (orphans.length === 0) {
      return { itemsTotal: 0, itemsDone: 0, metadata: { linked: 0, skipped: 0, noMatch: 0 } }
    }

    let linked = 0
    let skipped = 0
    let noMatch = 0
    let errors = 0

    for (const listing of orphans) {
      try {
        const payload = (listing.rawPayloadJson as Record<string, unknown>) ?? {}
        const ean = (payload.ean as string) ?? (payload.gtin as string) ?? null

        const match = await canonicalMatch({
          rawTitle: listing.rawTitle,
          rawBrand: listing.rawBrand,
          rawCategory: listing.rawCategory,
          ean,
          specsJson: payload,
        })

        if (!match) {
          noMatch++
          continue
        }

        // Only link with strong or probable confidence (>= 0.6)
        if (match.confidence === 'weak') {
          skipped++
          continue
        }

        // Link the listing to the matched product
        await prisma.listing.update({
          where: { id: listing.id },
          data: {
            productId: match.productId,
            matchConfidence: Math.round(match.score * 100),
            status: 'ACTIVE',
          },
        })

        linked++
        logger.debug('orphan-linker.linked', {
          listingId: listing.id,
          productId: match.productId,
          productName: match.productName,
          score: match.score,
          confidence: match.confidence,
          matchedOn: match.matchedOn,
        })
      } catch (err) {
        errors++
        logger.error('orphan-linker.error', {
          listingId: listing.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    ctx.log(`Orphan linker complete: ${linked} linked, ${skipped} weak (skipped), ${noMatch} no match, ${errors} errors`)

    return {
      itemsTotal: orphans.length,
      itemsDone: linked,
      metadata: { linked, skipped, noMatch, errors, processed: orphans.length },
    }
  })
}
