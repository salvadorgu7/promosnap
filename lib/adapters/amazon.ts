// Amazon PA-API Source Adapter (STUB)
// Ready for real PA-API 5.0 integration — returns mock data until configured.

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus, AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability } from './types'

const REQUIRED_ENV_VARS = ['AMAZON_ACCESS_KEY', 'AMAZON_SECRET_KEY', 'AMAZON_PARTNER_TAG'] as const

export class AmazonSourceAdapter implements SourceAdapter {
  name = 'Amazon Brasil'
  slug = 'amazon-br'

  isConfigured(): boolean {
    return REQUIRED_ENV_VARS.every((key) => !!process.env[key])
  }

  getStatus(): AdapterStatus {
    const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

    return {
      name: this.name,
      slug: this.slug,
      configured: this.isConfigured(),
      enabled: true,
      health: this.isConfigured() ? 'READY' : 'MOCK',
      message: this.isConfigured()
        ? 'PA-API 5.0 credentials configured'
        : `Missing env vars: ${missingEnvVars.join(', ')}`,
      missingEnvVars: [...missingEnvVars],
    }
  }

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    if (!this.isConfigured()) {
      console.log(`[SourceAdapter:${this.slug}] Not configured — returning mock data for "${query}"`)
      return this.getMockResults(query, options?.limit)
    }

    // TODO: Implement real PA-API 5.0 SearchItems
    // https://webservices.amazon.com/paapi5/documentation/search-items.html
    //
    // const params = {
    //   Keywords: query,
    //   SearchIndex: 'All',
    //   ItemCount: options?.limit ?? 10,
    //   Resources: [
    //     'ItemInfo.Title', 'ItemInfo.ByLineInfo', 'ItemInfo.Features',
    //     'Offers.Listings.Price', 'Offers.Listings.DeliveryInfo',
    //     'Images.Primary.Large',
    //   ],
    //   PartnerTag: process.env.AMAZON_PARTNER_TAG,
    //   PartnerType: 'Associates',
    // }

    console.log(`[SourceAdapter:${this.slug}] search("${query}") — PA-API integration pending`)
    return this.getMockResults(query, options?.limit)
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    if (!this.isConfigured()) {
      console.log(`[SourceAdapter:${this.slug}] Not configured — returning mock for ${externalId}`)
      return this.getMockProduct(externalId)
    }

    // TODO: Implement PA-API 5.0 GetItems
    console.log(`[SourceAdapter:${this.slug}] getProduct(${externalId}) — PA-API integration pending`)
    return this.getMockProduct(externalId)
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (this.isConfigured()) {
      return { healthy: true, message: 'PA-API 5.0 credentials present — adapter operacional' }
    }
    return { healthy: false, message: 'Credenciais PA-API ausentes — usando dados mock' }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]) as unknown as string[]
    return { ready: missing.length === 0, missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = ['search', 'lookup']
    if (this.isConfigured()) {
      caps.push('clickout_ready', 'price_refresh')
    }
    return caps
  }

  // ---------------------------------------------------------------------------
  // Mock data
  // ---------------------------------------------------------------------------

  private getMockResults(query: string, limit = 5): AdapterResult[] {
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      externalId: `AMZN-MOCK-${i + 1}`,
      title: `[Mock] ${query} — Produto Amazon ${i + 1}`,
      productUrl: `https://www.amazon.com.br/dp/BMOCK000${i + 1}`,
      affiliateUrl: `https://www.amazon.com.br/dp/BMOCK000${i + 1}?tag=${process.env.AMAZON_PARTNER_TAG || 'promosnap-20'}`,
      currentPrice: 99.9 + i * 30,
      originalPrice: 149.9 + i * 30,
      currency: 'BRL',
      availability: 'in_stock' as const,
      imageUrl: undefined,
      isFreeShipping: i % 2 === 0,
    }))
  }

  private getMockProduct(externalId: string): AdapterResult {
    return {
      externalId,
      title: `[Mock] Produto Amazon ${externalId}`,
      productUrl: `https://www.amazon.com.br/dp/${externalId}`,
      affiliateUrl: `https://www.amazon.com.br/dp/${externalId}?tag=${process.env.AMAZON_PARTNER_TAG || 'promosnap-20'}`,
      currentPrice: 129.9,
      originalPrice: 199.9,
      currency: 'BRL',
      availability: 'in_stock',
      isFreeShipping: true,
    }
  }
}
