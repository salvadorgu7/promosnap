// Feature flags — driven by environment variables for simplicity.
// Each flag defaults to false unless the corresponding env var is set to "true" or "1".

export interface FeatureFlags {
  /** Enable price alert email notifications */
  priceAlerts: boolean
  /** Enable trending keywords ingestion from ML */
  trendingKeywords: boolean
  /** Enable real-time price refresh via cron */
  priceRefresh: boolean
  /** Enable Amazon adapter (PA-API 5.0) */
  amazonAdapter: boolean
  /** Enable search intelligence (zero-result tracking, query normalization) */
  searchIntelligence: boolean
  /** Enable clickout origin tracking */
  originTracking: boolean
  /** Show debug info in API responses */
  debugMode: boolean
  /** Enable PromosApp integration (ingestion, scoring, review queue) */
  promosappEnabled: boolean
  /** Enable automatic publication of high-confidence PromosApp items (requires promosappEnabled) */
  promosappAutoPublish: boolean
  /** Enable WhatsApp auto-ingest via Evolution API webhook */
  whatsappAutoIngest: boolean
  /** Enable enhanced scoring with volume/price-history bonus */
  enhancedScoring: boolean
  /** Enable comparison hero on product page */
  comparisonHero: boolean
  /** Enable consumer-facing buy signals */
  buySignals: boolean
  /** Enable Shopee CSV-first integration (import via affiliate CSV export) */
  shopeeEnabled: boolean
}

function envBool(key: string): boolean {
  const val = process.env[key]
  return val === 'true' || val === '1'
}

export function getAllFlags(): FeatureFlags {
  return {
    priceAlerts: envBool('FF_PRICE_ALERTS'),
    trendingKeywords: envBool('FF_TRENDING_KEYWORDS'),
    priceRefresh: envBool('FF_PRICE_REFRESH'),
    amazonAdapter: envBool('FF_AMAZON_ADAPTER'),
    searchIntelligence: envBool('FF_SEARCH_INTELLIGENCE'),
    originTracking: envBool('FF_ORIGIN_TRACKING'),
    debugMode: envBool('FF_DEBUG_MODE'),
    promosappEnabled: envBool('FF_PROMOSAPP_ENABLED'),
    promosappAutoPublish: envBool('FF_PROMOSAPP_AUTO_PUBLISH'),
    whatsappAutoIngest: envBool('FF_WHATSAPP_AUTO_INGEST'),
    enhancedScoring: envBool('FF_ENHANCED_SCORING'),
    comparisonHero: envBool('FF_COMPARISON_HERO'),
    buySignals: envBool('FF_BUY_SIGNALS'),
    shopeeEnabled: envBool('SHOPEE_ENABLED') || !!process.env.SHOPEE_AFFILIATE_ID,
  }
}

export function getFlag(flag: keyof FeatureFlags): boolean {
  return getAllFlags()[flag]
}
