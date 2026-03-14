import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

/**
 * GET — Preview: show count of seed products and what will be deleted
 * DELETE — Execute: remove all seed products and their cascade (listings, offers, snapshots, clickouts)
 */

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  const seedProducts = await prisma.product.findMany({
    where: { originType: "seed" },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      _count: {
        select: {
          listings: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const totalOffers = await prisma.offer.count({
    where: { listing: { product: { originType: "seed" } } },
  });

  const totalClickouts = await prisma.clickout.count({
    where: { offer: { listing: { product: { originType: "seed" } } } },
  });

  return NextResponse.json({
    seedProducts: seedProducts.length,
    totalListings: seedProducts.reduce((sum, p) => sum + p._count.listings, 0),
    totalOffers,
    totalClickouts,
    products: seedProducts.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      status: p.status,
      listings: p._count.listings,
    })),
  });
}

export async function DELETE(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  // Cascade delete: clickouts → price_snapshots → offers → listings → variants → products
  // We do it in order to respect foreign keys

  // 1. Delete clickouts for seed offers
  const deletedClickouts = await prisma.clickout.deleteMany({
    where: { offer: { listing: { product: { originType: "seed" } } } },
  });

  // 2. Delete price snapshots for seed offers
  const deletedSnapshots = await prisma.priceSnapshot.deleteMany({
    where: { offer: { listing: { product: { originType: "seed" } } } },
  });

  // 3. Delete offers for seed listings
  const deletedOffers = await prisma.offer.deleteMany({
    where: { listing: { product: { originType: "seed" } } },
  });

  // 4. Delete listings for seed products
  const deletedListings = await prisma.listing.deleteMany({
    where: { product: { originType: "seed" } },
  });

  // 5. Delete product variants for seed products
  const deletedVariants = await prisma.productVariant.deleteMany({
    where: { product: { originType: "seed" } },
  });

  // 6. Delete seed products
  const deletedProducts = await prisma.product.deleteMany({
    where: { originType: "seed" },
  });

  return NextResponse.json({
    success: true,
    deleted: {
      products: deletedProducts.count,
      variants: deletedVariants.count,
      listings: deletedListings.count,
      offers: deletedOffers.count,
      snapshots: deletedSnapshots.count,
      clickouts: deletedClickouts.count,
    },
  });
}
