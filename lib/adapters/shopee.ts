// Shopee Source Adapter (STUB)
// Ready for real Shopee Open Platform integration.

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus, AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability } from './types'

const REQUIRED_ENV_VARS = ['SHOPEE_APP_ID', 'SHOPEE_APP_SECRET'] as const

export class ShopeeSourceAdapter implements SourceAdapter {
  name = 'Shopee'
  slug = 'shopee'

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
        ? 'Shopee Open Platform credentials configured'
        : `Missing env vars: ${missingEnvVars.join(', ')}`,
      missingEnvVars: [...missingEnvVars],
    }
  }

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    if (!this.isConfigured()) {
      console.log(`[SourceAdapter:${this.slug}] Not configured — returning mock data for "${query}"`)
      return this.getMockResults(query, options?.limit)
    }

    // TODO: Implement Shopee Open Platform API
    // https://open.shopee.com/documents/v2/v2.product.search_item
    //
    // const timestamp = Math.floor(Date.now() / 1000)
    // const sign = generateShopeeSign(timestamp)
    // const url = new URL('https://partner.shopeemobile.com/api/v2/product/search_item')
    // url.searchParams.set('keyword', query)
    // url.searchParams.set('partner_id', process.env.SHOPEE_APP_ID!)
    // url.searchParams.set('timestamp', String(timestamp))
    // url.searchParams.set('sign', sign)

    console.log(`[SourceAdapter:${this.slug}] search("${query}") — Shopee API integration pending`)
    return this.getMockResults(query, options?.limit)
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    if (!this.isConfigured()) {
      console.log(`[SourceAdapter:${this.slug}] Not configured — returning mock for ${externalId}`)
      return this.getMockProduct(externalId)
    }

    // TODO: Implement Shopee Open Platform GetItemDetail
    console.log(`[SourceAdapter:${this.slug}] getProduct(${externalId}) — Shopee API integration pending`)
    return this.getMockProduct(externalId)
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (this.isConfigured()) {
      return { healthy: true, message: 'Shopee Open Platform credentials presentes' }
    }
    return { healthy: false, message: 'SHOPEE_APP_ID / SHOPEE_APP_SECRET ausentes — usando dados mock' }
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
      externalId: `SHOPEE-MOCK-${2000 + i}`,
      title: `[Mock] ${query} — Produto Shopee ${i + 1}`,
      productUrl: `https://shopee.com.br/produto-mock-${i + 1}-i.123.${2000 + i}`,
      currentPrice: 49.9 + i * 15,
      originalPrice: 89.9 + i * 15,
      currency: 'BRL',
      availability: 'in_stock' as const,
      imageUrl: undefined,
      isFreeShipping: i === 0,
      coupon: i === 1 ? 'SHOPEE10' : undefined,
    }))
  }

  private getMockProduct(externalId: string): AdapterResult {
    return {
      externalId,
      title: `[Mock] Produto Shopee ${externalId}`,
      productUrl: `https://shopee.com.br/produto-mock-i.123.${externalId}`,
      currentPrice: 59.9,
      originalPrice: 99.9,
      currency: 'BRL',
      availability: 'in_stock',
      isFreeShipping: false,
    }
  }
}
