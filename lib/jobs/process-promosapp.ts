// ============================================================================
// Job: Process PromosApp — process pending candidates in the review queue
// ============================================================================

import { runJob, type JobResult } from '@/lib/jobs/runner'
import { getFlag } from '@/lib/config/feature-flags'
import { runImportPipeline, type ImportItem } from '@/lib/import/pipeline'
import prisma from '@/lib/db/prisma'

/**
 * Cron job that auto-imports approved PromosApp candidates.
 * Picks up APPROVED candidates that haven't been imported yet,
 * runs them through the import pipeline.
 */
export async function processPromosApp(): Promise<JobResult> {
  return runJob('process-promosapp', async (ctx) => {
    if (!getFlag('promosappEnabled')) {
      ctx.log('PromosApp integration disabled — skipping')
      return { itemsTotal: 0, itemsDone: 0, metadata: { skipped: true, reason: 'disabled' } }
    }

    ctx.log('Processing approved PromosApp candidates...')

    // Fetch approved but not yet imported candidates
    const candidates = await prisma.catalogCandidate.findMany({
      where: {
        sourceSlug: 'promosapp',
        status: 'APPROVED',
      },
      orderBy: { createdAt: 'asc' },
      take: 100, // Process up to 100 per run
    })

    if (candidates.length === 0) {
      ctx.log('No approved candidates to process')
      return { itemsTotal: 0, itemsDone: 0, metadata: { reason: 'no_candidates' } }
    }

    ctx.log(`Found ${candidates.length} approved candidates`)

    // Convert to ImportItems
    const importItems: ImportItem[] = candidates
      .filter(c => {
        const enriched = c.enrichedData as Record<string, any> | null
        const url = enriched?.productUrl || c.affiliateUrl
        return url && c.price && c.price > 0
      })
      .map(c => {
        const enriched = c.enrichedData as Record<string, any> | null
        return {
          externalId: c.externalId || c.id,
          title: c.title,
          currentPrice: c.price || 0,
          originalPrice: c.originalPrice || undefined,
          productUrl: enriched?.productUrl || c.affiliateUrl || '',
          imageUrl: c.imageUrl || undefined,
          sourceSlug: enriched?.marketplace
            ? mapSlug(enriched.marketplace)
            : (c.sourceSlug || 'unknown'),
          discoverySource: 'promosapp',
        }
      })

    if (importItems.length === 0) {
      ctx.warn('All candidates missing URL or price — cannot import')
      return { itemsTotal: candidates.length, itemsDone: 0, metadata: { reason: 'all_invalid' } }
    }

    ctx.log(`Importing ${importItems.length} items...`)
    await ctx.updateProgress(0, importItems.length)

    const result = await runImportPipeline(importItems)

    // Mark imported candidates
    const importedIds = candidates.map(c => c.id)
    await prisma.catalogCandidate.updateMany({
      where: { id: { in: importedIds } },
      data: { status: 'IMPORTED' },
    })

    ctx.log(`Done: ${result.created} created, ${result.updated} updated, ${result.failed} failed`)
    await ctx.updateProgress(importItems.length, importItems.length)

    return {
      itemsTotal: candidates.length,
      itemsDone: result.created + result.updated,
      metadata: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
        brandStats: result.brandStats,
        categoryStats: result.categoryStats,
      },
    }
  })
}

function mapSlug(marketplace: string): string {
  const map: Record<string, string> = {
    'Mercado Livre': 'mercadolivre',
    'Amazon Brasil': 'amazon-br',
    'Shopee': 'shopee',
    'Shein': 'shein',
    'Magazine Luiza': 'magalu',
    'KaBuM!': 'kabum',
    'AliExpress': 'aliexpress',
  }
  return map[marketplace] || marketplace.toLowerCase().replace(/\s+/g, '-')
}
