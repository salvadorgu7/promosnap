import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateAdmin } from "@/lib/auth/admin";

// ─── POST /api/admin/catalog/batch — batch actions on candidates ─────────────

export async function POST(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  let body: { action: string; candidateIds: string[] };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { action, candidateIds } = body;

  if (!action || !["approve", "reject", "publish"].includes(action)) {
    return NextResponse.json(
      { error: "Action deve ser: approve, reject ou publish" },
      { status: 400 },
    );
  }

  if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
    return NextResponse.json(
      { error: "candidateIds obrigatorio (array de IDs)" },
      { status: 400 },
    );
  }

  if (candidateIds.length > 100) {
    return NextResponse.json(
      { error: "Maximo de 100 candidatos por operacao" },
      { status: 400 },
    );
  }

  try {
    if (action === "approve") {
      const result = await prisma.catalogCandidate.updateMany({
        where: { id: { in: candidateIds } },
        data: { status: "APPROVED" },
      });
      return NextResponse.json({ action, updated: result.count });
    }

    if (action === "reject") {
      const result = await prisma.catalogCandidate.updateMany({
        where: { id: { in: candidateIds } },
        data: {
          status: "REJECTED",
          rejectionNote: "Rejeitado em lote pelo administrador",
        },
      });
      return NextResponse.json({ action, updated: result.count });
    }

    // action === "publish" — create Product + Listing from candidate data
    const candidates = await prisma.catalogCandidate.findMany({
      where: {
        id: { in: candidateIds },
        status: "APPROVED",
      },
    });

    if (candidates.length === 0) {
      return NextResponse.json(
        { error: "Nenhum candidato aprovado encontrado para publicar" },
        { status: 400 },
      );
    }

    let published = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const candidate of candidates) {
      try {
        // Generate slug from title
        const baseSlug = candidate.title
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "")
          .slice(0, 100);

        // Ensure unique slug
        const existing = await prisma.product.findUnique({ where: { slug: baseSlug } });
        const slug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

        // Find or skip brand/category
        let brandId: string | undefined;
        if (candidate.brand) {
          const brand = await prisma.brand.findFirst({
            where: { name: { equals: candidate.brand, mode: "insensitive" } },
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

        // Create Product
        const product = await prisma.product.create({
          data: {
            name: candidate.title,
            slug,
            imageUrl: candidate.imageUrl,
            status: "ACTIVE",
            ...(brandId && { brandId }),
            ...(categoryId && { categoryId }),
          },
        });

        // Create Listing + Offer if we have source + affiliate info
        if (candidate.affiliateUrl && candidate.sourceSlug) {
          const source = await prisma.source.findUnique({
            where: { slug: candidate.sourceSlug },
          });

          if (source) {
            const listing = await prisma.listing.create({
              data: {
                sourceId: source.id,
                productId: product.id,
                externalId: candidate.externalId || `import-${candidate.id}`,
                rawTitle: candidate.title,
                imageUrl: candidate.imageUrl,
                productUrl: candidate.affiliateUrl,
                status: "ACTIVE",
              },
            });

            if (candidate.price) {
              await prisma.offer.create({
                data: {
                  listingId: listing.id,
                  currentPrice: candidate.price,
                  originalPrice: candidate.originalPrice,
                  affiliateUrl: candidate.affiliateUrl,
                  isActive: true,
                },
              });
            }
          }
        }

        // Mark candidate as published (IMPORTED in DB)
        await prisma.catalogCandidate.update({
          where: { id: candidate.id },
          data: { status: "IMPORTED" },
        });

        published++;
      } catch (err) {
        skipped++;
        errors.push(`${candidate.title}: ${String(err)}`);
      }
    }

    return NextResponse.json({
      action: "publish",
      total: candidates.length,
      published,
      skipped,
      errors: errors.slice(0, 20),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Erro na operacao em lote: ${String(err)}` },
      { status: 500 },
    );
  }
}
