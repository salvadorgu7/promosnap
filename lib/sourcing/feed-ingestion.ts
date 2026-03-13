// ============================================
// FEED INGESTION — V18→V19
// Batch import model with improved parsing
// V19: Better CSV parsing (quoted fields, delimiters),
//      URL validation, per-item error reporting,
//      dryRun mode
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

export interface FeedItemError {
  line: number;
  field: string | null;
  reason: string;
  rawValue?: string;
}

export interface FeedProcessResult {
  batchId: string;
  total: number;
  valid: number;
  invalid: number;
  validationErrors: string[];
  // V19: per-item error details
  itemErrors: FeedItemError[];
}

export interface BatchProcessResult {
  batchId: string;
  total: number;
  imported: number;
  rejected: number;
  errors: string[];
}

// V19: Dry run result
export interface DryRunResult {
  total: number;
  valid: number;
  invalid: number;
  validationErrors: string[];
  itemErrors: FeedItemError[];
  preview: {
    title: string;
    brand: string | null;
    category: string | null;
    price: number | null;
    isValid: boolean;
    warnings: string[];
  }[];
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

// ─── V19: Improved CSV Parsing ──────────────────────────────────────────────

/**
 * Parse a CSV line respecting quoted fields (RFC 4180 compliant).
 * Handles: "field with, comma", "field with ""quotes""", simple fields
 */
function parseCSVLine(line: string, delimiter: string = ","): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // End of quoted field
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === delimiter) {
        fields.push(current.trim());
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

/**
 * Detect the CSV delimiter from the header line.
 * Tries: comma, semicolon, tab, pipe
 */
function detectDelimiter(headerLine: string): string {
  const delimiters = [",", ";", "\t", "|"];
  let bestDelimiter = ",";
  let bestCount = 0;

  for (const d of delimiters) {
    const count = headerLine.split(d).length;
    if (count > bestCount) {
      bestCount = count;
      bestDelimiter = d;
    }
  }

  return bestDelimiter;
}

/**
 * V19: Enhanced CSV parser that handles quoted fields and different delimiters.
 * Falls back to the existing parseCSVImport if needed.
 */
function parseCSVEnhanced(content: string): { items: ImportCandidate[]; errors: FeedItemError[] } {
  const lines = content.trim().split(/\r?\n/);
  const errors: FeedItemError[] = [];

  if (lines.length < 2) {
    errors.push({ line: 1, field: null, reason: "CSV must have at least a header and one data row" });
    return { items: [], errors };
  }

  const headerLine = lines[0];
  const delimiter = detectDelimiter(headerLine);
  const headers = parseCSVLine(headerLine, delimiter).map(h =>
    h.toLowerCase().replace(/['"]/g, "").trim()
  );

  const FIELD_MAP: Record<string, keyof ImportCandidate> = {
    title: "title", titulo: "title", nome: "title", name: "title",
    brand: "brand", marca: "brand",
    category: "category", categoria: "category",
    imageurl: "imageUrl", image_url: "imageUrl", imagem: "imageUrl",
    price: "price", preco: "price", valor: "price",
    originalprice: "originalPrice", original_price: "originalPrice", preco_original: "originalPrice",
    affiliateurl: "affiliateUrl", affiliate_url: "affiliateUrl", url: "affiliateUrl", link: "affiliateUrl",
    sourceslug: "sourceSlug", source_slug: "sourceSlug", fonte: "sourceSlug",
    externalid: "externalId", external_id: "externalId", id_externo: "externalId",
  };

  const mappedHeaders = headers.map(h => FIELD_MAP[h] || null);
  const titleIndex = mappedHeaders.indexOf("title");

  if (titleIndex === -1) {
    errors.push({ line: 1, field: "title", reason: "Header must contain a 'title' or 'nome' column" });
    return { items: [], errors };
  }

  const items: ImportCandidate[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const values = parseCSVLine(line, delimiter);
      const item: Record<string, unknown> = {};

      for (let j = 0; j < mappedHeaders.length; j++) {
        const field = mappedHeaders[j];
        if (field && j < values.length) {
          const val = values[j];
          if (field === "price" || field === "originalPrice") {
            const numVal = parseFloat(val.replace(/[^\d.,]/g, "").replace(",", "."));
            if (!isNaN(numVal)) item[field] = numVal;
          } else {
            if (val) item[field] = val;
          }
        }
      }

      if (!item.title || (item.title as string).length < 2) {
        errors.push({
          line: i + 1,
          field: "title",
          reason: "Title is empty or too short",
          rawValue: (item.title as string) || "",
        });
        continue;
      }

      items.push(item as unknown as ImportCandidate);
    } catch (err) {
      errors.push({
        line: i + 1,
        field: null,
        reason: `Parse error: ${String(err)}`,
      });
    }
  }

  return { items, errors };
}

// ─── V19: URL List with validation ──────────────────────────────────────────

function parseUrlListEnhanced(content: string): { items: ImportCandidate[]; errors: FeedItemError[] } {
  const lines = content
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items: ImportCandidate[] = [];
  const errors: FeedItemError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (!line.startsWith("http")) {
      errors.push({
        line: i + 1,
        field: "url",
        reason: "Line does not start with http:// or https://",
        rawValue: line.slice(0, 80),
      });
      continue;
    }

    const urlObj = safeParseUrl(line);
    if (!urlObj) {
      errors.push({
        line: i + 1,
        field: "url",
        reason: "Invalid URL format",
        rawValue: line.slice(0, 80),
      });
      continue;
    }

    // Validate URL structure
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      errors.push({
        line: i + 1,
        field: "url",
        reason: "URL has invalid or missing hostname",
        rawValue: line.slice(0, 80),
      });
      continue;
    }

    // Extract domain as source hint
    const domain = urlObj.hostname.replace(/^www\./, "");
    const pathSegments = urlObj.pathname?.split("/").filter(Boolean) ?? [];
    const lastSegment = pathSegments[pathSegments.length - 1] || "produto";
    const title = lastSegment
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    items.push({
      title,
      affiliateUrl: line,
      sourceSlug: domain,
    });
  }

  return { items, errors };
}

