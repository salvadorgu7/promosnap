// ============================================================================
// POST /api/admin/import/shopee-csv
// Admin endpoint to upload and process a Shopee affiliate CSV export.
//
// Accepts: multipart/form-data with field `file` (CSV)
//          OR application/json with field `url` (CSV URL to fetch)
//          OR text/plain / application/octet-stream body (raw CSV)
//
// Auth: ADMIN_SECRET (X-Admin-Secret header or Authorization: Bearer ...)
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runImportPipeline, MAX_BATCH_SIZE } from '@/lib/import/pipeline'
import { normalizeShopeeCSV } from '@/lib/import/shopee-csv-normalizer'
import { logger } from '@/lib/logger'

const log = logger.child({ route: 'admin/import/shopee-csv' })

/** Max CSV file size: 10 MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const contentType = request.headers.get('content-type') ?? ''

  let csvText: string | null = null
  let fileName = 'shopee-import.csv'

  // ── 1. Multipart form-data (file upload) ───────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (err) {
      return NextResponse.json({ error: 'Falha ao parsear form-data' }, { status: 400 })
    }

    const fileField = formData.get('file')
    if (!fileField || typeof fileField === 'string') {
      return NextResponse.json(
        { error: 'Campo "file" obrigatório (CSV do afiliado Shopee)' },
        { status: 400 }
      )
    }

    const file = fileField as File
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `Arquivo muito grande (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
        { status: 413 }
      )
    }

    fileName = file.name || fileName
    csvText = await file.text()

  // ── 2. JSON body with URL ──────────────────────────────────────────────────
  } else if (contentType.includes('application/json')) {
    let body: { url?: string; dryRun?: boolean }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
    }

    if (!body.url) {
      return NextResponse.json(
        { error: 'Campo "url" obrigatório quando enviando JSON' },
        { status: 400 }
      )
    }

    try {
      const res = await fetch(body.url, { signal: AbortSignal.timeout(30_000) })
      if (!res.ok) {
        return NextResponse.json(
          { error: `Falha ao buscar CSV da URL: HTTP ${res.status}` },
          { status: 502 }
        )
      }
      const buf = await res.arrayBuffer()
      if (buf.byteLength > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `CSV muito grande (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
          { status: 413 }
        )
      }
      csvText = new TextDecoder('utf-8').decode(buf)
      fileName = body.url.split('/').pop() ?? 'shopee-import.csv'
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return NextResponse.json({ error: `Falha ao buscar CSV: ${msg}` }, { status: 502 })
    }

  // ── 3. Raw CSV body (text/plain or application/octet-stream) ───────────────
  } else {
    try {
      const buf = await request.arrayBuffer()
      if (buf.byteLength > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Payload muito grande (max ${MAX_FILE_SIZE / 1024 / 1024} MB)` },
          { status: 413 }
        )
      }
      csvText = new TextDecoder('utf-8').decode(buf)
    } catch {
      return NextResponse.json(
        { error: 'Não foi possível ler o corpo da requisição' },
        { status: 400 }
      )
    }
  }

  if (!csvText || csvText.trim().length === 0) {
    return NextResponse.json({ error: 'CSV vazio' }, { status: 400 })
  }

  // ── Parse query params ─────────────────────────────────────────────────────
  const dryRun  = request.nextUrl.searchParams.get('dryRun') === 'true'
  const rawLimit = request.nextUrl.searchParams.get('limit')
  const batchLimit = rawLimit ? Math.min(parseInt(rawLimit, 10) || MAX_BATCH_SIZE, MAX_BATCH_SIZE) : MAX_BATCH_SIZE

  // ── Normalize CSV → ImportItem[] ───────────────────────────────────────────
  const { items, total, skipped: parseSkipped, reasons } = normalizeShopeeCSV(csvText, {
    discoverySource: 'csv_upload',
  })

  if (items.length === 0) {
    return NextResponse.json({
      ok: false,
      fileName,
      message: 'Nenhum produto válido encontrado no CSV',
      csvRows: total,
      parseSkipped,
      parseReasons: reasons.slice(0, 20),
    }, { status: 422 })
  }

  // Apply batch limit
  const batch = items.slice(0, batchLimit)
  const truncated = items.length > batchLimit

  log.info('shopee-csv.start', {
    fileName,
    csvRows: total,
    parsed: items.length,
    batch: batch.length,
    truncated,
    dryRun,
  })

  // ── Run import pipeline ────────────────────────────────────────────────────
  let pipelineResult
  try {
    pipelineResult = await runImportPipeline(batch, { dryRun })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    log.error('shopee-csv.pipeline-error', { error: msg })
    return NextResponse.json({ error: `Falha no pipeline de importação: ${msg}` }, { status: 500 })
  }

  // ── Build response ─────────────────────────────────────────────────────────
  const categoryBreakdown: Record<string, number> = {}
  for (const item of batch) {
    const slug = item.categorySlug ?? 'sem-categoria'
    categoryBreakdown[slug] = (categoryBreakdown[slug] || 0) + 1
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    fileName,
    csvRows: total,
    parsed: items.length,
    batchProcessed: batch.length,
    truncated,
    parseSkipped,
    parseReasons: reasons.slice(0, 10),
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
    categoryBreakdown,
    message: dryRun
      ? `[DRY RUN] ${batch.length} produtos processados sem gravação no DB`
      : `${pipelineResult.created} criados, ${pipelineResult.updated} atualizados, ${pipelineResult.skipped} ignorados`,
  })
}

// ── GET — info endpoint ────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  return NextResponse.json({
    endpoint: 'POST /api/admin/import/shopee-csv',
    description: 'Importa produtos Shopee via CSV do programa de afiliados',
    methods: {
      multipart: 'POST com form-data, campo "file" (CSV)',
      json: 'POST com JSON body: { url: "https://..." }',
      raw: 'POST com corpo em text/plain ou application/octet-stream',
    },
    queryParams: {
      dryRun: 'true | false — simula importação sem gravar (default: false)',
      limit: `number — máximo de itens por batch (default/max: ${MAX_BATCH_SIZE})`,
    },
    csvFormat: {
      required: ['itemid', 'title', 'product_link', 'sale_price OR price'],
      optional: ['image_link', 'global_category1', 'global_category2', 'discount_percentage'],
      note: 'Formato CSV do painel de afiliados Shopee Brasil (export CSV)',
    },
  })
}
