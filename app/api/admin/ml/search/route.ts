import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { runDiscovery, getAllCategories, fetchTrendingSignals } from '@/lib/ml-discovery'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ml/search
 *
 * Backward-compatible ML search endpoint.
 * Now routes through the discovery engine pipeline.
 *
 * Query params:
 *   q     - Search query
 *   limit - Max results (default: 20)
 *   mode  - 'categories' (list categories) | 'trends' (get trends) | default (search)
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const query = req.nextUrl.searchParams.get('q')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
  const mode = req.nextUrl.searchParams.get('mode')

  // Mode: list available categories
  if (mode === 'categories') {
    const allCats = getAllCategories()
    const unique = new Map<string, string>()
    for (const cat of allCats) {
      unique.set(cat.id, cat.name)
    }
    return NextResponse.json({
      categories: Array.from(unique.entries()).map(([id, name]) => ({ id, name })),
    })
  }

  // Mode: get trends
  if (mode === 'trends') {
    try {
      const trends = await fetchTrendingSignals()
      return NextResponse.json({
        trends: trends.map(t => ({
          keyword: t.keyword,
          url: t.url,
          category: t.resolvedCategory?.name,
        })),
      })
    } catch (error) {
      return NextResponse.json({
        trends: [],
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  // Search mode
  if (!query) {
    return NextResponse.json({ error: 'Parametro q obrigatorio' }, { status: 400 })
  }

  try {
    console.log(`[ml-search] Discovering: "${query}" limit=${limit}`)

    const { products, meta } = await runDiscovery({
      mode: 'manual-admin',
      query,
      limit,
    })

    // Map to backward-compatible format
    const results = products.map(p => ({
      externalId: p.externalId,
      title: p.title,
      currentPrice: p.currentPrice,
      originalPrice: p.originalPrice,
      productUrl: p.productUrl,
      imageUrl: p.imageUrl,
      isFreeShipping: p.isFreeShipping,
      availability: p.availability,
      category: meta.resolvedCategories[0]?.name,
    }))

    console.log(`[ml-search] "${query}" -> ${results.length} results in ${meta.timing.totalMs}ms`)

    return NextResponse.json({
      query,
      count: results.length,
      category: meta.resolvedCategories[0]?.name || null,
      method: 'discovery-engine',
      pipelinePath: meta.pipeline.map(s => `${s.stage}:${s.status}`).join(' → '),
      results,
    })
  } catch (error) {
    console.error('[ml-search] Exception:', error instanceof Error ? error.message : error)
    return NextResponse.json({
      error: `Falha ao buscar ML: ${error instanceof Error ? error.message : String(error)}`,
      query,
      results: [],
    })
  }
}
