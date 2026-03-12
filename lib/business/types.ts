// ============================================
// Business OS Types
// ============================================

export type MetricStatus = "good" | "warning" | "critical";

export interface MetricResult {
  value: number;
  label: string;
  format?: "number" | "currency" | "percent" | "decimal";
  trend7d: number;   // percentage change vs prior 7d
  trend30d: number;  // percentage change vs prior 30d
  status: MetricStatus;
}

export interface ScorecardItem {
  key: string;
  label: string;
  value: number;
  format?: "number" | "currency" | "percent" | "decimal";
  trend7d: number;
  trend30d: number;
  status: MetricStatus;
  description?: string;
}

export interface Scorecard {
  title: string;
  slug: string;
  items: ScorecardItem[];
  overallStatus: MetricStatus;
}

export interface BusinessMetrics {
  northStar: MetricResult;
  acquisition: MetricResult[];
  engagement: MetricResult[];
  monetization: MetricResult[];
  retention: MetricResult[];
  operational: MetricResult[];
}
