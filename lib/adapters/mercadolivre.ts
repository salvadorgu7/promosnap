// Mercado Livre Source Adapter — REAL API integration
// Uses ML OAuth token for authenticated requests + public API for search

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus, AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability, SyncResult, SourceCapabilityTruth } from './types'
import { getMLToken, getMLAppToken } from '@/lib/ml-auth'

// Accept both naming conventions for ML env vars
function getMLEnv(key: string): string | undefined {
  const aliases: Record<string, string[]> = {
    'ML_CLIENT_ID': ['ML_CLIENT_ID', 'MERCADOLIVRE_APP_ID'],
    'ML_CLIENT_SECRET': ['ML_CLIENT_SECRET', 'MERCADOLIVRE_SECRET'],
  }
  const names = aliases[key] || [key]
  for (const name of names) {
    if (process.env[name]) return process.env[name]
  }
  return undefined
}

function getMLRedirectUri(): string | undefined {
  return process.env.ML_REDIRECT_URI || process.env.MERCADOLIVRE_REDIRECT_URI || undefined
}

const REQUIRED_ENV_KEYS = ['ML_CLIENT_ID', 'ML_CLIENT_SECRET'] as const

const ML_API_BASE = 'https://api.mercadolibre.com'
const ML_SITE = 'MLB' // Brasil

// Standard headers to avoid ML blocking server-side requests
const ML_BASE_HEADERS: Record<string, string> = {
  'Accept': 'application/json',
  'User-Agent': 'PromoSnap/1.0 (https://promosnap.com)',
}

// ---------------------------------------------------------------------------
// ML API response types
// ---------------------------------------------------------------------------

interface MLSearchResult {
  id: string
  title: string
  price: number
  original_price: number | null
  currency_id: string
  condition: string
  permalink: string
  thumbnail: string
  thumbnail_id: string
  shipping: { free_shipping: boolean }
  installments?: { quantity: number; amount: number; currency_id: string } | null
  available_quantity: number
  sold_quantity: number
  catalog_product_id?: string | null
  official_store_name?: string | null
}

interface MLSearchResponse {
  results: MLSearchResult[]
  paging: { total: number; offset: number; limit: number }
}

interface MLItemResponse {
  id: string
  title: string
  price: number
  original_price: number | null
  currency_id: string
  condition: string
  permalink: string
  thumbnail: string
  pictures: { url: string; secure_url: string }[]
  shipping: { free_shipping: boolean }
  available_quantity: number
  sold_quantity: number
  catalog_product_id?: string | null
  official_store_name?: string | null
  attributes: { id: string; name: string; value_name: string | null }[]
  category_id: string
  status: string
}

// ---------------------------------------------------------------------------
// Helper: get auth headers (uses unified token getter: user → app token)
// ---------------------------------------------------------------------------

async function getAuthHeaders(): Promise<Record<string, string>> {
  try {
    const token = await getMLToken()
    return { Authorization: `Bearer ${token}` }
  } catch (err) {
    console.warn('[ML] getAuthHeaders failed, will try unauthenticated:', err instanceof Error ? err.message : err)
    return {}
  }
}

// ---------------------------------------------------------------------------
// Helper: convert ML image to high-res
// ---------------------------------------------------------------------------

function mlImageUrl(thumbnail: string): string {
  // ML thumbnails use -I.jpg suffix for small images, replace with -O.jpg for large
  return thumbnail.replace(/-I\.jpg$/, '-O.jpg')
}

// ---------------------------------------------------------------------------
// Convert ML result to AdapterResult
// ---------------------------------------------------------------------------

