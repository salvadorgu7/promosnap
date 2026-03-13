import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { validateAdmin } from "@/lib/auth/admin";
import { enrichCandidate, determineSubStatus } from "@/lib/ingest/enrich";
import type { ImportCandidate } from "@/lib/ingest/types";

// ─── POST /api/admin/imports/[id]/enrich — enrich candidates without processing ─

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID do batch obrigatorio" }, { status: 400 });
  }

  try {
    const batch = await prisma.importBatch.findUnique({
      where: { id },
      include: { candidates: { where: { status: "PENDING" } } },
    });

    if (!batch) {
      return NextResponse.json({ error: "Batch nao encontrado" }, { status: 404 });
    }

    if (batch.candidates.length === 0) {
      return NextResponse.json({ error: "Nenhum candidato pendente neste batch" }, { status: 400 });
    }

    let enriched = 0;
    let needsReview = 0;
    const notes: string[] = [];

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

      const enrichment = enrichCandidate(importCandidate);
      const subStatus = determineSubStatus(enrichment, "PENDING");
      enrichment.subStatus = subStatus;

      await prisma.catalogCandidate.update({
        where: { id: candidate.id },
        data: {
          brand: enrichment.detectedBrand || candidate.brand,
          category: enrichment.inferredCategory || candidate.category,
          enrichedData: enrichment as unknown as Prisma.InputJsonValue,
          // Keep status as PENDING — enrichment is separate from approval
        },
      });

      if (subStatus === "NEEDS_REVIEW") {
        needsReview++;
        notes.push(`${candidate.title}: precisa revisao (score: ${enrichment.trustScore})`);
      }
      enriched++;
    }

    return NextResponse.json({
      batchId: id,
      total: batch.candidates.length,
      enriched,
      needsReview,
      notes: notes.slice(0, 20),
    });
  } catch (err) {
    return NextResponse.json(
      { error: 'Erro ao enriquecer batch' },
      { status: 500 },
    );
  }
}
