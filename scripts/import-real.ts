/**
 * Import REAL products from Mercado Livre into PromoSnap.
 *
 * Run: npx tsx scripts/import-real.ts
 *
 * Uses the discovery pipeline (highlights + hydrate) which works
 * without /search API access. No OAuth user token required.
 *
 * Requires: MERCADOLIVRE_APP_ID + MERCADOLIVRE_SECRET in .env
 */

import { runDiscovery } from '@/lib/ml-discovery'
import { runImportPipeline, type ImportItem } from '@/lib/import'

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗')
  console.log('║  PromoSnap — Import Real Products from Mercado Livre    ║')
  console.log('╚══════════════════════════════════════════════════════════╝')
  console.log()

  // Check credentials
  const hasML = !!(
    (process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID) &&
    (process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET)
  )

  if (!hasML) {
    console.error('❌ ML credentials not found.')
    console.error('   Set MERCADOLIVRE_APP_ID + MERCADOLIVRE_SECRET in .env')
    process.exit(1)
  }

  console.log('✓ ML credentials found')

  // Run discovery pipeline (highlights → hydrate, no search needed)
  console.log()
  console.log('── Stage 1: Discovery ──────────────────────────────────')
  console.log('  Strategy: highlights → multi-get/products → import')
  console.log('  (sem depender de /search)')

  const start = Date.now()

  const { products, meta } = await runDiscovery({
    mode: 'scheduled-auto-import',
    includeTrends: true,
    limit: 80,
  })

  // Show pipeline stages
  const cats = meta.resolvedCategories.map(c => c.name).join(', ')
  const trends = meta.trendsUsed.slice(0, 5).join(', ')
  console.log(`  Categories: ${cats}`)
  if (trends) console.log(`  Trends: ${trends}`)
  console.log(`  Discovery: ${meta.timing.totalMs}ms`)
  console.log()
  console.log('  Pipeline:')
  for (const stage of meta.pipeline) {
    const icon = stage.status === 'success' ? '✓' : stage.status === 'partial' ? '⚠' : stage.status === 'skipped' ? '–' : '✗'
    console.log(`    ${icon} ${stage.stage}: ${stage.itemsIn} → ${stage.itemsOut} (${stage.durationMs}ms)`)
  }

  if (products.length === 0) {
    console.log()
    console.log('⚠ Nenhum produto descoberto.')
    console.log()
    console.log('  Possíveis causas:')
    console.log('  - ML API rate-limiting')
    console.log('  - /products/ e /items/ bloqueados (verifique com debug-ml.ts)')
    console.log('  - Token expirado')
    console.log()
    console.log('  Tente: npx tsx scripts/debug-ml.ts')
    process.exit(0)
  }

  // Show samples
  console.log()
  console.log(`── ${products.length} produtos descobertos ──────────────────────`)
  for (const p of products.slice(0, 8)) {
    const price = `R$ ${p.currentPrice.toFixed(2)}`
    const discount = p.originalPrice ? ` (era R$ ${p.originalPrice.toFixed(2)})` : ''
    const shipping = p.isFreeShipping ? ' [frete gratis]' : ''
    console.log(`  ${p.title.slice(0, 65)}`)
    console.log(`    ${price}${discount}${shipping}`)
  }
  if (products.length > 8) {
    console.log(`  ... e mais ${products.length - 8} produtos`)
  }

  // Import
  console.log()
  console.log('── Stage 2: Import to DB ───────────────────────────────')

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
    console.error('❌ Import failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  }

  console.log()
  console.log(`  ✓ Created:  ${importResult.created}`)
  console.log(`  ↻ Updated:  ${importResult.updated}`)
  console.log(`  – Skipped:  ${importResult.skipped}`)
  console.log(`  ✗ Failed:   ${importResult.failed}`)
  console.log(`  ─────────────────`)
  console.log(`  Total:      ${importResult.total}`)
  console.log(`  Duration:   ${importResult.durationMs}ms`)

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
  console.log(`║  ✅ ${importResult.created} produtos reais importados em ${(totalMs / 1000).toFixed(1)}s`)
  console.log('║')
  console.log('║  Próximos passos:')
  console.log('║  • Abre https://www.promosnap.com.br → produtos reais')
  console.log('║  • /api/admin/status → verificar catálogo')
  console.log('║  • Cron diário importa automaticamente')
  console.log('╚══════════════════════════════════════════════════════════╝')

  process.exit(0)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
