import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { discoverProducts, getTrends, ML_CATEGORIES } from '@/lib/ml-discovery'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const query = req.nextUrl.searchParams.get('q')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
  const mode = req.nextUrl.searchParams.get('mode') // 'trends' or 'categories'

  // Mode: list available categories
  if (mode === 'categories') {
    const unique = new Map<string, string>()
    for (const cat of Object.values(ML_CATEGORIES)) {
      unique.set(cat.id, cat.name)
    }
    return NextResponse.json({
      categories: Array.from(unique.entries()).map(([id, name]) => ({ id, name })),
    })
  }

  // Mode: get trends
  if (mode === 'trends') {
    const trends = await getTrends()
    return NextResponse.json({ trends })
  }

  // Search mode
  if (!query) {
    return NextResponse.json({ error: 'Parametro q obrigatorio' }, { status: 400 })
  }

  try {
    console.log(`[ml-search] Discovering products for: "${query}" limit=${limit}`)

    const { results, category, method } = await discoverProducts(query, limit)

    console.log(`[ml-search] "${query}" → ${results.length} results via ${method} (category: ${category || 'multi'})`)

    return NextResponse.json({
      query,
      count: results.length,
      category,
      method,
      results,
    })
  } catch (error) {
    console.error(`[ml-search] Exception:`, error)
    return NextResponse.json({
      error: `Falha ao buscar ML: ${error instanceof Error ? error.message : String(error)}`,
      query,
      results: [],
    })
  }
}
