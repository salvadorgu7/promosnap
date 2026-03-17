/**
 * Shopee Source Adapter — PromoSnap
 *
 * Supports 2 modes:
 * 1. AFFILIATE API: Product search via Shopee Affiliate Program API (requires approval)
 * 2. PUBLIC SCRAPING: Fallback using Shopee's public v4 API (rate limited, no auth)
 *
 * Shopee Affiliate API uses HMAC-SHA256 signature authentication.
 * Env vars: SHOPEE_APP_ID, SHOPEE_APP_SECRET
 *
 * Public API (v4) — no credentials needed, but:
 * - Rate limited aggressively
 * - Can be blocked if abused
 * - Returns less data than affiliate API
 *
 * See: https://open.shopee.com/documents/v2/
 */

import type {
  SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus,
  AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability,
  SyncResult, SourceCapabilityTruth,
} from './types'
import { logger } from '@/lib/logger'
import { createHmac } from 'crypto'
import { runImportPipeline, type ImportItem } from '@/lib/import/pipeline'

const log = logger.child({ module: 'shopee-adapter' })

const IS_PRODUCTION = process.env.NODE_ENV === 'production'
const SHOPEE_API_BASE = 'https://open-api.affiliate.shopee.com.br'
const SHOPEE_PUBLIC_BASE = 'https://shopee.com.br'

const REQUIRED_ENV_VARS = ['SHOPEE_APP_ID', 'SHOPEE_APP_SECRET'] as const

// ─── HMAC Signing ────────────────────────────────────────────────────────────

function signRequest(path: string, timestamp: number): string {
  const appId = process.env.SHOPEE_APP_ID!
  const secret = process.env.SHOPEE_APP_SECRET!
  const factor = `${appId}${path}${timestamp}`
  return createHmac('sha256', secret).update(factor).digest('hex')
}

// ─── Public API Fallback (v4) ────────────────────────────────────────────────

interface ShopeePublicProduct {
  itemid: number
  shopid: number
  name: string
  images?: string[]
  image?: string
  price: number
  price_before_discount: number
  currency: string
  stock: number
  sold: number
  historical_sold?: number
  shop_location?: string
  item_rating?: { rating_star: number; rating_count: number[] }
  shopee_verified?: boolean
  is_free_shipping?: boolean
}

async function searchPublicApi(query: string, limit = 10): Promise<AdapterResult[]> {
  try {
    const url = `${SHOPEE_PUBLIC_BASE}/api/v4/search/search_items?keyword=${encodeURIComponent(query)}&limit=${limit}&order=relevancy&page_type=search&scenario=PAGE_GLOBAL_SEARCH&version=2`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': `${SHOPEE_PUBLIC_BASE}/search?keyword=${encodeURIComponent(query)}`,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      log.warn('shopee.public-api.search-failed', { status: res.status, query })
      return []
    }

    const data = await res.json()
    const items: ShopeePublicProduct[] = data.items?.map((i: any) => i.item_basic) || []

    return items.slice(0, limit).map((item) => {
      const price = item.price / 100000 // Shopee prices are in micro-units
      const originalPrice = item.price_before_discount / 100000
      const imageUrl = item.image
        ? `https://down-br.img.susercontent.com/file/${item.image}`
        : item.images?.[0]
          ? `https://down-br.img.susercontent.com/file/${item.images[0]}`
          : undefined

      const affiliateId = process.env.SHOPEE_AFFILIATE_ID
      const productUrl = `${SHOPEE_PUBLIC_BASE}/product/${item.shopid}.${item.itemid}`
      const affiliateUrl = affiliateId
        ? `${productUrl}?af_id=${affiliateId}`
        : productUrl

      return {
        externalId: `${item.shopid}.${item.itemid}`,
        title: item.name,
        imageUrl,
        productUrl,
        affiliateUrl,
        currentPrice: price,
        originalPrice: originalPrice > price ? originalPrice : undefined,
        currency: 'BRL',
        availability: item.stock > 0 ? 'in_stock' as const : 'out_of_stock' as const,
        salesCount: item.historical_sold || item.sold,
        rating: item.item_rating?.rating_star,
        reviewsCount: item.item_rating?.rating_count?.reduce((a: number, b: number) => a + b, 0),
        isFreeShipping: item.is_free_shipping,
      }
    })
  } catch (err) {
    log.warn('shopee.public-api.search-error', { query, error: String(err) })
    return []
  }
}

