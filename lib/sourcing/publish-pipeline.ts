// ============================================
// PUBLISH PIPELINE — V19
// Approve, enrich, and publish candidates
// into Product/Listing/Offer records in one step
// ============================================

import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { enrichCandidate, determineSubStatus } from "@/lib/ingest/enrich";
import { findCanonicalCandidates } from "@/lib/catalog/canonical-match";
import type { ImportCandidate } from "@/lib/ingest/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PublishItemResult {
  candidateId: string;
  title: string;
  success: boolean;
  productId?: string;
  listingId?: string;
  offerId?: string;
  matchedExisting: boolean;
  error?: string;
}

export interface PublishBatchResult {
  total: number;
  published: number;
  failed: number;
  results: PublishItemResult[];
}

export interface EnrichItemResult {
  candidateId: string;
  title: string;
  success: boolean;
  detectedBrand?: string;
  inferredCategory?: string;
  trustScore?: number;
  error?: string;
}

export interface EnrichBatchResult {
  total: number;
  enriched: number;
  failed: number;
  results: EnrichItemResult[];
}

export interface RejectBatchResult {
  total: number;
  rejected: number;
  failed: number;
  errors: string[];
}

export interface PublishPreviewItem {
  candidateId: string;
  title: string;
  brand: string | null;
  category: string | null;
  price: number | null;
  imageUrl: string | null;
  affiliateUrl: string | null;
  willMatchExisting: boolean;
  matchedProductName: string | null;
  matchScore: number | null;
  enrichedData: Record<string, unknown> | null;
}

export interface PublishPreviewResult {
  total: number;
  readyToPublish: number;
  needsReview: number;
  items: PublishPreviewItem[];
}

// ─── Publish Batch ──────────────────────────────────────────────────────────

/**
 * Approve + enrich + create Product/Listing/Offer in one step.
 * If a candidate matches an existing canonical product, creates a Listing under it.
 * Otherwise, creates a new Product + Listing.
 * All operations are transactional per item.
 */
export async function publishBatch(
  candidateIds: string[]
): Promise<PublishBatchResult> {
  const candidates = await prisma.catalogCandidate.findMany({
    where: {
      id: { in: candidateIds },
      status: { in: ["APPROVED", "PENDING"] },
    },
  });

  if (candidates.length === 0) {
    return { total: 0, published: 0, failed: 0, results: [] };
  }

  const results: PublishItemResult[] = [];
  let published = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const result = await publishSingleCandidate(candidate);
      results.push(result);
      if (result.success) published++;
      else failed++;
    } catch (err) {
      results.push({
        candidateId: candidate.id,
        title: candidate.title,
        success: false,
        matchedExisting: false,
        error: String(err),
      });
      failed++;
    }
  }

  return { total: candidates.length, published, failed, results };
}

async function publishSingleCandidate(
  candidate: {
    id: string;
    title: string;
    brand: string | null;
    category: string | null;
    imageUrl: string | null;
    price: number | null;
    originalPrice: number | null;
    affiliateUrl: string | null;
    sourceSlug: string | null;
    externalId: string | null;
    enrichedData: Prisma.JsonValue;
  }
): Promise<PublishItemResult> {
  // Try to find canonical match
  const canonicalCandidates = await findCanonicalCandidates(
    candidate.title,
    candidate.brand,
    candidate.category
  );

  const bestMatch = canonicalCandidates.length > 0 && canonicalCandidates[0].score >= 0.6
    ? canonicalCandidates[0]
    : null;

  // Find or create source
  const sourceSlug = candidate.sourceSlug || "manual-import";
  let source = await prisma.source.findUnique({ where: { slug: sourceSlug } });
  if (!source) {
    source = await prisma.source.create({
      data: {
        name: sourceSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        slug: sourceSlug,
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    let productId: string;
    let matchedExisting = false;

    if (bestMatch) {
      // Match found — use existing product
      productId = bestMatch.productId;
      matchedExisting = true;
    } else {
      // No match — create new product
      const baseSlug = candidate.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "")
        .slice(0, 100);

      const existing = await tx.product.findUnique({ where: { slug: baseSlug } });
      const slug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

      let brandId: string | undefined;
      if (candidate.brand) {
        const brand = await tx.brand.findFirst({
          where: { name: { equals: candidate.brand, mode: "insensitive" } },
        });
        brandId = brand?.id;
      }

      let categoryId: string | undefined;
      if (candidate.category) {
        const cat = await tx.category.findFirst({
          where: {
            OR: [
              { slug: candidate.category },
              { name: { equals: candidate.category, mode: "insensitive" } },
            ],
          },
        });
        categoryId = cat?.id;
      }

      const product = await tx.product.create({
        data: {
          name: candidate.title,
          slug,
          imageUrl: candidate.imageUrl,
          status: "ACTIVE",
          ...(brandId && { brandId }),
          ...(categoryId && { categoryId }),
        },
      });
      productId = product.id;
    }

    // Create listing
    const listing = await tx.listing.create({
      data: {
        sourceId: source.id,
        productId,
        externalId: candidate.externalId || `import-${candidate.id}`,
        rawTitle: candidate.title,
        rawBrand: candidate.brand,
        rawCategory: candidate.category,
        imageUrl: candidate.imageUrl,
        productUrl: candidate.affiliateUrl || `https://www.promosnap.com.br/p/${productId}`,
        matchConfidence: bestMatch?.score ?? null,
        status: "ACTIVE",
      },
    });

    // Create offer if price is available
    let offerId: string | undefined;
    if (candidate.price && candidate.price > 0) {
      const offer = await tx.offer.create({
        data: {
          listingId: listing.id,
          currentPrice: candidate.price,
          originalPrice: candidate.originalPrice,
          affiliateUrl: candidate.affiliateUrl,
          isActive: true,
          offerScore: candidate.price > 0 ? 50 : 0,
        },
      });
      offerId = offer.id;
    }

    // Mark candidate as imported
    await tx.catalogCandidate.update({
      where: { id: candidate.id },
      data: { status: "IMPORTED" },
    });

    return {
      candidateId: candidate.id,
      title: candidate.title,
      success: true,
      productId,
      listingId: listing.id,
      offerId,
      matchedExisting,
    };
  });
}

// ─── Enrich Batch ───────────────────────────────────────────────────────────

/**
 * Run enrichment on a batch of candidates without publishing.
 * Updates their enrichedData, detected brand/category, and status.
 */
export async function enrichBatch(
  candidateIds: string[]
): Promise<EnrichBatchResult> {
  const candidates = await prisma.catalogCandidate.findMany({
    where: {
      id: { in: candidateIds },
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (candidates.length === 0) {
    return { total: 0, enriched: 0, failed: 0, results: [] };
  }

  const results: EnrichItemResult[] = [];
  let enriched = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const importCandidate: ImportCandidate = {
        title: candidate.title,
        brand: candidate.brand ?? undefined,
        category: candidate.category ?? undefined,
        imageUrl: candidate.imageUrl ?? undefined,
        price: candidate.price ?? undefined,
        originalPrice: candidate.originalPrice ?? undefined,
        affiliateUrl: candidate.affiliateUrl ?? undefined,
        sourceSlug: candidate.sourceSlug ?? undefined,
        externalId: candidate.externalId ?? undefined,
      };

      const enrichment = enrichCandidate(importCandidate);
      const subStatus = determineSubStatus(enrichment, "PENDING");
      enrichment.subStatus = subStatus;

      const dbStatus = subStatus === "REJECTED" ? "REJECTED" : "APPROVED";

      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: {
          status: dbStatus as "APPROVED" | "REJECTED",
          brand: enrichment.detectedBrand || candidate.brand,
          category: enrichment.inferredCategory || candidate.category,
          enrichedData: enrichment as unknown as Prisma.InputJsonValue,
        },
      });

      results.push({
        candidateId: candidate.id,
        title: candidate.title,
        success: true,
        detectedBrand: enrichment.detectedBrand,
        inferredCategory: enrichment.inferredCategory,
        trustScore: enrichment.trustScore,
      });
      enriched++;
    } catch (err) {
      results.push({
        candidateId: candidate.id,
        title: candidate.title,
        success: false,
        error: String(err),
      });
      failed++;
    }
  }

  return { total: candidates.length, enriched, failed, results };
}

