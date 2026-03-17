import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { MercadoLivreSourceAdapter } from '@/lib/adapters/mercadolivre'
import { runImportPipeline, type ImportItem, type ImportPipelineResult } from '@/lib/import'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { getMLAppToken } from '@/lib/ml-auth'
import { SEED_PRODUCTS } from '@/lib/seed-products'

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Remove lone surrogates and noisy emoji from text (prevents Prisma JSON errors + URI malformed) */
function sanitizeText(raw: string): string {
  return raw
    // Remove lone surrogates (broken emoji from WhatsApp copy-paste)
    // eslint-disable-next-line no-control-regex
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '')
    // Remove common emoji blocks that add noise
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}]/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Extract pipeline stats to include in API response for admin UI */
function pipelineStats(r: ImportPipelineResult) {
  return {
    brandStats: r.brandStats,
    categoryStats: r.categoryStats,
    priceStats: r.priceStats,
    noAffiliateUrl: r.noAffiliateUrl,
  }
}

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
      ...pipelineStats(result),
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
      ...pipelineStats(result),
      importedItems: result.items,
      ...(errors.length > 0 && { fetchErrors: errors }),
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao processar ingestao' }, { status: 500 })
  }
}

// ─── PUT /api/admin/ingest ──────────────────────────────────────────────────
// Manual entry: accepts pre-formatted product data directly
// Body: { items: [{ title, price, url, imageUrl?, originalPrice?, trackerUrl?, needsServerResolve? }] }

// Resolve a tracker/shortened URL by following redirects (server-side only)
async function resolveTrackerUrl(trackerUrl: string): Promise<string | null> {
  try {
    // Follow redirects with HEAD to find the real marketplace URL
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(trackerUrl, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PromoSnap/1.0)' },
    })
    clearTimeout(timeout)
    const finalUrl = res.url
    if (finalUrl && finalUrl !== trackerUrl) return finalUrl
    return null
  } catch {
    // Try GET as fallback (some servers don't support HEAD)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 5000)
      const res = await fetch(trackerUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PromoSnap/1.0)' },
      })
      clearTimeout(timeout)
      // Read a tiny bit to trigger redirects, then abort
      res.body?.cancel()
      const finalUrl = res.url
      if (finalUrl && finalUrl !== trackerUrl) return finalUrl
      return null
    } catch {
      return null
    }
  }
}

