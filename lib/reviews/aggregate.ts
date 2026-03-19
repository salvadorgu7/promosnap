/**
 * Review Aggregate — Persistent cached consolidation with freshness tracking.
 *
 * Builds on getConsolidatedRating() but persists results to ReviewAggregate table
 * for fast reads and freshness-aware display.
 */

import prisma from "@/lib/db/prisma"
import { getConsolidatedRating } from "./consolidated"
import { logger } from "@/lib/logger"

const log = logger.child({ module: "review-aggregate" })

export interface ReviewTheme {
  theme: string
  polarity: "positive" | "negative" | "neutral"
  strength: number // 0-1
  mentions: number
  confidence: "high" | "medium" | "low"
}

/**
 * Get or compute the ReviewAggregate for a product.
 * Uses DB cache with staleness check — recomputes if stale.
 */
export async function getReviewAggregate(productId: string) {
  // Try cached version first
  const cached = await prisma.reviewAggregate.findUnique({
    where: { productId },
  }).catch(() => null)

  // If fresh enough (< 24h), return cached
  if (cached) {
    const ageMs = Date.now() - cached.lastUpdatedAt.getTime()
    if (ageMs < 24 * 60 * 60 * 1000) return cached
  }

  // Recompute from source
  return refreshReviewAggregate(productId)
}

/**
 * Force-refresh the ReviewAggregate for a product.
 */
export async function refreshReviewAggregate(productId: string) {
  const consolidated = await getConsolidatedRating(productId)

  if (!consolidated) {
    // No rating data — remove stale cache if exists
    await prisma.reviewAggregate.deleteMany({ where: { productId } }).catch(() => {})
    return null
  }

  // Compute freshness based on product's latest offer
  const latestOffer = await prisma.offer.findFirst({
    where: { listing: { productId }, isActive: true },
    orderBy: { lastSeenAt: "desc" },
    select: { lastSeenAt: true },
  }).catch(() => null)

  let dataFreshness = "stale"
  if (latestOffer?.lastSeenAt) {
    const ageDays = (Date.now() - latestOffer.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24)
    dataFreshness = ageDays < 7 ? "fresh" : ageDays < 30 ? "recent" : "stale"
  }

  // Determine confidence including insufficient_data
  const confidence = consolidated.totalReviews < 3
    ? "insufficient_data"
    : consolidated.confidence

  const data = {
    rating: consolidated.consolidatedRating,
    totalReviews: consolidated.totalReviews,
    confidence,
    sourcesCount: consolidated.sourcesCount,
    dataFreshness,
    lastUpdatedAt: new Date(),
  }

  try {
    return await prisma.reviewAggregate.upsert({
      where: { productId },
      create: { productId, ...data },
      update: data,
    })
  } catch (err) {
    log.error("review-aggregate.upsert-failed", { productId, error: err })
    return null
  }
}
