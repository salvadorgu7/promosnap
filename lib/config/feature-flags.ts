// Feature flags — driven by environment variables for simplicity.
// Each flag defaults to false unless the corresponding env var is set to "true" or "1".
// Supports percentage-based rollout: FF_X=50 means 50% of requests get the feature.

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
  /** Enable Shopee integration (CSV import + API when credentials available) */
  shopeeEnabled: boolean
  /** Shopee Affiliate API is configured (SHOPEE_APP_ID + SHOPEE_APP_SECRET) */
  shopeeApiReady: boolean
  /** Enable Mercado Livre search in discovery engine */
  mlSearchEnabled: boolean
  /** Enable Busca Ampliada — expanded search with external connectors */
  expandedSearch: boolean
}

function envBool(key: string): boolean {
  const val = process.env[key]
  return val === 'true' || val === '1'
}

/**
 * Percentage-based rollout check.
 * Accepts: "true"/"1" (100%), "false"/"0"/undefined (0%), or "10"-"99" (percentage).
 * Uses minute-of-hour as bucket for consistent behavior within each minute.
 */
function envRollout(key: string): boolean {
  const val = process.env[key]
  if (!val) return false
  if (val === 'true' || val === '1') return true
  if (val === 'false' || val === '0') return false

  const pct = parseInt(val, 10)
  if (isNaN(pct) || pct <= 0) return false
  if (pct >= 100) return true

  // Deterministic per-minute bucket (consistent within each minute, varies across minutes)
  const bucket = new Date().getMinutes() % 100
  return bucket < pct
}

export function getAllFlags(): FeatureFlags {
  return {
    promosappEnabled: envBool('FF_PROMOSAPP_ENABLED'),
    promosappAutoPublish: envBool('FF_PROMOSAPP_AUTO_PUBLISH'),
    whatsappAutoIngest: envBool('FF_WHATSAPP_AUTO_INGEST'),
    enhancedScoring: envBool('FF_ENHANCED_SCORING'),
    buySignals: envBool('FF_BUY_SIGNALS'),
    shopeeEnabled: envBool('SHOPEE_ENABLED') || !!process.env.SHOPEE_AFFILIATE_ID,
    shopeeApiReady: !!process.env.SHOPEE_APP_ID && !!process.env.SHOPEE_APP_SECRET,
    mlSearchEnabled: envBool('FF_ML_SEARCH_ENABLED'),
    expandedSearch: envRollout('FF_EXPANDED_SEARCH'),
  }
}

export function getFlag(flag: keyof FeatureFlags): boolean {
  return getAllFlags()[flag]
}

/**
 * Get the raw rollout percentage for a flag.
 * Returns 0 (off), 100 (on), or the percentage value.
 */
export function getRolloutPercentage(key: string): number {
  const val = process.env[key]
  if (!val || val === 'false' || val === '0') return 0
  if (val === 'true' || val === '1') return 100
  const pct = parseInt(val, 10)
  if (isNaN(pct)) return 0
  return Math.max(0, Math.min(100, pct))
}
