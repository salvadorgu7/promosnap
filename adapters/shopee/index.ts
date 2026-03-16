import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'

/**
 * Shopee adapter — stub.
 * Real Shopee products enter via WhatsApp/Cola JSON ingest.
 */
export class ShopeeAdapter extends BaseAdapter {
  name = 'Shopee'
  slug = 'shopee'
  isEnabled = false

  private affiliateId = process.env.SHOPEE_AFFILIATE_ID || ''

  async searchProducts(_query: string, _options?: SearchOptions): Promise<RawListing[]> {
    return []
  }

  async fetchProductById(_externalId: string): Promise<RawListing | null> {
    return null
  }

  async fetchOffers(_params?: FetchOffersParams): Promise<RawListing[]> {
    return []
  }

  buildAffiliateUrl(productUrl: string): string {
    if (!this.affiliateId) return productUrl
    return `${productUrl}${productUrl.includes('?') ? '&' : '?'}af_id=${this.affiliateId}`
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { status: "BLOCKED", latencyMs: 0, message: "Shopee API not configured" }
  }
}
