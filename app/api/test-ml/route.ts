import { NextResponse } from 'next/server'
import { getMLToken } from '@/lib/ml-auth'

export async function GET() {
  try {
    const token = await getMLToken()

    const res = await fetch(
      'https://api.mercadolibre.com/sites/MLB/search?q=iphone&limit=3',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    )

    const body = await res.json()

    return NextResponse.json({ status: res.status, body })
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    )
  }
}
