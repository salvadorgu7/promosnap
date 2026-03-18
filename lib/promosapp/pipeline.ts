// ============================================================================
// PromosApp Pipeline — Full orchestration: parse → dedup → enrich → score → route
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getFlag } from '@/lib/config/feature-flags'
import { runImportPipeline, type ImportItem } from '@/lib/import/pipeline'
import { captureError, captureEvent } from '@/lib/monitoring'
import { parseRawEvents } from './parser'
import { canonicalizeItems, deduplicateBatch } from './canonicalizer'
import { enrichBatch } from './enricher'
import { scoreBatch, decideAction } from './scorer'
import type {
  PromosAppRawEvent,
  PromosAppNormalizedItem,
  PromosAppPipelineResult,
  PromosAppPipelineConfig,
  PromosAppItemResult,
  PromosAppDecision,
  DEFAULT_PIPELINE_CONFIG,
} from './types'

const log = logger.child({ module: 'promosapp-pipeline' })

// ── Helpers ────────────────────────────────────────────────────────────────

/** Check if this dedupeKey already exists in catalog_candidates (recent, not rejected) */
async function isDuplicateInDb(dedupeKey: string): Promise<boolean> {
  const existing = await prisma.catalogCandidate.findFirst({
    where: {
      sourceSlug: 'promosapp',
      externalId: dedupeKey,
      status: { not: 'REJECTED' },
      createdAt: { gte: new Date(Date.now() - 7 * 86400000) }, // Last 7 days
    },
    select: { id: true },
  })
  return !!existing
}

/**
 * Infer a broad category slug from the marketplace when the adapter
 * didn't provide one. Used as a last-resort so WhatsApp products at least
 * land in a recognisable section of the site.
 */
function inferCategoryFromMarketplace(sourceSlug: string): string | undefined {
  // Shein is pure fashion — always safe to categorise as 'moda'
  if (sourceSlug === 'shein') return 'moda'
  // Shopee has fashion, electronics, home — too broad to guess, leave unset
  // ML, Amazon, Magalu — too broad, import pipeline will try to detect from title
  return undefined
}

/** Convert a scored PromosApp item to ImportItem for the existing pipeline.
 *  Uses canonicalUrl (expanded, cleaned) when available, falls back to productUrl.
 */
function toImportItem(item: PromosAppNormalizedItem): ImportItem {
  // Prefer canonical URL (expanded short links, cleaned tracking params)
  // over raw productUrl which may be a meli.la/bit.ly short link
  const cleanUrl = item.canonicalUrl || item.productUrl

  // Use adapter-provided category if available, otherwise infer from marketplace
  const categorySlug = item.category || inferCategoryFromMarketplace(item.sourceSlug)

  return {
    externalId: item.externalId,
    title: item.title,
    currentPrice: item.currentPrice,
    originalPrice: item.originalPrice,
    productUrl: cleanUrl,
    imageUrl: item.imageUrl,
    isFreeShipping: item.isFreeShipping,
    sourceSlug: item.sourceSlug,
    discoverySource: 'promosapp',
    brand: item.brand || undefined,
    categorySlug,
  }
}

/** Persist item as CatalogCandidate for review queue */
async function persistCandidate(
  item: PromosAppNormalizedItem,
  score: number,
  decision: string,
  batchId?: string,
): Promise<string> {
  const candidate = await prisma.catalogCandidate.create({
    data: {
      importBatchId: batchId || undefined,
      title: item.title.slice(0, 500),
      brand: undefined, // Will be detected by import pipeline
      category: undefined,
      imageUrl: item.imageUrl,
      price: item.currentPrice || undefined,
      originalPrice: item.originalPrice,
      affiliateUrl: item.canonicalUrl || item.affiliateUrl,
      sourceSlug: 'promosapp',
      externalId: item.dedupeKey,
      status: decision === 'auto_approve' ? 'APPROVED' :
              decision === 'rejected' ? 'REJECTED' : 'PENDING',
      enrichedData: {
        score,
        sourceChannel: item.rawEvent.sourceChannel,
        marketplace: item.marketplace,
        discount: item.discount,
        couponCode: item.couponCode,
        isFreeShipping: item.isFreeShipping,
        sellerName: item.sellerName,
        productUrl: item.productUrl,
        canonicalUrl: item.canonicalUrl,
        rawTitle: item.rawEvent.rawTitle,
        parseErrors: item.parseErrors,
        capturedAt: item.rawEvent.capturedAt,
      },
    },
  })

  return candidate.id
}

