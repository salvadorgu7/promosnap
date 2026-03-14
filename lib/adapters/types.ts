// Unified Source Adapter Interface
// Provides a standardized contract for all marketplace adapters.

import type { HealthStatus } from '@/types'

// ---------------------------------------------------------------------------
// Search & Result Types
// ---------------------------------------------------------------------------

export interface AdapterSearchOptions {
  page?: number
  limit?: number
  category?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'popularity'
}

export interface AdapterResult {
  externalId: string
  title: string
  description?: string
  brand?: string
  category?: string
  imageUrl?: string
  images?: string[]
  productUrl: string
  affiliateUrl?: string
  currentPrice: number
  originalPrice?: number
  currency: string
  availability: 'in_stock' | 'out_of_stock' | 'pre_order' | 'unknown'
  rating?: number
  reviewsCount?: number
  salesCount?: number
  seller?: { name: string; rating?: number }
  coupon?: string
  shippingPrice?: number
  isFreeShipping?: boolean
  installment?: string
  specs?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Adapter Status
// ---------------------------------------------------------------------------

export interface AdapterStatus {
  /** Adapter name */
  name: string
  /** Adapter slug identifier */
  slug: string
  /** Whether all required env vars are set */
  configured: boolean
  /** Whether the adapter is currently enabled */
  enabled: boolean
  /** Health status from last check */
  health: HealthStatus
  /** Human-readable status message */
  message: string
  /** List of missing env vars (if not configured) */
  missingEnvVars: string[]
  /** Latency from last health check in ms */
  latencyMs?: number
  /** Last successful check timestamp */
  lastCheckedAt?: Date
}

// ---------------------------------------------------------------------------
// Source Adapter Interface
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Health Check & Readiness Types
// ---------------------------------------------------------------------------

export interface AdapterHealthCheckResult {
  healthy: boolean
  message: string
}

export interface AdapterReadinessResult {
  ready: boolean
  missing: string[]
}

export type AdapterCapability =
  | 'search'
  | 'lookup'
  | 'feed_sync'
  | 'clickout_ready'
  | 'price_refresh'
  | 'import_ready'

// ---------------------------------------------------------------------------
// Sync Types (V22)
// ---------------------------------------------------------------------------

export interface SyncResult {
  synced: number
  failed: number
  stale: number
  errors: string[]
}

export type CapabilityTruthStatus =
  | 'mock'
  | 'partial'
  | 'feed-ready'
  | 'sync-ready'
  | 'blocked'
  | 'provider-needed'

export interface SourceCapabilityTruth {
  status: CapabilityTruthStatus
  capabilities: string[]
  missing: string[]
  lastSync?: Date
}

// ---------------------------------------------------------------------------
// Discovery Types
// ---------------------------------------------------------------------------

export interface DiscoveredProduct {
  externalId: string
  title: string
  brand?: string
  category?: string
  imageUrl?: string
  currentPrice?: number
  originalPrice?: number
  productUrl: string
  sourceSlug: string
  discoveredAt: Date
}

// ---------------------------------------------------------------------------
// Source Quality Metrics
// ---------------------------------------------------------------------------

export interface SourceQualityMetrics {
  /** 0-1 score indicating how fresh/recent the data is */
  freshness: number
  /** 0-1 score indicating price accuracy vs marketplace */
  priceAccuracy: number
  /** 0-1 score indicating product availability accuracy */
  availability: number
  /** 0-1 score indicating completeness of product data (images, specs, etc.) */
  dataCompleteness: number
}

// ---------------------------------------------------------------------------
// Source Adapter Interface
// ---------------------------------------------------------------------------

export interface SourceAdapter {
  /** Display name (e.g. "Amazon Brasil") */
  name: string
  /** URL-safe slug (e.g. "amazon-br") */
  slug: string

  /**
   * Search for products by query.
   * Returns mock data if not fully configured.
   */
  search(query: string, options?: AdapterSearchOptions): Promise<AdapterResult[]>

  /**
   * Fetch a single product by its external marketplace ID.
   */
  getProduct(externalId: string): Promise<AdapterResult | null>

  /**
   * Whether all required API keys/credentials are present in env.
   */
  isConfigured(): boolean

  /**
   * Returns current adapter status (configured, enabled, health, missing vars).
   */
  getStatus(): AdapterStatus

  /**
   * Quick health check — verifies adapter is functional.
   * Optional for backward compatibility.
   */
  healthCheck?(): AdapterHealthCheckResult

  /**
   * Readiness check — verifies all requirements are met for production use.
   * Optional for backward compatibility.
   */
  readinessCheck?(): AdapterReadinessResult

  /**
   * Returns which capabilities this adapter supports.
   * Optional for backward compatibility.
   */
  capabilityMap?(): AdapterCapability[]

  /**
   * Sync a full feed from this source.
   * Optional — only for adapters with feed sync support.
   */
  syncFeed?(): Promise<SyncResult>

  /**
   * Import a batch of items into candidates.
   * Optional — only for adapters with batch import support.
   */
  importBatch?(items: AdapterResult[]): Promise<SyncResult>

  /**
   * Refresh a single offer by its external ID.
   * Optional — only for adapters with offer refresh support.
   */
  refreshOffer?(offerId: string): Promise<AdapterResult | null>

  /**
   * Returns the ground-truth capability status for this adapter.
   * Indicates whether the adapter is mock, partially configured, or truly ready.
   * Optional for backward compatibility.
   */
  getCapabilityTruth?(): SourceCapabilityTruth

  /**
   * Returns quality metrics for this source's data.
   * Optional — used for monitoring data quality across adapters.
   */
  getQualityMetrics?(): Promise<SourceQualityMetrics>

  /**
   * Discover trending/highlighted products from this source.
   * Optional — only for adapters that support discovery pipelines.
   */
  discover?(options?: { limit?: number; category?: string }): Promise<DiscoveredProduct[]>

  /**
   * Hydrate a discovered product with full details (price, availability, specs).
   * Optional — only for adapters that support two-phase discovery.
   */
  hydrateProduct?(product: DiscoveredProduct): Promise<AdapterResult | null>
}