export async function PUT(request: NextRequest) {
  const denied = validateAdmin(request)
  if (denied) return denied

  const rl = rateLimit(request, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  let body: { items?: Array<{
    title: string; price: number; url: string; imageUrl?: string;
    originalPrice?: number; trackerUrl?: string; needsServerResolve?: boolean;
    category?: string;
  }> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  const rawItems = body?.items
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return NextResponse.json({ error: 'Envie { items: [{ title, price, url }] }' }, { status: 400 })
  }

  // Known marketplace domains — only these should be used as product/affiliate URLs
  const MARKETPLACE_HOSTS = ['mercadolivre.com.br', 'mercadolibre.com', 'mercadolibre.com.br', 'amazon.com.br', 'shopee.com.br', 'magazineluiza.com.br', 'magalu.com', 'americanas.com.br', 'casasbahia.com.br', 'kabum.com.br', 'aliexpress.com', 'click.mercadolivre.com.br', 'click.mercadolibre.com', 's.click.mercadolibre.com']
  const isMarketplaceUrl = (u: string) => { try { return MARKETPLACE_HOSTS.some(d => new URL(u).hostname.includes(d)) } catch { return false } }

  // Detect source from URL domain
  const detectSource = (u: string): string => {
    try {
      const host = new URL(u).hostname
      if (host.includes('amazon')) return 'amazon-br'
      if (host.includes('shopee')) return 'shopee'
      if (host.includes('magazineluiza') || host.includes('magalu')) return 'magalu'
      if (host.includes('kabum')) return 'kabum'
    } catch {}
    return 'mercadolivre'
  }

  // ML adapter for title-based search fallback
  const adapter = new MercadoLivreSourceAdapter()
  const adapterConfigured = adapter.isConfigured()

  const items: ImportItem[] = []
  const resolveErrors: string[] = []

  for (let i = 0; i < rawItems.length; i++) {
    const item = { ...rawItems[i], title: sanitizeText(rawItems[i].title || '') }
    let effectiveUrl = item.url

    // === Step 1: Resolve tracker URLs server-side ===
    if (item.needsServerResolve && item.trackerUrl) {
      const resolved = await resolveTrackerUrl(item.trackerUrl)
      if (resolved && isMarketplaceUrl(resolved)) {
        effectiveUrl = resolved
      } else if (resolved) {
        // Resolved but not to marketplace — check for MLB ID
        const mlbInResolved = resolved.match(/MLB-?\d{6,15}/i)
        if (mlbInResolved) {
          effectiveUrl = `https://www.mercadolivre.com.br/p/${mlbInResolved[0].replace('-', '')}`
        }
      }
    }

    // === Step 2: Extract MLB ID from URL ===
    const mlMatch = effectiveUrl?.match(/MLB-?\d+/)
    let externalId = mlMatch ? mlMatch[0].replace('-', '') : ''

    // Also check title for MLB ID
    if (!externalId) {
      const mlbInTitle = item.title?.match(/MLB-?\d{6,15}/i)
      if (mlbInTitle) externalId = mlbInTitle[0].replace('-', '')
    }

    // === Step 3: Build clean marketplace URL ===
    let cleanUrl: string | undefined
    if (effectiveUrl && isMarketplaceUrl(effectiveUrl)) {
      cleanUrl = effectiveUrl
    } else if (externalId) {
      cleanUrl = `https://www.mercadolivre.com.br/p/${externalId}`
    }

    // === Step 4: Title-based search fallback via ML API ===
    if (!cleanUrl && !externalId && adapterConfigured && item.title) {
      try {
        const searchResults = await adapter.search(item.title, { limit: 1 })
        if (searchResults.length > 0) {
          const found = searchResults[0]
          // Use the API result — it has proper URL, ID, and metadata
          items.push({
            externalId: found.externalId,
            title: found.title,
            currentPrice: item.price || found.currentPrice,
            originalPrice: item.originalPrice || found.originalPrice,
            productUrl: found.productUrl,
            imageUrl: found.imageUrl || item.imageUrl,
            isFreeShipping: found.isFreeShipping,
            availability: found.availability === 'in_stock' ? 'in_stock'
              : found.availability === 'out_of_stock' ? 'out_of_stock'
              : 'unknown',
            sourceSlug: 'mercadolivre',
            discoverySource: 'whatsapp_title_search',
          })
          continue // skip normal processing — used API result
        } else {
          resolveErrors.push(`"${item.title.slice(0, 40)}": sem resultado na busca ML`)
        }
      } catch (err: any) {
        resolveErrors.push(`"${item.title.slice(0, 40)}": busca ML falhou — ${err.message || 'erro'}`)
      }
    }

    // === Step 5: Build import item ===
    // Skip items with no marketplace URL — they'll fail in the pipeline anyway
    if (!cleanUrl && !externalId) {
      resolveErrors.push(`"${item.title.slice(0, 40)}": sem URL de marketplace resolvida`)
      continue
    }

    if (!externalId) externalId = `MANUAL_${Date.now()}_${i}`

    items.push({
      externalId,
      title: item.title,
      currentPrice: item.price,
      originalPrice: item.originalPrice,
      productUrl: cleanUrl || "",
      imageUrl: item.imageUrl,
      availability: 'in_stock' as const,
      sourceSlug: cleanUrl ? detectSource(cleanUrl) : 'mercadolivre',
      discoverySource: item.needsServerResolve ? 'whatsapp_resolved' : 'manual_entry',
    })
  }

  if (items.length === 0) {
    return NextResponse.json({
      error: 'Nenhum item pôde ser resolvido para URLs de marketplace',
      hint: 'Os links de tracker não puderam ser resolvidos para URLs do Mercado Livre. Tente colar URLs diretas do ML.',
      errors: resolveErrors,
    }, { status: 422 })
  }

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
      ...pipelineStats(result),
      importedItems: result.items,
      ...(resolveErrors.length > 0 && { resolveErrors }),
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
      ...pipelineStats(result),
      importedItems: result.items,
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
      ...pipelineStats(result),
      importedItems: result.items,
      categories: [...new Set(selected.map(p => p.category))],
    })
  } catch (err) {
    return NextResponse.json({ error: 'Erro interno ao processar seed' }, { status: 500 })
  }
}
