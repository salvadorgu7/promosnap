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
    });
  } catch (err) {
    console.error("[sourcing API] GET error:", err);
    return NextResponse.json(
      { error: `Erro ao carregar dados de sourcing: ${String(err)}` },
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

      default:
        return NextResponse.json(
          {
            error:
              "Action invalida. Use: import, dry-run, process, recalculate, publish, publish-batch, enrich-batch, reject-batch, publish-preview",
          },
          { status: 400 }
        );
    }
  } catch (err) {
    console.error("[sourcing API] POST error:", err);
    return NextResponse.json(
      { error: `Erro na operacao: ${String(err)}` },
      { status: 500 }
    );
  }
}
