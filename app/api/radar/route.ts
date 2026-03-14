import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { buildProductCard, PRODUCT_INCLUDE } from "@/lib/db/queries";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];
  const categories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
  const limit = Math.min(parseInt(searchParams.get("limit") || "8"), 20);

  // Fetch favorites
  let favorites: ReturnType<typeof buildProductCard>[] = [];
  if (ids.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: ids.slice(0, 50) }, status: "ACTIVE" },
      include: PRODUCT_INCLUDE,
    });
    favorites = products.map(buildProductCard).filter(Boolean);
    // Preserve order
    const orderMap = new Map(ids.map((id, i) => [id, i]));
    favorites.sort((a, b) => (orderMap.get(a!.id) ?? 99) - (orderMap.get(b!.id) ?? 99));
  }

  // Fetch opportunities
  let opportunities: ReturnType<typeof buildProductCard>[] = [];
  if (categories.length > 0) {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        category: { slug: { in: categories } },
        ...(ids.length > 0 ? { id: { notIn: ids } } : {}),
      },
      include: PRODUCT_INCLUDE,
      orderBy: { popularityScore: "desc" },
      take: limit,
    });
    opportunities = products.map(buildProductCard).filter(Boolean);
  }

  return NextResponse.json({ favorites, opportunities });
}
