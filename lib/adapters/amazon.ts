// Placeholder adapter — not yet connected to real API
//
// To connect this adapter, you need:
//   1. An Amazon Associates account with PA-API 5.0 access
//   2. Set env vars: AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG
//   3. Implement SearchItems and GetItems calls per PA-API 5.0 docs
//   See: https://webservices.amazon.com/paapi5/documentation/

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus, AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability, SyncResult, SourceCapabilityTruth } from './types'

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

    // NOT IMPLEMENTED: Requires PA-API 5.0 SearchItems call
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

    // NOT IMPLEMENTED: Requires PA-API 5.0 GetItems call
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
  // V22: Sync methods & Capability Truth
  // ---------------------------------------------------------------------------

  async syncFeed(): Promise<SyncResult> {
    console.log(`[SourceAdapter:${this.slug}] syncFeed() — PA-API integration pending (mock)`)
    // Mock: simulate a feed sync that returns placeholder data
    return {
      synced: 0,
      failed: 0,
      stale: 0,
      errors: this.isConfigured()
        ? ['PA-API feed sync nao implementado — stub retornando mock']
        : ['PA-API credentials ausentes — configure AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY, AMAZON_PARTNER_TAG'],
    }
  }

  async importBatch(items: AdapterResult[]): Promise<SyncResult> {
    console.log(`[SourceAdapter:${this.slug}] importBatch(${items.length} items) — creating candidates (mock)`)
    // Mock: mark all items as "synced" candidates (no real DB write in stub)
    return {
      synced: items.length,
      failed: 0,
      stale: 0,
      errors: ['importBatch stub — candidatos nao persistidos (PA-API integration pendente)'],
    }
  }

  async refreshOffer(offerId: string): Promise<AdapterResult | null> {
    console.log(`[SourceAdapter:${this.slug}] refreshOffer(${offerId}) — mock refresh`)
    // Mock: return the mock product as "refreshed"
    return this.getMockProduct(offerId)
  }

  getCapabilityTruth(): SourceCapabilityTruth {
    return {
      status: 'provider-needed',
      capabilities: ['search', 'lookup'],
      missing: [
        'PA-API 5.0 key (AMAZON_ACCESS_KEY)',
        'PA-API 5.0 secret (AMAZON_SECRET_KEY)',
        'Partner tag (AMAZON_PARTNER_TAG)',
        'Feed sync integration',
        'Real price refresh',
      ],
      lastSync: undefined,
    }
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
