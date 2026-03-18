#!/usr/bin/env tsx
/**
 * scripts/import-shopee-csv.ts
 *
 * CLI runner para importar um CSV do afiliado Shopee diretamente no banco.
 * Usa o mesmo pipeline idempotente da API.
 *
 * Uso:
 *   npx tsx scripts/import-shopee-csv.ts <caminho-do-csv> [--dry-run] [--limit N]
 *
 * Exemplos:
 *   npx tsx scripts/import-shopee-csv.ts ../../../Downloads/shopee.csv
 *   npx tsx scripts/import-shopee-csv.ts shopee.csv --dry-run
 *   npx tsx scripts/import-shopee-csv.ts shopee.csv --limit 100
 *
 * Requer: DATABASE_URL no .env.local ou variável de ambiente
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// Load .env.local before importing anything that uses process.env
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) {
      const key = m[1].trim()
      const val = m[2].trim().replace(/^["']|["']$/g, '')
      if (!process.env[key]) process.env[key] = val
    }
  }
  console.log(`✓ Loaded .env.local`)
} else {
  console.log('⚠ .env.local not found — relying on system env vars')
}

// ── Parse args ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const csvArg = args.find(a => !a.startsWith('--'))
const dryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))?.split('=')[1]
  ?? args[args.indexOf('--limit') + 1]
const limit = limitArg ? parseInt(limitArg, 10) : 500

if (!csvArg) {
  console.error('❌ Uso: npx tsx scripts/import-shopee-csv.ts <arquivo.csv> [--dry-run] [--limit N]')
  process.exit(1)
}

const csvPath = path.resolve(csvArg)
if (!fs.existsSync(csvPath)) {
  console.error(`❌ Arquivo não encontrado: ${csvPath}`)
  process.exit(1)
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n📦 PromoSnap — Shopee CSV Import`)
  console.log(`   Arquivo : ${csvPath}`)
  console.log(`   Dry run : ${dryRun}`)
  console.log(`   Limite  : ${limit} itens`)
  console.log()

  // Read CSV
  const csvText = fs.readFileSync(csvPath, 'utf-8')
  console.log(`✓ CSV lido (${Math.round(csvText.length / 1024)} KB)`)

  // Normalize
  const { normalizeShopeeCSV } = await import('../lib/import/shopee-csv-normalizer')
  const { items, total, skipped: parseSkipped, reasons } = normalizeShopeeCSV(csvText, {
    discoverySource: 'csv_upload',
  })

  console.log(`✓ CSV parseado: ${total} linhas → ${items.length} produtos válidos (${parseSkipped} ignorados)`)

  if (reasons.length > 0) {
    console.log(`\n  ⚠ Motivos de skip (primeiros ${Math.min(reasons.length, 5)}):`)
    reasons.slice(0, 5).forEach(r => console.log(`    - ${r}`))
  }

  // Category breakdown
  const catBreakdown: Record<string, number> = {}
  for (const item of items) {
    const k = item.categorySlug ?? '(sem categoria)'
    catBreakdown[k] = (catBreakdown[k] || 0) + 1
  }
  console.log('\n  Categorias detectadas:')
  Object.entries(catBreakdown)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`    ${k.padEnd(20)} ${v}`))

  if (items.length === 0) {
    console.log('\n❌ Nenhum produto válido. Verifique o formato do CSV.')
    process.exit(1)
  }

  const batch = items.slice(0, limit)
  if (batch.length < items.length) {
    console.log(`\n⚠ Limitando a ${batch.length} de ${items.length} itens (use --limit N para mais)`)
  }

  if (dryRun) {
    console.log('\n[DRY RUN] Nenhum dado gravado no banco. Remova --dry-run para importar.')
    process.exit(0)
  }

  // Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  const answer = await new Promise<string>(resolve =>
    rl.question(`\nImportar ${batch.length} produtos no banco? [s/N] `, resolve)
  )
  rl.close()

  if (!['s', 'S', 'y', 'Y', 'sim', 'yes'].includes(answer.trim())) {
    console.log('Cancelado.')
    process.exit(0)
  }

  // Run pipeline
  console.log('\n🚀 Iniciando pipeline de importação...')
  const { runImportPipeline } = await import('../lib/import/pipeline')
  const result = await runImportPipeline(batch, { dryRun: false })

  // Disconnect
  const { default: prisma } = await import('../lib/db/prisma')
  await prisma.$disconnect()

  // Report
  console.log('\n✅ Importação concluída!')
  console.log(`   Criados   : ${result.created}`)
  console.log(`   Atualizados: ${result.updated}`)
  console.log(`   Ignorados : ${result.skipped}`)
  console.log(`   Falhas    : ${result.failed}`)
  console.log(`   Duração   : ${result.durationMs}ms`)
  console.log(`   Marcas    : ${result.brandStats.detected} detectadas, ${result.brandStats.unknown} desconhecidas`)
  console.log(`   Preços    : R$${result.priceStats.min} – R$${result.priceStats.max} (média R$${result.priceStats.avg})`)

  if (result.failed > 0) {
    const failures = result.items.filter(i => i.action === 'failed').slice(0, 5)
    console.log(`\n  ⚠ Primeiras falhas:`)
    failures.forEach(f => console.log(`    [${f.externalId}] ${f.reason}`))
  }
}

main().catch(err => {
  console.error('❌ Erro fatal:', err)
  process.exit(1)
})