// ─── Reject Batch ───────────────────────────────────────────────────────────

/**
 * Reject candidates with a reason.
 */
export async function rejectBatch(
  candidateIds: string[],
  reason: string
): Promise<RejectBatchResult> {
  if (candidateIds.length === 0) {
    return { total: 0, rejected: 0, failed: 0, errors: [] };
  }

  const errors: string[] = [];
  let rejected = 0;
  let failed = 0;

  // Use a single bulk update for efficiency
  try {
    const result = await prisma.catalogCandidate.updateMany({
      where: {
        id: { in: candidateIds },
        status: { in: ["PENDING", "APPROVED"] },
      },
      data: {
        status: "REJECTED",
        rejectionNote: reason,
      },
    });

    rejected = result.count;
    failed = candidateIds.length - result.count;

    if (failed > 0) {
      errors.push(`${failed} candidates were not updated (already imported or rejected)`);
    }
  } catch (err) {
    errors.push(`Bulk reject failed: ${String(err)}`);
    failed = candidateIds.length;
  }

  return { total: candidateIds.length, rejected, failed, errors };
}

// ─── Publish Preview ────────────────────────────────────────────────────────

/**
 * Preview what will be created when publishing candidates.
 * Shows canonical match info and enrichment data.
 */
export async function getPublishPreview(
  candidateIds: string[]
): Promise<PublishPreviewResult> {
  const candidates = await prisma.catalogCandidate.findMany({
    where: {
      id: { in: candidateIds },
      status: { in: ["PENDING", "APPROVED"] },
    },
  });

  if (candidates.length === 0) {
    return { total: 0, readyToPublish: 0, needsReview: 0, items: [] };
  }

  const items: PublishPreviewItem[] = [];
  let readyToPublish = 0;
  let needsReview = 0;

  for (const candidate of candidates) {
    // Check for canonical match
    const canonicalCandidates = await findCanonicalCandidates(
      candidate.title,
      candidate.brand,
      candidate.category
    );

    const bestMatch = canonicalCandidates.length > 0 && canonicalCandidates[0].score >= 0.6
      ? canonicalCandidates[0]
      : null;

    const enrichedData = (candidate.enrichedData as Record<string, unknown>) ?? null;
    const trustScore = (enrichedData?.trustScore as number) ?? 0;

    const isReady = trustScore >= 50 || bestMatch != null;
    if (isReady) readyToPublish++;
    else needsReview++;

    items.push({
      candidateId: candidate.id,
      title: candidate.title,
      brand: candidate.brand,
      category: candidate.category,
      price: candidate.price,
      imageUrl: candidate.imageUrl,
      affiliateUrl: candidate.affiliateUrl,
      willMatchExisting: bestMatch != null,
      matchedProductName: bestMatch?.productName ?? null,
      matchScore: bestMatch?.score ?? null,
      enrichedData,
    });
  }

  return {
    total: candidates.length,
    readyToPublish,
    needsReview,
    items,
  };
}
