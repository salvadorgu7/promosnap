/**
 * Magazine Luiza Source Adapter — PromoSnap
 *
 * Integrates with the Magalu Affiliate API to search products,
 * fetch details, and import offers into the PromoSnap catalog.
 *
 * Env vars:
 *   MAGALU_API_KEY        — API key
 *   MAGALU_API_KEY_ID     — API key ID
 *   MAGALU_API_SECRET     — API key secret
 *   MAGALU_PARTNER_ID     — Affiliate/partner ID (for link tracking)
 *
 * API: https://developer.magazineluiza.com.br
 */

import type {
  SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus,
  AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability,
  SyncResult, SourceCapabilityTruth,
} from './types'
import { logger } from '@/lib/logger'
import { runImportPipeline, type ImportItem } from '@/lib/import/pipeline'

const log = logger.child({ module: 'magalu-adapter' })

const MAGALU_API_BASE = 'https://api.magazineluiza.com.br/v1'
const MAGALU_PUBLIC_BASE = 'https://www.magazineluiza.com.br'

const REQUIRED_ENV_VARS = ['MAGALU_API_KEY', 'MAGALU_API_SECRET'] as const

// ─── Auth ─────────────────────────────────────────────────────────────────

function getApiKey(): string | undefined { return process.env.MAGALU_API_KEY }
function getApiSecret(): string | undefined { return process.env.MAGALU_API_SECRET }
function getApiKeyId(): string | undefined { return process.env.MAGALU_API_KEY_ID }
function getPartnerId(): string | undefined { return process.env.MAGALU_PARTNER_ID }

function getAuthHeaders(): Record<string, string> {
  const apiKey = getApiKey()
  const apiKeyId = getApiKeyId()
  const apiSecret = getApiSecret()

  if (!apiKey) return {}

  return {
    'Accept': 'application/json',
    'X-Api-Key': apiKey,
    ...(apiKeyId ? { 'X-Api-Key-Id': apiKeyId } : {}),
    ...(apiSecret ? { 'X-Api-Secret': apiSecret } : {}),
    'User-Agent': 'PromoSnap/1.0',
  }
}

// ─── Rate Limiter ─────────────────────────────────────────────────────────

let lastRequestTime = 0
const MIN_INTERVAL = 500 // 500ms between requests

async function rateLimitedFetch(url: string, options?: RequestInit): Promise<Response> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < MIN_INTERVAL) {
    await new Promise(r => setTimeout(r, MIN_INTERVAL - elapsed))
  }
  lastRequestTime = Date.now()
  return fetch(url, { ...options, signal: AbortSignal.timeout(10000) })
}

// ─── Search ───────────────────────────────────────────────────────────────

interface MagaluProduct {
  id?: string
  sku?: string
  title?: string
  name?: string
  price?: number
  list_price?: number
  old_price?: number
  image?: string
  images?: string[]
  url?: string
  link?: string
  brand?: string
  category?: string
  available?: boolean
  installment?: { quantity: number; value: number }
  rating?: number
  reviews_count?: number
  free_shipping?: boolean
}

function mapToAdapterResult(item: MagaluProduct): AdapterResult {
  const partnerId = getPartnerId()
  const externalId = item.sku || item.id || `magalu_${Date.now()}`
  const productUrl = item.url || item.link || `${MAGALU_PUBLIC_BASE}/${externalId}/p/`
  const price = item.price || 0
  const originalPrice = item.list_price || item.old_price
  const imageUrl = item.image || item.images?.[0]

  let affiliateUrl: string | undefined
  if (partnerId && productUrl) {
    try {
      const u = new URL(productUrl)
      u.searchParams.set('partner_id', partnerId)
      affiliateUrl = u.toString()
    } catch {
      affiliateUrl = `${productUrl}${productUrl.includes('?') ? '&' : '?'}partner_id=${partnerId}`
    }
  }

  return {
    externalId,
    title: item.title || item.name || '',
    brand: item.brand,
    category: item.category,
    imageUrl,
    productUrl,
    affiliateUrl,
    currentPrice: price,
    originalPrice: originalPrice && originalPrice > price ? originalPrice : undefined,
    currency: 'BRL',
    availability: item.available !== false ? 'in_stock' : 'out_of_stock',
    rating: item.rating,
    reviewsCount: item.reviews_count,
    isFreeShipping: item.free_shipping,
    installment: item.installment
      ? `${item.installment.quantity}x R$ ${item.installment.value.toFixed(2)}`
      : undefined,
  }
}

