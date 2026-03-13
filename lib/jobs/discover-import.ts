// ============================================================================
// Job: Discover & Import — automated discovery + import pipeline
// ============================================================================

import { runJob, type JobResult } from '@/lib/jobs/runner'
import { runDiscovery } from '@/lib/ml-discovery'
import { runImportPipeline, type ImportItem } from '@/lib/import'
import { getCronCategories, getAllCategories } from '@/lib/ml-discovery/categories'

// ── Mode configuration ──────────────────────────────────────────────────────

export type DiscoverImportMode = 'daily' | 'extended' | 'category' | 'debug'

interface ModeConfig {
  limit: number
  categoryFilter?: (cat: { priority: number }) => boolean
  categoryId?: string
  label: string
}

const MODE_CONFIGS: Record<DiscoverImportMode, ModeConfig> = {
  daily:    { limit: 30, categoryFilter: (c) => c.priority <= 2, label: 'daily (top categories, limit 30)' },
  extended: { limit: 80, label: 'extended (all categories, limit 80)' },
  category: { limit: 30, label: 'single category' },
  debug:    { limit: 5, categoryFilter: (c) => c.priority <= 1, label: 'debug (priority 1 only, limit 5)' },
}

export interface DiscoverImportOptions {
  mode?: DiscoverImportMode
  categoryId?: string  // Required for 'category' mode
}

/**
 * Automated discovery + import job.
 * Runs the ML discovery pipeline in scheduled-auto-import mode,
 * then imports discovered products through the unified pipeline.
 */
export async function discoverAndImport(options?: DiscoverImportOptions): Promise<JobResult> {
  return runJob('discover-import', async (ctx) => {
    const mode = options?.mode ?? 'daily'
    const config = MODE_CONFIGS[mode]
    const pipelineStart = Date.now()

    ctx.log(`Mode: ${config.label}`)

    // Check ML credentials before attempting discovery
    const hasML = !!(
      (process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID) &&
      (process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET)
    )
    if (!hasML) {
      ctx.log('ML credentials not configured — skipping discovery')
      return { itemsTotal: 0, itemsDone: 0, metadata: { skipped: true, reason: 'ml_credentials_missing', mode } }
    }

    ctx.log('Starting automated discovery + import pipeline...')

    // Stage 1: Discovery
    ctx.log('Running ML discovery in scheduled-auto-import mode...')
    const discoveryOpts: Parameters<typeof runDiscovery>[0] = {
      mode: mode === 'category' ? 'category-bestsellers' : 'scheduled-auto-import',
      limit: config.limit,
      includeTrends: mode !== 'debug',
    }
    if (mode === 'category' && options?.categoryId) {
      discoveryOpts.categoryId = options.categoryId
    }

    let discoveryResult
    try {
      discoveryResult = await runDiscovery(discoveryOpts)

      // Per-category stats logging
      const catStats = discoveryResult.meta.stats.categoryFetchStats
      if (catStats && catStats.length > 0) {
        const succeeded = catStats.filter(s => s.status === 'success').length
        const fallbacks = catStats.filter(s => s.status === 'fallback').length
        const failed = catStats.filter(s => s.status === 'failed').length
        ctx.log(`Categories resolved: ${catStats.length} (ok:${succeeded} fallback:${fallbacks} failed:${failed})`)
        for (const s of catStats) {
          const count = s.highlightCount > 0 ? ` → ${s.highlightCount} highlights` : ''
          const fb = s.fallbackUsed ? ` (via ${s.fallbackUsed})` : ''
          ctx.log(`  ${s.categoryId}: ${s.status}${count}${fb}`)
        }
      }

      ctx.log(`Discovery found ${discoveryResult.products.length} products via ${discoveryResult.meta.mode} in ${discoveryResult.meta.timing.totalMs}ms`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      ctx.error(`Discovery failed: ${msg}`)
      return { itemsTotal: 0, itemsDone: 0, metadata: { error: msg, stage: 'discovery', mode } }
    }

    if (discoveryResult.products.length === 0) {
      ctx.warn('No products discovered — skipping import. Consider checking ML API availability or trying extended mode.')
      return {
        itemsTotal: 0,
        itemsDone: 0,
        metadata: {
          mode,
          discoveryMs: discoveryResult.meta.timing.totalMs,
          categories: discoveryResult.meta.resolvedCategories.map(c => c.name),
          recommendation: 'zero_products_discovered',
          categoryFetchStats: discoveryResult.meta.stats.categoryFetchStats,
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
      discoverySource: 'ml_discovery',
    }))

    let importResult
    try {
      importResult = await runImportPipeline(importItems)
      ctx.log(`Import done: ${importResult.created} created, ${importResult.updated} updated, ${importResult.skipped} skipped, ${importResult.failed} failed`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      ctx.error(`Import failed: ${msg}`)
      // Partial success: discovery worked, import failed
      return {
        itemsTotal: discoveryResult.products.length,
        itemsDone: 0,
        metadata: {
          error: msg,
          stage: 'import',
          mode,
          discoveryMs: discoveryResult.meta.timing.totalMs,
          productsDiscovered: discoveryResult.products.length,
          partialSuccess: true,
          categoryFetchStats: discoveryResult.meta.stats.categoryFetchStats,
        },
      }
    }

    await ctx.updateProgress(importResult.created + importResult.updated, importResult.total)

    const pipelineMs = Date.now() - pipelineStart
    ctx.log(`Pipeline complete in ${pipelineMs}ms (discovery: ${discoveryResult.meta.timing.totalMs}ms, import: ${importResult.durationMs}ms)`)

    return {
      itemsTotal: importResult.total,
      itemsDone: importResult.created + importResult.updated,
      metadata: {
        mode,
        discoveryMs: discoveryResult.meta.timing.totalMs,
        importMs: importResult.durationMs,
        pipelineMs,
        categories: discoveryResult.meta.resolvedCategories.map(c => c.name),
        trends: discoveryResult.meta.trendsUsed.slice(0, 5),
        created: importResult.created,
        updated: importResult.updated,
        skipped: importResult.skipped,
        failed: importResult.failed,
        brandStats: importResult.brandStats,
        categoryStats: importResult.categoryStats,
        priceStats: importResult.priceStats,
        categoryFetchStats: discoveryResult.meta.stats.categoryFetchStats,
      },
    }
  })
}
