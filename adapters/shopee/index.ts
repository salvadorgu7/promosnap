import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'

export class ShopeeAdapter extends BaseAdapter {
  name = 'Shopee'
  slug = 'shopee'
  isEnabled = true

  private affiliateId = process.env.SHOPEE_AFFILIATE_ID || ''

  async searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]> {
    this.log(`Searching: "${query}"`, options)
    return []
  }

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    this.log(`Fetching: ${externalId}`)
    return null
  }

  async fetchOffers(params?: FetchOffersParams): Promise<RawListing[]> {
    return []
  }

  buildAffiliateUrl(productUrl: string): string {
    if (!this.affiliateId) return productUrl
    return `${productUrl}${productUrl.includes('?') ? '&' : '?'}af_id=${this.affiliateId}`
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { status: "MOCK", latencyMs: 0, message: "Adapter not yet implemented" }
  }
}
