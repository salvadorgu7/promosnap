import { NextResponse } from 'next/server'
import { getTrendingIntentProducts } from '@/lib/intelligence/purchase-intent'

export async function GET() {
  try {
    const products = await getTrendingIntentProducts(8)

    return NextResponse.json({ products }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=1800' },
    })
  } catch {
    return NextResponse.json({ products: [] })
  }
}
