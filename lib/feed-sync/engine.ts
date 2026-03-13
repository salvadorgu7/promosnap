// ============================================
// FEED SYNC ENGINE — V22
// Validates, normalizes, enriches, publishes feed items
// and marks stale offers.
// ============================================

import prisma from "@/lib/db/prisma";
import { normalizeTitle, extractBrand, inferCategory } from "@/lib/catalog/normalize";
import { enrichCandidate } from "@/lib/ingest/enrich";
import { findCanonicalCandidates } from "@/lib/catalog/canonical-match";
import type { ImportCandidate } from "@/lib/ingest/types";
import type {
  FeedItem,
  FeedBatchResult,
  FeedBatchLog,
  FeedSyncBatchRecord,
  StaleItemInfo,
} from "./types";

// ---------------------------------------------------------------------------
// In-memory batch store
// ---------------------------------------------------------------------------

const batchStore: FeedSyncBatchRecord[] = [];
const MAX_BATCHES = 200;
let batchCounter = 0;

function storeBatch(record: FeedSyncBatchRecord): void {
  batchStore.unshift(record);
  if (batchStore.length > MAX_BATCHES) {
    batchStore.length = MAX_BATCHES;
  }
}

export function getBatches(limit = 50): FeedSyncBatchRecord[] {
  return batchStore.slice(0, limit);
}

export function getBatchById(id: string): FeedSyncBatchRecord | undefined {
  return batchStore.find((b) => b.id === id);
}

// ---------------------------------------------------------------------------
// In-memory batch log
// ---------------------------------------------------------------------------

function createBatchLogger(): { logs: FeedBatchLog[]; log: (level: FeedBatchLog["level"], message: string, context?: Record<string, unknown>) => void } {
  const logs: FeedBatchLog[] = [];
  return {
    logs,
    log(level, message, context) {
      logs.push({ timestamp: new Date(), level, message, context });
    },
  };
}

// ---------------------------------------------------------------------------
// 1. validateFeedBatch
// ---------------------------------------------------------------------------

export function validateFeedBatch(
  items: FeedItem[]
): { valid: FeedItem[]; invalid: { item: FeedItem; errors: string[] }[] } {
  const valid: FeedItem[] = [];
  const invalid: { item: FeedItem; errors: string[] }[] = [];

  for (const item of items) {
    const errors: string[] = [];

    if (!item.title || item.title.trim().length < 3) {
      errors.push("Titulo ausente ou muito curto (min 3 caracteres)");
    }

    if (item.price == null || isNaN(item.price) || item.price <= 0) {
      errors.push("Preco invalido ou ausente");
    }

    if (!item.url || !item.url.startsWith("http")) {
      errors.push("URL invalida ou ausente");
    }

    if (item.originalPrice != null && item.originalPrice < 0) {
      errors.push("Preco original negativo");
    }

    if (item.originalPrice != null && item.price != null && item.originalPrice < item.price) {
      errors.push("Preco original menor que preco atual");
    }

    if (errors.length > 0) {
      invalid.push({ item, errors });
    } else {
      valid.push(item);
    }
  }

  return { valid, invalid };
}

// ---------------------------------------------------------------------------
// 2. normalizeFeedBatch
// ---------------------------------------------------------------------------

export function normalizeFeedBatch(items: FeedItem[]): FeedItem[] {
  return items.map((item) => {
    const normalizedTitle = normalizeTitle(item.title);
    const detectedBrand = item.brand || extractBrand(item.title) || undefined;
    const detectedCategory = item.category || inferCategory(item.title) || undefined;

    return {
      ...item,
      title: normalizedTitle || item.title,
      brand: detectedBrand,
      category: detectedCategory,
    };
  });
}

// ---------------------------------------------------------------------------
// 3. enrichFeedBatch
// ---------------------------------------------------------------------------

export function enrichFeedBatch(
  items: FeedItem[]
): { items: FeedItem[]; enrichments: Map<number, ReturnType<typeof enrichCandidate>> } {
  const enrichments = new Map<number, ReturnType<typeof enrichCandidate>>();

  const enrichedItems = items.map((item, index) => {
    const candidate: ImportCandidate = {
      title: item.title,
      brand: item.brand,
      category: item.category,
      imageUrl: item.imageUrl,
      price: item.price,
      originalPrice: item.originalPrice,
      affiliateUrl: item.url,
    };

    const enrichment = enrichCandidate(candidate);
    enrichments.set(index, enrichment);

    return {
      ...item,
      brand: enrichment.detectedBrand || item.brand,
      category: enrichment.inferredCategory || item.category,
    };
  });

  return { items: enrichedItems, enrichments };
}

