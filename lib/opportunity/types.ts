// ============================================
// Opportunity Engine — Types
// ============================================

export const OPPORTUNITY_TYPES = [
  "catalog-weak",
  "high-potential-product",
  "category-gap",
  "low-monetization-page",
  "low-trust-relevant",
  "highlight-candidate",
  "content-missing",
  "distribution-recommended",
  "campaign-recommended",
  "needs-review",
] as const;

export type OpportunityType = (typeof OPPORTUNITY_TYPES)[number];

export type OpportunityPriority = "critical" | "high" | "medium" | "low";

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;
  priority: OpportunityPriority;
  impactScore: number;   // 0-100
  effortScore: number;   // 0-100
  confidenceScore: number; // 0-100
  recommendedAction: string;
  adminUrl?: string;
  /** Contextual metadata for rendering */
  meta?: Record<string, unknown>;
}

export interface OpportunitySummary {
  total: number;
  byCritical: number;
  byHigh: number;
  byMedium: number;
  byLow: number;
  topTypes: { type: OpportunityType; count: number }[];
  averageImpact: number;
}
