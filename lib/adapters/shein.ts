// Shein Source Adapter (STUB)
// Ready for real Shein Affiliate API integration.

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus } from './types'

const REQUIRED_ENV_VARS = ['SHEIN_API_KEY'] as const

export class SheinSourceAdapter implements SourceAdapter {
  name = 'Shein'
  slug = 'shein'

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
        ? 'Shein Affiliate API key configured'
        : `Missing env vars: ${missingEnvVars.join(', ')}`,
      missingEnvVars: [...missingEnvVars],
    }
  }

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    if (!this.isConfigured()) {
      console.log(`[SourceAdapter:${this.slug}] Not configured — returning mock data for "${query}"`)
      return this.getMockResults(query, options?.limit)
    }

    // TODO: Implement Shein Affiliate API search
    // https://api.shein.com/affiliate/v1/products/search
    //
    // const res = await fetch('https://api.shein.com/affiliate/v1/products/search', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'x-api-key': process.env.SHEIN_API_KEY!,
    //   },
    //   body: JSON.stringify({
    //     keyword: query,
    //     page: options?.page ?? 1,
    //     pageSize: options?.limit ?? 10,
    //     country: 'BR',
    //     currency: 'BRL',
    //     language: 'pt',
    //   }),
    // })

    console.log(`[SourceAdapter:${this.slug}] search("${query}") — Shein API integration pending`)
    return this.getMockResults(query, options?.limit)
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    if (!this.isConfigured()) {
      console.log(`[SourceAdapter:${this.slug}] Not configured — returning mock for ${externalId}`)
      return this.getMockProduct(externalId)
    }

    // TODO: Implement Shein Affiliate API product detail
    console.log(`[SourceAdapter:${this.slug}] getProduct(${externalId}) — Shein API integration pending`)
    return this.getMockProduct(externalId)
  }

  // ---------------------------------------------------------------------------
  // Mock data
  // ---------------------------------------------------------------------------

  private getMockResults(query: string, limit = 5): AdapterResult[] {
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      externalId: `SHEIN-MOCK-${3000 + i}`,
      title: `[Mock] ${query} — Produto Shein ${i + 1}`,
      productUrl: `https://www.shein.com/produto-mock-${i + 1}-p-${3000 + i}.html`,
      currentPrice: 29.9 + i * 10,
      originalPrice: 59.9 + i * 10,
      currency: 'BRL',
      availability: 'in_stock' as const,
      imageUrl: undefined,
      isFreeShipping: i < 2,
    }))
  }

  private getMockProduct(externalId: string): AdapterResult {
    return {
      externalId,
      title: `[Mock] Produto Shein ${externalId}`,
      productUrl: `https://www.shein.com/produto-mock-p-${externalId}.html`,
      currentPrice: 39.9,
      originalPrice: 79.9,
      currency: 'BRL',
      availability: 'in_stock',
      isFreeShipping: true,
    }
  }
}
