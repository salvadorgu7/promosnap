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

  // Parse params with validation
  const rawPage = parseInt(sp.get('page') || '1', 10)
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage
  const rawLimit = parseInt(sp.get('limit') || '24', 10)
  const limit = isNaN(rawLimit) ? 24 : Math.min(Math.max(1, rawLimit), 48)
  const minPrice = sp.get('minPrice') ? parseFloat(sp.get('minPrice')!) : undefined
  const maxPrice = sp.get('maxPrice') ? parseFloat(sp.get('maxPrice')!) : undefined
  const freeShipping = sp.get('freeShipping') === 'true'
  const forceExpand = isAdmin && sp.get('expand') === 'true'

  // Validate sort value
  const VALID_SORTS = ['relevance', 'price_asc', 'price_desc', 'popularity', 'score'] as const
  const rawSort = sp.get('sort') || 'relevance'
  const sortBy = VALID_SORTS.includes(rawSort as any) ? rawSort as typeof VALID_SORTS[number] : 'relevance'

  try {
    const result = await expandedSearch({
      query,
      page,
      limit,
      category: sp.get('category') || undefined,
      brand: sp.get('brand') || undefined,
      source: sp.get('source') || undefined,
      minPrice: minPrice && !isNaN(minPrice) && minPrice >= 0 ? minPrice : undefined,
      maxPrice: maxPrice && !isNaN(maxPrice) && maxPrice >= 0 ? maxPrice : undefined,
      freeShipping: freeShipping || undefined,
      sortBy,
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
    // Don't leak internal error details in production
    const isDev = process.env.NODE_ENV !== 'production'
    return NextResponse.json(
      { error: 'Search failed', ...(isDev ? { detail: String(error) } : {}) },
      { status: 500 }
    )
  }
}
