import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'
import { buildAffiliateUrl } from '@/lib/affiliate'

/**
 * Mercado Livre adapter — bridge para o registry legado.
 * A implementacao real vive em lib/adapters/mercadolivre.ts (SourceAdapter).
 * Este wrapper existe apenas para manter compatibilidade com adapters/shared/registry.
 */
export class MercadoLivreAdapter extends BaseAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'
  isEnabled = !!(process.env.MERCADOLIVRE_APP_ID || process.env.ML_CLIENT_ID)

  async searchProducts(_query: string, _options?: SearchOptions): Promise<RawListing[]> {
    // Delegate to the real adapter via admin pipeline
    return []
  }

  async fetchProductById(_externalId: string): Promise<RawListing | null> {
    return null
  }

  async fetchOffers(_params?: FetchOffersParams): Promise<RawListing[]> {
    return []
  }

  buildAffiliateUrl(productUrl: string): string {
    return buildAffiliateUrl(productUrl)
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (this.isEnabled) {
      return { status: 'READY', latencyMs: 0, message: 'ML configurado — use SourceAdapter para operacoes reais' }
    }
    return { status: 'BLOCKED', latencyMs: 0, message: 'ML_CLIENT_ID / MERCADOLIVRE_APP_ID ausente' }
  }
}
