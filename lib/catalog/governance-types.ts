// ============================================
// CATALOG GOVERNANCE — types
// ============================================

export type CatalogState =
  | "healthy"
  | "incomplete"
  | "stale"
  | "orphan"
  | "weak-canonical";

export interface CatalogHealthReport {
  total: number;
  healthy: number;
  incomplete: number;
  stale: number;
  orphan: number;
  weakCanonical: number;
  generatedAt: Date;
}

export interface GovernanceIssue {
  productId: string | null;
  productName: string;
  listingId?: string;
  state: CatalogState;
  details: string;
}

export interface GovernanceRecommendation {
  productId: string | null;
  productName: string;
  issue: string;
  action: string;
  priority: "high" | "medium" | "low";
}
