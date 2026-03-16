import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'

/**
 * Shein adapter — stub.
 * Real Shein products enter via WhatsApp/Cola JSON ingest.
 */
export class SheinAdapter extends BaseAdapter {
  name = 'Shein'
  slug = 'shein'
  isEnabled = false

  private affiliateId = process.env.SHEIN_AFFILIATE_ID || ''

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
    return `${productUrl}${productUrl.includes('?') ? '&' : '?'}aff_id=${this.affiliateId}`
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { status: "BLOCKED", latencyMs: 0, message: "Shein API not configured" }
  }
}
