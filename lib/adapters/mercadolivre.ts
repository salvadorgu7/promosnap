// Mercado Livre Source Adapter — REAL API integration
// Uses ML OAuth token for authenticated requests + public API for search

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus, AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability, SyncResult, SourceCapabilityTruth } from './types'
import { getMLToken, getMLAppToken } from '@/lib/ml-auth'
import { logger } from '@/lib/logger'
import { runImportPipeline, type ImportItem } from '@/lib/import/pipeline'

const log = logger.child({ adapter: 'mercadolivre' })

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
// Circuit breaker — stops hammering ML API when it's consistently failing
// ---------------------------------------------------------------------------

const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  /** Threshold: after N consecutive failures, open the circuit */
  threshold: 5,
  /** Reset window: circuit closes after this many ms without a call */
  resetMs: 60_000, // 1 min

  isOpen(): boolean {
    if (this.failures < this.threshold) return false
    // Auto-close after reset window
    if (Date.now() - this.lastFailure > this.resetMs) {
      this.failures = 0
      return false
    }
    return true
  },

  recordSuccess() {
    this.failures = 0
  },

  recordFailure() {
    this.failures++
    this.lastFailure = Date.now()
  },
}

// ---------------------------------------------------------------------------
// Rate limiter — basic token bucket (10 req/s burst, refills at 5/s)
// ---------------------------------------------------------------------------

const rateBucket = {
  tokens: 10,
  maxTokens: 10,
  refillRate: 5, // tokens per second
  lastRefill: Date.now(),

  async acquire(): Promise<void> {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate)
    this.lastRefill = now

    if (this.tokens < 1) {
      const waitMs = Math.ceil((1 - this.tokens) / this.refillRate * 1000)
      await new Promise(resolve => setTimeout(resolve, waitMs))
      this.tokens = 1
    }
    this.tokens--
  },
}

/** Fetch with rate limit + circuit breaker + retry on 429 */
async function mlFetch(url: string, options?: RequestInit): Promise<Response> {
  if (circuitBreaker.isOpen()) {
    throw new Error('ML API circuit breaker aberto — muitas falhas consecutivas. Aguarde 1min.')
  }

  await rateBucket.acquire()

  const res = await fetch(url, options)

  // Handle 429 (Too Many Requests) with retry-after
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('retry-after') || '2', 10)
    const waitMs = Math.min(retryAfter * 1000, 10_000) // cap at 10s
    log.warn('ml.rate-limited', { url, retryAfter, waitMs })
    await new Promise(resolve => setTimeout(resolve, waitMs))

    await rateBucket.acquire()
    const retry = await fetch(url, options)
    if (!retry.ok) {
      circuitBreaker.recordFailure()
    } else {
      circuitBreaker.recordSuccess()
    }
    return retry
  }

  if (res.status >= 500) {
    circuitBreaker.recordFailure()
  } else {
    circuitBreaker.recordSuccess()
  }

  return res
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
    log.warn('auth.headers.failed', { error: err instanceof Error ? err.message : err })
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
  log.debug('scrape.search', { url: searchUrl })

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
    log.warn('scrape.no-jsonld', { query })
    return []
  }

  try {
    // Decode unicode escapes (\u002F → /)
    const jsonStr = ldMatch[1].replace(/\\u002F/g, '/')
    const ld = JSON.parse(jsonStr)
    const graph: MLJsonLdProduct[] = ld['@graph'] || (Array.isArray(ld) ? ld : [ld])

    const products = graph.filter((item) => item['@type'] === 'Product')
    log.debug('scrape.found', { count: products.length })

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
    log.error('scrape.parse-error', { error: err })
    return []
  }
}

