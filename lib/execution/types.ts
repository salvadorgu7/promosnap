// ============================================
// EXECUTION LAYER — Types
// ============================================

export type ExecutionType =
  | "create_banner"
  | "publish_distribution"
  | "feature_product"
  | "create_campaign"
  | "create_import_batch"
  | "create_review_task"
  | "trigger_job"
  | "trigger_email"
  | "trigger_webhook";

export type ExecutionStatus = "pending" | "running" | "success" | "failed" | "skipped";

export type ExecutionOrigin = "opportunity" | "manual" | "automation";

export interface ExecutionRecord {
  id: string;
  type: ExecutionType;
  status: ExecutionStatus;
  origin: ExecutionOrigin;
  payload: Record<string, unknown>;
  result: Record<string, unknown> | null;
  error: string | null;
  retries: number;
  createdAt: Date;
  completedAt: Date | null;
  linkedOpportunityId?: string;
}

export interface ExecutionSummary {
  total: number;
  byStatus: Record<ExecutionStatus, number>;
  byType: Record<ExecutionType, number>;
  recentFailures: ExecutionRecord[];
}
