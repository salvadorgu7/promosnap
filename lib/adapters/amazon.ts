/**
 * Amazon Source Adapter — PromoSnap
 *
 * Supports 3 modes:
 * 1. PA-API 5.0: Full product search and lookup (requires credentials)
 * 2. AFFILIATE-ONLY: Links with tracking tag (works NOW, no search)
 * 3. CREATORS: Amazon Creators API (future, not yet implemented)
 *
 * Current mode is auto-detected from env vars.
 * See lib/amazon/strategy.ts for full documentation.
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
import { runImportPipeline, type ImportItem } from '@/lib/import/pipeline'
import {
  AMAZON_TRACKING_TAG,
  detectAmazonApiPath,
  buildAmazonProductUrl,
  buildAmazonSearchUrl,
  type AmazonApiPath,
} from '@/lib/amazon/strategy'
import {
  isApiConfigured,
  searchItems,
  getItem,
  type AmazonProduct,
} from '@/lib/amazon/pa-api'

const log = logger.child({ module: 'amazon-adapter' })

// Rate limit queue for PA-API (1 req/s)
let lastPaApiCall = 0
const PA_API_MIN_INTERVAL = 1100 // 1.1s to be safe

async function rateLimitedPaApiCall<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now()
  const elapsed = now - lastPaApiCall
  if (elapsed < PA_API_MIN_INTERVAL) {
    await new Promise((r) => setTimeout(r, PA_API_MIN_INTERVAL - elapsed))
  }
  lastPaApiCall = Date.now()
  return fn()
}

/**
 * Convert PA-API product to AdapterResult.
 */
function paApiToAdapterResult(product: AmazonProduct): AdapterResult {
  return {
    externalId: product.asin,
    title: product.title,
    brand: product.brand,
    imageUrl: product.imageUrl,
    productUrl: product.detailPageUrl,
    affiliateUrl: buildAmazonProductUrl(product.asin),
    currentPrice: product.currentPrice || 0,
    originalPrice: product.originalPrice,
    currency: product.currency || 'BRL',
    availability: product.availability,
    isFreeShipping: product.isFreeShipping,
    seller: product.sellerName ? { name: product.sellerName } : undefined,
    salesCount: product.salesRank ? Math.max(1, 100000 - product.salesRank) : undefined, // Rough estimate
  }
}

export class AmazonSourceAdapter implements SourceAdapter {
  name = 'Amazon Brasil'
  slug = 'amazon-br'

  // ---------------------------------------------------------------------------
  // Configuration Detection
  // ---------------------------------------------------------------------------

  private getApiPath(): AmazonApiPath {
    return detectAmazonApiPath().path
  }

  isConfigured(): boolean {
    return AMAZON_TRACKING_TAG !== ''
  }

  private hasApiAccess(): boolean {
    const path = this.getApiPath()
    return path === 'creators' || path === 'pa-api'
  }

  getStatus(): AdapterStatus {
    const apiPath = this.getApiPath()
    const hasApi = this.hasApiAccess()

    const missingEnvVars: string[] = []
    if (!process.env.AMAZON_AFFILIATE_TAG && !process.env.AMAZON_PARTNER_TAG) {
      missingEnvVars.push('AMAZON_AFFILIATE_TAG')
    }

    let health: 'READY' | 'MOCK' | 'DEGRADED' = 'MOCK'
    let message = ''

    if (hasApi) {
      health = 'READY'
      message = `${apiPath === 'creators' ? 'Creators API' : 'PA-API 5.0'} configured — adapter operational`
    } else if (AMAZON_TRACKING_TAG) {
      health = 'DEGRADED' as 'MOCK'
      message = `Affiliate-only mode (tag: ${AMAZON_TRACKING_TAG}) — no API access`
    } else {
      message = `Missing env vars: ${missingEnvVars.join(', ')}`
    }

    return {
      name: this.name,
      slug: this.slug,
      configured: this.isConfigured(),
      enabled: true,
      health: hasApi ? 'READY' : 'MOCK',
      message,
      missingEnvVars: [...missingEnvVars],
    }
  }

  // ---------------------------------------------------------------------------
  // Search & Lookup
  // ---------------------------------------------------------------------------

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    const path = this.getApiPath()

    // PA-API 5.0: Real search
    if (path === 'pa-api' && isApiConfigured()) {
      try {
        const products = await rateLimitedPaApiCall(() =>
          searchItems(query, {
            category: options?.category,
            minPrice: options?.minPrice,
            maxPrice: options?.maxPrice,
            limit: options?.limit || 10,
          })
        )

        log.info('amazon.pa-api.search.success', {
          query,
          results: products.length,
        })

        return products.map(paApiToAdapterResult)
      } catch (err) {
        log.error('amazon.pa-api.search.error', { query, error: String(err) })
        return []
      }
    }

    if (path === 'creators') {
      // Creators API search — not yet implemented
      log.debug('amazon.creators.search.pending', { query })
      return []
    }

    // Affiliate-only: no search capability
    log.debug('amazon.affiliate-only.search.unavailable')
    return []
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    const path = this.getApiPath()

    // PA-API 5.0: Real product lookup
    if (path === 'pa-api' && isApiConfigured()) {
      try {
        const product = await rateLimitedPaApiCall(() => getItem(externalId))
        if (!product) {
          log.warn('amazon.pa-api.getProduct.not-found', { asin: externalId })
          return null
        }

        log.info('amazon.pa-api.getProduct.success', { asin: externalId })
        return paApiToAdapterResult(product)
      } catch (err) {
        log.error('amazon.pa-api.getProduct.error', { asin: externalId, error: String(err) })
        return null
      }
    }

