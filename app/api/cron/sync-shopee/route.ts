// ============================================================================
// GET /api/cron/sync-shopee
// Daily automation to re-process a Shopee affiliate CSV.
//
// Since Shopee has no public API, the daily sync fetches a pre-configured
// CSV export URL and re-runs the import pipeline (idempotent — only
// updates prices for existing products, creates new ones for new items).
//
// Configuration (env vars):
//   SHOPEE_CSV_URL       — URL to a hosted CSV file (e.g. Vercel Blob, S3, Drive)
//   SHOPEE_ENABLED       — Must be "true" to run
//   CRON_SECRET          — Bearer token for auth
//
// Auth: Bearer CRON_SECRET (same as main cron)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { normalizeShopeeCSV } from '@/lib/import/shopee-csv-normalizer'
import { runImportPipeline, MAX_BATCH_SIZE } from '@/lib/import/pipeline'
import { logger } from '@/lib/logger'

const log = logger.child({ route: 'cron/sync-shopee' })
const CRON_SECRET = process.env.CRON_SECRET

function safeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf-8')
    const bufB = Buffer.from(b, 'utf-8')
    if (bufA.length !== bufB.length) {
      timingSafeEqual(bufA, bufA)
      return false
    }
    return timingSafeEqual(bufA, bufB)
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization')
  if (CRON_SECRET) {
    if (!authHeader || !safeCompare(authHeader, `Bearer ${CRON_SECRET}`)) {
      log.warn('unauthorized', { message: 'Requisição não autorizada rejeitada' })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // ── Feature gate ───────────────────────────────────────────────────────────
  const shopeeEnabled = process.env.SHOPEE_ENABLED === 'true'
  if (!shopeeEnabled) {
    return NextResponse.json({
      ok: false,
      skipped: true,
      message: 'Shopee sync desativado. Defina SHOPEE_ENABLED=true para ativar.',
    })
  }

  // ── CSV URL ────────────────────────────────────────────────────────────────
  const csvUrl = process.env.SHOPEE_CSV_URL
  if (!csvUrl) {
    log.warn('shopee-sync', { message: 'SHOPEE_CSV_URL não configurado — sync ignorado' })
    return NextResponse.json({
      ok: false,
      skipped: true,
      message: 'SHOPEE_CSV_URL não configurado. Configure a URL do CSV exportado do painel de afiliados Shopee.',
      hint: 'Exporte o CSV do programa de afiliados Shopee, hospede em um URL acessível (Vercel Blob, S3, etc.) e defina SHOPEE_CSV_URL.',
    })
  }

  // ── Query params ───────────────────────────────────────────────────────────
  const dryRun = req.nextUrl.searchParams.get('dryRun') === 'true'
  const rawLimit = req.nextUrl.searchParams.get('limit')
  const batchLimit = rawLimit
    ? Math.min(parseInt(rawLimit, 10) || MAX_BATCH_SIZE, MAX_BATCH_SIZE)
    : MAX_BATCH_SIZE

  const startTime = Date.now()
  log.info('shopee-sync.start', { csvUrl, dryRun, batchLimit })

  // ── Fetch CSV ──────────────────────────────────────────────────────────────
  let csvText: string
  try {
    const res = await fetch(csvUrl, {
      signal: AbortSignal.timeout(60_000),
      headers: { 'Cache-Control': 'no-cache' },
    })
    if (!res.ok) {
      const msg = `HTTP ${res.status} ao buscar CSV de ${csvUrl}`
      log.error('shopee-sync.fetch-failed', { url: csvUrl, status: res.status })
      return NextResponse.json({ ok: false, error: msg }, { status: 502 })
    }
    const buf = await res.arrayBuffer()
    csvText = new TextDecoder('utf-8').decode(buf)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('shopee-sync.fetch-error', { url: csvUrl, error: msg })
    return NextResponse.json({ ok: false, error: `Falha ao buscar CSV: ${msg}` }, { status: 502 })
  }

  // ── Normalize ──────────────────────────────────────────────────────────────
  const { items, total, skipped: parseSkipped, reasons } = normalizeShopeeCSV(csvText, {
    discoverySource: 'csv_cron',
  })

  if (items.length === 0) {
    log.warn('shopee-sync.empty', { csvUrl, csvRows: total, reasons })
    return NextResponse.json({
      ok: false,
      message: 'Nenhum produto válido encontrado no CSV',
      csvRows: total,
      parseSkipped,
      parseReasons: reasons.slice(0, 10),
    }, { status: 422 })
  }

  // Apply batch limit
  const batch = items.slice(0, batchLimit)

  // ── Import ─────────────────────────────────────────────────────────────────
  let pipelineResult
  try {
    pipelineResult = await runImportPipeline(batch, { dryRun })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('shopee-sync.pipeline-error', { error: msg })
    return NextResponse.json({ ok: false, error: `Pipeline falhou: ${msg}` }, { status: 500 })
  }

  const totalMs = Date.now() - startTime

  log.info('shopee-sync.complete', {
    csvRows: total,
    parsed: items.length,
    batch: batch.length,
    created: pipelineResult.created,
    updated: pipelineResult.updated,
    skipped: pipelineResult.skipped,
    failed: pipelineResult.failed,
    totalMs,
    dryRun,
  })

  return NextResponse.json({
    ok: true,
    dryRun,
    csvUrl,
    csvRows: total,
    parsed: items.length,
    batchProcessed: batch.length,
    truncated: items.length > batchLimit,
    parseSkipped,
    import: {
      created: pipelineResult.created,
      updated: pipelineResult.updated,
      skipped: pipelineResult.skipped,
      failed: pipelineResult.failed,
      durationMs: pipelineResult.durationMs,
      brandStats: pipelineResult.brandStats,
      categoryStats: pipelineResult.categoryStats,
      priceStats: pipelineResult.priceStats,
    },
    totalMs,
    message: dryRun
      ? `[DRY RUN] ${batch.length} produtos lidos, sem gravação`
      : `Shopee sync concluído: ${pipelineResult.created} novos, ${pipelineResult.updated} atualizados`,
  })
}
