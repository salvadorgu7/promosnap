import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'

export class SheinAdapter extends BaseAdapter {
  name = 'Shein'
  slug = 'shein'
  isEnabled = true

  private affiliateId = process.env.SHEIN_AFFILIATE_ID || ''

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
    return `${productUrl}${productUrl.includes('?') ? '&' : '?'}aff_id=${this.affiliateId}`
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { status: "MOCK", latencyMs: 0, message: "Adapter not yet implemented" }
  }
}