async function scrapeMLProduct(url: string): Promise<AdapterResult | null> {
  log.debug('scrape.product', { url })

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    redirect: 'follow',
  })

  log.debug('scrape.product.response', { status: res.status, url: res.url })
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

      log.info('search.start', { query, limit, offset })

      // Strategy: try with auth token → try app token directly → try without auth
      let res: Response | null = null
      let lastErr = ''

      // Attempt 1: no auth first (ML search is a public API — fastest path)
      res = await mlFetch(url.toString(), { headers: { ...ML_BASE_HEADERS } })
      if (!res.ok) {
        lastErr = `noAuth(${res.status})`
        log.warn('search.noauth.failed', { status: res.status })
        res = null
      }

      // Attempt 2: full auth (user token → app token via getMLToken)
      if (!res) {
        const authHeaders = await getAuthHeaders()
        if (Object.keys(authHeaders).length > 0) {
          res = await mlFetch(url.toString(), { headers: { ...ML_BASE_HEADERS, ...authHeaders } })
          if (res.ok) { /* success */ }
          else {
            lastErr = `auth(${res.status})`
            log.warn('search.auth.failed', { status: res.status })
            res = null
          }
        }
      }

      // Attempt 3: explicit app token (client_credentials)
      if (!res) {
        try {
          const appToken = await getMLAppToken()
          res = await mlFetch(url.toString(), { headers: { ...ML_BASE_HEADERS, Authorization: `Bearer ${appToken}` } })
          if (res.ok) { /* success */ }
          else {
            lastErr = `app_token(${res.status})`
            log.warn('search.apptoken.failed', { status: res.status })
            res = null
          }
        } catch (e) {
          log.warn('search.apptoken.error', { error: e instanceof Error ? e.message : e })
        }
      }

      // All API attempts failed — try web scraping fallback
      if (!res) {
        log.warn('search.api.exhausted', { lastErr, query })
        const scraped = await scrapeMLSearch(query, limit)
        if (scraped.length > 0) {
          log.info('search.scrape.ok', { query, count: scraped.length })
          return scraped
        }
        throw new Error(`ML API e scrape falharam. Último erro API: ${lastErr}`)
      }

      const data: MLSearchResponse = await res.json()
      log.info('search.ok', { query, results: data.results.length, total: data.paging.total })

      return data.results.map(mlToAdapterResult)
    } catch (error) {
      log.error('search.error', { query, error })
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
    res = await mlFetch(itemUrl, { headers: { ...ML_BASE_HEADERS } })
    if (!res.ok) {
      lastErr = `noAuth(${res.status})`
      log.warn('getProduct.noauth.failed', { externalId, status: res.status })
      res = null
    }

    // Attempt 2: full auth (user token → app token)
    if (!res) {
      const headers = await getAuthHeaders()
      if (Object.keys(headers).length > 0) {
        res = await mlFetch(itemUrl, { headers: { ...ML_BASE_HEADERS, ...headers } })
        if (!res.ok) {
          lastErr = `auth(${res.status})`
          log.warn('getProduct.auth.failed', { externalId, status: res.status })
          res = null
        }
      }
    }

    // Attempt 3: explicit app token
    if (!res) {
      try {
        const appToken = await getMLAppToken()
        res = await mlFetch(itemUrl, { headers: { ...ML_BASE_HEADERS, Authorization: `Bearer ${appToken}` } })
        if (!res.ok) {
          lastErr = `appToken(${res.status})`
          log.warn('getProduct.apptoken.failed', { externalId, status: res.status })
          res = null
        }
      } catch (e) {
        log.warn('getProduct.apptoken.error', { externalId, error: e instanceof Error ? e.message : e })
      }
    }

    // Attempt 4: multi-get endpoint (different ML policy, sometimes works when /items/{id} doesn't)
    if (!res) {
      try {
        const multiRes = await mlFetch(multiGetUrl, { headers: { ...ML_BASE_HEADERS } })
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
        log.warn('getProduct.multiget.failed', { externalId, error: e instanceof Error ? e.message : e })
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
            log.info('getProduct.scrape.ok', { externalId, url: pUrl })
            return scraped
          }
        } catch (e) {
          lastErr = `scrape(${pUrl}: ${e instanceof Error ? e.message : e})`
          log.warn('getProduct.scrape.failed', { externalId, url: pUrl, error: e instanceof Error ? e.message : e })
        }
      }
    }

    // Attempt 6: search by ID via web scrape (most reliable — uses listing page)
    if (!res) {
      try {
        const scraped = await scrapeMLSearch(externalId, 5)
        log.debug('getProduct.searchscrape', { externalId, results: scraped.length })
        if (scraped.length > 0) {
          const match = scraped.find(s => s.externalId === externalId) || scraped[0]
          log.info('getProduct.searchscrape.ok', { externalId, matchedId: match.externalId })
          return match
        }
        lastErr = `searchScrape(0 results)`
      } catch (e) {
        lastErr = `searchScrape(${e instanceof Error ? e.message : e})`
        log.warn('getProduct.searchscrape.failed', { externalId, error: e instanceof Error ? e.message : e })
      }
    }

    if (!res) {
      throw new Error(`[ML] getProduct(${externalId}) falhou em todas as tentativas. Último: ${lastErr}`)
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      const msg = `[ML] getProduct(${externalId}) failed: ${res.status} — ${errText.slice(0, 200)}`
      log.error('getProduct.failed', { externalId, status: res.status })
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

    // Search trending categories, convert results, and run through import pipeline
    const categories = ['celular', 'notebook', 'fone bluetooth', 'smartwatch', 'tablet']
    let totalSynced = 0
    let totalFailed = 0
    const errors: string[] = []

    for (const cat of categories) {
      try {
        const results = await this.search(cat, { limit: 10 })
        if (results.length === 0) continue

        // Convert AdapterResult → ImportItem and run through real import pipeline
        const importItems: ImportItem[] = results
          .filter((r) => r.currentPrice > 0)
          .map((r) => ({
            externalId: r.externalId,
            title: r.title,
            currentPrice: r.currentPrice,
            originalPrice: r.originalPrice,
            productUrl: r.productUrl,
            imageUrl: r.imageUrl,
            isFreeShipping: r.isFreeShipping,
            availability: (r.availability === 'in_stock' || r.availability === 'out_of_stock') ? r.availability : 'unknown' as const,
            brand: r.brand,
            categorySlug: r.category,
            sourceSlug: 'mercadolivre',
            discoverySource: 'ml_sync_feed',
          }))

        if (importItems.length > 0) {
          const result = await runImportPipeline(importItems)
          totalSynced += result.created + result.updated
          totalFailed += result.failed
          if (result.failed > 0) {
            errors.push(`"${cat}": ${result.failed} falhas no import`)
          }
          log.info('syncFeed.category', {
            category: cat,
            searched: results.length,
            imported: result.created + result.updated,
            failed: result.failed,
          })
        }
      } catch (err) {
        totalFailed++
        errors.push(`Falha ao buscar/importar "${cat}": ${err}`)
      }
    }

    return { synced: totalSynced, failed: totalFailed, stale: 0, errors }
  }

  async importBatch(items: AdapterResult[]): Promise<SyncResult> {
    const importItems: ImportItem[] = items
      .filter((r) => r.currentPrice > 0)
      .map((r) => ({
        externalId: r.externalId,
        title: r.title,
        currentPrice: r.currentPrice,
        originalPrice: r.originalPrice,
        productUrl: r.productUrl,
        imageUrl: r.imageUrl,
        isFreeShipping: r.isFreeShipping,
        availability: (r.availability === 'in_stock' || r.availability === 'out_of_stock') ? r.availability : 'unknown' as const,
        brand: r.brand,
        categorySlug: r.category,
        sourceSlug: 'mercadolivre',
        discoverySource: 'ml_import_batch',
      }))

    if (importItems.length === 0) {
      return { synced: 0, failed: 0, stale: 0, errors: [] }
    }

    const result = await runImportPipeline(importItems)
    log.info('importBatch', {
      input: items.length,
      created: result.created,
      updated: result.updated,
      failed: result.failed,
    })

    return {
      synced: result.created + result.updated,
      failed: result.failed,
      stale: 0,
      errors: result.items
        .filter((i) => i.action === 'failed')
        .map((i) => `${i.externalId}: ${i.reason}`),
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
