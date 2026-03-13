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
}
