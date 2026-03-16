import { NextRequest, NextResponse } from 'next/server'
import { getSearchSuggestions } from '@/lib/db/queries'
import { logger } from '@/lib/logger'
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit"

export async function GET(request: NextRequest) {
  const rl = rateLimit(request, "public");
  if (!rl.success) return rateLimitResponse(rl);

  const q = request.nextUrl.searchParams.get('q') || ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  try {
    const suggestions = await getSearchSuggestions(q, 8)
    return NextResponse.json(suggestions)
  } catch (err) {
    logger.error("search-suggest.failed", { error: err });
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 })
  }
}
