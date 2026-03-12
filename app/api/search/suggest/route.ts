import { NextRequest, NextResponse } from 'next/server'
import { getSearchSuggestions } from '@/lib/db/queries'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') || ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  try {
    const suggestions = await getSearchSuggestions(q, 5)
    return NextResponse.json(suggestions)
  } catch {
    return NextResponse.json([])
  }
}
