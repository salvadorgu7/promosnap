import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { validateAdmin } from "@/lib/auth/admin";
import {
  getSourcingPipelines,
  getSourcingStats,
  getActiveStrategyInfo,
} from "@/lib/sourcing/strategy";
import {
  processSourceFeed,
  processBatchItems,
  dryRunImport,
} from "@/lib/sourcing/feed-ingestion";
import type { FeedFormat } from "@/lib/sourcing/feed-ingestion";
import {
  publishBatch,
  enrichBatch,
  rejectBatch,
  getPublishPreview,
} from "@/lib/sourcing/publish-pipeline";
import { adapterRegistry } from "@/lib/adapters/registry";
import { getSyncPipelines } from "@/lib/adapters/sync-architecture";
import { getSyncRecommendations } from "@/lib/sourcing/sync-recommendations";

// ─── GET /api/admin/sourcing ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  try {
    const [pipelines, stats, recentBatches, candidateCounts] =
      await Promise.all([
        getSourcingPipelines(),
        getSourcingStats(),
        prisma.importBatch.findMany({
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            _count: { select: { candidates: true } },
          },
        }),
        prisma.catalogCandidate.groupBy({
          by: ["status"],
          _count: { status: true },
        }),
      ]);

    const strategyInfo = getActiveStrategyInfo();

    // Organize candidate counts
    const counts: Record<string, number> = {};
    for (const c of candidateCounts) {
      counts[c.status] = c._count.status;
    }

    // Recent candidates (new, weak match, ready to publish)
    const [newCandidates, weakMatchCandidates, readyToPublish] =
      await Promise.all([
        prisma.catalogCandidate.findMany({
          where: { status: "PENDING" },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            brand: true,
            category: true,
            status: true,
            createdAt: true,
            enrichedData: true,
          },
        }),
        prisma.catalogCandidate.findMany({
          where: {
            status: "APPROVED",
            enrichedData: { path: ["trustScore"], lt: 50 },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            brand: true,
            status: true,
            enrichedData: true,
          },
        }),
        prisma.catalogCandidate.findMany({
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            title: true,
            brand: true,
            category: true,
            status: true,
            enrichedData: true,
          },
        }),
      ]);

    // V22: Sync pipelines and history
    const syncPipelines = getSyncPipelines().map((p) => ({
      sourceId: p.sourceId,
      name: p.name,
      status: p.status,
      blockers: p.blockers,
      capabilityTruth: {
        status: p.capabilityTruth.status,
        capabilities: p.capabilityTruth.capabilities,
        missing: p.capabilityTruth.missing,
        lastSync: p.capabilityTruth.lastSync?.toISOString() ?? null,
      },
    }));

    return NextResponse.json({
      strategy: strategyInfo,
      pipelines,
      stats,
      candidateCounts: counts,
      recentBatches: recentBatches.map((b) => ({
        id: b.id,
        fileName: b.fileName,
        format: b.format,
        status: b.status,
        totalItems: b.totalItems,
        imported: b.imported,
        rejected: b.rejected,
        candidatesCount: b._count.candidates,
        processedAt: b.processedAt,
        createdAt: b.createdAt,
      })),
      newCandidates,
      weakMatchCandidates,
      readyToPublish,
      syncPipelines,
      syncHistory: [],
    });
  } catch (err) {
    console.error("[sourcing API] GET error:", err);
    return NextResponse.json(
      { error: 'Erro ao carregar dados de sourcing' },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/sourcing ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  let body: {
    action: string;
    content?: string;
    format?: FeedFormat;
    sourceSlug?: string;
    sourceId?: string;
    offerId?: string;
    batchId?: string;
    candidateIds?: string[];
    reason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { action } = body;

  try {
    switch (action) {
      // ─── Import ───────────────────────────────────────────────────
      case "import": {
        const { content, format = "json", sourceSlug = "manual" } = body;
        if (!content) {
          return NextResponse.json(
            { error: "Conteudo obrigatorio para importacao" },
            { status: 400 }
          );
        }

        const result = await processSourceFeed(content, sourceSlug, format);
        return NextResponse.json(result);
      }

      // ─── V19: Dry-run import ──────────────────────────────────────
      case "dry-run": {
        const { content, format = "json" } = body;
        if (!content) {
          return NextResponse.json(
            { error: "Conteudo obrigatorio para validacao" },
            { status: 400 }
          );
        }

        const result = await dryRunImport(content, format);
        return NextResponse.json({ action: "dry-run", ...result });
      }

      // ─── Process batch ────────────────────────────────────────────
      case "process": {
        const { batchId } = body;
        if (!batchId) {
          return NextResponse.json(
            { error: "batchId obrigatorio" },
            { status: 400 }
          );
        }

        const result = await processBatchItems(batchId);
        return NextResponse.json(result);
      }

      // ─── Recalculate ──────────────────────────────────────────────
      case "recalculate": {
        const { candidateIds } = body;
        if (!candidateIds || candidateIds.length === 0) {
          return NextResponse.json(
            { error: "candidateIds obrigatorio" },
            { status: 400 }
          );
        }

        // Reset candidates to PENDING for reprocessing
        const result = await prisma.catalogCandidate.updateMany({
          where: { id: { in: candidateIds } },
          data: { status: "PENDING", enrichedData: Prisma.DbNull },
        });

        return NextResponse.json({
          action: "recalculate",
          reset: result.count,
        });
      }

      // ─── V19: Publish batch (via publish pipeline) ────────────────
      case "publish-batch": {
        const { candidateIds } = body;
        if (!candidateIds || candidateIds.length === 0) {
          return NextResponse.json(
            { error: "candidateIds obrigatorio" },
            { status: 400 }
          );
        }

        const result = await publishBatch(candidateIds);
        return NextResponse.json({ action: "publish-batch", ...result });
      }

      // ─── Legacy publish (kept for backward compat) ────────────────
      case "publish": {
        const { candidateIds } = body;
        if (!candidateIds || candidateIds.length === 0) {
          return NextResponse.json(
            { error: "candidateIds obrigatorio" },
            { status: 400 }
          );
        }

        // Delegate to new publish pipeline
        const result = await publishBatch(candidateIds);
        return NextResponse.json({
          action: "publish",
          total: result.total,
          published: result.published,
          errors: result.results
            .filter(r => !r.success)
            .map(r => `${r.title}: ${r.error}`)
            .slice(0, 20),
        });
      }

      // ─── V19: Enrich batch ────────────────────────────────────────
      case "enrich-batch": {
        const { candidateIds } = body;
        if (!candidateIds || candidateIds.length === 0) {
          return NextResponse.json(
            { error: "candidateIds obrigatorio" },
            { status: 400 }
          );
        }

        const result = await enrichBatch(candidateIds);
        return NextResponse.json({ action: "enrich-batch", ...result });
      }

      // ─── V19: Reject batch with reason ────────────────────────────
      case "reject-batch": {
        const { candidateIds, reason } = body;
        if (!candidateIds || candidateIds.length === 0) {
          return NextResponse.json(
            { error: "candidateIds obrigatorio" },
            { status: 400 }
          );
        }

        const result = await rejectBatch(candidateIds, reason || "Rejected by admin");
        return NextResponse.json({ action: "reject-batch", ...result });
      }

      // ─── V19: Publish preview ─────────────────────────────────────
      case "publish-preview": {
        const { candidateIds } = body;
        if (!candidateIds || candidateIds.length === 0) {
          return NextResponse.json(
            { error: "candidateIds obrigatorio" },
            { status: 400 }
          );
        }

        const result = await getPublishPreview(candidateIds);
        return NextResponse.json({ action: "publish-preview", ...result });
      }

      // ─── V22: Sync a source ───────────────────────────────────────
      case "sync": {
        const { sourceId } = body;
        if (!sourceId) {
          return NextResponse.json(
            { error: "sourceId obrigatorio para sync" },
            { status: 400 }
          );
        }

        const adapter = adapterRegistry.get(sourceId);
        if (!adapter) {
          return NextResponse.json(
            { error: `Adapter "${sourceId}" nao encontrado. Adapters disponiveis: ${adapterRegistry.getAll().map(a => a.slug).join(', ')}` },
            { status: 404 }
          );
        }

        if (!adapter.syncFeed) {
          return NextResponse.json(
            { error: `Adapter "${sourceId}" nao suporta syncFeed(). Metodo nao implementado.` },
            { status: 400 }
          );
        }

        const syncResult = await adapter.syncFeed();
        return NextResponse.json({
          action: "sync",
          sourceId,
          ...syncResult,
        });
      }

      // ─── V22: Refresh a single offer ──────────────────────────────
      case "refresh-offer": {
        const { sourceId, offerId } = body;
        if (!sourceId || !offerId) {
          return NextResponse.json(
            { error: "sourceId e offerId obrigatorios para refresh-offer" },
            { status: 400 }
          );
        }

        const refreshAdapter = adapterRegistry.get(sourceId);
        if (!refreshAdapter) {
          return NextResponse.json(
            { error: `Adapter "${sourceId}" nao encontrado` },
            { status: 404 }
          );
        }

        if (!refreshAdapter.refreshOffer) {
          return NextResponse.json(
            { error: `Adapter "${sourceId}" nao suporta refreshOffer()` },
            { status: 400 }
          );
        }

        const refreshed = await refreshAdapter.refreshOffer(offerId);
        if (!refreshed) {
          return NextResponse.json(
            { error: `Oferta "${offerId}" nao encontrada no adapter "${sourceId}"` },
            { status: 404 }
          );
        }

        return NextResponse.json({
          action: "refresh-offer",
          sourceId,
          offerId,
          offer: refreshed,
        });
      }

      // ─── V22: Sync recommendations ────────────────────────────────
      case "sync-recommendations": {
        const recommendations = getSyncRecommendations();
        return NextResponse.json({
          action: "sync-recommendations",
          recommendations,
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Action invalida. Use: import, dry-run, process, recalculate, publish, publish-batch, enrich-batch, reject-batch, publish-preview, sync, refresh-offer, sync-recommendations",
          },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[sourcing API] POST error:", err);
    return NextResponse.json(
      { error: 'Erro interno na operacao de sourcing' },
      { status: 500 }
    );
  }
}
