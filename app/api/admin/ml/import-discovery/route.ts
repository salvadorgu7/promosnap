import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runImportPipeline, type ImportItem } from '@/lib/import'
import type { MLProduct } from '@/lib/ml-discovery'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/ml/import-discovery
 *
 * Imports ML discovery results into the PromoSnap catalog.
 * Uses the unified import pipeline v2.
 *
 * Body: { products: MLProduct[], dryRun?: boolean }
 */
export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  let body: { products: MLProduct[]; dryRun?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body JSON invalido' }, { status: 400 })
  }

  if (!body.products || !Array.isArray(body.products) || body.products.length === 0) {
    return NextResponse.json({ error: 'Envie { products: MLProduct[] }' }, { status: 400 })
  }

  try {
    // Convert MLProduct[] to ImportItem[]
    const importItems: ImportItem[] = body.products.map(p => ({
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

    const result = await runImportPipeline(importItems, { dryRun: body.dryRun })

    return NextResponse.json({
      imported: result.created,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
      total: result.total,
      items: result.items,
      durationMs: result.durationMs,
    })
  } catch (error) {
    console.error('[ml-import-discovery] Error:', error instanceof Error ? error.message : String(error))
    return NextResponse.json(
      { error: 'Falha na importacao', detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
