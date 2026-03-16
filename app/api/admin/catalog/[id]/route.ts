import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateAdmin } from "@/lib/auth/admin";
import { logger } from "@/lib/logger";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      name, imageUrl, status,
      featured, hidden, needsReview, editorialScore,
      brandId, categoryId,
    } = body;

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(status !== undefined && { status }),
        ...(featured !== undefined && { featured }),
        ...(hidden !== undefined && { hidden }),
        ...(needsReview !== undefined && { needsReview }),
        ...(editorialScore !== undefined && { editorialScore: editorialScore === null ? null : parseInt(editorialScore) }),
        ...(brandId !== undefined && { brandId: brandId || null }),
        ...(categoryId !== undefined && { categoryId: categoryId || null }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        status: true,
        featured: true,
        hidden: true,
        needsReview: true,
        editorialScore: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    logger.error("catalog-product.update-failed", { error, productId: id });
    return NextResponse.json({ error: "Failed to update product" }, { status: 500 });
  }
}
