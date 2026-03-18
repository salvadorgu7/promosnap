#!/usr/bin/env tsx
/**
 * scripts/import-shopee-csv.ts
 *
 * CLI runner para importar um CSV do afiliado Shopee diretamente no banco.
 * Processa o ficheiro completo em batches de 500 (idempotente — seguro re-rodar).
 *
 * Uso:
 *   npx tsx scripts/import-shopee-csv.ts <caminho-do-csv> [opções]
 *
 * Opções:
 *   --dry-run          Simula sem gravar nada no banco
 *   --batch-size N     Itens por batch (default/max: 500)
 *   --offset N         Começa do produto N (skip primeiros N)
 *   --limit N          Processa apenas N produtos no total
 *   --yes              Não pede confirmação (útil para CI/automação)
 *
 * Exemplos:
 *   npx tsx scripts/import-shopee-csv.ts shopee.csv --dry-run
 *   npx tsx scripts/import-shopee-csv.ts shopee.csv --yes
 *   npx tsx scripts/import-shopee-csv.ts shopee.csv --offset 500 --limit 500
 */

import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'

// ── Load .env.local ───────────────────────────────────────────────────────────
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
  console.log('✓ .env.local loaded')
} else {
  console.log('⚠ .env.local not found — using system env vars')
}

// ── Parse args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const csvArg = args.find(a => !a.startsWith('--'))
const dryRun   = args.includes('--dry-run')
const skipConfirm = args.includes('--yes') || args.includes('-y')

function getArgVal(name: string, def: number): number {
  const flag = args.find(a => a.startsWith(`--${name}=`))
  if (flag) return parseInt(flag.split('=')[1], 10) || def
  const idx = args.indexOf(`--${name}`)
  if (idx >= 0 && args[idx + 1]) return parseInt(args[idx + 1], 10) || def
  return def
}

const BATCH_SIZE = Math.min(getArgVal('batch-size', 500), 500)
const OFFSET     = getArgVal('offset', 0)
const LIMIT      = getArgVal('limit', Infinity)

if (!csvArg) {
  console.error('\n❌ Uso: npx tsx scripts/import-shopee-csv.ts <arquivo.csv> [--dry-run] [--yes]\n')
  process.exit(1)
}

const csvPath = path.resolve(csvArg)
if (!fs.existsSync(csvPath)) {
  console.error(`❌ Ficheiro não encontrado: ${csvPath}`)
  process.exit(1)
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number) { return n.toLocaleString('pt-BR') }
function fmtMs(ms: number) {
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms/1000).toFixed(1)}s`
  return `${Math.floor(ms/60000)}m ${Math.floor((ms%60000)/1000)}s`
}

function confirm(question: string): Promise<boolean> {
  if (skipConfirm) return Promise.resolve(true)
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, ans => {
      rl.close()
      resolve(['s', 'S', 'y', 'Y', 'sim', 'yes'].includes(ans.trim()))
    })
  })
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  const fileSizeMB = (fs.statSync(csvPath).size / 1024 / 1024).toFixed(1)
  console.log(`\n📦 PromoSnap — Shopee CSV Import`)
  console.log(`   Ficheiro  : ${path.basename(csvPath)} (${fileSizeMB} MB)`)
  console.log(`   Dry run   : ${dryRun}`)
  console.log(`   Batch size: ${BATCH_SIZE}`)
  if (OFFSET > 0) console.log(`   Offset    : ${OFFSET}`)
  if (LIMIT < Infinity) console.log(`   Limit     : ${LIMIT}`)
  console.log()

  // ── Parse CSV ──────────────────────────────────────────────────────────────
  console.log('⏳ Parsing CSV...')
  const csvText = fs.readFileSync(csvPath, 'utf-8')
  const { normalizeShopeeCSV } = await import('../lib/import/shopee-csv-normalizer')
  const { items, total, skipped: parseSkipped, reasons } = normalizeShopeeCSV(csvText, {
    discoverySource: 'csv_upload',
  })

  console.log(`✓ CSV parseado: ${fmt(total)} linhas → ${fmt(items.length)} produtos válidos (${fmt(parseSkipped)} ignorados)`)

  if (reasons.length > 0) {
    console.log(`  ⚠ Primeiros motivos de skip:`)
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
    .slice(0, 10)
    .forEach(([k, v]) => console.log(`    ${k.padEnd(22)} ${fmt(v)}`))
  if (Object.keys(catBreakdown).length > 10) {
    console.log(`    ... +${Object.keys(catBreakdown).length - 10} categorias`)
  }

  if (items.length === 0) {
    console.log('\n❌ Nenhum produto válido. Verifica o formato do CSV.')
    process.exit(1)
  }

  // Apply offset + limit
  const slice = items.slice(OFFSET, LIMIT < Infinity ? OFFSET + LIMIT : undefined)
  const totalBatches = Math.ceil(slice.length / BATCH_SIZE)

  console.log(`\n  Total a importar : ${fmt(slice.length)} produtos`)
  console.log(`  Batches          : ${totalBatches} × ${BATCH_SIZE}`)

  if (dryRun) {
    console.log('\n[DRY RUN] Simulação concluída. Remove --dry-run para importar.')
    process.exit(0)
  }

  const ok = await confirm(`\nImportar ${fmt(slice.length)} produtos no banco? [s/N] `)
  if (!ok) { console.log('Cancelado.'); process.exit(0) }

  // ── Batch import ───────────────────────────────────────────────────────────
  const { runImportPipeline } = await import('../lib/import/pipeline')

  const globalStart = Date.now()
  let totalCreated = 0, totalUpdated = 0, totalSkipped = 0, totalFailed = 0

  for (let b = 0; b < totalBatches; b++) {
    const batch = slice.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE)
    const batchNum = b + 1
    const pct = Math.round((b / totalBatches) * 100)

    process.stdout.write(
      `\r  Batch ${batchNum}/${totalBatches} (${pct}%) — ` +
      `✓ ${fmt(totalCreated)} criados  ↺ ${fmt(totalUpdated)} atualizados  ` +
      `⊘ ${fmt(totalSkipped)} ign.  ✗ ${fmt(totalFailed)} falhas   `
    )

    const result = await runImportPipeline(batch, { dryRun: false })
    totalCreated += result.created
    totalUpdated += result.updated
    totalSkipped += result.skipped
    totalFailed  += result.failed
  }

  process.stdout.write('\n')

  const elapsed = Date.now() - globalStart

  console.log('\n✅ Importação concluída!')
  console.log(`   Criados     : ${fmt(totalCreated)}`)
  console.log(`   Atualizados : ${fmt(totalUpdated)}`)
  console.log(`   Ignorados   : ${fmt(totalSkipped)}`)
  console.log(`   Falhas      : ${fmt(totalFailed)}`)
  console.log(`   Duração     : ${fmtMs(elapsed)}`)
  console.log(`   Velocidade  : ~${fmt(Math.round(slice.length / (elapsed / 1000)))} produtos/s`)

  const { default: prisma } = await import('../lib/db/prisma')
  await prisma.$disconnect()
}

main().catch(err => {
  console.error('\n❌ Erro fatal:', err)
  process.exit(1)
})
