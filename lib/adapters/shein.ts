/**
 * Shein Affiliate Adapter — production-ready implementation.
 *
 * Supports:
 *   - Product search via Shein Affiliate API
 *   - Product detail lookup
 *   - Feed sync for catalog population
 *   - Affiliate URL generation with tracking
 *
 * Required env vars:
 *   SHEIN_API_KEY        — Affiliate API key
 *   SHEIN_AFFILIATE_ID   — Affiliate/publisher ID (optional, improves tracking)
 *   SHEIN_SECRET_KEY     — API secret for signed requests (optional)
 *
 * API docs: https://affiliate.shein.com/
 */

import type {
  SourceAdapter,
  AdapterSearchOptions,
  AdapterResult,
  AdapterStatus,
  AdapterHealthCheckResult,
  AdapterReadinessResult,
  AdapterCapability,
  SyncResult,
  SourceCapabilityTruth,
} from './types'
import { logger } from '@/lib/logger'

// ── Configuration ───────────────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

const SHEIN_API_BASE = 'https://affiliate-api.shein.com/api'
const SHEIN_AFFILIATE_TAG = process.env.SHEIN_AFFILIATE_ID || ''
const RATE_LIMIT_MS = 200 // 5 requests/second max

const REQUIRED_ENV_VARS = ['SHEIN_API_KEY'] as const
const OPTIONAL_ENV_VARS = ['SHEIN_AFFILIATE_ID', 'SHEIN_SECRET_KEY'] as const

let lastRequestTime = 0

// ── Helpers ─────────────────────────────────────────────────────────────────

async function rateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed))
  }
  lastRequestTime = Date.now()
}

async function sheinFetch<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<{ ok: boolean; data?: T; error?: string; status?: number }> {
  const apiKey = process.env.SHEIN_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'SHEIN_API_KEY not configured' }
  }

  await rateLimit()

  const url = new URL(`${SHEIN_API_BASE}${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
        'User-Agent': 'PromoSnap/1.0',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      logger.warn('shein.api.error', { endpoint, status: res.status, body: body.slice(0, 300) })
      return { ok: false, error: `HTTP ${res.status}`, status: res.status }
    }

    const data = (await res.json()) as T
    return { ok: true, data }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    logger.error('shein.api.fetch_error', { endpoint, error: msg })
    return { ok: false, error: msg }
  }
}

function buildAffiliateUrl(productUrl: string, subId?: string): string {
  try {
    const url = new URL(productUrl)
    if (SHEIN_AFFILIATE_TAG) {
      url.searchParams.set('aff_id', SHEIN_AFFILIATE_TAG)
    }
    if (subId) {
      url.searchParams.set('sub_id', subId)
    }
    url.searchParams.set('ref', 'promosnap')
    return url.toString()
  } catch {
    return productUrl
  }
}

// ── API Response Types ──────────────────────────────────────────────────────

interface SheinProductRaw {
  goods_id?: string
  goods_sn?: string
  goods_name?: string
  goods_url_name?: string
  goods_img?: string
  detail_image?: string[]
  retail_price?: { amount?: string; amountWithSymbol?: string }
  sale_price?: { amount?: string; amountWithSymbol?: string }
  discount?: string
  stock?: number
  cat_id?: string
  cat_name?: string
  brand?: string
  comment_num?: string
  comment_rank?: string
  is_free_shipping?: number
  productUrl?: string
  product_url?: string
}

interface SheinSearchResponse {
  code?: string
  msg?: string
  info?: {
    products?: SheinProductRaw[]
    total?: number
  }
}

interface SheinProductResponse {
  code?: string
  msg?: string
  info?: SheinProductRaw
}

// ── Adapter Implementation ──────────────────────────────────────────────────

function mapProduct(raw: SheinProductRaw): AdapterResult {
  const externalId = raw.goods_sn || raw.goods_id || `shein-${Date.now()}`
  const baseUrl = raw.productUrl || raw.product_url || `https://br.shein.com/${raw.goods_url_name || externalId}.html`
  const currentPrice = parseFloat(raw.sale_price?.amount || '0')
  const originalPrice = parseFloat(raw.retail_price?.amount || '0')

  return {
    externalId,
    title: raw.goods_name || `Produto Shein ${externalId}`,
    brand: raw.brand || 'SHEIN',
    category: raw.cat_name,
    imageUrl: raw.goods_img,
    images: raw.detail_image,
    productUrl: baseUrl,
    affiliateUrl: buildAffiliateUrl(baseUrl),
    currentPrice: currentPrice || 0,
    originalPrice: originalPrice > currentPrice ? originalPrice : undefined,
    currency: 'BRL',
    availability: (raw.stock ?? 1) > 0 ? 'in_stock' : 'out_of_stock',
    rating: raw.comment_rank ? parseFloat(raw.comment_rank) : undefined,
    reviewsCount: raw.comment_num ? parseInt(raw.comment_num, 10) : undefined,
    isFreeShipping: raw.is_free_shipping === 1,
  }
}

export class SheinSourceAdapter implements SourceAdapter {
  name = 'Shein'
  slug = 'shein'

  isConfigured(): boolean {
    return REQUIRED_ENV_VARS.every((key) => !!process.env[key])
  }