    if (path === 'creators') {
      log.debug('amazon.creators.getProduct.pending', { externalId })
      return null
    }

    // Affiliate-only: return a basic affiliate link
    if (AMAZON_TRACKING_TAG && externalId.match(/^B[A-Z0-9]{9}$/)) {
      return {
        externalId,
        title: `Amazon Product ${externalId}`,
        productUrl: `https://www.amazon.com.br/dp/${externalId}`,
        affiliateUrl: buildAmazonProductUrl(externalId),
        currentPrice: 0,
        currency: 'BRL',
        availability: 'unknown',
      }
    }

    return null
  }

  // ---------------------------------------------------------------------------
  // Offer Refresh (PA-API)
  // ---------------------------------------------------------------------------

  async refreshOffer(offerId: string): Promise<AdapterResult | null> {
    if (!this.hasApiAccess()) return null

    // offerId here is expected to be an ASIN
    if (isApiConfigured()) {
      return this.getProduct(offerId)
    }

    return null
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (isApiConfigured()) {
      return {
        healthy: true,
        message: 'PA-API 5.0 credentials present — search and lookup available',
      }
    }
    if (this.hasApiAccess()) {
      const path = this.getApiPath()
      return {
        healthy: true,
        message: `${path === 'creators' ? 'Creators API' : 'PA-API 5.0'} credentials present`,
      }
    }
    if (AMAZON_TRACKING_TAG) {
      return {
        healthy: true,
        message: `Affiliate-only mode — clickout tracking functional (tag: ${AMAZON_TRACKING_TAG})`,
      }
    }
    return { healthy: false, message: 'Nenhuma configuração Amazon detectada' }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing: string[] = []
    if (!AMAZON_TRACKING_TAG) missing.push('AMAZON_AFFILIATE_TAG')
    if (!this.hasApiAccess()) {
      missing.push('AMAZON_ACCESS_KEY + AMAZON_SECRET_KEY (PA-API 5.0)')
      missing.push('or AMAZON_CREATORS_TOKEN + AMAZON_CREATORS_SECRET (Creators API)')
    }
    return { ready: this.hasApiAccess(), missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = []
    if (AMAZON_TRACKING_TAG) {
      caps.push('clickout_ready')
    }
    if (this.hasApiAccess()) {
      caps.push('search', 'lookup', 'price_refresh')
    }
    return caps
  }

  // ---------------------------------------------------------------------------
  // Sync
  // ---------------------------------------------------------------------------

  async syncFeed(): Promise<SyncResult> {
    const path = this.getApiPath()

    if (path === 'pa-api' && isApiConfigured()) {
      // Search trending categories and import via real pipeline
      const categories = ['celulares', 'notebooks', 'fones', 'tvs']
      let totalSynced = 0
      let totalFailed = 0
      const errors: string[] = []

      for (const cat of categories) {
        try {
          const products = await rateLimitedPaApiCall(() =>
            searchItems(`mais vendidos ${cat}`, { category: cat, limit: 10 })
          )
          if (products.length === 0) continue

          const results = products.map(paApiToAdapterResult)

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
              categorySlug: cat,
              sourceSlug: 'amazon-br',
              discoverySource: 'amazon_sync_feed',
            }))

          if (importItems.length > 0) {
            const result = await runImportPipeline(importItems)
            totalSynced += result.created + result.updated
            totalFailed += result.failed
            if (result.failed > 0) {
              errors.push(`"${cat}": ${result.failed} falhas no import`)
            }
            log.info('amazon.syncFeed.category', {
              category: cat,
              searched: products.length,
              imported: result.created + result.updated,
              failed: result.failed,
            })
          }
        } catch (err) {
          totalFailed++
          errors.push(`${cat}: ${String(err)}`)
        }
      }

      return { synced: totalSynced, failed: totalFailed, stale: 0, errors }
    }

    if (path === 'associates-only' || path === 'unknown') {
      return {
        synced: 0,
        failed: 0,
        stale: 0,
        errors: ['Feed sync requer PA-API 5.0 ou Creators API — apenas affiliate-only disponível'],
      }
    }

    return {
      synced: 0,
      failed: 0,
      stale: 0,
      errors: [`${path} feed sync não implementado`],
    }
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
        sourceSlug: 'amazon-br',
        discoverySource: 'amazon_import_batch',
      }))

    if (importItems.length === 0) {
      return { synced: 0, failed: 0, stale: 0, errors: [] }
    }

    const result = await runImportPipeline(importItems)
    log.info('amazon.importBatch', {
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

  getCapabilityTruth(): SourceCapabilityTruth {
    const path = this.getApiPath()
    const capabilities: string[] = []
    const missing: string[] = []

    if (AMAZON_TRACKING_TAG) capabilities.push('clickout_ready')

    if (path === 'pa-api' && isApiConfigured()) {
      capabilities.push('search', 'lookup', 'price_refresh', 'sync_feed', 'import_batch')
      missing.push('Creators API migration (PA-API deprecated May 2026)')
    } else if (path === 'creators') {
      capabilities.push('search', 'lookup')
      missing.push('Feed sync implementation', 'Real price refresh')
    } else {
      missing.push(
        'AMAZON_ACCESS_KEY + AMAZON_SECRET_KEY (PA-API 5.0)',
        'Or AMAZON_CREATORS_TOKEN + AMAZON_CREATORS_SECRET (Creators API)',
      )
    }

    let status: SourceCapabilityTruth['status'] = 'provider-needed'
    if (path === 'pa-api' && isApiConfigured()) status = 'sync-ready'
    else if (path === 'creators') status = 'partial'
    else if (AMAZON_TRACKING_TAG) status = 'mock'

    return { status, capabilities, missing, lastSync: undefined }
  }
}
