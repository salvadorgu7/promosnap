// ============================================================================
// Job: Discover & Import — automated discovery + import pipeline
// ============================================================================

import { runJob, type JobResult } from '@/lib/jobs/runner'
import { runDiscovery } from '@/lib/ml-discovery'
import { runImportPipeline, type ImportItem } from '@/lib/import'

/**
 * Automated discovery + import job.
 * Runs the ML discovery pipeline in scheduled-auto-import mode,
 * then imports discovered products through the unified pipeline.
 */
export async function discoverAndImport(): Promise<JobResult> {
  return runJob('discover-import', async (ctx) => {
    // Check ML credentials before attempting discovery
    const hasML = !!(
      (process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID) &&
      (process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET)
    )
    if (!hasML) {
      ctx.log('ML credentials not configured — skipping discovery')
      return { itemsTotal: 0, itemsDone: 0, metadata: { skipped: true, reason: 'ml_credentials_missing' } }
    }

    ctx.log('Starting automated discovery + import pipeline...')

    // Stage 1: Discovery
    ctx.log('Running ML discovery in scheduled-auto-import mode...')
    let discoveryResult
    try {
      discoveryResult = await runDiscovery({
        mode: 'scheduled-auto-import',
        limit: 30,
        includeTrends: true,
      })
      ctx.log(`Discovery found ${discoveryResult.products.length} products via ${discoveryResult.meta.mode}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      ctx.error(`Discovery failed: ${msg}`)
      return { itemsTotal: 0, itemsDone: 0, metadata: { error: msg, stage: 'discovery' } }
    }

    if (discoveryResult.products.length === 0) {
      ctx.warn('No products discovered — skipping import')
      return {
        itemsTotal: 0,
        itemsDone: 0,
        metadata: {
          discoveryMs: discoveryResult.meta.timing.totalMs,
          categories: discoveryResult.meta.resolvedCategories.map(c => c.name),
        },
      }
    }

    // Stage 2: Import via unified pipeline
    ctx.log(`Importing ${discoveryResult.products.length} products...`)
    const importItems: ImportItem[] = discoveryResult.products.map(p => ({
      externalId: p.externalId,
      title: p.title,
      currentPrice: p.currentPrice,
      originalPrice: p.originalPrice,
      productUrl: p.productUrl,
      imageUrl: p.imageUrl,
      isFreeShipping: p.isFreeShipping,
      availability: p.availability,
      soldQuantity: p.soldQuantity,
      condition: p.condition,
      sourceSlug: 'mercadolivre',
    }))

    let importResult
    try {
      importResult = await runImportPipeline(importItems)
      ctx.log(`Import done: ${importResult.created} created, ${importResult.updated} updated, ${importResult.skipped} skipped, ${importResult.failed} failed`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      ctx.error(`Import failed: ${msg}`)
      return {
        itemsTotal: discoveryResult.products.length,
        itemsDone: 0,
        metadata: { error: msg, stage: 'import', discoveryMs: discoveryResult.meta.timing.totalMs },
      }
    }

    await ctx.updateProgress(importResult.created + importResult.updated, importResult.total)

    return {
      itemsTotal: importResult.total,
      itemsDone: importResult.created + importResult.updated,
      metadata: {
        discoveryMs: discoveryResult.meta.timing.totalMs,
        importMs: importResult.durationMs,
        categories: discoveryResult.meta.resolvedCategories.map(c => c.name),
        trends: discoveryResult.meta.trendsUsed.slice(0, 5),
        created: importResult.created,
        updated: importResult.updated,
        skipped: importResult.skipped,
        failed: importResult.failed,
      },
    }
  })
}