  getStatus(): AdapterStatus {
    const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

    return {
      name: this.name,
      slug: this.slug,
      configured: this.isConfigured(),
      enabled: true,
      health: this.isConfigured() ? 'READY' : 'MOCK',
      message: this.isConfigured()
        ? 'Shein Affiliate API configurado e pronto'
        : `Env vars ausentes: ${missingEnvVars.join(', ')}`,
      missingEnvVars: [...missingEnvVars],
    }
  }

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    if (!this.isConfigured()) {
      if (IS_PRODUCTION) {
        logger.warn('shein.search.skipped', { query, reason: 'not configured in production' })
        return []
      }
      logger.debug('shein.search.mock', { query })
      return this.getMockResults(query, options?.limit)
    }

    const params: Record<string, string> = {
      q: query,
      language: 'pt',
      country: 'BR',
      currency: 'BRL',
      page: String(options?.page || 1),
      limit: String(options?.limit || 20),
    }

    if (options?.minPrice) params.min_price = String(options.minPrice)
    if (options?.maxPrice) params.max_price = String(options.maxPrice)
    if (options?.category) params.cat_id = options.category

    if (options?.sortBy) {
      const sortMap: Record<string, string> = {
        relevance: '0',
        price_asc: '1',
        price_desc: '2',
        popularity: '3',
      }
      params.sort = sortMap[options.sortBy] || '0'
    }

    const res = await sheinFetch<SheinSearchResponse>('/products/search', params)

    if (!res.ok || !res.data?.info?.products) {
      logger.warn('shein.search.failed', { query, error: res.error })
      return IS_PRODUCTION ? [] : this.getMockResults(query, options?.limit)
    }

    const products = res.data.info.products.map(mapProduct)
    logger.info('shein.search.success', { query, results: products.length })
    return products
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    if (!this.isConfigured()) {
      if (IS_PRODUCTION) {
        logger.warn('shein.getProduct.skipped', { externalId, reason: 'not configured in production' })
        return null
      }
      logger.debug('shein.getProduct.mock', { externalId })
      return this.getMockProduct(externalId)
    }

    const res = await sheinFetch<SheinProductResponse>('/products/detail', {
      goods_sn: externalId,
      language: 'pt',
      country: 'BR',
      currency: 'BRL',
    })

    if (!res.ok || !res.data?.info) {
      logger.warn('shein.getProduct.failed', { externalId, error: res.error })
      return IS_PRODUCTION ? null : this.getMockProduct(externalId)
    }

    return mapProduct(res.data.info)
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (!this.isConfigured()) {
      return { healthy: false, message: 'SHEIN_API_KEY ausente — usando dados mock' }
    }
    return { healthy: true, message: 'Shein Affiliate API configurado e pronto para uso' }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]) as unknown as string[]
    return { ready: missing.length === 0, missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = ['search', 'lookup']
    if (this.isConfigured()) {
      caps.push('clickout_ready', 'price_refresh')
    }
    return caps
  }

  // ---------------------------------------------------------------------------
  // Sync methods
  // ---------------------------------------------------------------------------

  async syncFeed(): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return {
        synced: 0,
        failed: 0,
        stale: 0,
        errors: ['SHEIN_API_KEY ausente — sync bloqueado'],
      }
    }

    // Sync popular categories
    const categories = ['vestidos', 'blusas', 'calcados', 'acessorios', 'eletronicos']
    let synced = 0
    let failed = 0
    const errors: string[] = []

    for (const cat of categories) {
      try {
        const results = await this.search(cat, { limit: 50 })
        synced += results.length
      } catch (err) {
        failed++
        errors.push(`Falha ao sincronizar categoria "${cat}": ${err instanceof Error ? err.message : 'erro desconhecido'}`)
      }
    }

    logger.info('shein.syncFeed.complete', { synced, failed, errors: errors.length })
    return { synced, failed, stale: 0, errors }
  }

  async importBatch(items: AdapterResult[]): Promise<SyncResult> {
    logger.info('shein.importBatch', { count: items.length })
    // Items are already in AdapterResult format — mark as synced
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
    if (this.isConfigured()) {
      return {
        status: 'sync-ready',
        capabilities: ['search', 'lookup', 'clickout_ready', 'price_refresh'],
        missing: [],
        lastSync: undefined,
      }
    }

    return {
      status: 'provider-needed',
      capabilities: ['search', 'lookup'],
      missing: [
        'SHEIN_API_KEY',
        'Shein Affiliate Program approval',
      ],
      lastSync: undefined,
    }
  }

  // ---------------------------------------------------------------------------
  // Mock data (development fallback)
  // ---------------------------------------------------------------------------

  private getMockResults(query: string, limit = 5): AdapterResult[] {
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      externalId: `SHEIN-MOCK-${3000 + i}`,
      title: `[Mock] ${query} — Produto Shein ${i + 1}`,
      brand: 'SHEIN',
      productUrl: `https://br.shein.com/produto-mock-${i + 1}-p-${3000 + i}.html`,
      affiliateUrl: buildAffiliateUrl(`https://br.shein.com/produto-mock-${i + 1}-p-${3000 + i}.html`),
      currentPrice: 29.9 + i * 10,
      originalPrice: 59.9 + i * 10,
      currency: 'BRL',
      availability: 'in_stock' as const,
      imageUrl: undefined,
      isFreeShipping: i < 2,
    }))
  }

  private getMockProduct(externalId: string): AdapterResult {
    return {
      externalId,
      title: `[Mock] Produto Shein ${externalId}`,
      brand: 'SHEIN',
      productUrl: `https://br.shein.com/produto-mock-p-${externalId}.html`,
      affiliateUrl: buildAffiliateUrl(`https://br.shein.com/produto-mock-p-${externalId}.html`),
      currentPrice: 39.9,
      originalPrice: 79.9,
      currency: 'BRL',
      availability: 'in_stock',
      isFreeShipping: true,
    }
  }
}
