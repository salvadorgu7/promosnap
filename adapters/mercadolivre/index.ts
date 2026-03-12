import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'

export class MercadoLivreAdapter extends BaseAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'
  isEnabled = true

  private affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID || ''

  async searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]> {
    this.log(`Searching: "${query}"`, options)
    // TODO: Implement ML public API: GET /sites/MLB/search?q=...
    return []
  }

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    this.log(`Fetching product: ${externalId}`)
    // TODO: Implement ML API: GET /items/{id}
    return null
  }

  async fetchOffers(params?: FetchOffersParams): Promise<RawListing[]> {
    this.log('Fetching offers', params)
    return []
  }

  buildAffiliateUrl(productUrl: string): string {
    if (!this.affiliateId) return productUrl
    return `https://www.mercadolivre.com.br/affiliate-redirect?url=${encodeURIComponent(productUrl)}&aff_id=${this.affiliateId}`
  }

  async healthCheck(): Promise<HealthCheckResult> {
    return { status: "MOCK", latencyMs: 0, message: "Adapter not yet implemented" }
  }
}
