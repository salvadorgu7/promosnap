import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'
import { logger } from '@/lib/logger'

/**
 * Amazon Brasil adapter — stub.
 * Real imports use the admin ingest pipeline + WhatsApp/Cola JSON.
 * PA-API 5.0 requires an Associates account with qualifying sales.
 */
export class AmazonAdapter extends BaseAdapter {
  name = 'Amazon Brasil'
  slug = 'amazon-br'
  isEnabled = false

  private tag = process.env.AMAZON_AFFILIATE_TAG || ''

  async searchProducts(query: string, _options?: SearchOptions): Promise<RawListing[]> {
    logger.debug("amazon-adapter.search-not-implemented", { query })
    return []
  }

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    logger.debug("amazon-adapter.fetch-not-implemented", { externalId })
    return null
  }

  async fetchOffers(_params?: FetchOffersParams): Promise<RawListing[]> {
    return []
  }

  buildAffiliateUrl(productUrl: string): string {
    if (!this.tag) return productUrl
    try {
      const url = new URL(productUrl)
      url.searchParams.set('tag', this.tag)
      url.searchParams.set('linkCode', 'll1')
      return url.toString()
    } catch {
      return `${productUrl}${productUrl.includes('?') ? '&' : '?'}tag=${this.tag}`
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { status: "BLOCKED", latencyMs: 0, message: "Amazon PA-API not configured" }
  }
}
