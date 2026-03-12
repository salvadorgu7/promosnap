// ============================================
// FEED INGESTION — batch import model
// ============================================

import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { parseCSVImport, parseJSONImport, validateCandidate } from "@/lib/ingest/import";
import { enrichCandidate, determineSubStatus } from "@/lib/ingest/enrich";
import type { ImportCandidate } from "@/lib/ingest/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type FeedFormat = "csv" | "json" | "url-list" | "title-list";

export interface FeedValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface FeedProcessResult {
  batchId: string;
  total: number;
  valid: number;
  invalid: number;
  validationErrors: string[];
}

export interface BatchProcessResult {
  batchId: string;
  total: number;
  imported: number;
  rejected: number;
  errors: string[];
}

// ─── Feed Item Validation ───────────────────────────────────────────────────

/**
 * Validates an individual feed item.
 */
export function validateFeedItem(item: ImportCandidate): FeedValidationResult {
  const validation = validateCandidate(item);
  return {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
  };
}

// ─── Parse Feed by Format ───────────────────────────────────────────────────

function parseFeedContent(
  content: string,
  format: FeedFormat
): ImportCandidate[] {
  switch (format) {
    case "csv":
      return parseCSVImport(content);
    case "json":
      return parseJSONImport(content);
    case "url-list":
      return parseUrlList(content);
    case "title-list":
      return parseTitleList(content);
    default:
      return [];
  }
}

function parseUrlList(content: string): ImportCandidate[] {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .filter((line) => line.startsWith("http"))
    .map((url) => {
      // Extract a title from the URL path
      const urlObj = safeParseUrl(url);
      const pathSegments = urlObj?.pathname?.split("/").filter(Boolean) ?? [];
      const lastSegment = pathSegments[pathSegments.length - 1] || "produto";
      const title = lastSegment
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      return {
        title,
        affiliateUrl: url,
      };
    });
}

function parseTitleList(content: string): ImportCandidate[] {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines
    .filter((line) => line.length >= 3)
    .map((title) => ({ title }));
}

function safeParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

// ─── Process Source Feed ────────────────────────────────────────────────────

/**
 * Handles batch import from a feed source.
 * Parses the content, validates, and creates an ImportBatch with CatalogCandidates.
 */
export async function processSourceFeed(
  feedData: string,
  sourceSlug: string,
  format: FeedFormat
): Promise<FeedProcessResult> {
  const items = parseFeedContent(feedData, format);

  if (items.length === 0) {
    return {
      batchId: "",
      total: 0,
      valid: 0,
      invalid: 0,
      validationErrors: ["Nenhum item encontrado no conteudo fornecido"],
    };
  }

  // Tag items with source slug
  const taggedItems = items.map((item) => ({
    ...item,
    sourceSlug: item.sourceSlug || sourceSlug,
  }));

  return createImportBatch(
    taggedItems,
    `feed-${sourceSlug}-${Date.now()}`,
    format
  );
}

// ─── Create Import Batch ────────────────────────────────────────────────────

/**
 * Creates an import batch in the database with validated candidates.
 */
export async function createImportBatch(
  items: ImportCandidate[],
  fileName: string,
  format: FeedFormat | string
): Promise<FeedProcessResult> {
  const validItems: ImportCandidate[] = [];
  const validationErrors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const validation = validateFeedItem(item);

    if (validation.isValid) {
      validItems.push(item);
    } else {
      validationErrors.push(
        `Item ${i + 1} (${item.title || "sem titulo"}): ${validation.errors.join(", ")}`
      );
    }
  }

  if (validItems.length === 0) {
    return {
      batchId: "",
      total: items.length,
      valid: 0,
      invalid: items.length,
      validationErrors,
    };
  }

  // Create batch + candidates in a transaction
  const batch = await prisma.importBatch.create({
    data: {
      fileName,
      format: format === "url-list" || format === "title-list" ? "json" : format,
      status: "PENDING",
      totalItems: validItems.length,
      candidates: {
        create: validItems.map((item) => ({
          title: item.title,
          brand: item.brand ?? null,
          category: item.category ?? null,
          imageUrl: item.imageUrl ?? null,
          price: item.price ?? null,
          originalPrice: item.originalPrice ?? null,
          affiliateUrl: item.affiliateUrl ?? null,
          sourceSlug: item.sourceSlug ?? null,
          externalId: item.externalId ?? null,
          status: "PENDING",
        })),
      },
    },
  });

  return {
    batchId: batch.id,
    total: items.length,
    valid: validItems.length,
    invalid: items.length - validItems.length,
    validationErrors,
  };
}

// ─── Process Batch Items ────────────────────────────────────────────────────

/**
 * Processes all pending items in a batch: validates, enriches, and updates status.
 */
export async function processBatchItems(
  batchId: string
): Promise<BatchProcessResult> {
  const batch = await prisma.importBatch.findUnique({
    where: { id: batchId },
    include: { candidates: { where: { status: "PENDING" } } },
  });

  if (!batch) {
    return {
      batchId,
      total: 0,
      imported: 0,
      rejected: 0,
      errors: ["Batch nao encontrado"],
    };
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: { status: "PROCESSING" },
  });

  let imported = 0;
  let rejected = 0;
  const errors: string[] = [];

  for (const candidate of batch.candidates) {
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

    const validation = validateFeedItem(importCandidate);

    if (!validation.isValid) {
      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "REJECTED",
          rejectionNote: validation.errors.join("; "),
        },
      });
      rejected++;
      errors.push(`${candidate.title}: ${validation.errors.join(", ")}`);
      continue;
    }

    try {
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
      imported++;
    } catch (err) {
      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: {
          status: "REJECTED",
          rejectionNote: `Erro no processamento: ${String(err)}`,
        },
      });
      rejected++;
      errors.push(`${candidate.title}: ${String(err)}`);
    }
  }

  await prisma.importBatch.update({
    where: { id: batchId },
    data: {
      status: "COMPLETED",
      imported,
      rejected,
      errors:
        errors.length > 0
          ? (errors as unknown as Prisma.InputJsonValue)
          : Prisma.DbNull,
      processedAt: new Date(),
    },
  });

  return {
    batchId,
    total: batch.candidates.length,
    imported,
    rejected,
    errors,
  };
}
