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

  // ML search API now requires OAuth token (403 without it)
  let accessToken: string | null = null
  try {
    accessToken = await getMLToken()
  } catch {
    // Token not available — check if we have credentials to tell user what to do
    const hasCredentials = !!(process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID)
    if (!hasCredentials) {
      return NextResponse.json({
        error: 'ML nao configurado. Defina MERCADOLIVRE_APP_ID e MERCADOLIVRE_SECRET nas env vars.',
        results: [],
      })
    }
    return NextResponse.json({
      error: 'Token ML expirado ou ausente. Clique em "Iniciar OAuth" primeiro para autenticar.',
      needsAuth: true,
      results: [],
    })
  }

  try {
    const url = new URL(`${ML_API_BASE}/sites/${ML_SITE}/search`)
    url.searchParams.set('q', query)
    url.searchParams.set('limit', String(Math.min(limit, 50)))
    url.searchParams.set('offset', String(page * limit))

    console.log(`[ml-search] Fetching: ${url.toString()}`)

    const headers: Record<string, string> = { 'Accept': 'application/json' }
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const res = await fetch(url.toString(), {
      headers,
      next: { revalidate: 0 },
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error(`[ml-search] ML API error: ${res.status} — ${errText}`)

      if (res.status === 401 || res.status === 403) {
        // Token expired or invalid — clear it
        await mlTokenStore.clear()
        return NextResponse.json({
          error: 'Token ML expirado. Clique em "Iniciar OAuth" para re-autenticar.',
          needsAuth: true,
          results: [],
        })
      }

      return NextResponse.json({
        error: `ML API retornou ${res.status}`,
        detail: errText.slice(0, 500),
        query,
        results: [],
      })
    }

    const data = await res.json()
    console.log(`[ml-search] "${query}" → ${data.results?.length ?? 0} results (total: ${data.paging?.total ?? 0})`)

    // Map ML results to our format
    const results = (data.results || []).map((item: {
      id: string
      title: string
      price: number
      original_price: number | null
      permalink: string
      thumbnail: string
      shipping?: { free_shipping?: boolean }
      available_quantity: number
      installments?: { quantity: number; amount: number } | null
    }) => ({
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

    return NextResponse.json({
      query,
      count: results.length,
      total: data.paging?.total ?? 0,
      results,
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