// ---------------------------------------------------------------------------
// 4. publishFeedBatch
// ---------------------------------------------------------------------------

export async function publishFeedBatch(
  items: FeedItem[],
  sourceId: string
): Promise<{ published: number; results: { item: FeedItem; candidateId?: string; productId?: string }[]; errors: string[] }> {
  const results: { item: FeedItem; candidateId?: string; productId?: string }[] = [];
  const errors: string[] = [];
  let published = 0;

  // Find or create source
  let source = await prisma.source.findUnique({ where: { slug: sourceId } });
  if (!source) {
    source = await prisma.source.create({
      data: {
        name: sourceId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        slug: sourceId,
      },
    });
  }

  for (const item of items) {
    try {
      // Create CatalogCandidate
      const candidate = await prisma.catalogCandidate.create({
        data: {
          title: item.title,
          brand: item.brand ?? null,
          category: item.category ?? null,
          imageUrl: item.imageUrl ?? null,
          price: item.price,
          originalPrice: item.originalPrice ?? null,
          affiliateUrl: item.url,
          sourceSlug: sourceId,
          status: "PENDING",
        },
      });

      // Try canonical match
      const canonicalCandidates = await findCanonicalCandidates(
        item.title,
        item.brand ?? null,
        item.category ?? null
      );

      const bestMatch =
        canonicalCandidates.length > 0 && canonicalCandidates[0].score >= 0.6
          ? canonicalCandidates[0]
          : null;

      let productId: string | undefined;

      if (bestMatch) {
        productId = bestMatch.productId;
      }

      // Mark candidate as approved since it passed validation + enrichment
      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: { status: "APPROVED" },
      });

      results.push({ item, candidateId: candidate.id, productId });
      published++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Falha ao publicar "${item.title}": ${msg}`);
      results.push({ item });
    }
  }

  return { published, results, errors };
}

// ---------------------------------------------------------------------------
// 5. markStaleItems
// ---------------------------------------------------------------------------

export async function markStaleItems(
  sourceId: string,
  maxAgeDays: number
): Promise<{ staleCount: number; staleItems: StaleItemInfo[] }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  // Find the source
  const source = await prisma.source.findUnique({ where: { slug: sourceId } });
  if (!source) {
    return { staleCount: 0, staleItems: [] };
  }

  // Find stale offers via listings from this source
  const staleOffers = await prisma.offer.findMany({
    where: {
      isActive: true,
      lastSeenAt: { lt: cutoffDate },
      listing: { sourceId: source.id },
    },
    include: {
      listing: {
        include: { source: true },
      },
    },
    take: 500,
  });

  if (staleOffers.length === 0) {
    return { staleCount: 0, staleItems: [] };
  }

  // Mark them as inactive
  await prisma.offer.updateMany({
    where: {
      id: { in: staleOffers.map((o) => o.id) },
    },
    data: { isActive: false },
  });

  const now = new Date();
  const staleItems: StaleItemInfo[] = staleOffers.map((offer) => ({
    offerId: offer.id,
    listingId: offer.listingId,
    sourceId: source.id,
    sourceName: source.name,
    lastSeenAt: offer.lastSeenAt,
    currentPrice: offer.currentPrice,
    daysStale: Math.floor((now.getTime() - offer.lastSeenAt.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  return { staleCount: staleOffers.length, staleItems };
}

// ---------------------------------------------------------------------------
// Full pipeline: validate -> normalize -> enrich -> publish
// ---------------------------------------------------------------------------

export async function runFullSyncPipeline(
  items: FeedItem[],
  sourceId: string
): Promise<{ batchId: string; result: FeedBatchResult }> {
  const logger = createBatchLogger();
  const batchId = `fsb_${++batchCounter}_${Date.now()}`;

  logger.log("info", `Iniciando pipeline de sync — ${items.length} items, source=${sourceId}`);

  // Step 1: Validate
  logger.log("info", "Etapa 1: Validacao");
  const { valid, invalid } = validateFeedBatch(items);
  logger.log("info", `Validacao concluida: ${valid.length} validos, ${invalid.length} invalidos`);

  if (invalid.length > 0) {
    for (const inv of invalid.slice(0, 10)) {
      logger.log("warn", `Item invalido: "${inv.item.title}" — ${inv.errors.join(", ")}`);
    }
  }

  // Step 2: Normalize
  logger.log("info", "Etapa 2: Normalizacao");
  const normalized = normalizeFeedBatch(valid);
  logger.log("info", `Normalizacao concluida: ${normalized.length} items`);

  // Step 3: Enrich
  logger.log("info", "Etapa 3: Enriquecimento");
  const { items: enriched } = enrichFeedBatch(normalized);
  logger.log("info", `Enriquecimento concluido: ${enriched.length} items`);

  // Step 4: Publish
  logger.log("info", "Etapa 4: Publicacao");
  const publishResult = await publishFeedBatch(enriched, sourceId);
  logger.log("info", `Publicacao concluida: ${publishResult.published} publicados, ${publishResult.errors.length} erros`);

  const result: FeedBatchResult = {
    total: items.length,
    valid: valid.length,
    invalid: invalid.length,
    enriched: enriched.length,
    published: publishResult.published,
    stale: 0,
    errors: [
      ...invalid.map((inv) => `Invalido: "${inv.item.title}" — ${inv.errors.join(", ")}`),
      ...publishResult.errors,
    ],
    logs: logger.logs.map((l) => `[${l.level.toUpperCase()}] ${l.message}`),
  };

  // Determine batch status
  let status: FeedSyncBatchRecord["status"] = "success";
  if (publishResult.published === 0 && valid.length > 0) {
    status = "failed";
  } else if (invalid.length > 0 || publishResult.errors.length > 0) {
    status = "partial";
  } else if (valid.length === 0) {
    status = "failed";
  }

  const record: FeedSyncBatchRecord = {
    id: batchId,
    sourceId,
    status,
    result,
    validItems: enriched,
    invalidItems: invalid,
    publishedItems: publishResult.results,
    createdAt: new Date(),
  };

  storeBatch(record);
  logger.log("info", `Pipeline concluido — batch ${batchId}, status=${status}`);

  return { batchId, result };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export function getFeedSyncStats(): {
  totalBatches: number;
  totalItemsProcessed: number;
  totalValid: number;
  totalInvalid: number;
  totalPublished: number;
  totalStale: number;
  recentBatches: FeedSyncBatchRecord[];
} {
  let totalItemsProcessed = 0;
  let totalValid = 0;
  let totalInvalid = 0;
  let totalPublished = 0;
  let totalStale = 0;

  for (const batch of batchStore) {
    totalItemsProcessed += batch.result.total;
    totalValid += batch.result.valid;
    totalInvalid += batch.result.invalid;
    totalPublished += batch.result.published;
    totalStale += batch.result.stale;
  }

  return {
    totalBatches: batchStore.length,
    totalItemsProcessed,
    totalValid,
    totalInvalid,
    totalPublished,
    totalStale,
    recentBatches: batchStore.slice(0, 20),
  };
}

// ---------------------------------------------------------------------------
// Retry a failed batch
// ---------------------------------------------------------------------------

export async function retryBatch(
  batchId: string
): Promise<{ success: boolean; result?: FeedBatchResult; error?: string }> {
  const batch = batchStore.find((b) => b.id === batchId);
  if (!batch) {
    return { success: false, error: `Batch "${batchId}" nao encontrado` };
  }

  if (batch.status !== "failed" && batch.status !== "partial") {
    return { success: false, error: `Batch "${batchId}" nao pode ser re-executado (status=${batch.status})` };
  }

  // Collect all items (valid + previously invalid) to retry
  const allItems: FeedItem[] = [
    ...batch.validItems,
    ...batch.invalidItems.map((inv) => inv.item),
  ];

  if (allItems.length === 0) {
    return { success: false, error: "Nenhum item para re-executar" };
  }

  try {
    const { result } = await runFullSyncPipeline(allItems, batch.sourceId);
    // Update original batch status reference
    batch.status = result.errors.length === 0 ? "success" : "partial";
    batch.result = result;
    return { success: true, result };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
