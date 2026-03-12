// ─── Consolidated Review Types ───────────────────────────────────────────────

/** Confidence level for consolidated ratings */
export type ReviewConfidence = "low" | "medium" | "high";

/** Rating from a single source/listing */
export interface SourceRating {
  sourceName: string;
  sourceSlug: string;
  rating: number;
  reviewsCount: number;
  /** Weight used in consolidation (0-1) */
  weight: number;
}

/** Consolidated rating across all sources for a product */
export interface ConsolidatedRating {
  /** Weighted average rating (1-5 scale) */
  consolidatedRating: number;
  /** Total reviews across all sources */
  totalReviews: number;
  /** Confidence in the consolidated rating */
  confidence: ReviewConfidence;
  /** Breakdown by source */
  sourceBreakdown: SourceRating[];
  /** Number of sources with rating data */
  sourcesCount: number;
}

/** Category ranking badge types */
export type RankingBadgeType = "top-rated" | "best-value" | "most-popular";

/** Badge info for category insights */
export interface RankingBadge {
  type: RankingBadgeType;
  label: string;
  description: string;
}

/** Category ranking insights for a product */
export interface CategoryInsight {
  productId: string;
  categoryId: string;
  categoryName: string;
  /** Position in category by rating (1-based) */
  positionByRating: number;
  /** Total products in category with ratings */
  totalRatedInCategory: number;
  /** Badges earned by this product */
  badges: RankingBadge[];
}
