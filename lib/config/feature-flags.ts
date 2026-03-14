// Feature flags — driven by environment variables for simplicity.
// Each flag defaults to false unless the corresponding env var is set to "true" or "1".

export interface FeatureFlags {
  /** Enable automatic ML discovery and import pipeline */
  autoDiscovery: boolean
  /** Enable price alert email notifications */
  priceAlerts: boolean
  /** Enable trending keywords ingestion from ML */
  trendingKeywords: boolean
  /** Enable real-time price refresh via cron */
  priceRefresh: boolean
  /** Enable Amazon adapter (PA-API 5.0) */
  amazonAdapter: boolean
  /** Enable editorial content engine */
  editorialEngine: boolean
  /** Enable newsletter digest emails */
  newsletterDigest: boolean
  /** Enable search intelligence (zero-result tracking, query normalization) */
  searchIntelligence: boolean
  /** Enable clickout origin tracking */
  originTracking: boolean
  /** Show debug info in API responses */
  debugMode: boolean
}

function envBool(key: string): boolean {
  const val = process.env[key]
  return val === 'true' || val === '1'
}

export function getAllFlags(): FeatureFlags {
  return {
    autoDiscovery: envBool('FF_AUTO_DISCOVERY'),
    priceAlerts: envBool('FF_PRICE_ALERTS'),
    trendingKeywords: envBool('FF_TRENDING_KEYWORDS'),
    priceRefresh: envBool('FF_PRICE_REFRESH'),
    amazonAdapter: envBool('FF_AMAZON_ADAPTER'),
    editorialEngine: envBool('FF_EDITORIAL_ENGINE'),
    newsletterDigest: envBool('FF_NEWSLETTER_DIGEST'),
    searchIntelligence: envBool('FF_SEARCH_INTELLIGENCE'),
    originTracking: envBool('FF_ORIGIN_TRACKING'),
    debugMode: envBool('FF_DEBUG_MODE'),
  }
}

export function getFlag(flag: keyof FeatureFlags): boolean {
  return getAllFlags()[flag]
}
