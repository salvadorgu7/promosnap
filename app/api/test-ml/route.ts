import { NextRequest, NextResponse } from 'next/server'
import { getMLToken } from '@/lib/ml-auth'

async function mlFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json()
  return { status: res.status, body }
}

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  if (secret) {
    const url = new URL(req.url)
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}` && url.searchParams.get('secret') !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }
  try {
    const token = await getMLToken()

    const [user, site, search] = await Promise.all([
      mlFetch('https://api.mercadolibre.com/users/me', token),
      mlFetch('https://api.mercadolibre.com/sites/MLB', token),
      mlFetch('https://api.mercadolibre.com/sites/MLB/search?q=iphone&limit=3', token),
    ])

    return NextResponse.json({ user, site, search })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
