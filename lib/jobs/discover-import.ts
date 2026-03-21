// ============================================================================
// Job: Discover & Import — automated discovery + import pipeline
// ============================================================================

import { runJob, type JobResult } from '@/lib/jobs/runner'
import { runDiscovery } from '@/lib/ml-discovery'
import { runImportPipeline, type ImportItem } from '@/lib/import'
import { getAllCategories, resolveMLCategorySlug } from '@/lib/ml-discovery/categories'
import { adapterRegistry } from '@/lib/adapters/registry'

// ── Mode configuration ──────────────────────────────────────────────────────

export type DiscoverImportMode = 'daily' | 'extended' | 'massive' | 'category' | 'debug'

interface ModeConfig {
  limit: number
  categoryFilter?: (cat: { priority: number }) => boolean
  categoryId?: string
  label: string
}

const MODE_CONFIGS: Record<DiscoverImportMode, ModeConfig> = {
  daily:    { limit: 500, label: 'daily (all categories, limit 500)' },
  extended: { limit: 500, label: 'extended (all categories, limit 500)' },
  massive:  { limit: 500, label: 'massive (all categories, limit 500)' },
  category: { limit: 50, label: 'single category' },
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
    // Use ALL categories for daily/extended/massive — maximizes catalog variety
    if (mode === 'daily' || mode === 'massive' || mode === 'extended') {
      discoveryOpts.categoryIds = getAllCategories().map(c => c.id)
      ctx.log(`Using all ${discoveryOpts.categoryIds.length} categories for ${mode} mode`)
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
      categorySlug: resolveMLCategorySlug(p.categoryId),
      sourceSlug: 'mercadolivre',
      discoverySource: 'ml_discovery',
    }))

    let importResult
    try {
      // Split into batches of 100 to avoid memory/timeout issues
      const BATCH = 100
      if (importItems.length <= BATCH) {
        importResult = await runImportPipeline(importItems)
      } else {
        const aggregated = { created: 0, updated: 0, skipped: 0, failed: 0, total: 0, durationMs: 0, brandStats: { detected: 0, unknown: 0 }, categoryStats: { resolved: 0, unresolved: 0 }, priceStats: { min: Infinity, max: 0, avg: 0 } }
        const totalBatches = Math.ceil(importItems.length / BATCH)
        for (let i = 0; i < importItems.length; i += BATCH) {
          const batch = importItems.slice(i, i + BATCH)
          const batchNum = Math.floor(i / BATCH) + 1
          ctx.log(`Importing batch ${batchNum}/${totalBatches} (${batch.length} items)...`)
          const r = await runImportPipeline(batch)
          aggregated.created += r.created
          aggregated.updated += r.updated
          aggregated.skipped += r.skipped
          aggregated.failed += r.failed
          aggregated.total += r.total
          aggregated.durationMs += r.durationMs
          if (r.priceStats) {
            aggregated.priceStats.min = Math.min(aggregated.priceStats.min, r.priceStats.min)
            aggregated.priceStats.max = Math.max(aggregated.priceStats.max, r.priceStats.max)
          }
          if (r.brandStats) {
            aggregated.brandStats.detected += r.brandStats.detected
            aggregated.brandStats.unknown += r.brandStats.unknown
          }
          if (r.categoryStats) {
            aggregated.categoryStats.resolved += r.categoryStats.resolved
            aggregated.categoryStats.unresolved += r.categoryStats.unresolved
          }
        }
        if (aggregated.priceStats.min === Infinity) aggregated.priceStats.min = 0
        importResult = aggregated
      }
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

    // Stage 3: Multi-marketplace discovery via syncFeed (Amazon + Shopee + Shein)
    const marketplaceStats: Record<string, { synced: number; failed: number; errors: string[] }> = {}

    const syncTargets = [
      { slug: 'amazon-br', label: 'Amazon' },
      { slug: 'shopee', label: 'Shopee' },
      { slug: 'shein', label: 'Shein' },
      { slug: 'magalu', label: 'Magazine Luiza' },
    ]

    for (const target of syncTargets) {
      try {
        const adapter = adapterRegistry.get(target.slug)
        if (adapter?.isConfigured() && adapter.syncFeed) {
          ctx.log(`Running ${target.label} discovery via syncFeed...`)
          const result = await adapter.syncFeed()
          marketplaceStats[target.slug] = { synced: result.synced, failed: result.failed, errors: result.errors }
          ctx.log(`${target.label} discovery: ${result.synced} synced, ${result.failed} failed`)
        } else {
          ctx.log(`${target.label} adapter not configured — skipping`)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        ctx.warn(`${target.label} discovery failed (non-fatal): ${msg}`)
        marketplaceStats[target.slug] = { synced: 0, failed: 0, errors: [msg] }
      }
    }

    const totalMarketplaceSynced = Object.values(marketplaceStats).reduce((s, m) => s + m.synced, 0)

    const pipelineMs = Date.now() - pipelineStart
    ctx.log(`Pipeline complete in ${pipelineMs}ms (discovery: ${discoveryResult.meta.timing.totalMs}ms, import: ${importResult.durationMs}ms, marketplaces: ${totalMarketplaceSynced} synced)`)

    return {
      itemsTotal: importResult.total + totalMarketplaceSynced,
      itemsDone: importResult.created + importResult.updated + totalMarketplaceSynced,
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
        marketplaces: Object.keys(marketplaceStats).length > 0 ? marketplaceStats : undefined,
      },
    }
  })
}
