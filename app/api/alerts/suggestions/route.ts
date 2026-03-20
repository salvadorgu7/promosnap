import { NextResponse } from 'next/server'
import { getAlertSuggestions } from '@/lib/alerts/auto-suggest'

export async function GET() {
  try {
    const suggestions = await getAlertSuggestions([], 5)
    return NextResponse.json({ suggestions }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
    })
  } catch {
    return NextResponse.json({ suggestions: [] })
  }
}
