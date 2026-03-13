// ============================================
// FEED SYNC — Types (V22)
// ============================================

// ---------------------------------------------------------------------------
// Feed Item — the unit of data flowing through the sync pipeline
// ---------------------------------------------------------------------------

export interface FeedItem {
  title: string;
  price: number;
  originalPrice?: number;
  url: string;
  imageUrl?: string;
  brand?: string;
  category?: string;
  source?: string;
}

// ---------------------------------------------------------------------------
// Batch results
// ---------------------------------------------------------------------------

export interface FeedBatchResult {
  total: number;
  valid: number;
  invalid: number;
  enriched: number;
  published: number;
  stale: number;
  errors: string[];
  logs: string[];
}

// ---------------------------------------------------------------------------
// Batch log entry
// ---------------------------------------------------------------------------

export interface FeedBatchLog {
  timestamp: Date;
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Sync job
// ---------------------------------------------------------------------------

export type SyncJobStatus = "idle" | "running" | "success" | "failed" | "partial";

export interface FeedSyncJob {
  id: string;
  sourceId: string;
  status: SyncJobStatus;
  startedAt: Date;
  completedAt?: Date;
  result?: FeedBatchResult;
  error?: string;
}

// ---------------------------------------------------------------------------
// Stored batch record (in-memory)
// ---------------------------------------------------------------------------

export interface FeedSyncBatchRecord {
  id: string;
  sourceId: string;
  status: SyncJobStatus;
  result: FeedBatchResult;
  validItems: FeedItem[];
  invalidItems: { item: FeedItem; errors: string[] }[];
  publishedItems: { item: FeedItem; candidateId?: string; productId?: string }[];
  createdAt: Date;
}

// ---------------------------------------------------------------------------
// Stale item info
// ---------------------------------------------------------------------------

export interface StaleItemInfo {
  offerId: string;
  listingId: string;
  sourceId: string;
  sourceName: string;
  lastSeenAt: Date;
  currentPrice: number;
  daysStale: number;
}