async function getProductPublicApi(shopId: string, itemId: string): Promise<AdapterResult | null> {
  try {
    const url = `${SHOPEE_PUBLIC_BASE}/api/v4/item/get?shopid=${shopId}&itemid=${itemId}`

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Referer': `${SHOPEE_PUBLIC_BASE}/product/${shopId}.${itemId}`,
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return null

    const data = await res.json()
    const item = data.data

    if (!item) return null

    const price = (item.price || item.price_min || 0) / 100000
    const originalPrice = (item.price_before_discount || 0) / 100000
    const imageUrl = item.image
      ? `https://down-br.img.susercontent.com/file/${item.image}`
      : undefined

    const affiliateId = process.env.SHOPEE_AFFILIATE_ID
    const productUrl = `${SHOPEE_PUBLIC_BASE}/product/${shopId}.${itemId}`

    return {
      externalId: `${shopId}.${itemId}`,
      title: item.name || `Shopee ${itemId}`,
      imageUrl,
      productUrl,
      affiliateUrl: affiliateId ? `${productUrl}?af_id=${affiliateId}` : productUrl,
      currentPrice: price,
      originalPrice: originalPrice > price ? originalPrice : undefined,
      currency: 'BRL',
      availability: (item.stock || 0) > 0 ? 'in_stock' : 'out_of_stock',
      salesCount: item.historical_sold || item.sold,
      rating: item.item_rating?.rating_star,
      reviewsCount: item.item_rating?.rating_count?.reduce((a: number, b: number) => a + b, 0),
      isFreeShipping: item.show_free_shipping,
      seller: item.shop_name ? { name: item.shop_name, rating: item.shop_rating } : undefined,
    }
  } catch (err) {
    log.warn('shopee.public-api.getProduct-error', { shopId, itemId, error: String(err) })
    return null
  }
}

// ─── Affiliate API ───────────────────────────────────────────────────────────

async function searchAffiliateApi(query: string, limit = 10): Promise<AdapterResult[]> {
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const path = '/graphql'
    const signature = signRequest(path, timestamp)

    const payload = {
      query: `query { productOfferV2(keyword: "${query.replace(/"/g, '\\"')}", limit: ${limit}, sortType: 2) { nodes { productName itemId shopId commissionRate productLink imageUrl priceMin priceMax sales ratingStar offerLink } } }`,
    }

    const res = await fetch(`${SHOPEE_API_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `SHA256 Credential=${process.env.SHOPEE_APP_ID}, Timestamp=${timestamp}, Signature=${signature}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      log.warn('shopee.affiliate-api.search-failed', { status: res.status, query })
      // Fallback to public API
      return searchPublicApi(query, limit)
    }

    const data = await res.json()
    const nodes = data.data?.productOfferV2?.nodes || []

    return nodes.map((node: any) => ({
      externalId: `${node.shopId}.${node.itemId}`,
      title: node.productName,
      imageUrl: node.imageUrl,
      productUrl: node.productLink || `${SHOPEE_PUBLIC_BASE}/product/${node.shopId}.${node.itemId}`,
      affiliateUrl: node.offerLink || node.productLink,
      currentPrice: node.priceMin / 100000,
      originalPrice: node.priceMax > node.priceMin ? node.priceMax / 100000 : undefined,
      currency: 'BRL',
      availability: 'in_stock' as const,
      salesCount: node.sales,
      rating: node.ratingStar,
    }))
  } catch (err) {
    log.warn('shopee.affiliate-api.search-error', { query, error: String(err) })
    // Fallback to public API
    return searchPublicApi(query, limit)
  }
}

// ─── Adapter Implementation ──────────────────────────────────────────────────

export class ShopeeSourceAdapter implements SourceAdapter {
  name = 'Shopee'
  slug = 'shopee'

