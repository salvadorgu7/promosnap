/**
 * Candidate Resolver — Normalizes and resolves external search results.
 *
 * Takes raw results from web search / external APIs and:
 *   1. Normalizes title, brand, category
 *   2. Attempts to match against local catalog (canonical matching)
 *   3. Assigns confidence level
 *   4. Determines monetization capability
 *   5. Returns enriched candidates ready for decision layer
 *
 * Reuses existing mature infrastructure:
 *   - lib/catalog/normalize.ts (title cleaning, brand extraction, category inference)
 *   - lib/catalog/canonical-match.ts (V19 matching with 6 tiers)
 *   - lib/affiliate/index.ts (affiliate URL building)
 */

import { normalizeTitle, extractBrand, inferCategory } from '@/lib/catalog/normalize'
import { buildAffiliateUrl, hasAffiliateTag } from '@/lib/affiliate'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'candidate-resolver' })

// ── Types ──────────────────────────────────────────────────────────────────

export type ResolutionStatus = 'resolved' | 'partially_resolved' | 'unresolved_raw' | 'rejected_low_quality'

export interface ExternalCandidate {
  /** Raw title from external source */
  rawTitle: string
  /** Source URL */
  externalUrl: string
  /** Price if available */
  price?: number
  /** Original/list price */
  originalPrice?: number
  /** Image URL */
  imageUrl?: string
  /** Source domain/name */
  sourceDomain: string
  /** Merchant/seller name */
  merchant?: string
}

export interface ResolvedCandidate {
  /** Cleaned, normalized title */
  normalizedTitle: string
  /** Detected brand (from title) */
  brand: string | null
  /** Inferred category slug */
  categoryGuess: string | null
  /** Original external URL */
  externalUrl: string
  /** Affiliate URL if monetizable */
  affiliateUrl: string
  /** Price */
  price?: number
  originalPrice?: number
  /** Image */
  imageUrl?: string
  /** Source domain */
  sourceDomain: string
  merchant?: string
  /** Resolution result */
  status: ResolutionStatus
  /** Match confidence 0-1 (0 = no match, 1 = exact catalog match) */
  matchConfidence: number
  /** Can we monetize this? */
  monetization: 'verified' | 'best_effort' | 'none'
  /** If resolved to local product, its slug */
  localProductSlug?: string
  /** Fingerprint for dedup */
  fingerprint: string
}

// ── Known marketplace domains → source slugs ───────────────────────────────

const DOMAIN_TO_SOURCE: Record<string, string> = {
  'amazon.com.br': 'amazon-br',
  'mercadolivre.com.br': 'mercadolivre',
  'produto.mercadolivre.com.br': 'mercadolivre',
  'shopee.com.br': 'shopee',
  'shein.com': 'shein',
  'shein.com.br': 'shein',
  'magazineluiza.com.br': 'magalu',
  'magalu.com': 'magalu',
  'kabum.com.br': 'kabum',
  'casasbahia.com.br': 'casasbahia',
  'americanas.com.br': 'americanas',
  'extra.com.br': 'extra',
  'ponto.com.br': 'ponto',
  'carrefour.com.br': 'carrefour',
}

function detectSourceFromUrl(url: string): string | null {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    for (const [domain, slug] of Object.entries(DOMAIN_TO_SOURCE)) {
      if (hostname.includes(domain)) return slug
    }
  } catch {}
  return null
}

// ── Core Functions ─────────────────────────────────────────────────────────

/**
 * Generate a dedup fingerprint from normalized title + source.
 */
function generateFingerprint(title: string, source: string): string {
  const normalized = title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 50)
  return `${source}:${normalized}`
}

/**
 * Resolve a single external candidate.
 */
export function resolveCandidate(raw: ExternalCandidate): ResolvedCandidate {
  // 1. Normalize title
  const normalizedTitle = normalizeTitle(raw.rawTitle)

  // 2. Extract brand
  const brand = extractBrand(normalizedTitle)

  // 3. Infer category
  const categoryGuess = inferCategory(normalizedTitle)

  // 4. Detect source from URL
  const sourceSlug = detectSourceFromUrl(raw.externalUrl)

  // 5. Try to build affiliate URL
  let affiliateUrl = raw.externalUrl
  let monetization: ResolvedCandidate['monetization'] = 'none'

  if (sourceSlug) {
    const built = buildAffiliateUrl(raw.externalUrl)
    if (built !== raw.externalUrl && hasAffiliateTag(built)) {
      affiliateUrl = built
      monetization = 'verified'
    } else {
      // Known source but no env var configured → best effort
      monetization = 'best_effort'
    }
  }

  // 6. Assess quality / confidence
  let matchConfidence = 0
  let status: ResolutionStatus = 'unresolved_raw'

  // Has brand + category = partially resolved
  if (brand && categoryGuess) {
    matchConfidence = 0.5
    status = 'partially_resolved'
  } else if (brand || categoryGuess) {
    matchConfidence = 0.3
    status = 'partially_resolved'
  }

  // Known marketplace = higher confidence
  if (sourceSlug) {
    matchConfidence = Math.min(matchConfidence + 0.2, 0.9)
  }

  // Has price = slightly more confidence
  if (raw.price && raw.price > 0) {
    matchConfidence = Math.min(matchConfidence + 0.1, 0.9)
  }

  // Quality check — reject garbage
  if (normalizedTitle.length < 5 || (!raw.price && !raw.imageUrl)) {
    status = 'rejected_low_quality'
    matchConfidence = 0
  }

  const fingerprint = generateFingerprint(normalizedTitle, raw.sourceDomain)

  return {
    normalizedTitle,
    brand,
    categoryGuess,
    externalUrl: raw.externalUrl,
    affiliateUrl,
    price: raw.price,
    originalPrice: raw.originalPrice,
    imageUrl: raw.imageUrl,
    sourceDomain: raw.sourceDomain,
    merchant: raw.merchant,
    status,
    matchConfidence,
    monetization,
    fingerprint,
  }
}

