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
} from "@/lib/sourcing/feed-ingestion";
import type { FeedFormat } from "@/lib/sourcing/feed-ingestion";

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
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { action } = body;

  try {
    switch (action) {
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

      case "publish": {
        const { candidateIds } = body;
        if (!candidateIds || candidateIds.length === 0) {
          return NextResponse.json(
            { error: "candidateIds obrigatorio" },
            { status: 400 }
          );
        }

        // Delegate to existing batch action logic
        const candidates = await prisma.catalogCandidate.findMany({
          where: { id: { in: candidateIds }, status: "APPROVED" },
        });

        if (candidates.length === 0) {
          return NextResponse.json(
            { error: "Nenhum candidato aprovado encontrado" },
            { status: 400 }
          );
        }

        let published = 0;
        const errors: string[] = [];

        for (const candidate of candidates) {
          try {
            const baseSlug = candidate.title
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/(^-|-$)/g, "")
              .slice(0, 100);

            const existing = await prisma.product.findUnique({
              where: { slug: baseSlug },
            });
            const slug = existing
              ? `${baseSlug}-${Date.now().toString(36)}`
              : baseSlug;

            let brandId: string | undefined;
            if (candidate.brand) {
              const brand = await prisma.brand.findFirst({
                where: {
                  name: { equals: candidate.brand, mode: "insensitive" },
                },
              });
              brandId = brand?.id;
            }

            let categoryId: string | undefined;
            if (candidate.category) {
              const category = await prisma.category.findFirst({
                where: { slug: candidate.category },
              });
              categoryId = category?.id;
            }

            await prisma.product.create({
              data: {
                name: candidate.title,
                slug,
                imageUrl: candidate.imageUrl,
                status: "ACTIVE",
                ...(brandId && { brandId }),
                ...(categoryId && { categoryId }),
              },
            });

            await prisma.catalogCandidate.update({
              where: { id: candidate.id },
              data: { status: "IMPORTED" },
            });

            published++;
          } catch (err) {
            errors.push(`${candidate.title}: ${String(err)}`);
          }
        }

        return NextResponse.json({
          action: "publish",
          total: candidates.length,
          published,
          errors: errors.slice(0, 20),
        });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Action invalida. Use: import, process, recalculate, publish",
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
