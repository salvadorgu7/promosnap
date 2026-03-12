import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'

export class AmazonAdapter extends BaseAdapter {
  name = 'Amazon Brasil'
  slug = 'amazon-br'
  isEnabled = true

  private tag = process.env.AMAZON_AFFILIATE_TAG || ''

  async searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]> {
    this.log(`Searching: "${query}"`, options)
    // TODO: Implement PA-API 5.0 SearchItems
    return []
  }

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    this.log(`Fetching product: ${externalId}`)
    // TODO: Implement PA-API 5.0 GetItems
    return null
  }

  async fetchOffers(params?: FetchOffersParams): Promise<RawListing[]> {
    this.log('Fetching offers', params)
    // TODO: Implement PA-API 5.0 browse/category fetch
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
    return { status: "MOCK", latencyMs: 0, message: "Adapter not yet implemented" }
  }
}
