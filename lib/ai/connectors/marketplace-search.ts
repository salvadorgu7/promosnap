/**
 * Marketplace Direct Search Connectors — ML + Shopee
 *
 * Searches Mercado Livre and Shopee directly via their adapters,
 * returning results as ExternalCandidate for the AI assistant pipeline.
 *
 * These complement Google Shopping (SerpApi) for cases where:
 * - SerpApi key is not configured
 * - We want more targeted marketplace results
 * - We want results that are guaranteed to be affiliatable
 */

import { logger } from '@/lib/logger'
import type { ExternalCandidate, SourceConnector } from '../candidate-resolver'

const log = logger.child({ module: 'marketplace-connector' })

// ── Mercado Livre Connector ─────────────────────────────────────────────────

export const mercadoLivreConnector: SourceConnector = {
  name: 'Mercado Livre',
  slug: 'mercadolivre-search',

  isReady(): boolean {
    // Accept either naming convention for ML credentials
    return !!(process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID)
  },

  async search(query: string, options?: { maxPrice?: number; limit?: number }): Promise<ExternalCandidate[]> {
    if (!this.isReady()) {
      log.debug('ml-connector.not-ready', {
        hint: 'Configure MERCADOLIVRE_APP_ID ou ML_CLIENT_ID + respectivo SECRET',
      })
      return []
    }

    try {
      const { MercadoLivreSourceAdapter } = await import('@/lib/adapters/mercadolivre')
      const adapter = new MercadoLivreSourceAdapter()

      if (!adapter.isConfigured()) {
        log.warn('ml-connector.not-configured', {
          hint: 'APP_ID presente mas SECRET ausente — verifique MERCADOLIVRE_SECRET / ML_CLIENT_SECRET',
        })
        return []
      }

      const results = await adapter.search(query, { limit: options?.limit || 8 })

      log.info('ml-connector.search.ok', { query, results: results.length })

      return results
        .filter(r => r.currentPrice > 0 && (!options?.maxPrice || r.currentPrice <= options.maxPrice))
        .map(r => ({
          rawTitle: r.title,
          externalUrl: r.affiliateUrl || r.productUrl,
          price: r.currentPrice,
          originalPrice: r.originalPrice,
          imageUrl: r.imageUrl,
          sourceDomain: 'mercadolivre.com.br',
          merchant: 'Mercado Livre',
        }))
    } catch (err) {
      log.error('ml-connector.search.failed', { query, error: String(err) })
      return []
    }
  },
}

// ── Shopee Connector ────────────────────────────────────────────────────────

export const shopeeConnector: SourceConnector = {
  name: 'Shopee',
  slug: 'shopee-search',

  isReady(): boolean {
    return !!process.env.SHOPEE_APP_ID || !!process.env.SHOPEE_AFFILIATE_ID
  },

  async search(query: string, options?: { maxPrice?: number; limit?: number }): Promise<ExternalCandidate[]> {
    if (!this.isReady()) return []

    try {
      const { ShopeeSourceAdapter } = await import('@/lib/adapters/shopee')
      const adapter = new ShopeeSourceAdapter()

      const results = await adapter.search(query, { limit: options?.limit || 8 })

      log.info('shopee-connector.search.ok', { query, results: results.length })

      return results
        .filter(r => r.currentPrice > 0 && (!options?.maxPrice || r.currentPrice <= options.maxPrice))
        .map(r => ({
          rawTitle: r.title,
          externalUrl: r.affiliateUrl || r.productUrl,
          price: r.currentPrice,
          originalPrice: r.originalPrice,
          imageUrl: r.imageUrl,
          sourceDomain: 'shopee.com.br',
          merchant: 'Shopee',
        }))
    } catch (err) {
      log.error('shopee-connector.search.failed', { query, error: String(err) })
      return []
    }
  },
}
