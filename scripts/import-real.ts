/**
 * Import REAL products from Mercado Livre into PromoSnap.
 *
 * Usage:
 *   npx tsx scripts/import-real.ts                     # quick mode (default)
 *   npx tsx scripts/import-real.ts --mode=quick        # limit 20, top 5 categories
 *   npx tsx scripts/import-real.ts --mode=full         # limit 80, all categories
 *   npx tsx scripts/import-real.ts --mode=category --cat=MLB1055  # specific category
 *   npx tsx scripts/import-real.ts --mode=debug        # limit 5, verbose logging
 *
 * Uses the discovery pipeline (highlights + hydrate) which works
 * without /search API access. No OAuth user token required.
 *
 * Requires: MERCADOLIVRE_APP_ID + MERCADOLIVRE_SECRET in .env
 */

import { runDiscovery } from '@/lib/ml-discovery'
import { runImportPipeline, type ImportItem } from '@/lib/import'

// ── CLI Argument Parsing ────────────────────────────────────────────────────

type ScriptMode = 'quick' | 'full' | 'category' | 'debug'

interface ScriptConfig {
  mode: ScriptMode
  limit: number
  categoryId?: string
  label: string
}

function parseArgs(): ScriptConfig {
  const args = process.argv.slice(2)
  const argMap: Record<string, string> = {}
  for (const arg of args) {
    const match = arg.match(/^--(\w+)(?:=(.+))?$/)
    if (match) argMap[match[1]] = match[2] ?? 'true'
  }

  const mode = (argMap.mode as ScriptMode) || 'quick'

  switch (mode) {
    case 'full':
      return { mode, limit: 80, label: 'full (all categories, limit 80)' }
    case 'category': {
      const catId = argMap.cat
      if (!catId) {
        console.error('--mode=category requires --cat=MLB1055')
        process.exit(1)
      }
      return { mode, limit: 30, categoryId: catId, label: `category ${catId} (limit 30)` }
    }
    case 'debug':
      return { mode, limit: 5, label: 'debug (limit 5, verbose)' }
    case 'quick':
    default:
      return { mode: 'quick', limit: 20, label: 'quick (top categories, limit 20)' }
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const config = parseArgs()

  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  PromoSnap — Import Real Products from Mercado Livre    ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log()
  console.log(`  Mode: ${config.label}`)
  console.log()

  // Check credentials
  const hasML = !!(
    (process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID) &&
    (process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET)
  )

  if (!hasML) {
    console.error('ML credentials not found.')
    console.error('   Set MERCADOLIVRE_APP_ID + MERCADOLIVRE_SECRET in .env')
    process.exit(1)
  }

  console.log('  ML credentials found')

  // Run discovery pipeline (highlights -> hydrate, no search needed)
  console.log()
  console.log('-- Stage 1: Discovery ------------------------------------------')
  console.log('  Strategy: highlights -> multi-get/products -> import')
  console.log('  (sem depender de /search)')

  const start = Date.now()

  const discoveryOpts: Parameters<typeof runDiscovery>[0] = {
    mode: config.mode === 'category' ? 'category-bestsellers' : 'scheduled-auto-import',
    includeTrends: config.mode !== 'debug',
    limit: config.limit,
  }
  if (config.categoryId) {
    discoveryOpts.categoryId = config.categoryId
  }

  const { products, meta } = await runDiscovery(discoveryOpts)

  // Show pipeline stages
  const cats = meta.resolvedCategories.map(c => c.name).join(', ')
  const trends = meta.trendsUsed.slice(0, 5).join(', ')
  console.log(`  Categories: ${cats}`)
  if (trends) console.log(`  Trends: ${trends}`)
  console.log(`  Discovery: ${meta.timing.totalMs}ms`)

  // Per-category fetch stats
  const catStats = meta.stats.categoryFetchStats
  if (catStats && catStats.length > 0) {
    console.log()
    console.log('  Category fetch stats:')
    for (const s of catStats) {
      const icon = s.status === 'success' ? '[ok]' : s.status === 'fallback' ? '[fb]' : '[!!]'
      const fb = s.fallbackUsed ? ` via ${s.fallbackUsed}` : ''
      console.log(`    ${icon} ${s.categoryId}: ${s.highlightCount} highlights${fb}`)
    }
  }

  console.log()
  console.log('  Pipeline:')
  for (const stage of meta.pipeline) {
    const icon = stage.status === 'success' ? '[ok]' : stage.status === 'partial' ? '[~~]' : stage.status === 'skipped' ? '[--]' : '[!!]'
    console.log(`    ${icon} ${stage.stage}: ${stage.itemsIn} -> ${stage.itemsOut} (${stage.durationMs}ms)`)
  }

  if (products.length === 0) {
    console.log()
    console.log('  Nenhum produto descoberto.')
    console.log()
    console.log('  Possiveis causas:')
    console.log('  - ML API rate-limiting')
    console.log('  - /products/ e /items/ bloqueados (verifique com debug-ml.ts)')
    console.log('  - Token expirado')
    console.log()
    console.log('  Tente: npx tsx scripts/debug-ml.ts')
    process.exit(0)
  }

  // Show samples
  console.log()
  console.log(`-- ${products.length} produtos descobertos --------------------`)
  const sampleCount = config.mode === 'debug' ? products.length : 8
  for (const p of products.slice(0, sampleCount)) {
    const price = `R$ ${p.currentPrice.toFixed(2)}`
    const discount = p.originalPrice ? ` (era R$ ${p.originalPrice.toFixed(2)})` : ''
    const shipping = p.isFreeShipping ? ' [frete gratis]' : ''
    console.log(`  ${p.title.slice(0, 65)}`)
    console.log(`    ${price}${discount}${shipping}`)
  }
  if (products.length > sampleCount) {
    console.log(`  ... e mais ${products.length - sampleCount} produtos`)
  }

  // Import
  console.log()
  console.log('-- Stage 2: Import to DB ---------------------------------------')

  const importItems: ImportItem[] = products.map(p => ({
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
  } catch (err) {
    console.error('Import failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  console.log()
  console.log(`  Created:  ${importResult.created}`)
  console.log(`  Updated:  ${importResult.updated}`)
  console.log(`  Skipped:  ${importResult.skipped}`)
  console.log(`  Failed:   ${importResult.failed}`)
  console.log(`  --------------------`)
  console.log(`  Total:      ${importResult.total}`)
  console.log(`  Duration:   ${importResult.durationMs}ms`)

  // Extended stats
  if (importResult.brandStats.detected > 0) {
    console.log(`  Brands:     ${importResult.brandStats.detected} detected, ${importResult.brandStats.unknown} unknown`)
  }
  if (importResult.priceStats.max > 0) {
    console.log(`  Prices:     R$${importResult.priceStats.min.toFixed(0)}-R$${importResult.priceStats.max.toFixed(0)} (avg R$${importResult.priceStats.avg.toFixed(0)})`)
  }

  const failures = importResult.items.filter(i => i.action === 'failed')
  if (failures.length > 0) {
    console.log()
    console.log('  Failures:')
    for (const f of failures.slice(0, 5)) {
      console.log(`    ${f.externalId}: ${f.reason}`)
    }
  }

  const totalMs = Date.now() - start
  console.log()
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log(`║  ${importResult.created} produtos reais importados em ${(totalMs / 1000).toFixed(1)}s`)
  console.log('║')
  console.log('║  Proximos passos:')
  console.log('║  - Abre https://www.promosnap.com.br -> produtos reais')
  console.log('║  - /api/admin/status -> verificar catalogo')
  console.log('║  - Cron diario importa automaticamente')
  console.log('╚══════════════════════════════════════════════════════════╝')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