  isConfigured(): boolean {
    return REQUIRED_ENV_VARS.every((key) => !!process.env[key])
  }

  getStatus(): AdapterStatus {
    const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key])
    const hasPublicFallback = true // Public API always available

    return {
      name: this.name,
      slug: this.slug,
      configured: this.isConfigured(),
      enabled: true,
      health: this.isConfigured() ? 'READY' : hasPublicFallback ? 'READY' : 'MOCK',
      message: this.isConfigured()
        ? 'Shopee Affiliate API configured'
        : `Public API fallback active — affiliate API needs: ${missingEnvVars.join(', ')}`,
      missingEnvVars: [...missingEnvVars],
    }
  }

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    const limit = options?.limit || 10

    if (this.isConfigured()) {
      // Use Affiliate API (primary)
      const results = await searchAffiliateApi(query, limit)
      if (results.length > 0) {
        log.info('shopee.search.affiliate-api', { query, results: results.length })
        return results
      }
    }

    // Fallback to public API (always available, rate limited)
    if (IS_PRODUCTION) {
      // In production, only use public API with logging
      log.info('shopee.search.public-api-fallback', { query })
    }
    const results = await searchPublicApi(query, limit)
    log.info('shopee.search.result', { query, results: results.length, mode: this.isConfigured() ? 'affiliate' : 'public' })
    return results
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    // externalId format: "shopId.itemId"
    const parts = externalId.split('.')
    if (parts.length !== 2) {
      log.warn('shopee.getProduct.invalid-id', { externalId })
      return null
    }

    const [shopId, itemId] = parts
    const result = await getProductPublicApi(shopId, itemId)
    if (result) {
      log.info('shopee.getProduct.success', { externalId })
    }
    return result
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (this.isConfigured()) {
      return { healthy: true, message: 'Shopee Affiliate API configurada — search e import reais' }
    }
    // Public API works but is rate-limited — honest about limitations
    return { healthy: true, message: 'Shopee public API v4 ativa (sem credenciais — rate limited)' }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]) as unknown as string[]
    // Public API fallback works, but affiliate gives better data
    return { ready: true, missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = ['search', 'lookup']
    if (process.env.SHOPEE_AFFILIATE_ID) {
      caps.push('clickout_ready')
    }
    if (this.isConfigured()) {
      caps.push('price_refresh')
    }
    return caps
  }

  // ---------------------------------------------------------------------------
  // Sync & Import
  // ---------------------------------------------------------------------------

  async syncFeed(): Promise<SyncResult> {
    const categories = ['celular', 'fone bluetooth', 'smartwatch', 'airfryer']
    let totalSynced = 0
    let totalFailed = 0
    const errors: string[] = []

    for (const cat of categories) {
      try {
        const results = await this.search(cat, { limit: 10 })
        if (results.length === 0) continue

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
            sourceSlug: 'shopee',
            discoverySource: 'shopee_sync_feed',
          }))

        if (importItems.length > 0) {
          const result = await runImportPipeline(importItems)
          totalSynced += result.created + result.updated
          totalFailed += result.failed
          if (result.failed > 0) {
            errors.push(`"${cat}": ${result.failed} falhas no import`)
          }
        }
      } catch (err) {
        totalFailed++
        errors.push(`${cat}: ${String(err)}`)
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
        sourceSlug: 'shopee',
        discoverySource: 'shopee_import_batch',
      }))

    if (importItems.length === 0) {
      return { synced: 0, failed: 0, stale: 0, errors: [] }
    }

    const result = await runImportPipeline(importItems)
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
    if (this.isConfigured()) {
      return {
        status: 'sync-ready',
        capabilities: ['search', 'lookup', 'clickout_ready', 'price_refresh'],
        missing: ['Feed sync automation'],
        lastSync: undefined,
      }
    }

    return {
      status: 'partial',
      capabilities: ['search', 'lookup'],
      missing: [
        'SHOPEE_APP_ID',
        'SHOPEE_APP_SECRET',
        'Shopee Affiliate Program approval',
      ],
      lastSync: undefined,
    }
  }
}
