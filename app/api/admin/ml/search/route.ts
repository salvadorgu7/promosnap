import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { mlTokenStore, getMLToken } from '@/lib/ml-auth'

export const dynamic = 'force-dynamic'

const ML_API_BASE = 'https://api.mercadolibre.com'
const ML_SITE = 'MLB'

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const query = req.nextUrl.searchParams.get('q')
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20')
  const page = parseInt(req.nextUrl.searchParams.get('page') || '0')

  if (!query) {
    return NextResponse.json({ error: 'Parametro q obrigatorio' }, { status: 400 })
  }

  // Build the ML search URL
  const url = new URL(`${ML_API_BASE}/sites/${ML_SITE}/search`)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', String(Math.min(limit, 50)))
  url.searchParams.set('offset', String(page * limit))

  // Strategy: try with token first, then without token as fallback
  let accessToken: string | null = null
  try {
    accessToken = await getMLToken()
  } catch {
    // No token — will try without auth
  }

  // Attempt 1: with token (if available)
  if (accessToken) {
    try {
      console.log(`[ml-search] Trying with token: ${url.toString()}`)
      const res = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 0 },
      })

      if (res.ok) {
        const data = await res.json()
        console.log(`[ml-search] With token: "${query}" → ${data.results?.length ?? 0} results`)
        return NextResponse.json({
          query,
          count: data.results?.length ?? 0,
          total: data.paging?.total ?? 0,
          authMethod: 'oauth_token',
          results: mapResults(data.results || []),
        })
      }

      // Token rejected — log details and try without
      const errText = await res.text()
      console.error(`[ml-search] Token rejected: ${res.status} — ${errText}`)

      if (res.status === 401 || res.status === 403) {
        // Token is invalid — clear it so we don't keep using it
        await mlTokenStore.clear()
        console.log('[ml-search] Cleared invalid token, trying without auth...')
      }
    } catch (err) {
      console.error('[ml-search] Fetch with token failed:', err)
    }
  }

  // Attempt 2: without token (public access)
  try {
    console.log(`[ml-search] Trying without token: ${url.toString()}`)
    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })

    if (res.ok) {
      const data = await res.json()
      console.log(`[ml-search] Without token: "${query}" → ${data.results?.length ?? 0} results`)
      return NextResponse.json({
        query,
        count: data.results?.length ?? 0,
        total: data.paging?.total ?? 0,
        authMethod: 'public',
        results: mapResults(data.results || []),
      })
    }

    const errText = await res.text()
    console.error(`[ml-search] Public access also failed: ${res.status} — ${errText}`)

    // Attempt 3: try with client_credentials app token
    const appToken = await getAppToken()
    if (appToken) {
      console.log(`[ml-search] Trying with app token...`)
      const res3 = await fetch(url.toString(), {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${appToken}`,
        },
        next: { revalidate: 0 },
      })

      if (res3.ok) {
        const data = await res3.json()
        console.log(`[ml-search] With app token: "${query}" → ${data.results?.length ?? 0} results`)
        return NextResponse.json({
          query,
          count: data.results?.length ?? 0,
          total: data.paging?.total ?? 0,
          authMethod: 'client_credentials',
          results: mapResults(data.results || []),
        })
      }

      const errText3 = await res3.text()
      console.error(`[ml-search] App token also failed: ${res3.status} — ${errText3}`)
    }

    return NextResponse.json({
      error: `ML API rejeitou todos os metodos de autenticacao. Status: ${res.status}. Detalhes: ${errText.slice(0, 300)}`,
      query,
      results: [],
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

// Get an app-level token via client_credentials grant (no user auth needed)
async function getAppToken(): Promise<string | null> {
  const clientId = process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID
  const clientSecret = process.env.MERCADOLIVRE_SECRET || process.env.ML_CLIENT_SECRET

  if (!clientId || !clientSecret) return null

  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[ml-search] client_credentials failed:', res.status, err)
      return null
    }

    const data = await res.json()
    return data.access_token || null
  } catch (err) {
    console.error('[ml-search] client_credentials exception:', err)
    return null
  }
}

function mapResults(results: Array<{
  id: string
  title: string
  price: number
  original_price: number | null
  permalink: string
  thumbnail: string
  shipping?: { free_shipping?: boolean }
  available_quantity: number
  installments?: { quantity: number; amount: number } | null
}>) {
  return results.map((item) => ({
    externalId: item.id,
    title: item.title,
    currentPrice: item.price,
    originalPrice: item.original_price ?? undefined,
    productUrl: item.permalink,
    imageUrl: item.thumbnail?.replace(/-I\.jpg$/, '-O.jpg'),
    isFreeShipping: item.shipping?.free_shipping ?? false,
    availability: item.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
    installment: item.installments
      ? `${item.installments.quantity}x R$ ${item.installments.amount.toFixed(2)}`
      : undefined,
  }))
}
