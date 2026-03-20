/**
 * Canonical store normalization — single source of truth for marketplace identities.
 *
 * Rules:
 * - Every marketplace maps to ONE canonical slug + display name.
 * - Internal / operational sources are excluded from public-facing counts.
 * - offersCount ≠ storesCount — they are separate concepts.
 */

// ============================================
// CANONICAL MARKETPLACE MAP
// ============================================

export interface CanonicalStore {
  slug: string
  displayName: string
  shortName: string
  logoKey?: string
}

/**
 * All known marketplace aliases → canonical form.
 * If a sourceSlug is not here, it's either unknown or internal.
 */
const ALIAS_MAP: Record<string, string> = {
  // Amazon
  'amazon-br': 'amazon-br',
  'amazon': 'amazon-br',
  'amazon_br': 'amazon-br',
  'amazon-brasil': 'amazon-br',

  // Mercado Livre
  'mercadolivre': 'mercadolivre',
  'mercado-livre': 'mercadolivre',
  'mercado_livre': 'mercadolivre',
  'ml': 'mercadolivre',

  // Shopee
  'shopee': 'shopee',
  'shopee-br': 'shopee',

  // Shein
  'shein': 'shein',
  'shein-br': 'shein',
}

/** Canonical store metadata */
const CANONICAL_STORES: Record<string, CanonicalStore> = {
  'amazon-br': {
    slug: 'amazon-br',
    displayName: 'Amazon Brasil',
    shortName: 'Amazon',
    logoKey: 'amazon',
  },
  'mercadolivre': {
    slug: 'mercadolivre',
    displayName: 'Mercado Livre',
    shortName: 'Mercado Livre',
    logoKey: 'mercadolivre',
  },
  'shopee': {
    slug: 'shopee',
    displayName: 'Shopee',
    shortName: 'Shopee',
    logoKey: 'shopee',
  },
  'shein': {
    slug: 'shein',
    displayName: 'Shein',
    shortName: 'Shein',
    logoKey: 'shein',
  },
}

/**
 * Source slugs that are internal/operational and should NEVER appear
 * in public-facing store counts or UI.
 */
const INTERNAL_SOURCES = new Set([
  'promosapp',
  'unknown',
  'admin',
  'manual-import',
  'internal',
  'feed-placeholder',
  'test',
])

// ============================================
// PUBLIC API
// ============================================

/** Resolve any source slug to its canonical form. Returns null if internal/unknown. */
export function canonicalizeSource(slug: string): string | null {
  const lower = slug.toLowerCase().trim()
  if (INTERNAL_SOURCES.has(lower)) return null
  return ALIAS_MAP[lower] ?? null
}

/** Get canonical store metadata. Returns null if not a public marketplace. */
export function getCanonicalStore(slug: string): CanonicalStore | null {
  const canonical = canonicalizeSource(slug)
  if (!canonical) return null
  return CANONICAL_STORES[canonical] ?? null
}

/** Get the display name for a source slug. Falls back to raw slug if unknown. */
export function getStoreDisplayName(slug: string): string {
  const store = getCanonicalStore(slug)
  return store?.displayName ?? slug
}

/** Check if a source slug represents a public commercial marketplace. */
export function isCommercialSource(slug: string): boolean {
  return canonicalizeSource(slug) !== null
}

/** List all canonical commercial marketplace slugs. */
export function getCommercialSlugs(): string[] {
  return Object.keys(CANONICAL_STORES)
}

/**
 * Count distinct commercial stores from a list of source slugs.
 * Deduplicates aliases and excludes internal sources.
 */
export function countDistinctStores(sourceSlugs: string[]): number {
  const unique = new Set<string>()
  for (const slug of sourceSlugs) {
    const canonical = canonicalizeSource(slug)
    if (canonical) unique.add(canonical)
  }
  return unique.size
}

/**
 * Get distinct store names from a list of source slugs.
 * Returns canonical display names, deduplicated.
 */
export function getDistinctStoreNames(sourceSlugs: string[]): string[] {
  const seen = new Set<string>()
  const names: string[] = []
  for (const slug of sourceSlugs) {
    const store = getCanonicalStore(slug)
    if (store && !seen.has(store.slug)) {
      seen.add(store.slug)
      names.push(store.displayName)
    }
  }
  return names
}