// ─── Adapter ──────────────────────────────────────────────────────────────

export class MagaluSourceAdapter implements SourceAdapter {
  name = 'Magazine Luiza'
  slug = 'magalu'

  isConfigured(): boolean {
    return REQUIRED_ENV_VARS.every(key => !!process.env[key])
  }

  getStatus(): AdapterStatus {
    const missingEnvVars = REQUIRED_ENV_VARS.filter(key => !process.env[key])
    return {
      name: this.name,
      slug: this.slug,
      configured: this.isConfigured(),
      enabled: true,
      health: this.isConfigured() ? 'READY' : 'MOCK',
      message: this.isConfigured()
        ? 'Magalu API configurado — search e import prontos'
        : `Variaveis ausentes: ${missingEnvVars.join(', ')}`,
      missingEnvVars: [...missingEnvVars],
    }
  }

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    if (!this.isConfigured()) {
      log.debug('magalu.search.not-configured')
      return []
    }

    const limit = options?.limit || 15
    const headers = getAuthHeaders()

    try {
      // Try Magalu API search endpoint
      const url = new URL(`${MAGALU_API_BASE}/products/search`)
      url.searchParams.set('q', query)
      url.searchParams.set('limit', String(Math.min(limit, 50)))
      if (options?.minPrice) url.searchParams.set('min_price', String(options.minPrice))
      if (options?.maxPrice) url.searchParams.set('max_price', String(options.maxPrice))

      const res = await rateLimitedFetch(url.toString(), { headers })

      if (!res.ok) {
        log.warn('magalu.search.api-failed', { status: res.status, query })

        // Fallback: try alternative endpoint format
        const altUrl = `${MAGALU_API_BASE}/search?q=${encodeURIComponent(query)}&limit=${limit}`
        const altRes = await rateLimitedFetch(altUrl, { headers })

        if (!altRes.ok) {
          log.warn('magalu.search.alt-failed', { status: altRes.status })
          return []
        }

        const altData = await altRes.json()
        const altProducts = altData.products || altData.results || altData.data || []
        return altProducts.slice(0, limit).map(mapToAdapterResult)
      }

      const data = await res.json()
      const products = data.products || data.results || data.data || []

      log.info('magalu.search.ok', { query, results: products.length })
      return products.slice(0, limit).map(mapToAdapterResult)
    } catch (err) {
      log.error('magalu.search.error', { query, error: String(err) })
      return []
    }
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    if (!this.isConfigured()) return null

    const headers = getAuthHeaders()

