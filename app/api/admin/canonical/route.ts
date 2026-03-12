// ============================================
// ADMIN API — Canonical Operations — V18
// GET:  canonical stats + recent weak matches
// POST: recalculate / merge / extract-attributes
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { validateAdmin } from "@/lib/auth/admin";
import { getCanonicalStats, mergeIntoCanonical } from "@/lib/catalog/canonical-graph";
import { canonicalMatch, findCanonicalCandidates } from "@/lib/catalog/canonical-match";
import { extractAndStoreAttributes } from "@/lib/catalog/product-attributes";
import prisma from "@/lib/db/prisma";

// ─── GET /api/admin/canonical — stats + recent weak matches ──────────────────

export async function GET(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  try {
    const stats = await getCanonicalStats();

    // Get recent weak matches (listings with low matchConfidence)
    const weakMatches = await prisma.listing.findMany({
      where: {
        productId: { not: null },
        matchConfidence: { lt: 0.6 },
        status: "ACTIVE",
      },
      select: {
        id: true,
        rawTitle: true,
        rawBrand: true,
        rawCategory: true,
        matchConfidence: true,
        sourceId: true,
        productId: true,
        product: { select: { name: true, slug: true } },
        source: { select: { name: true } },
      },
      orderBy: { matchConfidence: "asc" },
      take: 30,
    });

    // Get unmatched listings count and samples
    const unmatchedSamples = await prisma.listing.findMany({
      where: {
        productId: null,
        status: "ACTIVE",
      },
      select: {
        id: true,
        rawTitle: true,
        rawBrand: true,
        rawCategory: true,
        sourceId: true,
        source: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      stats,
      weakMatches: weakMatches.map(l => ({
        listingId: l.id,
        rawTitle: l.rawTitle,
        rawBrand: l.rawBrand,
        rawCategory: l.rawCategory,
        matchConfidence: l.matchConfidence,
        sourceName: l.source.name,
        productId: l.productId,
        productName: l.product?.name ?? null,
        productSlug: l.product?.slug ?? null,
      })),
      unmatchedSamples: unmatchedSamples.map(l => ({
        listingId: l.id,
        rawTitle: l.rawTitle,
        rawBrand: l.rawBrand,
        rawCategory: l.rawCategory,
        sourceName: l.source.name,
      })),
    });
  } catch (e) {
    console.error("[admin/canonical] GET error:", e);
    return NextResponse.json(
      { error: "Erro ao buscar dados canonicos" },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/canonical — actions ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  let body: {
    action: string;
    targetProductId?: string;
    sourceProductId?: string;
    limit?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { action } = body;

  // ─── action=recalculate ─────────────────────────────────────────────────
  if (action === "recalculate") {
    const limit = Math.min(body.limit ?? 100, 500);

    try {
      const unmatchedListings = await prisma.listing.findMany({
        where: { productId: null, status: "ACTIVE" },
        select: {
          id: true,
          rawTitle: true,
          rawBrand: true,
          rawCategory: true,
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      });

      let matched = 0;
      let failed = 0;
      const results: { listingId: string; productId: string | null; score: number; confidence: string }[] = [];

      for (const listing of unmatchedListings) {
        try {
          const match = await canonicalMatch({
            rawTitle: listing.rawTitle,
            rawBrand: listing.rawBrand,
            rawCategory: listing.rawCategory,
          });

          if (match && match.confidence !== "weak") {
            // Only auto-link strong and probable matches
            await prisma.listing.update({
              where: { id: listing.id },
              data: {
                productId: match.productId,
                matchConfidence: match.score,
              },
            });
            matched++;
            results.push({
              listingId: listing.id,
              productId: match.productId,
              score: match.score,
              confidence: match.confidence,
            });
          } else if (match) {
            // Weak match — record but don't auto-link
            results.push({
              listingId: listing.id,
              productId: null,
              score: match.score,
              confidence: match.confidence,
            });
            failed++;
          } else {
            failed++;
          }
        } catch (e) {
          console.error(`[canonical] recalculate error for listing ${listing.id}:`, e);
          failed++;
        }
      }

      return NextResponse.json({
        action: "recalculate",
        processed: unmatchedListings.length,
        matched,
        failed,
        results: results.slice(0, 50),
      });
    } catch (e) {
      console.error("[admin/canonical] recalculate error:", e);
      return NextResponse.json(
        { error: "Erro ao recalcular matches" },
        { status: 500 }
      );
    }
  }

  // ─── action=merge ───────────────────────────────────────────────────────
  if (action === "merge") {
    const { targetProductId, sourceProductId } = body;

    if (!targetProductId || !sourceProductId) {
      return NextResponse.json(
        { error: "targetProductId e sourceProductId sao obrigatorios" },
        { status: 400 }
      );
    }

    try {
      const result = await mergeIntoCanonical(targetProductId, sourceProductId);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error, action: "merge", result },
          { status: 400 }
        );
      }

      return NextResponse.json({ action: "merge", result });
    } catch (e) {
      console.error("[admin/canonical] merge error:", e);
      return NextResponse.json(
        { error: "Erro ao fazer merge de produtos" },
        { status: 500 }
      );
    }
  }

  // ─── action=extract-attributes ──────────────────────────────────────────
  if (action === "extract-attributes") {
    const limit = Math.min(body.limit ?? 50, 200);

    try {
      // Find products missing specsJson or with empty specsJson
      const products = await prisma.product.findMany({
        where: {
          status: { in: ["ACTIVE", "PENDING_REVIEW"] },
          OR: [
            { specsJson: { equals: Prisma.DbNull } },
            { specsJson: { equals: Prisma.JsonNull } },
          ],
        },
        select: { id: true, name: true },
        take: limit,
        orderBy: { popularityScore: "desc" },
      });

      let extracted = 0;
      let failed = 0;

      for (const product of products) {
        try {
          const attrs = await extractAndStoreAttributes(product.id);
          if (attrs) extracted++;
          else failed++;
        } catch (e) {
          console.error(`[canonical] extract-attributes error for ${product.id}:`, e);
          failed++;
        }
      }

      return NextResponse.json({
        action: "extract-attributes",
        processed: products.length,
        extracted,
        failed,
      });
    } catch (e) {
      console.error("[admin/canonical] extract-attributes error:", e);
      return NextResponse.json(
        { error: "Erro ao extrair atributos" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: `Acao desconhecida: ${action}. Acoes validas: recalculate, merge, extract-attributes` },
    { status: 400 }
  );
}
