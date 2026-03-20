import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'
import { ShopeeSourceAdapter } from '@/lib/adapters/shopee'

/**
 * Shopee adapter — delegates to ShopeeSourceAdapter for API capabilities.
 *
 * This adapter bridges the MarketplaceAdapter interface (used by adapters/shared/registry)
 * with the full SourceAdapter implementation in lib/adapters/shopee.ts.
 *
 * Mode control via env:
 *   SHOPEE_ENABLED=true       — Activate adapter in registry
 *   SHOPEE_AFFILIATE_ID       — Your Shopee affiliate ID (af_id param)
 *   SHOPEE_APP_ID             — Shopee Open Platform App ID (for affiliate API)
 *   SHOPEE_APP_SECRET         — Shopee Open Platform App Secret (for HMAC signing)
 */

const sourceAdapter = new ShopeeSourceAdapter()

export class ShopeeAdapter extends BaseAdapter {
  name = 'Shopee'
  slug = 'shopee'

  /** Enabled when SHOPEE_ENABLED=true or when an affiliate ID is configured */
  get isEnabled(): boolean {
    return process.env.SHOPEE_ENABLED === 'true' || !!process.env.SHOPEE_AFFILIATE_ID
  }

  private get affiliateId(): string {
    return process.env.SHOPEE_AFFILIATE_ID || ''
  }

  // ── Search / Fetch ─────────────────────────────────────────────────────────
  // Delegates to ShopeeSourceAdapter which supports affiliate API + public fallback.

  async searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]> {
    const results = await sourceAdapter.search(query, { limit: options?.limit })
    return results.map((r) => ({
      externalId: r.externalId,
      sourceSlug: 'shopee',
      title: r.title,
      imageUrl: r.imageUrl,
      productUrl: r.productUrl,
      currentPrice: r.currentPrice,
      originalPrice: r.originalPrice,
      currency: r.currency || 'BRL',
      availability: r.availability,
      isFreeShipping: r.isFreeShipping,
    }))
  }

  async fetchProductById(externalId: string): Promise<RawListing | null> {
    const result = await sourceAdapter.getProduct(externalId)
    if (!result) return null
    return {
      externalId: result.externalId,
      sourceSlug: 'shopee',
      title: result.title,
      imageUrl: result.imageUrl,
      productUrl: result.productUrl,
      currentPrice: result.currentPrice,
      originalPrice: result.originalPrice,
      currency: result.currency || 'BRL',
      availability: result.availability,
      isFreeShipping: result.isFreeShipping,
    }
  }

  async fetchOffers(_params?: FetchOffersParams): Promise<RawListing[]> {
    return []
  }

  // ── Affiliate URL builder ──────────────────────────────────────────────────

  /**
   * Build a Shopee affiliate URL.
   *
   * Supports canonical URLs (shopee.com.br/product/...) and
   * short redirect URLs (s.shopee.com.br, shope.ee).
   */
  buildAffiliateUrl(productUrl: string): string {
    if (!productUrl || !productUrl.startsWith('http')) return productUrl
    if (!this.affiliateId) return productUrl

    try {
      const url = new URL(productUrl)
      url.searchParams.set('af_id', this.affiliateId)
      return url.toString()
    } catch {
      const sep = productUrl.includes('?') ? '&' : '?'
      return `${productUrl}${sep}af_id=${encodeURIComponent(this.affiliateId)}`
    }
  }

  // ── Health check ───────────────────────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.isEnabled) {
      return {
        status: 'BLOCKED',
        latencyMs: 0,
        message: 'Shopee adapter disabled. Set SHOPEE_ENABLED=true to activate.',
      }
    }

    const apiConfigured = sourceAdapter.isConfigured()
    const hasAffiliateId = !!this.affiliateId

    return {
      status: 'READY',
      latencyMs: 0,
      message: apiConfigured
        ? `Affiliate API configured. af_id=${hasAffiliateId ? this.affiliateId.slice(0, 4) + '***' : 'not set'}.`
        : hasAffiliateId
          ? `CSV-first mode. Affiliate ID configured (${this.affiliateId.slice(0, 4)}***). Set SHOPEE_APP_ID + SHOPEE_APP_SECRET for API search.`
          : 'CSV-first mode active. No affiliate ID — set SHOPEE_AFFILIATE_ID for monetisation.',
    }
  }
}
