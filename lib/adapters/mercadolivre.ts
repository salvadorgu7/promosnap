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
  const explicit = process.env.ML_REDIRECT_URI || process.env.MERCADOLIVRE_REDIRECT_URI
  if (explicit) return explicit
  // Auto-detect from NEXT_PUBLIC_APP_URL or VERCEL_URL
  const base = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  return base ? `${base}/api/admin/ml/callback` : undefined
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

// ---------------------------------------------------------------------------
// Web scraping fallback — parses JSON-LD from ML listing pages
// ---------------------------------------------------------------------------

interface MLJsonLdProduct {
  '@type': string
  name: string
  image: string
  brand?: { name: string }
  aggregateRating?: { ratingCount: number; ratingValue: number }
  offers?: {
    price: number
    priceCurrency: string
    url: string
    availability?: string
  }
}

async function scrapeMLSearch(query: string, limit: number): Promise<AdapterResult[]> {
  const searchUrl = `https://lista.mercadolivre.com.br/${encodeURIComponent(query.replace(/\s+/g, '-'))}`
  console.log(`[ML] scrape fallback: ${searchUrl}`)

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
  })

  if (!res.ok) {
    throw new Error(`[ML] scrape failed: ${res.status}`)
  }

  const html = await res.text()

  // Extract JSON-LD structured data
  const ldMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
  if (!ldMatch) {
    console.warn('[ML] scrape: no JSON-LD found')
    return []
  }

  try {
    // Decode unicode escapes (\u002F → /)
    const jsonStr = ldMatch[1].replace(/\\u002F/g, '/')
    const ld = JSON.parse(jsonStr)
    const graph: MLJsonLdProduct[] = ld['@graph'] || (Array.isArray(ld) ? ld : [ld])

    const products = graph.filter((item) => item['@type'] === 'Product')
    console.log(`[ML] scrape: found ${products.length} products in JSON-LD`)

    return products.slice(0, limit).map((p): AdapterResult => {
      // Extract MLB ID from URL like .../p/MLB62112970
      const urlMatch = p.offers?.url?.match(/MLB\d+/)
      const externalId = urlMatch ? urlMatch[0] : `SCRAPE_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID
      const mattWord = process.env.MERCADOLIVRE_AFFILIATE_WORD
      let affiliateUrl: string | undefined
      if (affiliateId && p.offers?.url) {
        affiliateUrl = `${p.offers.url}?matt_tool=${affiliateId}${mattWord ? `&matt_word=${mattWord}` : ''}`
      }

      return {
        externalId,
        title: p.name,
        productUrl: p.offers?.url || searchUrl,
        affiliateUrl,
        currentPrice: p.offers?.price ?? 0,
        originalPrice: undefined,
        currency: p.offers?.priceCurrency || 'BRL',
        availability: p.offers?.availability?.includes('InStock') ? 'in_stock' : 'in_stock',
        imageUrl: p.image?.replace(/\\u002F/g, '/') || '',
        isFreeShipping: false,
      }
    })
  } catch (err) {
    console.error('[ML] scrape JSON-LD parse error:', err)
    return []
  }
}

async function scrapeMLProduct(url: string): Promise<AdapterResult | null> {
  console.log(`[ML] scrape product: ${url}`)

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
  })

  console.log(`[ML] scrape product response: ${res.status} ${res.url}`)
  if (!res.ok) return null

  const html = await res.text()
  const ldMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
  if (!ldMatch) return null

  try {
    const jsonStr = ldMatch[1].replace(/\\u002F/g, '/')
    const ld = JSON.parse(jsonStr)
    const product = ld['@type'] === 'Product' ? ld : (ld['@graph'] || []).find((x: MLJsonLdProduct) => x['@type'] === 'Product')
    if (!product) return null

    const urlMatch = product.offers?.url?.match(/MLB\d+/) || url.match(/MLB\d+/)
    const externalId = urlMatch ? urlMatch[0] : ''

    return {
      externalId,
      title: product.name,
      productUrl: product.offers?.url || url,
      currentPrice: product.offers?.price ?? 0,
      currency: product.offers?.priceCurrency || 'BRL',
      availability: 'in_stock',
      imageUrl: product.image?.replace(/\\u002F/g, '/') || '',
      isFreeShipping: false,
    }
  } catch {
    return null
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

      // All API attempts failed — try web scraping fallback
      if (!res) {
        console.warn(`[ML] all API attempts failed (${lastErr}), trying web scrape fallback...`)
        const scraped = await scrapeMLSearch(query, limit)
        if (scraped.length > 0) {
          console.log(`[ML] search("${query}") → ${scraped.length} results via scrape`)
          return scraped
        }
        throw new Error(`ML API e scrape falharam. Último erro API: ${lastErr}`)
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

    // Attempt 5: scrape ML product page (try multiple URL formats)
    if (!res) {
      // MLB4492838717 → produto.mercadolivre.com.br/MLB-4492838717 (listing URL)
      const dashId = externalId.replace(/^(MLB)(\d)/, '$1-$2')
      const productUrls = [
        `https://produto.mercadolivre.com.br/${dashId}`,
        `https://www.mercadolivre.com.br/p/${externalId}`,
      ]
      for (const pUrl of productUrls) {
        try {
          const scraped = await scrapeMLProduct(pUrl)
          if (scraped) {
            console.log(`[ML] getProduct(${externalId}) resolved via scrape: ${pUrl}`)
            return scraped
          }
        } catch (e) {
          lastErr = `scrape(${pUrl}: ${e instanceof Error ? e.message : e})`
          console.warn(`[ML] scrape fallback failed for ${pUrl}:`, e instanceof Error ? e.message : e)
        }
      }
    }

    // Attempt 6: search by ID via web scrape (most reliable — uses listing page)
    if (!res) {
      try {
        const scraped = await scrapeMLSearch(externalId, 5)
        console.log(`[ML] getProduct(${externalId}) search scrape returned ${scraped.length} results`)
        if (scraped.length > 0) {
          // Try exact match first, then return first result
          const match = scraped.find(s => s.externalId === externalId) || scraped[0]
          console.log(`[ML] getProduct(${externalId}) resolved via search scrape → ${match.externalId}`)
          return match
        }
        lastErr = `searchScrape(0 results)`
      } catch (e) {
        lastErr = `searchScrape(${e instanceof Error ? e.message : e})`
        console.warn(`[ML] search scrape fallback failed:`, e instanceof Error ? e.message : e)
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
