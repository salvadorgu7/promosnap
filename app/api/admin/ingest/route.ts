import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { MercadoLivreSourceAdapter } from '@/lib/adapters/mercadolivre'
import { runImportPipeline, type ImportItem } from '@/lib/import'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getMLAppToken } from '@/lib/ml-auth'
import { SEED_PRODUCTS } from '@/lib/seed-products'

// ─── helpers ─────────────────────────────────────────────────────────────────

function adapterResultToImportItem(
  r: { externalId: string; title: string; currentPrice: number; originalPrice?: number; productUrl: string; affiliateUrl?: string; imageUrl?: string; isFreeShipping?: boolean; availability?: string }
): ImportItem {
  return {
    externalId: r.externalId,
    title: r.title,
    currentPrice: r.currentPrice,
    originalPrice: r.originalPrice,
    productUrl: r.productUrl,
    imageUrl: r.imageUrl,
    isFreeShipping: r.isFreeShipping,
    availability: r.availability === 'in_stock' ? 'in_stock'
      : r.availability === 'out_of_stock' ? 'out_of_stock'
      : 'unknown',
    sourceSlug: 'mercadolivre',
    discoverySource: 'manual_ingest',
  }
}

// ─── GET /api/admin/ingest?q=... ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const rl = rateLimit(request, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q') || 'smartphone'
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50)

  const adapter = new MercadoLivreSourceAdapter()

  if (!adapter.isConfigured()) {
    return NextResponse.json({ error: 'ML API nao configurado — variaveis de ambiente ausentes' }, { status: 503 })
  }

  let items: ImportItem[]
  try {
    const results = await adapter.search(q, { limit })
    items = results.map(adapterResultToImportItem)
  } catch (err: any) {
    return NextResponse.json({ error: `Falha ao buscar da API ML: ${err.message || 'erro desconhecido'}` }, { status: 502 })
  }

  if (items.length === 0) {
    return NextResponse.json({ mode: 'search', query: q, fetched: 0, created: 0, updated: 0, skipped: 0, failed: 0 })
  }

  try {
    const result = await runImportPipeline(items)
    return NextResponse.json({
      mode: 'search',
      query: q,
      fetched: items.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      durationMs: result.durationMs,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao processar ingestao' }, { status: 500 })
  }
}

// ─── POST /api/admin/ingest ───────────────────────────────────────────────────
// Ingere por lista de IDs ou URLs do ML
// Body: { ids: ["MLB123", "https://www.mercadolivre.com.br/.../MLB456/..."] }

export async function POST(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const rl = rateLimit(request, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  let body: { ids?: string[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  const ids = body?.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Envie { ids: ["MLB123", ...] }' }, { status: 400 })
  }
  if (ids.length > 100) {
    return NextResponse.json({ error: 'Maximo 100 IDs por chamada' }, { status: 400 })
  }

  const adapter = new MercadoLivreSourceAdapter()

  if (!adapter.isConfigured()) {
    return NextResponse.json({ error: 'ML API nao configurado — variaveis de ambiente ausentes' }, { status: 503 })
  }

  // Extract ML item IDs from URLs if needed
  const extractId = (input: string): string => {
    const match = input.match(/MLB-?\d+/)
    return match ? match[0].replace('-', '') : input.trim()
  }

  const items: ImportItem[] = []
  const errors: string[] = []

  for (const raw of ids) {
    const id = extractId(raw)
    try {
      const result = await adapter.getProduct(id)
      if (result) {
        items.push(adapterResultToImportItem(result))
      } else {
        errors.push(`${id}: nao encontrado na API ML`)
      }
    } catch (err: any) {
      errors.push(`${id}: ${err.message || 'falha ao buscar'}`)
    }
  }

  if (items.length === 0) {
    return NextResponse.json({
      error: 'Nenhum item encontrado para os IDs fornecidos',
      hint: errors.length > 0
        ? 'Verifique se os IDs estao corretos e se as credenciais ML estao configuradas (ML_CLIENT_ID / ML_CLIENT_SECRET)'
        : 'Verifique se os IDs ML estao no formato correto (ex: MLB1234567890)',
      errors,
      configured: adapter.isConfigured(),
    }, { status: 404 })
  }

  try {
    const result = await runImportPipeline(items)
    return NextResponse.json({
      mode: 'items',
      submitted: ids.length,
      fetched: items.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      durationMs: result.durationMs,
      ...(errors.length > 0 && { fetchErrors: errors }),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao processar ingestao' }, { status: 500 })
  }
}

// ─── PUT /api/admin/ingest ──────────────────────────────────────────────────
// Manual entry: accepts pre-formatted product data directly
// Body: { items: [{ title, price, url, imageUrl?, originalPrice? }] }

export async function PUT(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const rl = rateLimit(request, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  let body: { items?: Array<{ title: string; price: number; url: string; imageUrl?: string; originalPrice?: number }> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  const rawItems = body?.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: 'Envie { items: [{ title, price, url }] }' }, { status: 400 })
  }

  const items: ImportItem[] = rawItems.map((item, i) => {
    const mlMatch = item.url?.match(/MLB-?\d+/)
    const externalId = mlMatch ? mlMatch[0].replace('-', '') : `MANUAL_${Date.now()}_${i}`

    return {
      externalId,
      title: item.title,
      currentPrice: item.price,
      originalPrice: item.originalPrice,
      productUrl: item.url,
      imageUrl: item.imageUrl,
      availability: 'in_stock' as const,
      sourceSlug: 'mercadolivre',
      discoverySource: 'manual_entry',
    }
  })

  try {
    const result = await runImportPipeline(items)
    return NextResponse.json({
      mode: 'manual',
      fetched: items.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      durationMs: result.durationMs,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao processar ingestao manual' }, { status: 500 })
  }
}

// ─── PATCH /api/admin/ingest ────────────────────────────────────────────────
// Import from ML trends — uses working /trends/MLB endpoint
// Body: { limit?: number }

export async function PATCH(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const rl = rateLimit(request, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  let body: { limit?: number } = {}
  try {
    body = await request.json()
  } catch { /* empty body ok */ }

  const limit = Math.min(body.limit || 20, 50)

  // Fetch trending keywords from ML (works with client_credentials!)
  let trends: Array<{ keyword: string; url: string }> = []
  try {
    let headers: Record<string, string> = {}
    try {
      const token = await getMLAppToken()
      headers = { Authorization: `Bearer ${token}` }
    } catch { /* try without token */ }

    const res = await fetch('https://api.mercadolibre.com/trends/MLB', { headers })
    if (res.ok) {
      trends = await res.json()
    } else {
      return NextResponse.json({ error: `Falha ao buscar trends: ${res.status}` }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: `Erro ao buscar trends: ${err.message}` }, { status: 502 })
  }

  if (trends.length === 0) {
    return NextResponse.json({ error: 'Nenhuma tendencia encontrada' }, { status: 404 })
  }

  // Use adapter to search for each trending keyword
  const adapter = new MercadoLivreSourceAdapter()
  const allItems: ImportItem[] = []
  const errors: string[] = []
  const perKeyword = Math.max(2, Math.ceil(limit / Math.min(trends.length, 10)))

  for (const trend of trends.slice(0, 10)) {
    try {
      const results = await adapter.search(trend.keyword, { limit: perKeyword })
      for (const r of results) {
        allItems.push(adapterResultToImportItem(r))
      }
    } catch (err: any) {
      errors.push(`"${trend.keyword}": ${err.message || 'falha'}`)
    }
    if (allItems.length >= limit) break
  }

  const uniqueItems = allItems.slice(0, limit)

  if (uniqueItems.length === 0) {
    return NextResponse.json({
      error: 'Nenhum produto encontrado nas tendencias',
      trends: trends.slice(0, 10).map(t => t.keyword),
      errors,
    }, { status: 404 })
  }

  try {
    const result = await runImportPipeline(uniqueItems)
    return NextResponse.json({
      mode: 'trends',
      keywords: trends.slice(0, 10).map(t => t.keyword),
      fetched: uniqueItems.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      durationMs: result.durationMs,
      ...(errors.length > 0 && { searchErrors: errors }),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao processar trends' }, { status: 500 })
  }
}

// ─── DELETE /api/admin/ingest ───────────────────────────────────────────────
// Seed import: imports pre-scraped popular products (always works!)
// Body: { count?: number }

export async function DELETE(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const rl = rateLimit(request, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  let body: { count?: number } = {}
  try {
    body = await request.json()
  } catch { /* empty body ok */ }

  const count = Math.min(body.count || 20, SEED_PRODUCTS.length)
  const selected = SEED_PRODUCTS.slice(0, count)

  const items: ImportItem[] = selected.map((p) => ({
    externalId: p.externalId,
    title: p.title,
    currentPrice: p.currentPrice,
    productUrl: p.productUrl,
    imageUrl: p.imageUrl,
    categorySlug: p.category,
    availability: 'in_stock' as const,
    sourceSlug: 'mercadolivre',
    discoverySource: 'seed_import',
  }))

  try {
    const result = await runImportPipeline(items)
    return NextResponse.json({
      mode: 'seed',
      fetched: items.length,
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      durationMs: result.durationMs,
      categories: [...new Set(selected.map(p => p.category))],
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao processar seed' }, { status: 500 })
  }
}