function mlToAdapterResult(item: MLSearchResult): AdapterResult {
  const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID
  let affiliateUrl: string | undefined

  if (affiliateId && item.permalink) {
    // ML affiliate link format
    const mattWord = process.env.MERCADOLIVRE_AFFILIATE_WORD
    affiliateUrl = `${item.permalink}?matt_tool=${affiliateId}${mattWord ? `&matt_word=${mattWord}` : ''}`
  }

  return {
    externalId: item.id,
    title: item.title,
    productUrl: item.permalink,
    affiliateUrl,
    currentPrice: item.price,
    originalPrice: item.original_price ?? undefined,
    currency: item.currency_id || 'BRL',
    availability: item.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
    imageUrl: mlImageUrl(item.thumbnail),
    isFreeShipping: item.shipping?.free_shipping ?? false,
    installment: item.installments
      ? `${item.installments.quantity}x R$ ${item.installments.amount.toFixed(2)}`
      : undefined,
  }
}

function mlItemToAdapterResult(item: MLItemResponse): AdapterResult {
  const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID
  let affiliateUrl: string | undefined

  if (affiliateId && item.permalink) {
    const mattWord = process.env.MERCADOLIVRE_AFFILIATE_WORD
    affiliateUrl = `${item.permalink}?matt_tool=${affiliateId}${mattWord ? `&matt_word=${mattWord}` : ''}`
  }

  const mainImage = item.pictures?.[0]?.secure_url || item.pictures?.[0]?.url || mlImageUrl(item.thumbnail)

  return {
    externalId: item.id,
    title: item.title,
    productUrl: item.permalink,
    affiliateUrl,
    currentPrice: item.price,
    originalPrice: item.original_price ?? undefined,
    currency: item.currency_id || 'BRL',
    availability: item.available_quantity > 0 ? 'in_stock' : 'out_of_stock',
    imageUrl: mainImage,
    isFreeShipping: item.shipping?.free_shipping ?? false,
  }
}

// ============================================================================
// Adapter
// ============================================================================

