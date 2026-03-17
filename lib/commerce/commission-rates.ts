// ============================================================================
// Commission Rates — single source of truth for affiliate commission estimates
// ============================================================================
// These are estimated commission rates as a % of product price.
// Used to calculate estimated revenue from clickouts.
// Overridable via REVENUE_RATES env var (JSON object).

const DEFAULT_COMMISSION_RATES: Record<string, number> = {
  "amazon-br": 0.04,    // ~4% average across categories
  mercadolivre: 0.03,   // ~3% affiliate program
  shopee: 0.025,        // ~2.5% affiliate program
  shein: 0.03,          // ~3% affiliate program
  magazineluiza: 0.03,  // ~3% affiliate program
  americanas: 0.03,     // ~3% affiliate program
}

const DEFAULT_RATE = 0.03

/** Merged rates: defaults + env overrides */
export const COMMISSION_RATES: Record<string, number> = (() => {
  try {
    const envRates = process.env.REVENUE_RATES
    return envRates
      ? { ...DEFAULT_COMMISSION_RATES, ...JSON.parse(envRates) }
      : DEFAULT_COMMISSION_RATES
  } catch {
    return DEFAULT_COMMISSION_RATES
  }
})()

/** Get commission rate for a source slug */
export function getCommissionRate(sourceSlug: string | null): number {
  if (!sourceSlug) return DEFAULT_RATE
  return COMMISSION_RATES[sourceSlug] ?? DEFAULT_RATE
}

/** Estimate revenue from clickouts: clickouts × avgPrice × commissionRate */
export function estimateRevenue(
  rows: { sourceSlug: string | null; clickouts: number | bigint; avgPrice: number | null }[]
): number {
  return rows.reduce(
    (sum, r) => sum + Number(r.clickouts) * (r.avgPrice ?? 0) * getCommissionRate(r.sourceSlug),
    0
  )
}
