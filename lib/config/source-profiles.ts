/**
 * Shared source profiles — single source of truth for affiliate commission rates,
 * average ticket values, and estimated conversion rates per retailer.
 *
 * Used by: revenue/tracker.ts, demand/clickout-intelligence.ts, and any future
 * revenue estimation code.
 */

export interface SourceProfile {
  /** Human-readable retailer name */
  name: string;
  /** Average order value in BRL */
  avgTicket: number;
  /** Affiliate commission rate (0–1) */
  commissionRate: number;
  /** Estimated clickout → purchase conversion rate (0–1) */
  conversionRate: number;
}

export const SOURCE_PROFILES: Record<string, SourceProfile> = {
  "amazon-br": {
    name: "Amazon BR",
    avgTicket: 180,
    commissionRate: 0.04,
    conversionRate: 0.08,
  },
  mercadolivre: {
    name: "Mercado Livre",
    avgTicket: 150,
    commissionRate: 0.03,
    conversionRate: 0.06,
  },
  shopee: {
    name: "Shopee",
    avgTicket: 80,
    commissionRate: 0.025,
    conversionRate: 0.05,
  },
  magazineluiza: {
    name: "Magazine Luiza",
    avgTicket: 120,
    commissionRate: 0.03,
    conversionRate: 0.05,
  },
};

export const DEFAULT_PROFILE: SourceProfile = {
  name: "Unknown",
  avgTicket: 120,
  commissionRate: 0.03,
  conversionRate: 0.06,
};

/** Get profile for a source slug, falling back to default. */
export function getSourceProfile(slug: string): SourceProfile {
  return SOURCE_PROFILES[slug] || DEFAULT_PROFILE;
}

/** Weighted average ticket across all sources. */
export function getWeightedAvgTicket(): number {
  const profiles = Object.values(SOURCE_PROFILES);
  return profiles.reduce((sum, p) => sum + p.avgTicket, 0) / profiles.length;
}

/** Weighted average commission across all sources. */
export function getWeightedAvgCommission(): number {
  const profiles = Object.values(SOURCE_PROFILES);
  return profiles.reduce((sum, p) => sum + p.commissionRate, 0) / profiles.length;
}
