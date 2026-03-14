// Placeholder adapter — not yet connected to real API
//
// To connect this adapter, you need:
//   1. Shein Affiliate Program approval
//   2. Set env var: SHEIN_API_KEY
//   3. Implement product search and detail endpoints via Shein Affiliate API
//   See: https://affiliate.shein.com/ for API documentation

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus, AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability, SyncResult, SourceCapabilityTruth } from './types'

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

    // NOT IMPLEMENTED: Requires Shein Affiliate API /products/search endpoint
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

    // NOT IMPLEMENTED: Requires Shein Affiliate API /products/detail endpoint
    console.log(`[SourceAdapter:${this.slug}] getProduct(${externalId}) — Shein API integration pending`)
    return this.getMockProduct(externalId)
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (this.isConfigured()) {
      return { healthy: true, message: 'Shein Affiliate API key presente' }
    }
    return { healthy: false, message: 'SHEIN_API_KEY ausente — usando dados mock' }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]) as unknown as string[]
    return { ready: missing.length === 0, missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = ['search', 'lookup']
    if (this.isConfigured()) {
      caps.push('clickout_ready')
    }
    return caps
  }

  // ---------------------------------------------------------------------------
  // V22: Sync methods & Capability Truth
  // ---------------------------------------------------------------------------

  async syncFeed(): Promise<SyncResult> {
    console.log(`[SourceAdapter:${this.slug}] syncFeed() — Shein Affiliate API integration pending (mock)`)
    return {
      synced: 0,
      failed: 0,
      stale: 0,
      errors: this.isConfigured()
        ? ['Shein feed sync stub — integracao real pendente']
        : ['SHEIN_API_KEY ausente — sync bloqueado'],
    }
  }

  async importBatch(items: AdapterResult[]): Promise<SyncResult> {
    console.log(`[SourceAdapter:${this.slug}] importBatch(${items.length} items) — mock`)
    return {
      synced: items.length,
      failed: 0,
      stale: 0,
      errors: ['importBatch stub — Shein integration pendente'],
    }
  }

  async refreshOffer(offerId: string): Promise<AdapterResult | null> {
    console.log(`[SourceAdapter:${this.slug}] refreshOffer(${offerId}) — mock`)
    return this.getMockProduct(offerId)
  }

  getCapabilityTruth(): SourceCapabilityTruth {
    return {
      status: 'provider-needed',
      capabilities: ['search', 'lookup'],
      missing: [
        'SHEIN_API_KEY',
        'Shein Affiliate API approval',
        'Feed sync integration',
        'Price refresh support',
      ],
      lastSync: undefined,
    }
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
