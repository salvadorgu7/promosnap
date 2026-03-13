// ============================================
// API: Admin Feed Sync — V22
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import {
  validateFeedBatch,
  runFullSyncPipeline,
  markStaleItems,
  retryBatch,
  getFeedSyncStats,
  getBatches,
} from "@/lib/feed-sync/engine";
import { sourceSyncJob, staleCleanupJob } from "@/lib/feed-sync/jobs";
import type { FeedItem } from "@/lib/feed-sync/types";

// ---------------------------------------------------------------------------
// GET — feed sync stats, recent batches, stale info
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const authErr = validateAdmin(req);
  if (authErr) return authErr;

  try {
    const stats = getFeedSyncStats();
    const batches = getBatches(30);

    return NextResponse.json({
      stats: {
        totalBatches: stats.totalBatches,
        totalItemsProcessed: stats.totalItemsProcessed,
        totalValid: stats.totalValid,
        totalInvalid: stats.totalInvalid,
        totalPublished: stats.totalPublished,
        totalStale: stats.totalStale,
      },
      recentBatches: batches.map((b) => ({
        id: b.id,
        sourceId: b.sourceId,
        status: b.status,
        total: b.result.total,
        valid: b.result.valid,
        invalid: b.result.invalid,
        enriched: b.result.enriched,
        published: b.result.published,
        stale: b.result.stale,
        errorCount: b.result.errors.length,
        logCount: b.result.logs.length,
        createdAt: b.createdAt.toISOString(),
        validItems: b.validItems.slice(0, 10),
        invalidItems: b.invalidItems.slice(0, 10),
        publishedItems: b.publishedItems.slice(0, 10),
        errors: b.result.errors.slice(0, 20),
        logs: b.result.logs.slice(0, 30),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST — actions: validate-batch, run-sync, mark-stale, retry-batch
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const authErr = validateAdmin(req);
  if (authErr) return authErr;

  try {
    const body = await req.json();
    const action = body.action as string;

    switch (action) {
      // ── validate-batch: validate items without persisting ──
      case "validate-batch": {
        const items = body.items as FeedItem[];
        if (!items || !Array.isArray(items)) {
          return NextResponse.json(
            { error: "Campo 'items' obrigatorio (array de FeedItem)" },
            { status: 400 }
          );
        }

        const { valid, invalid } = validateFeedBatch(items);
        return NextResponse.json({
          action: "validate-batch",
          total: items.length,
          valid: valid.length,
          invalid: invalid.length,
          validItems: valid.slice(0, 50),
          invalidItems: invalid.slice(0, 50).map((inv) => ({
            title: inv.item.title,
            errors: inv.errors,
          })),
        });
      }

      // ── run-sync: full pipeline ──
      case "run-sync": {
        const items = body.items as FeedItem[] | undefined;
        const sourceId = (body.sourceId as string) || "manual-sync";

        // If items provided, run pipeline directly
        if (items && Array.isArray(items) && items.length > 0) {
          const { batchId, result } = await runFullSyncPipeline(items, sourceId);
          return NextResponse.json({
            action: "run-sync",
            batchId,
            result,
          });
        }

        // If no items but sourceId provided, run source sync job
        if (body.sourceId) {
          const job = await sourceSyncJob(body.sourceId);
          return NextResponse.json({
            action: "run-sync",
            job: {
              id: job.id,
              sourceId: job.sourceId,
              status: job.status,
              result: job.result,
              error: job.error,
            },
          });
        }

        return NextResponse.json(
          { error: "Forneça 'items' (array) ou 'sourceId' para executar o sync" },
          { status: 400 }
        );
      }

      // ── mark-stale: mark stale items for a source ──
      case "mark-stale": {
        const sourceId = body.sourceId as string;
        const maxAgeDays = (body.maxAgeDays as number) || 14;

        if (sourceId) {
          const { staleCount, staleItems } = await markStaleItems(sourceId, maxAgeDays);
          return NextResponse.json({
            action: "mark-stale",
            sourceId,
            maxAgeDays,
            staleCount,
            staleItems: staleItems.slice(0, 50),
          });
        }

        // No sourceId — run for all sources
        const job = await staleCleanupJob(maxAgeDays);
        return NextResponse.json({
          action: "mark-stale",
          job: {
            id: job.id,
            status: job.status,
            result: job.result,
          },
        });
      }

      // ── retry-batch: retry a failed batch ──
      case "retry-batch": {
        const batchId = body.batchId as string;
        if (!batchId) {
          return NextResponse.json(
            { error: "Campo 'batchId' obrigatorio" },
            { status: 400 }
          );
        }

        const retryResult = await retryBatch(batchId);
        return NextResponse.json({
          action: "retry-batch",
          batchId,
          ...retryResult,
        });
      }

      default:
        return NextResponse.json(
          {
            error: `Acao desconhecida: "${action}"`,
            availableActions: [
              "validate-batch",
              "run-sync",
              "mark-stale",
              "retry-batch",
            ],
          },
          { status: 400 }
        );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