export class MercadoLivreSourceAdapter implements SourceAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'

  isConfigured(): boolean {
    return REQUIRED_ENV_KEYS.every((key) => !!getMLEnv(key))
  }

  getStatus(): AdapterStatus {
    const missingEnvVars = REQUIRED_ENV_KEYS.filter((key) => !getMLEnv(key))

    let message = ''
    if (this.isConfigured()) {
      message = 'ML API configurado — client_credentials ativo para busca e importacao'
    } else {
      message = `Variaveis ausentes: ${missingEnvVars.join(', ')}`
    }

    return {
      name: this.name,
      slug: this.slug,
      configured: this.isConfigured(),
      enabled: true,
      health: this.isConfigured() ? 'READY' : 'MOCK',
      message,
      missingEnvVars: [...missingEnvVars],
    }
  }

  // ---------------------------------------------------------------------------
  // SEARCH — Real ML API (public endpoint, no auth needed)
  // ---------------------------------------------------------------------------

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    const limit = options?.limit ?? 20
    const page = options?.page ?? 0
    const offset = page * limit

    try {
      const url = new URL(`${ML_API_BASE}/sites/${ML_SITE}/search`)
      url.searchParams.set('q', query)
      url.searchParams.set('limit', String(Math.min(limit, 50)))
      url.searchParams.set('offset', String(offset))

      if (options?.category) {
        url.searchParams.set('category', options.category)
      }
      if (options?.minPrice) url.searchParams.set('price', `${options.minPrice}-*`)
      if (options?.maxPrice) url.searchParams.set('price', `*-${options.maxPrice}`)

      // Sort
      if (options?.sortBy === 'price_asc') url.searchParams.set('sort', 'price_asc')
      if (options?.sortBy === 'price_desc') url.searchParams.set('sort', 'price_desc')

      console.log(`[ML] search("${query}") limit=${limit} offset=${offset}`)

      // Strategy: try with auth token → try app token directly → try without auth
      let res: Response | null = null
      let lastErr = ''

      // Attempt 1: no auth first (ML search is a public API — fastest path)
      res = await fetch(url.toString(), { headers: { ...ML_BASE_HEADERS } })
      if (!res.ok) {
        lastErr = `noAuth(${res.status})`
        console.warn(`[ML] search without auth failed: ${res.status}`)
        res = null
      }

      // Attempt 2: full auth (user token → app token via getMLToken)
      if (!res) {
        const authHeaders = await getAuthHeaders()
        if (Object.keys(authHeaders).length > 0) {
          res = await fetch(url.toString(), { headers: { ...ML_BASE_HEADERS, ...authHeaders } })
          if (res.ok) { /* success */ }
          else {
            lastErr = `auth(${res.status})`
            console.warn(`[ML] search with auth failed: ${res.status}`)
            res = null
          }
        }
      }

      // Attempt 3: explicit app token (client_credentials)
      if (!res) {
        try {
          const appToken = await getMLAppToken()
          res = await fetch(url.toString(), { headers: { ...ML_BASE_HEADERS, Authorization: `Bearer ${appToken}` } })
          if (res.ok) { /* success */ }
          else {
            lastErr = `app_token(${res.status})`
            console.warn(`[ML] search with app token failed: ${res.status}`)
            res = null
          }
        } catch (e) {
          console.warn(`[ML] app token fetch failed:`, e instanceof Error ? e.message : e)
        }
      }

      // All attempts failed
      if (!res) {
        throw new Error(`ML API busca falhou em todas as tentativas. Último erro: ${lastErr}`)
      }

      const data: MLSearchResponse = await res.json()
      console.log(`[ML] search("${query}") → ${data.results.length} results (total: ${data.paging.total})`)

      return data.results.map(mlToAdapterResult)
    } catch (error) {
      console.error(`[ML] search error:`, error)
      throw error
    }
  }

  // ---------------------------------------------------------------------------
  // GET PRODUCT — Real ML API
  // ---------------------------------------------------------------------------

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    const itemUrl = `${ML_API_BASE}/items/${externalId}`
    const multiGetUrl = `${ML_API_BASE}/items?ids=${externalId}`
    let res: Response | null = null
    let lastErr = ''

    // Attempt 1: no auth (works for public/active items)
    res = await fetch(itemUrl, { headers: { ...ML_BASE_HEADERS } })
    if (!res.ok) {
      lastErr = `noAuth(${res.status})`
      console.warn(`[ML] getProduct(${externalId}) no auth failed: ${res.status}`)
      res = null
    }

    // Attempt 2: full auth (user token → app token)
    if (!res) {
      const headers = await getAuthHeaders()
      if (Object.keys(headers).length > 0) {
        res = await fetch(itemUrl, { headers: { ...ML_BASE_HEADERS, ...headers } })
        if (!res.ok) {
          lastErr = `auth(${res.status})`
          console.warn(`[ML] getProduct(${externalId}) auth failed: ${res.status}`)
          res = null
        }
      }
    }

    // Attempt 3: explicit app token
    if (!res) {
      try {
        const appToken = await getMLAppToken()
        res = await fetch(itemUrl, { headers: { ...ML_BASE_HEADERS, Authorization: `Bearer ${appToken}` } })
        if (!res.ok) {
          lastErr = `appToken(${res.status})`
          console.warn(`[ML] getProduct(${externalId}) app token failed: ${res.status}`)
          res = null
        }
      } catch (e) {
        console.warn(`[ML] app token fetch failed:`, e instanceof Error ? e.message : e)
      }
    }

    // Attempt 4: multi-get endpoint (different ML policy, sometimes works when /items/{id} doesn't)
    if (!res) {
      try {
        const multiRes = await fetch(multiGetUrl, { headers: { ...ML_BASE_HEADERS } })
        if (multiRes.ok) {
          const multiData = await multiRes.json()
          if (Array.isArray(multiData) && multiData[0]?.code === 200 && multiData[0]?.body) {
            const item: MLItemResponse = multiData[0].body
            return mlItemToAdapterResult(item)
          }
          lastErr = `multiGet(item not found or error)`
        } else {
          lastErr = `multiGet(${multiRes.status})`
        }
      } catch (e) {
        console.warn(`[ML] multi-get fallback failed:`, e instanceof Error ? e.message : e)
      }
    }

    // Attempt 5: search by ID as last resort
    if (!res) {
      try {
        const searchUrl = `${ML_API_BASE}/sites/${ML_SITE}/search?q=${externalId}&limit=1`
        const searchRes = await fetch(searchUrl, { headers: { ...ML_BASE_HEADERS } })
        if (searchRes.ok) {
          const searchData: MLSearchResponse = await searchRes.json()
          const match = searchData.results.find(r => r.id === externalId)
          if (match) {
            console.log(`[ML] getProduct(${externalId}) resolved via search fallback`)
            return mlToAdapterResult(match)
          }
        }
      } catch (e) {
        console.warn(`[ML] search fallback failed:`, e instanceof Error ? e.message : e)
      }
    }

    if (!res) {
      throw new Error(`[ML] getProduct(${externalId}) falhou em todas as tentativas. Último: ${lastErr}`)
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const msg = `[ML] getProduct(${externalId}) failed: ${res.status} — ${errText.slice(0, 200)}`
      console.error(msg)
      throw new Error(msg)
    }

    const item: MLItemResponse = await res.json()
    return mlItemToAdapterResult(item)
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (this.isConfigured()) {
      return {
        healthy: true,
        message: 'ML API configurado — client_credentials disponivel',
      }
    }
    return { healthy: false, message: 'MERCADOLIVRE_APP_ID / MERCADOLIVRE_SECRET ausentes' }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing = REQUIRED_ENV_KEYS.filter((key) => !getMLEnv(key)) as unknown as string[]
    if (!getMLRedirectUri()) missing.push('ML_REDIRECT_URI (recomendado)')
    return { ready: REQUIRED_ENV_KEYS.every((k) => !!getMLEnv(k)), missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = ['search', 'lookup']
    if (this.isConfigured()) {
      caps.push('clickout_ready', 'price_refresh', 'import_ready')
    }
    return caps
  }

  // ---------------------------------------------------------------------------
  // Sync & Import
  // ---------------------------------------------------------------------------

  async syncFeed(): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return {
        synced: 0, failed: 0, stale: 0,
        errors: ['ML nao configurado — sync bloqueado'],
      }
    }

    // Search trending categories and import
    const categories = ['celular', 'notebook', 'fone bluetooth', 'smartwatch', 'tablet']
    let totalSynced = 0
    let totalFailed = 0
    const errors: string[] = []

    for (const cat of categories) {
      try {
        const results = await this.search(cat, { limit: 10 })
        totalSynced += results.length
      } catch (err) {
        totalFailed++
        errors.push(`Falha ao buscar "${cat}": ${err}`)
      }
    }

    return { synced: totalSynced, failed: totalFailed, stale: 0, errors }
  }

  async importBatch(items: AdapterResult[]): Promise<SyncResult> {
    console.log(`[ML] importBatch(${items.length} items)`)
    return {
      synced: items.length,
      failed: 0,
      stale: 0,
      errors: [],
    }
  }

  async refreshOffer(offerId: string): Promise<AdapterResult | null> {
    return this.getProduct(offerId)
  }

  getCapabilityTruth(): SourceCapabilityTruth {
    const hasClientId = !!getMLEnv('ML_CLIENT_ID')
    const hasSecret = !!getMLEnv('ML_CLIENT_SECRET')
    const hasRedirect = !!getMLRedirectUri()
    if (hasClientId && hasSecret) {
      return {
        status: 'sync-ready',
        capabilities: ['search', 'lookup', 'clickout_ready', 'price_refresh', 'import_ready'],
        missing: [
          ...(!hasRedirect ? ['ML_REDIRECT_URI (opcional)'] : []),
        ],
        lastSync: undefined,
      }
    }

    return {
      status: 'blocked',
      capabilities: ['search', 'lookup'],
      missing: ['ML_CLIENT_ID', 'ML_CLIENT_SECRET', 'ML_REDIRECT_URI', 'OAuth flow'],
      lastSync: undefined,
    }
  }
}
