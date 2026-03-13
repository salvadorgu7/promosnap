import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runImportPipeline, type ImportItem } from '@/lib/import'
import { runDiscovery } from '@/lib/ml-discovery'
import type { MLProduct, DiscoveryMode } from '@/lib/ml-discovery'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/ml/import-discovery
 *
 * Imports ML products into the PromoSnap catalog.
 * Supports two modes:
 *
 * Mode A — Pre-hydrated products (existing):
 *   Body: { products: MLProduct[], dryRun?: boolean }
 *
 * Mode B — Server-side discovery + import (new):
 *   Body: { discover: true, query?: string, category?: string, limit?: number, dryRun?: boolean }
 */
export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  let body: {
    products?: MLProduct[]
    discover?: boolean
    query?: string
    category?: string
    limit?: number
    dryRun?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  try {
    // ── Mode B: Server-side discovery then import ──────────────────────────
    if (body.discover) {
      if (!body.query && !body.category) {
        return NextResponse.json(
          { error: 'discover mode requer query ou category', hint: '{ discover: true, query: "celular" }' },
          { status: 400 }
        )
      }

      const limit = Math.min(body.limit ?? 20, 50)
      console.log(`[ml-import-discovery] Mode B: discover+import | query="${body.query || ''}" category="${body.category || ''}" limit=${limit}`)

      // 1. Run discovery pipeline
      const discoveryStart = Date.now()
      const discoveryResult = await runDiscovery({
        mode: 'manual-admin' as DiscoveryMode,
        query: body.query,
        categoryId: body.category,
        limit,
      })
      const discoveryDurationMs = Date.now() - discoveryStart

      const allProducts = discoveryResult.products
      console.log(`[ml-import-discovery] Discovery returned ${allProducts.length} products`)

      // 2. Separate products with valid prices from those without
      const withPrice = allProducts.filter(p => p.currentPrice > 0)
      const withoutPrice = allProducts.filter(p => !p.currentPrice || p.currentPrice <= 0)

      console.log(`[ml-import-discovery] Valid prices: ${withPrice.length} | Zero/missing price: ${withoutPrice.length}`)

      if (withoutPrice.length > 0) {
        console.log(`[ml-import-discovery] Discarded (price_zero):`, withoutPrice.map(p => p.title.slice(0, 60)))
      }

      // 3. Collect unique categories from discovery
      const categories = [...new Set(
        discoveryResult.meta.resolvedCategories.map(c => c.name).filter(Boolean)
      )]

      // 4. Build discarded list
      const discarded: { title: string; externalId: string; reason: string }[] = withoutPrice.map(p => ({
        title: p.title,
        externalId: p.externalId,
        reason: 'price_zero',
      }))

      // 5. Run import pipeline on valid products
      if (withPrice.length === 0) {
        console.log(`[ml-import-discovery] No products with valid prices to import`)
        return NextResponse.json({
          ok: true,
          discovery: {
            found: allProducts.length,
            withPrice: 0,
            withoutPrice: withoutPrice.length,
            categories,
            durationMs: discoveryDurationMs,
          },
          import: {
            created: 0, updated: 0, skipped: 0, failed: 0, total: 0, durationMs: 0,
          },
          details: { discarded },
        })
      }

      const importItems = mlProductsToImportItems(withPrice)
      const importResult = await runImportPipeline(importItems, { dryRun: body.dryRun })

      // 6. Add validation failures to discarded list
      for (const item of importResult.items) {
        if (item.action === 'failed' && item.reason) {
          discarded.push({
            title: withPrice.find(p => p.externalId === item.externalId)?.title || item.externalId,
            externalId: item.externalId,
            reason: `validation_failed: ${item.reason}`,
          })
        }
      }

      console.log(`[ml-import-discovery] Import done: created=${importResult.created} updated=${importResult.updated} skipped=${importResult.skipped} failed=${importResult.failed} (${importResult.durationMs}ms)`)

      return NextResponse.json({
        ok: true,
        discovery: {
          found: allProducts.length,
          withPrice: withPrice.length,
          withoutPrice: withoutPrice.length,
          categories,
          durationMs: discoveryDurationMs,
        },
        import: {
          created: importResult.created,
          updated: importResult.updated,
          skipped: importResult.skipped,
          failed: importResult.failed,
          total: importResult.total,
          durationMs: importResult.durationMs,
        },
        details: { discarded },
      })
    }

    // ── Mode A: Pre-hydrated products (existing behavior) ─────────────────
    if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
      return NextResponse.json({ error: 'Envie { products: MLProduct[] } ou { discover: true, query: "..." }' }, { status: 400 })
    }

    console.log(`[ml-import-discovery] Mode A: pre-hydrated | ${body.products.length} products received`)

    // Filter out zero-price products before import
    const validProducts = body.products.filter(p => p.currentPrice > 0)
    const zeroPrice = body.products.filter(p => !p.currentPrice || p.currentPrice <= 0)

    if (zeroPrice.length > 0) {
      console.log(`[ml-import-discovery] Filtered out ${zeroPrice.length} products with zero/missing price`)
    }

    const discarded: { title: string; externalId: string; reason: string }[] = zeroPrice.map(p => ({
      title: p.title,
      externalId: p.externalId,
      reason: 'price_zero',
    }))

    if (validProducts.length === 0) {
      console.log(`[ml-import-discovery] No valid products to import after filtering`)
      return NextResponse.json({
        ok: true,
        import: {
          created: 0, updated: 0, skipped: 0, failed: 0, total: 0, durationMs: 0,
        },
        details: { discarded },
      })
    }

    const importItems = mlProductsToImportItems(validProducts)
    const result = await runImportPipeline(importItems, { dryRun: body.dryRun })

    // Add validation failures to discarded list
    for (const item of result.items) {
      if (item.action === 'failed' && item.reason) {
        discarded.push({
          title: validProducts.find(p => p.externalId === item.externalId)?.title || item.externalId,
          externalId: item.externalId,
          reason: `validation_failed: ${item.reason}`,
        })
      }
    }

    console.log(`[ml-import-discovery] Import done: created=${result.created} updated=${result.updated} skipped=${result.skipped} failed=${result.failed} (${result.durationMs}ms)`)

    return NextResponse.json({
      ok: true,
      import: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        failed: result.failed,
        total: result.total,
        durationMs: result.durationMs,
      },
      details: { discarded },
    })
  } catch (error) {
    console.error('[ml-import-discovery] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Falha na importacao', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// ── Helper ──────────────────────────────────────────────────────────────────

function mlProductsToImportItems(products: MLProduct[]): ImportItem[] {
  return products.map(p => ({
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
  }))
}