// ─── Parse Feed by Format — V19 enhanced ────────────────────────────────────

function parseFeedContent(
  content: string,
  format: FeedFormat
): { items: ImportCandidate[]; errors: FeedItemError[] } {
  switch (format) {
    case "csv": {
      const result = parseCSVEnhanced(content);
      // If enhanced parser finds nothing, fallback to original
      if (result.items.length === 0 && result.errors.length === 0) {
        return { items: parseCSVImport(content), errors: [] };
      }
      return result;
    }
    case "json":
      return { items: parseJSONImport(content), errors: [] };
    case "url-list":
      return parseUrlListEnhanced(content);
    case "title-list":
      return { items: parseTitleList(content), errors: [] };
    default:
      return { items: [], errors: [] };
  }
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

// ─── V19: Dry Run Mode ─────────────────────────────────────────────────────

/**
 * Validates feed content without persisting anything.
 * Returns detailed preview of what would be imported.
 */
export async function dryRunImport(
  feedData: string,
  format: FeedFormat
): Promise<DryRunResult> {
  const { items, errors: parseErrors } = parseFeedContent(feedData, format);

  if (items.length === 0) {
    return {
      total: 0,
      valid: 0,
      invalid: 0,
      validationErrors: parseErrors.length > 0
        ? parseErrors.map(e => `Line ${e.line}: ${e.reason}`)
        : ["No items found in the provided content"],
      itemErrors: parseErrors,
      preview: [],
    };
  }

  const validationErrors: string[] = [];
  const itemErrors: FeedItemError[] = [...parseErrors];
  const preview: DryRunResult["preview"] = [];
  let valid = 0;
  let invalid = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const validation = validateFeedItem(item);

    if (validation.isValid) {
      valid++;
      preview.push({
        title: item.title,
        brand: item.brand ?? null,
        category: item.category ?? null,
        price: item.price ?? null,
        isValid: true,
        warnings: validation.warnings,
      });
    } else {
      invalid++;
      validationErrors.push(
        `Item ${i + 1} (${item.title || "sem titulo"}): ${validation.errors.join(", ")}`
      );
      itemErrors.push({
        line: i + 1,
        field: null,
        reason: validation.errors.join("; "),
      });
      preview.push({
        title: item.title || "(sem titulo)",
        brand: item.brand ?? null,
        category: item.category ?? null,
        price: item.price ?? null,
        isValid: false,
        warnings: validation.errors,
      });
    }
  }

  return {
    total: items.length,
    valid,
    invalid,
    validationErrors,
    itemErrors,
    preview: preview.slice(0, 100), // Limit preview size
  };
}

// ─── Process Source Feed — V19: with per-item errors ────────────────────────

/**
 * Handles batch import from a feed source.
 * Parses the content, validates, and creates an ImportBatch with CatalogCandidates.
 */
export async function processSourceFeed(
  feedData: string,
  sourceSlug: string,
  format: FeedFormat
): Promise<FeedProcessResult> {
  const { items, errors: parseErrors } = parseFeedContent(feedData, format);

  if (items.length === 0) {
    return {
      batchId: "",
      total: 0,
      valid: 0,
      invalid: 0,
      validationErrors: parseErrors.length > 0
        ? parseErrors.map(e => `Line ${e.line}: ${e.reason}`)
        : ["Nenhum item encontrado no conteudo fornecido"],
      itemErrors: parseErrors,
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
    format,
    parseErrors
  );
}

// ─── Create Import Batch — V19: with itemErrors ────────────────────────────

/**
 * Creates an import batch in the database with validated candidates.
 */
export async function createImportBatch(
  items: ImportCandidate[],
  fileName: string,
  format: FeedFormat | string,
  existingErrors: FeedItemError[] = []
): Promise<FeedProcessResult> {
  const validItems: ImportCandidate[] = [];
  const validationErrors: string[] = [];
  const itemErrors: FeedItemError[] = [...existingErrors];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const validation = validateFeedItem(item);

    if (validation.isValid) {
      validItems.push(item);
    } else {
      validationErrors.push(
        `Item ${i + 1} (${item.title || "sem titulo"}): ${validation.errors.join(", ")}`
      );
      itemErrors.push({
        line: i + 1,
        field: validation.errors[0]?.includes("title") ? "title" : null,
        reason: validation.errors.join("; "),
        rawValue: item.title?.slice(0, 80),
      });
    }
  }

  if (validItems.length === 0) {
    return {
      batchId: "",
      total: items.length,
      valid: 0,
      invalid: items.length,
      validationErrors,
      itemErrors,
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
    itemErrors,
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
