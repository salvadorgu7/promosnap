import { BaseAdapter } from '../shared/base'
import type { RawListing, SearchOptions, FetchOffersParams, HealthCheckResult } from '@/types'

/**
 * Shopee adapter — CSV-first mode.
 *
 * Products enter PromoSnap via Shopee affiliate CSV exports, processed through
 * the import pipeline (`lib/import/shopee-csv-normalizer.ts`).
 *
 * Direct API access is not available (Shopee does not expose a public Product API).
 * This adapter handles affiliate URL building and is ready for future API integration.
 *
 * Mode control via env:
 *   SHOPEE_ENABLED=true   — Activate adapter in registry (enables search/fetchOffers hooks)
 *   SHOPEE_AFFILIATE_ID   — Your Shopee affiliate ID (af_id param)
 */
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
  // Not available via direct API — Shopee products enter via CSV import.
  // These return empty arrays to satisfy the interface contract.

  async searchProducts(_query: string, _options?: SearchOptions): Promise<RawListing[]> {
    return []
  }

  async fetchProductById(_externalId: string): Promise<RawListing | null> {
    return null
  }

  async fetchOffers(_params?: FetchOffersParams): Promise<RawListing[]> {
    return []
  }

  // ── Affiliate URL builder ──────────────────────────────────────────────────

  /**
   * Build a Shopee affiliate URL.
   *
   * Strategy:
   * 1. If `SHOPEE_AFFILIATE_ID` is set, append `af_id` to the URL.
   *    Works on both canonical URLs (shopee.com.br/product/...) and
   *    short redirect URLs (shope.ee/...).
   * 2. If no affiliate ID configured, return the original URL as-is
   *    (the clickout route will try to inject af_id at redirect time).
   */
  buildAffiliateUrl(productUrl: string): string {
    if (!productUrl || !productUrl.startsWith('http')) return productUrl
    if (!this.affiliateId) return productUrl

    try {
      const url = new URL(productUrl)
      url.searchParams.set('af_id', this.affiliateId)
      return url.toString()
    } catch {
      // URL parsing failed — append as query string
      const sep = productUrl.includes('?') ? '&' : '?'
      return `${productUrl}${sep}af_id=${encodeURIComponent(this.affiliateId)}`
    }
  }

  // ── Health check ───────────────────────────────────────────────────────────

  async healthCheck(): Promise<HealthCheckResult> {
    const hasAffiliateId = !!this.affiliateId

    if (!this.isEnabled) {
      return {
        status: 'BLOCKED',
        latencyMs: 0,
        message: 'Shopee adapter disabled. Set SHOPEE_ENABLED=true to activate.',
      }
    }

    return {
      status: 'READY',
      latencyMs: 0,
      message: hasAffiliateId
        ? `CSV-first mode active. Affiliate ID configured (${this.affiliateId.slice(0, 4)}***).`
        : 'CSV-first mode active. No affiliate ID — set SHOPEE_AFFILIATE_ID for monetisation.',
    }
  }
}
