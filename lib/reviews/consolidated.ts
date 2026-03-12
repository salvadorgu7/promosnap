import prisma from "@/lib/db/prisma";
import type { ConsolidatedRating, SourceRating, ReviewConfidence } from "./types";

// ─── Source Trust Weights ────────────────────────────────────────────────────

/** Base trust factor per source slug (higher = more trusted reviews) */
const SOURCE_TRUST: Record<string, number> = {
  mercadolivre: 0.9,
  amazon: 0.95,
  magazineluiza: 0.85,
  americanas: 0.8,
  casasbahia: 0.8,
  kabum: 0.85,
  pichau: 0.8,
};

function getSourceTrust(sourceSlug: string): number {
  return SOURCE_TRUST[sourceSlug] ?? 0.7;
}

// ─── Confidence Calculation ──────────────────────────────────────────────────

function calculateConfidence(
  totalReviews: number,
  sourcesCount: number,
): ReviewConfidence {
  // High confidence: many reviews from multiple sources
  if (totalReviews >= 50 && sourcesCount >= 2) return "high";
  if (totalReviews >= 100) return "high";

  // Medium confidence: decent reviews or multiple sources
  if (totalReviews >= 10 && sourcesCount >= 2) return "medium";
  if (totalReviews >= 20) return "medium";

  // Low confidence: few reviews or single source
  return "low";
}

// ─── Main API ────────────────────────────────────────────────────────────────

/**
 * Get consolidated rating for a product by aggregating ratings from all listings.
 * Returns null if no rating data exists (never fakes data).
 */
export async function getConsolidatedRating(
  productId: string,
): Promise<ConsolidatedRating | null> {
  // Fetch all listings with rating data for this product
  const listings = await prisma.listing.findMany({
    where: {
      productId,
      status: "ACTIVE",
      rating: { not: null },
    },
    include: {
      source: { select: { name: true, slug: true } },
      _count: { select: { offers: { where: { isActive: true } } } },
    },
  });

  // Filter only listings that have actual rating data
  const ratedListings = listings.filter(
    (l) => l.rating !== null && l.rating > 0,
  );

  if (ratedListings.length === 0) {
    return null; // No rating data — be honest
  }

  // Build source breakdown with weights
  const sourceBreakdown: SourceRating[] = [];
  let weightedSum = 0;
  let totalWeight = 0;
  let totalReviews = 0;

  for (const listing of ratedListings) {
    const sourceTrust = getSourceTrust(listing.source.slug);
    const reviewCount = listing.reviewsCount ?? 0;

    // Weight = sourceTrust * log(reviewCount + 1) to avoid domination by single large source
    // but still favor sources with more reviews
    const reviewWeight = Math.log10(reviewCount + 2); // +2 to avoid log(1)=0
    const weight = sourceTrust * reviewWeight;

    sourceBreakdown.push({
      sourceName: listing.source.name,
      sourceSlug: listing.source.slug,
      rating: listing.rating!,
      reviewsCount: reviewCount,
      weight: Math.round(weight * 100) / 100,
    });

    weightedSum += listing.rating! * weight;
    totalWeight += weight;
    totalReviews += reviewCount;
  }

  if (totalWeight === 0) return null;

  const consolidatedRating = Math.round((weightedSum / totalWeight) * 10) / 10;
  const uniqueSources = new Set(sourceBreakdown.map((s) => s.sourceSlug)).size;

  return {
    consolidatedRating: Math.min(5, Math.max(1, consolidatedRating)),
    totalReviews,
    confidence: calculateConfidence(totalReviews, uniqueSources),
    sourceBreakdown: sourceBreakdown.sort((a, b) => b.reviewsCount - a.reviewsCount),
    sourcesCount: uniqueSources,
  };
}
