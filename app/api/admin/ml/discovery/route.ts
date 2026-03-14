import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runDiscovery } from '@/lib/ml-discovery'
import type { DiscoveryMode } from '@/lib/ml-discovery'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ml/discovery
 *
 * Full ML discovery pipeline — resolves intent, fetches highlights,
 * hydrates items, normalizes, ranks, and returns scored products.
 *
 * Query params:
 *   q         - Free-text search term (e.g. "celular", "notebook gamer")
 *   category  - Explicit ML category ID (e.g. "MLB1055")
 *   mode      - Discovery mode (default: "manual-admin")
 *   limit     - Max results (default: 20, max: 50)
 *   trends    - Include trend signals ("1" or "true")
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const sp = req.nextUrl.searchParams
  const query = sp.get('q') || undefined
  const categoryId = sp.get('category') || undefined
  const mode = (sp.get('mode') as DiscoveryMode) || 'manual-admin'
  const limit = Math.min(parseInt(sp.get('limit') || '20'), 50)
  const includeTrends = sp.get('trends') === '1' || sp.get('trends') === 'true'

  if (!query && !categoryId && mode === 'manual-admin') {
    return NextResponse.json(
      { error: 'Envie q (busca) ou category (ID da categoria ML)', hint: 'Ex: ?q=celular&limit=20 ou ?category=MLB1055' },
      { status: 400 }
    )
  }

  try {
    console.log(`[ml-discovery-api] mode=${mode} q="${query || ''}" cat=${categoryId || ''} limit=${limit}`)

    const result = await runDiscovery({ mode, query, categoryId, limit, includeTrends })

    return NextResponse.json({
      products: result.products,
      count: result.products.length,
      meta: result.meta,
    })
  } catch (error) {
    console.error('[ml-discovery-api] Pipeline error:', error)
    return NextResponse.json(
      { error: 'Falha no pipeline de discovery' },
      { status: 500 }
    )
  }
}