    try {
      const res = await rateLimitedFetch(`${MAGALU_API_BASE}/products/${externalId}`, { headers })

      if (!res.ok) {
        log.warn('magalu.getProduct.failed', { externalId, status: res.status })
        return null
      }

      const item = await res.json()
      return mapToAdapterResult(item)
    } catch (err) {
      log.error('magalu.getProduct.error', { externalId, error: String(err) })
      return null
    }
  }

  healthCheck(): AdapterHealthCheckResult {
    if (this.isConfigured()) {
      return { healthy: true, message: 'Magalu API configurado e pronto' }
    }
    return { healthy: false, message: 'MAGALU_API_KEY ou MAGALU_API_SECRET ausente' }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing = REQUIRED_ENV_VARS.filter(key => !process.env[key]) as unknown as string[]
    return { ready: this.isConfigured(), missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = ['search', 'lookup']
    if (this.isConfigured()) {
      caps.push('clickout_ready', 'price_refresh', 'import_ready')
    }
    return caps
  }

  async syncFeed(): Promise<SyncResult> {
    if (!this.isConfigured()) {
      return { synced: 0, failed: 0, stale: 0, errors: ['Magalu não configurado'] }
    }

    const queries: { term: string; categorySlug: string }[] = [
      { term: 'celular smartphone', categorySlug: 'celulares' },
      { term: 'notebook laptop', categorySlug: 'notebooks' },
      { term: 'smart tv 4k', categorySlug: 'smart-tvs' },
      { term: 'fone bluetooth', categorySlug: 'audio' },
      { term: 'geladeira', categorySlug: 'casa' },
      { term: 'airfryer fritadeira', categorySlug: 'casa' },
      { term: 'monitor gamer', categorySlug: 'informatica' },
      { term: 'console playstation xbox', categorySlug: 'gamer' },
      { term: 'smartwatch', categorySlug: 'wearables' },
      { term: 'aspirador robo', categorySlug: 'casa' },
    ]

    let totalSynced = 0
    let totalFailed = 0
    const errors: string[] = []

    for (const q of queries) {
      try {
        const results = await this.search(q.term, { limit: 15 })
        if (results.length === 0) continue

        const importItems: ImportItem[] = results
          .filter(r => r.currentPrice > 0)
          .map(r => ({
            externalId: r.externalId,
            title: r.title,
            currentPrice: r.currentPrice,
            originalPrice: r.originalPrice,
            productUrl: r.productUrl,
            imageUrl: r.imageUrl,
            isFreeShipping: r.isFreeShipping,
            availability: (r.availability === 'in_stock' || r.availability === 'out_of_stock') ? r.availability : 'unknown' as const,
            brand: r.brand,
            categorySlug: r.category || q.categorySlug,
            sourceSlug: 'magalu',
            discoverySource: 'magalu_sync_feed',
          }))

        if (importItems.length > 0) {
          const result = await runImportPipeline(importItems)
          totalSynced += result.created + result.updated
          totalFailed += result.failed
          log.info('magalu.syncFeed.query', { term: q.term, imported: result.created + result.updated })
        }
      } catch (err) {
        totalFailed++
        errors.push(`${q.term}: ${String(err)}`)
      }
    }

    log.info('magalu.syncFeed.complete', { totalSynced, totalFailed })
    return { synced: totalSynced, failed: totalFailed, stale: 0, errors }
  }

  async importBatch(items: AdapterResult[]): Promise<SyncResult> {
    const importItems: ImportItem[] = items
      .filter(r => r.currentPrice > 0)
      .map(r => ({
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
        sourceSlug: 'magalu',
        discoverySource: 'magalu_import_batch',
      }))

    if (importItems.length === 0) {
      return { synced: 0, failed: 0, stale: 0, errors: [] }
    }

    const result = await runImportPipeline(importItems)
    return {
      synced: result.created + result.updated,
      failed: result.failed,
      stale: 0,
      errors: result.items.filter(i => i.action === 'failed').map(i => `${i.externalId}: ${i.reason}`),
    }
  }

  async refreshOffer(offerId: string): Promise<AdapterResult | null> {
    return this.getProduct(offerId)
  }

  getCapabilityTruth(): SourceCapabilityTruth {
    if (this.isConfigured()) {
      return {
        status: 'sync-ready',
        capabilities: ['search', 'lookup', 'clickout_ready', 'price_refresh', 'import_ready'],
        missing: [],
        lastSync: undefined,
      }
    }
    return {
      status: 'blocked',
      capabilities: [],
      missing: ['MAGALU_API_KEY', 'MAGALU_API_SECRET'],
      lastSync: undefined,
    }
  }
}
