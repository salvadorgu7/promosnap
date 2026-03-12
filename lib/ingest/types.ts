// ─── Ingest Strategy Types ───────────────────────────────────────────────────

/** Available ingest strategies */
export type IngestStrategy = "curated" | "seed" | "trends" | "adapter" | "import";

/** Configuration for the active ingest strategy */
export interface IngestConfig {
  strategy: IngestStrategy;
  /** Whether auto-ingest is enabled */
  autoIngest: boolean;
  /** Max items per batch */
  batchSize: number;
  /** Interval in minutes between auto-ingests */
  intervalMinutes: number;
  /** Source slugs enabled for ingestion */
  enabledSources: string[];
}

/** Stats about ingestion activity */
export interface IngestStats {
  strategy: IngestStrategy;
  totalIngested: number;
  totalFailed: number;
  lastIngestAt: Date | null;
  lastBatchSize: number;
  activeSources: number;
  pendingCandidates: number;
}

/** Human-readable info about an ingest strategy */
export interface IngestStrategyInfo {
  strategy: IngestStrategy;
  label: string;
  description: string;
  isAutomatic: boolean;
  requiresApiKey: boolean;
}

/** A candidate item parsed from CSV/JSON import */
export interface ImportCandidate {
  title: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  price?: number;
  originalPrice?: number;
  affiliateUrl?: string;
  sourceSlug?: string;
  externalId?: string;
}

/** Validation result for a single candidate */
export interface CandidateValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/** Result of processing an import batch */
export interface ImportBatchResult {
  batchId: string;
  total: number;
  imported: number;
  rejected: number;
  errors: string[];
}

/** Enrichment data produced by the enrichment step */
export interface EnrichmentData {
  detectedBrand?: string;
  inferredCategory?: string;
  imageValid: boolean;
  affiliateValid: boolean;
  trustScore: number;
  enrichmentNotes: string[];
  shippingSignals?: {
    hasFreeShipping: boolean;
    hasPrimeShipping: boolean;
    isMarketplace: boolean;
  };
  /** Sub-status for richer pipeline tracking within the enrichedData JSON */
  subStatus?: string;
}
