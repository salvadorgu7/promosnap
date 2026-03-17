// Placeholder adapter — not yet connected to real API
//
// To connect this adapter, you need:
//   1. Shein Affiliate Program approval
//   2. Set env var: SHEIN_API_KEY
//   3. Implement product search and detail endpoints via Shein Affiliate API
//   See: https://affiliate.shein.com/ for API documentation

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus, AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability, SyncResult, SourceCapabilityTruth } from './types'
import { logger } from '@/lib/logger'

const IS_PRODUCTION = process.env.NODE_ENV === 'production'

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
      if (IS_PRODUCTION) {
        logger.warn('shein.search.skipped', { query, reason: 'not configured in production' })
        return []
      }
      logger.debug('shein.search.mock', { query })
      return this.getMockResults(query, options?.limit)
    }

    // NOT IMPLEMENTED: Requires Shein Affiliate API /products/search endpoint
    logger.info('shein.search.pending', { query, message: 'Shein API integration pending' })
    return []
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    if (!this.isConfigured()) {
      if (IS_PRODUCTION) {
        logger.warn('shein.getProduct.skipped', { externalId, reason: 'not configured in production' })
        return null
      }
      logger.debug('shein.getProduct.mock', { externalId })
      return this.getMockProduct(externalId)
    }

    // NOT IMPLEMENTED: Requires Shein Affiliate API /products/detail endpoint
    logger.info('shein.getProduct.pending', { externalId, message: 'Shein API integration pending' })
    return null
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
    logger.info('shein.syncFeed.pending', { configured: this.isConfigured() })
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
    logger.info('shein.importBatch.pending', { count: items.length })
    return {
      synced: items.length,
      failed: 0,
      stale: 0,
      errors: ['importBatch stub — Shein integration pendente'],
    }
  }

  async refreshOffer(offerId: string): Promise<AdapterResult | null> {
    logger.debug('shein.refreshOffer.pending', { offerId })
    return IS_PRODUCTION ? null : this.getMockProduct(offerId)
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
