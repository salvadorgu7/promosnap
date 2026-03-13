// Mercado Livre Source Adapter (STUB)
// Ready for real ML API integration — uses existing ML OAuth if available.

import type { SourceAdapter, AdapterSearchOptions, AdapterResult, AdapterStatus, AdapterHealthCheckResult, AdapterReadinessResult, AdapterCapability } from './types'

const REQUIRED_ENV_VARS = ['ML_CLIENT_ID', 'ML_CLIENT_SECRET'] as const

export class MercadoLivreSourceAdapter implements SourceAdapter {
  name = 'Mercado Livre'
  slug = 'mercadolivre'

  isConfigured(): boolean {
    return REQUIRED_ENV_VARS.every((key) => !!process.env[key])
  }

  getStatus(): AdapterStatus {
    const missingEnvVars = REQUIRED_ENV_VARS.filter((key) => !process.env[key])

    // Check if ML OAuth token exists (from existing ml-auth.ts)
    const hasOAuth = !!process.env.ML_CLIENT_ID && !!process.env.ML_CLIENT_SECRET
    const hasRedirect = !!process.env.ML_REDIRECT_URI

    let message = ''
    if (this.isConfigured() && hasRedirect) {
      message = 'ML API credentials configured with OAuth redirect'
    } else if (this.isConfigured()) {
      message = 'ML API credentials configured (OAuth redirect not set)'
    } else {
      message = `Missing env vars: ${missingEnvVars.join(', ')}`
    }

    return {
      name: this.name,
      slug: this.slug,
      configured: this.isConfigured(),
      enabled: true,
      health: this.isConfigured() ? 'READY' : 'MOCK',
      message,
      missingEnvVars: [...missingEnvVars],
    }
  }

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    if (!this.isConfigured()) {
      console.log(`[SourceAdapter:${this.slug}] Not configured — returning mock data for "${query}"`)
      return this.getMockResults(query, options?.limit)
    }

    // TODO: Implement ML API search
    // Uses existing getMLToken() from @/lib/ml-auth for authenticated requests
    //
    // const token = await getMLToken()
    // const url = new URL('https://api.mercadolibre.com/sites/MLB/search')
    // url.searchParams.set('q', query)
    // url.searchParams.set('limit', String(options?.limit ?? 10))
    // if (options?.category) url.searchParams.set('category', options.category)
    //
    // const res = await fetch(url.toString(), {
    //   headers: { Authorization: `Bearer ${token}` },
    // })

    console.log(`[SourceAdapter:${this.slug}] search("${query}") — ML API integration pending`)
    return this.getMockResults(query, options?.limit)
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    if (!this.isConfigured()) {
      console.log(`[SourceAdapter:${this.slug}] Not configured — returning mock for ${externalId}`)
      return this.getMockProduct(externalId)
    }

    // TODO: Implement ML API: GET /items/{id}
    // const token = await getMLToken()
    // const res = await fetch(`https://api.mercadolibre.com/items/${externalId}`, {
    //   headers: { Authorization: `Bearer ${token}` },
    // })

    console.log(`[SourceAdapter:${this.slug}] getProduct(${externalId}) — ML API integration pending`)
    return this.getMockProduct(externalId)
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (this.isConfigured()) {
      const hasRedirect = !!process.env.ML_REDIRECT_URI
      return {
        healthy: true,
        message: hasRedirect
          ? 'ML API com OAuth redirect configurado'
          : 'ML API credentials presentes (sem redirect URI)',
      }
    }
    return { healthy: false, message: 'ML_CLIENT_ID / ML_CLIENT_SECRET ausentes — usando dados mock' }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]) as unknown as string[]
    if (!process.env.ML_REDIRECT_URI) missing.push('ML_REDIRECT_URI (recomendado)')
    return { ready: REQUIRED_ENV_VARS.every((k) => !!process.env[k]), missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = ['search', 'lookup']
    if (this.isConfigured()) {
      caps.push('clickout_ready', 'price_refresh', 'import_ready')
    }
    return caps
  }

  // ---------------------------------------------------------------------------
  // Mock data
  // ---------------------------------------------------------------------------

  private getMockResults(query: string, limit = 5): AdapterResult[] {
    return Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      externalId: `MLB-MOCK-${1000 + i}`,
      title: `[Mock] ${query} — Produto ML ${i + 1}`,
      productUrl: `https://www.mercadolivre.com.br/produto-mock-${i + 1}/p/MLB-MOCK-${1000 + i}`,
      affiliateUrl: undefined,
      currentPrice: 79.9 + i * 25,
      originalPrice: 119.9 + i * 25,
      currency: 'BRL',
      availability: 'in_stock' as const,
      imageUrl: undefined,
      isFreeShipping: i < 3,
      installment: `12x R$ ${((79.9 + i * 25) / 12).toFixed(2)}`,
    }))
  }

  private getMockProduct(externalId: string): AdapterResult {
    return {
      externalId,
      title: `[Mock] Produto Mercado Livre ${externalId}`,
      productUrl: `https://www.mercadolivre.com.br/produto-mock/p/${externalId}`,
      currentPrice: 89.9,
      originalPrice: 139.9,
      currency: 'BRL',
      availability: 'in_stock',
      isFreeShipping: true,
      installment: '12x R$ 7.49',
    }
  }
}