/**
 * Resolve and deduplicate a batch of external candidates.
 */
export function resolveCandidates(raws: ExternalCandidate[]): ResolvedCandidate[] {
  const seen = new Set<string>()
  const results: ResolvedCandidate[] = []

  for (const raw of raws) {
    const resolved = resolveCandidate(raw)

    // Skip rejected
    if (resolved.status === 'rejected_low_quality') continue

    // Dedup by fingerprint
    if (seen.has(resolved.fingerprint)) continue
    seen.add(resolved.fingerprint)

    results.push(resolved)
  }

  // Sort: resolved first, then by confidence
  results.sort((a, b) => {
    const statusOrder: Record<ResolutionStatus, number> = {
      resolved: 0,
      partially_resolved: 1,
      unresolved_raw: 2,
      rejected_low_quality: 3,
    }
    const diff = statusOrder[a.status] - statusOrder[b.status]
    if (diff !== 0) return diff
    return b.matchConfidence - a.matchConfidence
  })

  return results
}

/**
 * Convert a ResolvedCandidate to the AssistantProduct format.
 */
export function candidateToAssistantProduct(candidate: ResolvedCandidate): {
  name: string
  price?: number
  originalPrice?: number
  source: string
  url: string
  affiliateUrl: string
  imageUrl?: string
  isFromCatalog: boolean
  confidence: 'verified' | 'resolved' | 'raw'
  monetization: 'verified' | 'best_effort' | 'none'
} {
  // If no affiliate URL was resolved, generate ML search link as fallback
  // This ensures every product can monetize through ML affiliate search
  let affiliateUrl = candidate.affiliateUrl
  let monetization = candidate.monetization
  if (monetization === 'none' || affiliateUrl === candidate.externalUrl) {
    affiliateUrl = generateMLSearchAffiliateUrl(candidate.normalizedTitle)
    monetization = 'best_effort'
  }

  return {
    name: candidate.normalizedTitle,
    price: candidate.price,
    originalPrice: candidate.originalPrice,
    source: candidate.merchant || candidate.sourceDomain,
    url: candidate.externalUrl,
    affiliateUrl,
    imageUrl: candidate.imageUrl,
    isFromCatalog: false,
    confidence: candidate.status === 'resolved' ? 'resolved'
      : candidate.status === 'partially_resolved' ? 'resolved'
      : 'raw',
    monetization,
  }
}

// ── Source Connector Interface (for future federation) ──────────────────────

export interface SourceConnector {
  name: string
  slug: string
  /** Search products on this source */
  search(query: string, options?: { maxPrice?: number; limit?: number }): Promise<ExternalCandidate[]>
  /** Is this connector configured and ready? */
  isReady(): boolean
}

/**
 * Registry for future federated search connectors.
 * Google Shopping, Amazon API, etc. will plug in here.
 */
export class ConnectorRegistry {
  private connectors = new Map<string, SourceConnector>()

  register(connector: SourceConnector) {
    this.connectors.set(connector.slug, connector)
  }

  get(slug: string): SourceConnector | undefined {
    return this.connectors.get(slug)
  }

  getReady(): SourceConnector[] {
    return Array.from(this.connectors.values()).filter(c => c.isReady())
  }

  async federatedSearch(
    query: string,
    options?: { maxPrice?: number; limit?: number }
  ): Promise<ExternalCandidate[]> {
    const ready = this.getReady()
    if (ready.length === 0) return []

    const results = await Promise.allSettled(
      ready.map(c => c.search(query, options))
    )

    return results
      .filter((r): r is PromiseFulfilledResult<ExternalCandidate[]> => r.status === 'fulfilled')
      .flatMap(r => r.value)
  }
}

// ── Fallback Affiliate Link Generator ──────────────────────────────────────

/**
 * Generate a Mercado Livre search link with affiliate tag for any product name.
 * Used as fallback when we don't have a direct product URL.
 * This ensures every product card can monetize, even external results.
 */
export function generateMLSearchAffiliateUrl(productName: string): string {
  const mlAffiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID
  const query = encodeURIComponent(productName.slice(0, 100))
  const baseUrl = `https://lista.mercadolivre.com.br/${query}`
  if (mlAffiliateId) {
    return `${baseUrl}#matt_tool=${mlAffiliateId}`
  }
  return baseUrl
}

/** Global connector registry */
export const connectorRegistry = new ConnectorRegistry()

// ── Auto-register available connectors ─────────────────────────────────────
// Connectors self-check isReady() — no error if env var is missing

import { serpApiShoppingConnector } from './connectors/serpapi-shopping'
import { mercadoLivreConnector, shopeeConnector, magaluConnector } from './connectors/marketplace-search'

connectorRegistry.register(serpApiShoppingConnector)
connectorRegistry.register(mercadoLivreConnector)
connectorRegistry.register(shopeeConnector)
connectorRegistry.register(magaluConnector)
