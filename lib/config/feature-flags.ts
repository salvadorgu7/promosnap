// Feature flags — driven by environment variables for simplicity.
// Each flag defaults to false unless the corresponding env var is set to "true" or "1".

export interface FeatureFlags {
  /** Enable PromosApp integration (ingestion, scoring, review queue) */
  promosappEnabled: boolean
  /** Enable automatic publication of high-confidence PromosApp items (requires promosappEnabled) */
  promosappAutoPublish: boolean
  /** Enable WhatsApp auto-ingest via Evolution API webhook */
  whatsappAutoIngest: boolean
  /** Enable enhanced scoring with volume/price-history bonus */
  enhancedScoring: boolean
  /** Enable consumer-facing buy signals */
  buySignals: boolean
  /** Enable Shopee CSV-first integration (import via affiliate CSV export) */
  shopeeEnabled: boolean
  /** Enable Mercado Livre search in discovery engine */
  mlSearchEnabled: boolean
}

function envBool(key: string): boolean {
  const val = process.env[key]
  return val === 'true' || val === '1'
}

export function getAllFlags(): FeatureFlags {
  return {
    promosappEnabled: envBool('FF_PROMOSAPP_ENABLED'),
    promosappAutoPublish: envBool('FF_PROMOSAPP_AUTO_PUBLISH'),
    whatsappAutoIngest: envBool('FF_WHATSAPP_AUTO_INGEST'),
    enhancedScoring: envBool('FF_ENHANCED_SCORING'),
    buySignals: envBool('FF_BUY_SIGNALS'),
    shopeeEnabled: envBool('SHOPEE_ENABLED') || !!process.env.SHOPEE_AFFILIATE_ID,
    mlSearchEnabled: envBool('FF_ML_SEARCH_ENABLED'),
  }
}

export function getFlag(flag: keyof FeatureFlags): boolean {
  return getAllFlags()[flag]
}
