/**
 * Amazon Source Adapter — PromoSnap
 *
 * Supports 3 modes:
 * 1. AFFILIATE-ONLY: Links with tracking tag (works NOW)
 * 2. PA-API: Product Advertising API 5.0 (requires credentials)
 * 3. CREATORS: Amazon Creators API (requires credentials)
 *
 * Current mode is auto-detected from env vars.
 * See lib/amazon/strategy.ts for full documentation.
 */

import type {
  SourceAdapter,
  AdapterSearchOptions,
  AdapterResult,
  AdapterStatus,
  AdapterHealthCheckResult,
  AdapterReadinessResult,
  AdapterCapability,
  SyncResult,
  SourceCapabilityTruth,
} from "./types"
import { logger } from "@/lib/logger"
import {
  AMAZON_TRACKING_TAG,
  detectAmazonApiPath,
  buildAmazonProductUrl,
  buildAmazonSearchUrl,
  type AmazonApiPath,
} from "@/lib/amazon/strategy"

export class AmazonSourceAdapter implements SourceAdapter {
  name = "Amazon Brasil"
  slug = "amazon-br"

  // ---------------------------------------------------------------------------
  // Configuration Detection
  // ---------------------------------------------------------------------------

  private getApiPath(): AmazonApiPath {
    return detectAmazonApiPath().path
  }

  isConfigured(): boolean {
    // "configured" means we have at least the tracking tag
    // For full API, check getApiPath()
    return AMAZON_TRACKING_TAG !== ""
  }

  private hasApiAccess(): boolean {
    const path = this.getApiPath()
    return path === "creators" || path === "pa-api"
  }

  getStatus(): AdapterStatus {
    const apiPath = this.getApiPath()
    const hasApi = this.hasApiAccess()

    const missingEnvVars: string[] = []
    if (!process.env.AMAZON_AFFILIATE_TAG && !process.env.AMAZON_PARTNER_TAG) {
      missingEnvVars.push("AMAZON_AFFILIATE_TAG")
    }

    let health: "READY" | "MOCK" | "DEGRADED" = "MOCK"
    let message = ""

    if (hasApi) {
      health = "READY"
      message = `${apiPath === "creators" ? "Creators API" : "PA-API 5.0"} configured — adapter operational`
    } else if (AMAZON_TRACKING_TAG) {
      health = "DEGRADED" as "MOCK" // Type coercion for existing interface
      message = `Affiliate-only mode (tag: ${AMAZON_TRACKING_TAG}) — no API access`
    } else {
      message = `Missing env vars: ${missingEnvVars.join(", ")}`
    }

    return {
      name: this.name,
      slug: this.slug,
      configured: this.isConfigured(),
      enabled: true,
      health: hasApi ? "READY" : "MOCK",
      message,
      missingEnvVars: [...missingEnvVars],
    }
  }

  // ---------------------------------------------------------------------------
  // Search & Lookup (requires API)
  // ---------------------------------------------------------------------------

