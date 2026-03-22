/**
 * GET /api/search/expanded
 *
 * Busca Ampliada API — retorna resultados internos + externos unificados.
 * Se FF_EXPANDED_SEARCH=false, retorna apenas internos (backwards-compatible).
 *
 * Query params:
 *   q        - search query (required)
 *   page     - page number (default 1)
 *   limit    - results per page (default 24)
 *   category - filter by category slug
 *   brand    - filter by brand slug
 *   source   - filter by source slug
 *   minPrice - minimum price
 *   maxPrice - maximum price
 *   sort     - relevance|price_asc|price_desc|popularity|score
 *   expand   - force expansion (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { expandedSearch } from '@/lib/search/expanded'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'
import { logInfo } from '@/lib/monitoring'

const ADMIN_SECRET = process.env.ADMIN_SECRET

export async function GET(req: NextRequest) {
  // Rate limit
  const rl = rateLimit(req, 'search')
  if (!rl.success) return rateLimitResponse(rl)

  const sp = req.nextUrl.searchParams
  const query = sp.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Query too short (min 2 chars)' }, { status: 400 })
  }
  if (query.length > 200) {
    return NextResponse.json({ error: 'Query too long (max 200 chars)' }, { status: 400 })
  }

  // Admin check
  const adminSecret = req.headers.get('x-admin-secret')
  const isAdmin = !!(ADMIN_SECRET && adminSecret === ADMIN_SECRET)

  // Parse params
  const page = parseInt(sp.get('page') || '1', 10)
  const limit = Math.min(parseInt(sp.get('limit') || '24', 10), 48)
  const minPrice = sp.get('minPrice') ? parseFloat(sp.get('minPrice')!) : undefined
  const maxPrice = sp.get('maxPrice') ? parseFloat(sp.get('maxPrice')!) : undefined
  const forceExpand = isAdmin && sp.get('expand') === 'true'

  try {
    const result = await expandedSearch({
      query,
      page,
      limit,
      category: sp.get('category') || undefined,
      brand: sp.get('brand') || undefined,
      source: sp.get('source') || undefined,
      minPrice: minPrice && !isNaN(minPrice) ? minPrice : undefined,
      maxPrice: maxPrice && !isNaN(maxPrice) ? maxPrice : undefined,
      sortBy: (sp.get('sort') as any) || 'relevance',
      forceExpand,
      isAdmin,
    })

    // Build response — exclude trace for non-admins
    const response: Record<string, any> = {
      query,
      // Primary results (blended or internal-only)
      results: result.blendedResults,
      totalInternal: result.internalTotal,
      // Expansion metadata
      expanded: result.expanded,
      expandedCount: result.expandedResults.length,
      expandedFraming: result.expandedFraming,
      // Coverage info
      coverage: {
        score: result.coverage.coverageScore,
        level: result.coverage.expansionLevel,
        shouldExpand: result.coverage.shouldExpand,
      },
      // Search intelligence
      intent: result.understanding.intent,
      confidence: result.understanding.confidence,
      suggestions: result.understanding.suggestions,
      // Pagination
      page,
      limit,
      hasMore: result.internalTotal > page * limit,
      // Tracking
      searchLogId: result.searchLogId,
    }

    // Admin-only debug info
    if (isAdmin && result.trace) {
      response._trace = result.trace
      response._understanding = result.understanding
    }

    logInfo('search', `expanded q="${query}" int=${result.internalResults.length} ext=${result.expandedResults.length} cov=${result.coverage.coverageScore}`)

    return NextResponse.json(response)
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed', detail: String(error) },
      { status: 500 }
    )
  }
}
