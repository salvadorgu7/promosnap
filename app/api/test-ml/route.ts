import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { getMLToken } from '@/lib/ml-auth'

async function mlFetch(url: string, token: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const body = await res.json()
  return { status: res.status, body }
}

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  try {
    const token = await getMLToken()

    const [user, site, search] = await Promise.all([
      mlFetch('https://api.mercadolibre.com/users/me', token),
      mlFetch('https://api.mercadolibre.com/sites/MLB', token),
      mlFetch('https://api.mercadolibre.com/sites/MLB/search?q=iphone&limit=3', token),
    ])

    return NextResponse.json({ user, site, search })
  } catch (err) {
    console.error('[test-ml] Error:', err)
    return NextResponse.json({ error: 'Falha ao testar integracao ML' }, { status: 500 })
  }
}