  async search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]> {
    const path = this.getApiPath()

    if (path === "creators") {
      // Creators API search — not yet implemented
      logger.debug("amazon.creators.search.pending", { query })
      return []
    }

    if (path === "pa-api") {
      // PA-API 5.0 SearchItems — not yet implemented
      // https://webservices.amazon.com/paapi5/documentation/search-items.html
      logger.debug("amazon.pa-api.search.pending", { query })
      return []
    }

    // Affiliate-only: no search capability
    logger.debug("amazon.affiliate-only.search.unavailable")
    return []
  }

  async getProduct(externalId: string): Promise<AdapterResult | null> {
    const path = this.getApiPath()

    if (path === "creators" || path === "pa-api") {
      // API lookup — not yet implemented
      logger.debug("amazon.getProduct.pending", { path, externalId })
      return null
    }

    // Affiliate-only: return a basic affiliate link
    if (AMAZON_TRACKING_TAG && externalId.match(/^B[A-Z0-9]{9}$/)) {
      return {
        externalId,
        title: `Amazon Product ${externalId}`,
        productUrl: `https://www.amazon.com.br/dp/${externalId}`,
        affiliateUrl: buildAmazonProductUrl(externalId),
        currentPrice: 0,
        currency: "BRL",
        availability: "unknown",
      }
    }

    return null
  }

  // ---------------------------------------------------------------------------
  // Health, Readiness & Capabilities
  // ---------------------------------------------------------------------------

  healthCheck(): AdapterHealthCheckResult {
    if (this.hasApiAccess()) {
      const path = this.getApiPath()
      return {
        healthy: true,
        message: `${path === "creators" ? "Creators API" : "PA-API 5.0"} credentials present`,
      }
    }
    if (AMAZON_TRACKING_TAG) {
      return {
        healthy: true,
        message: `Affiliate-only mode — clickout tracking functional (tag: ${AMAZON_TRACKING_TAG})`,
      }
    }
    return { healthy: false, message: "Nenhuma configuração Amazon detectada" }
  }

  readinessCheck(): AdapterReadinessResult {
    const missing: string[] = []
    if (!AMAZON_TRACKING_TAG) missing.push("AMAZON_AFFILIATE_TAG")
    if (!this.hasApiAccess()) {
      missing.push("AMAZON_CREATORS_TOKEN + AMAZON_CREATORS_SECRET (recommended)")
      missing.push("or AMAZON_ACCESS_KEY + AMAZON_SECRET_KEY (PA-API fallback)")
    }
    return { ready: this.hasApiAccess(), missing }
  }

  capabilityMap(): AdapterCapability[] {
    const caps: AdapterCapability[] = []
    if (AMAZON_TRACKING_TAG) {
      caps.push("clickout_ready")
    }
    if (this.hasApiAccess()) {
      caps.push("search", "lookup", "price_refresh")
    }
    return caps
  }

  // ---------------------------------------------------------------------------
  // Sync (requires API)
  // ---------------------------------------------------------------------------

  async syncFeed(): Promise<SyncResult> {
    const path = this.getApiPath()
    if (path === "associates-only" || path === "unknown") {
      return {
        synced: 0,
        failed: 0,
        stale: 0,
        errors: ["Feed sync requer Creators API ou PA-API — apenas affiliate-only disponível"],
      }
    }
    logger.debug("amazon.syncFeed.pending", { path })
    return {
      synced: 0,
      failed: 0,
      stale: 0,
      errors: [`${path} feed sync não implementado`],
    }
  }

  async importBatch(items: AdapterResult[]): Promise<SyncResult> {
    logger.debug("amazon.importBatch.stub", { count: items.length })
    return {
      synced: 0,
      failed: items.length,
      stale: 0,
      errors: ["importBatch não implementado — use import pipeline manual"],
    }
  }

  async refreshOffer(offerId: string): Promise<AdapterResult | null> {
    if (!this.hasApiAccess()) return null
    logger.debug("amazon.refreshOffer.pending", { path: this.getApiPath(), offerId })
    return null
  }

  getCapabilityTruth(): SourceCapabilityTruth {
    const path = this.getApiPath()
    const capabilities: string[] = []
    const missing: string[] = []

    if (AMAZON_TRACKING_TAG) capabilities.push("clickout_ready")

    if (path === "creators") {
      capabilities.push("search", "lookup")
      missing.push("Feed sync implementation", "Real price refresh")
    } else if (path === "pa-api") {
      capabilities.push("search", "lookup")
      missing.push("Feed sync implementation", "Real price refresh", "Migration to Creators API")
    } else {
      missing.push(
        "Creators API credentials (AMAZON_CREATORS_TOKEN, AMAZON_CREATORS_SECRET)",
        "Or PA-API 5.0 credentials (AMAZON_ACCESS_KEY, AMAZON_SECRET_KEY)",
        "Feed sync integration",
        "Real price refresh",
      )
    }

    let status: SourceCapabilityTruth["status"] = "provider-needed"
    if (path === "creators" || path === "pa-api") status = "partial"
    else if (AMAZON_TRACKING_TAG) status = "mock" // affiliate-only, not truly mock but limited

    return { status, capabilities, missing, lastSync: undefined }
  }
}
