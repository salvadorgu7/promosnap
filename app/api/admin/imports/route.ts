import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { validateAdmin } from "@/lib/auth/admin";
import { parseCSVImport, parseJSONImport, validateCandidate } from "@/lib/ingest/import";
import type { ImportCandidate } from "@/lib/ingest/types";

// ─── GET /api/admin/imports — list import batches ────────────────────────────

export async function GET(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  const batches = await prisma.importBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: {
        select: { candidates: true },
      },
    },
  });

  const result = batches.map((b) => ({
    id: b.id,
    fileName: b.fileName,
    format: b.format,
    status: b.status,
    totalItems: b.totalItems,
    imported: b.imported,
    rejected: b.rejected,
    errors: b.errors,
    candidatesCount: b._count.candidates,
    processedAt: b.processedAt,
    createdAt: b.createdAt,
  }));

  return NextResponse.json({ batches: result });
}

// ─── POST /api/admin/imports — create batch with candidates ──────────────────

export async function POST(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  let body: { content: string; format?: "json" | "csv"; fileName?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { content, format, fileName } = body;

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Campo 'content' obrigatorio" }, { status: 400 });
  }

  // Auto-detect format
  const detectedFormat = format || (content.trim().startsWith("[") || content.trim().startsWith("{") ? "json" : "csv");

  // Parse candidates
  let candidates: ImportCandidate[];
  if (detectedFormat === "json") {
    candidates = parseJSONImport(content);
  } else {
    candidates = parseCSVImport(content);
  }

  if (candidates.length === 0) {
    return NextResponse.json(
      { error: "Nenhum candidato valido encontrado no conteudo fornecido" },
      { status: 400 },
    );
  }

  if (candidates.length > 500) {
    return NextResponse.json(
      { error: "Maximo de 500 itens por importacao" },
      { status: 400 },
    );
  }

  // Validate all candidates upfront
  let validCount = 0;
  let invalidCount = 0;
  const validationErrors: string[] = [];

  for (const c of candidates) {
    const v = validateCandidate(c);
    if (v.isValid) validCount++;
    else {
      invalidCount++;
      validationErrors.push(`${c.title}: ${v.errors.join(", ")}`);
    }
  }

  // Create batch + candidates in a transaction
  const batch = await prisma.importBatch.create({
    data: {
      fileName: fileName || `import-${Date.now()}.${detectedFormat}`,
      format: detectedFormat,
      status: "PENDING",
      totalItems: candidates.length,
      candidates: {
        create: candidates.map((c) => ({
          title: c.title,
          brand: c.brand ?? null,
          category: c.category ?? null,
          imageUrl: c.imageUrl ?? null,
          price: c.price ?? null,
          originalPrice: c.originalPrice ?? null,
          affiliateUrl: c.affiliateUrl ?? null,
          sourceSlug: c.sourceSlug ?? null,
          externalId: c.externalId ?? null,
          status: "PENDING",
        })),
      },
    },
  });

  return NextResponse.json({
    batchId: batch.id,
    totalParsed: candidates.length,
    validCount,
    invalidCount,
    validationErrors: validationErrors.slice(0, 20),
  });
}