// ── Main Pipeline ──────────────────────────────────────────────────────────

/**
 * Process a batch of raw PromosApp events through the full pipeline.
 *
 * Flow: parse → dedup → canonicalize → enrich → score → route (approve/review/reject)
 *
 * Shadow mode: Everything processes but auto-publish is controlled by FF_PROMOSAPP_AUTO_PUBLISH.
 */
export async function processPromosAppBatch(
  events: PromosAppRawEvent[],
  configOverrides?: Partial<PromosAppPipelineConfig>,
): Promise<PromosAppPipelineResult> {
  const startTime = Date.now()
  const config: PromosAppPipelineConfig = {
    // 40: products scoring 40+ auto-approve (link + price + discount + no spam)
    // 25: products scoring <25 are rejected (no link, no price, spam, parse errors)
    // 25–39: pending_review (borderline — admin can check before publishing)
    autoApproveThreshold: configOverrides?.autoApproveThreshold ?? 40,
    rejectThreshold: configOverrides?.rejectThreshold ?? 25,
    maxBatchSize: configOverrides?.maxBatchSize ?? 200,
    autoPublish: configOverrides?.autoPublish ?? getFlag('promosappAutoPublish'),
    enrichViaAdapters: configOverrides?.enrichViaAdapters ?? true,
    urlExpansionTimeout: configOverrides?.urlExpansionTimeout ?? 5000,
  }

  const result: PromosAppPipelineResult = {
    received: events.length,
    parsed: 0,
    duplicatesSkipped: 0,
    enriched: 0,
    scored: 0,
    autoApproved: 0,
    pendingReview: 0,
    rejected: 0,
    imported: 0,
    failed: 0,
    errors: [],
    items: [],
    durationMs: 0,
  }

  try {
    captureEvent('promosapp:pipeline:start', { count: events.length })
    log.info('promosapp.pipeline.start', { events: events.length, config: { ...config, autoPublish: config.autoPublish } })

    // Enforce batch size
    const trimmedEvents = events.slice(0, config.maxBatchSize)
    if (events.length > config.maxBatchSize) {
      result.errors.push(`Batch truncated from ${events.length} to ${config.maxBatchSize}`)
    }

    // ── Stage 1: Parse ──
    const { items: parsedItems, unparseable } = parseRawEvents(trimmedEvents)
    result.parsed = parsedItems.length
    if (unparseable > 0) {
      result.errors.push(`${unparseable} events could not be parsed`)
    }

    if (parsedItems.length === 0) {
      result.durationMs = Date.now() - startTime
      return result
    }

    // ── Stage 2: Canonicalize URLs ──
    const canonicalized = await canonicalizeItems(parsedItems, {
      timeoutMs: config.urlExpansionTimeout,
    })

    // ── Stage 3: Deduplicate within batch ──
    const { unique, duplicatesRemoved } = deduplicateBatch(canonicalized)
    result.duplicatesSkipped += duplicatesRemoved

    // Deduplicate against DB (recent candidates)
    const dbDeduped: PromosAppNormalizedItem[] = []
    for (const item of unique) {
      const isDup = await isDuplicateInDb(item.dedupeKey)
      if (isDup) {
        result.duplicatesSkipped++
      } else {
        dbDeduped.push(item)
      }
    }

    if (dbDeduped.length === 0) {
      log.info('promosapp.pipeline.all-duplicates', { total: events.length })
      result.durationMs = Date.now() - startTime
      return result
    }

    // ── Stage 4: Enrich via adapters ──
    const enrichResult = await enrichBatch(dbDeduped, { enabled: config.enrichViaAdapters })
    result.enriched = enrichResult.enriched

    // ── Stage 5: Score ──
    const wasEnriched = enrichResult.items.map((_, i) => {
      // Track which items were successfully enriched
      return i < enrichResult.enriched
    })
    const scored = await scoreBatch(enrichResult.items, { wasEnriched })
    result.scored = scored.length

    // ── Stage 6: Create ImportBatch for tracking ──
    const importBatch = await prisma.importBatch.create({
      data: {
        fileName: `promosapp-${new Date().toISOString().slice(0, 10)}`,
        format: 'promosapp',
        status: 'PROCESSING',
        totalItems: scored.length,
      },
    })

    // ── Stage 7: Route decisions ──
    const toImport: PromosAppNormalizedItem[] = []

    const TRUSTED_SOURCES = ['amazon-br', 'mercadolivre', 'shopee', 'magalu', 'magazine-luiza', 'kabum', 'shein']

    for (const { item, score } of scored) {
      const rawDecision = decideAction(score, config)
      const isTrustedSource = TRUSTED_SOURCES.includes(item.sourceSlug)

      // Gate for unknown marketplace:
      //   - Trusted sources (amazon-br, mercadolivre, etc.) → pass through as-is
      //   - Unknown source with high score (>=50) + real title (>20 chars) + valid price (>R$5)
      //     → allow auto_approve (likely a real product from a short-link we couldn't expand)
      //   - Unknown source that doesn't meet quality bar → downgrade to pending_review
      let decision: PromosAppDecision = rawDecision
      if (rawDecision === 'auto_approve' && item.sourceSlug === 'unknown' && !isTrustedSource) {
        const hasSubstantiveTitle = item.title.length > 20 && !/^[A-ZÀÁÂÃÉÊÍÓÔÕÚÇ\s!.,]+$/.test(item.title)
        const hasValidPrice = item.currentPrice >= 5
        const hasHighScore = score.total >= 50
        if (hasSubstantiveTitle && hasValidPrice && hasHighScore) {
          // Good enough data — let it through
          decision = 'auto_approve'
        } else {
          decision = 'pending_review'
        }
      }

      let candidateId: string | undefined
      let importedProductId: string | undefined

      try {
        // Persist to CatalogCandidate (all items, for tracking)
        candidateId = await persistCandidate(item, score.total, decision, importBatch.id)

        if (decision === 'auto_approve') {
          result.autoApproved++
          toImport.push(item)
        } else if (decision === 'pending_review') {
          result.pendingReview++
        } else {
          result.rejected++
        }
      } catch (err) {
        result.failed++
        result.errors.push(`Failed to persist ${item.dedupeKey}: ${String(err)}`)
      }

      result.items.push({
        dedupeKey: item.dedupeKey,
        title: item.title.slice(0, 100),
        sourceSlug: item.sourceSlug,
        currentPrice: item.currentPrice,
        score,
        decision,
        candidateId,
        importedProductId,
        errors: item.parseErrors,
      })
    }

    // ── Stage 8: Auto-import approved items (if enabled) ──
    if (config.autoPublish && toImport.length > 0) {
      try {
        const importItems = toImport.map(toImportItem)
        const importResult = await runImportPipeline(importItems)
        result.imported = importResult.created + importResult.updated
        log.info('promosapp.auto-import', {
          created: importResult.created,
          updated: importResult.updated,
          failed: importResult.failed,
        })
      } catch (err) {
        result.errors.push(`Auto-import failed: ${String(err)}`)
        await captureError(err, { route: 'promosapp-pipeline', stage: 'auto-import' })
      }
    } else if (toImport.length > 0) {
      log.info('promosapp.auto-import.disabled', {
        approved: toImport.length,
        reason: config.autoPublish ? 'none' : 'FF_PROMOSAPP_AUTO_PUBLISH=false',
      })
    }

    // ── Stage 9: Update ImportBatch status ──
    await prisma.importBatch.update({
      where: { id: importBatch.id },
      data: {
        status: 'COMPLETED',
        imported: result.imported,
        rejected: result.rejected,
        processedAt: new Date(),
      },
    })

    captureEvent('promosapp:pipeline:complete', {
      received: result.received,
      parsed: result.parsed,
      approved: result.autoApproved,
      review: result.pendingReview,
      rejected: result.rejected,
      imported: result.imported,
    })
  } catch (err) {
    result.errors.push(`Pipeline error: ${String(err)}`)
    await captureError(err, { route: 'promosapp-pipeline' })
    log.error('promosapp.pipeline.error', { error: String(err) })
  }

  result.durationMs = Date.now() - startTime
  log.info('promosapp.pipeline.done', {
    durationMs: result.durationMs,
    received: result.received,
    imported: result.imported,
    review: result.pendingReview,
    rejected: result.rejected,
  })

  return result
}
