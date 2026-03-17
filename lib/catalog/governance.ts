// ============================================
// CATALOG GOVERNANCE — classification & health
// ============================================

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import type {
  CatalogState,
  CatalogHealthReport,
  GovernanceIssue,
} from "./governance-types";

// ============================================
// Classify a single product
// ============================================

interface ProductForClassification {
  id: string;
  name: string;
  imageUrl?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  listings?: {
    id: string;
    sourceId: string;
    offers?: { updatedAt: Date; isActive: boolean }[];
  }[];
}

export function classifyProduct(product: ProductForClassification): CatalogState {
  const missingImage = !product.imageUrl;
  const missingBrand = !product.brandId;
  const missingCategory = !product.categoryId;

  if (missingImage || missingBrand || missingCategory) {
    return "incomplete";
  }

  const listings = product.listings ?? [];
  if (listings.length === 0) {
    return "incomplete";
  }

  // Check stale: no offer updated in 30+ days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const allOffers = listings.flatMap((l) => l.offers ?? []);
  const activeOffers = allOffers.filter((o) => o.isActive);

  if (activeOffers.length > 0) {
    const latestUpdate = activeOffers.reduce(
      (latest, o) => (o.updatedAt > latest ? o.updatedAt : latest),
      new Date(0)
    );
    if (latestUpdate < thirtyDaysAgo) {
      return "stale";
    }
  } else if (allOffers.length > 0) {
    return "stale";
  }

  // Check weak-canonical: only 1 unique source
  const uniqueSources = new Set(listings.map((l) => l.sourceId));
  if (uniqueSources.size < 2) {
    return "weak-canonical";
  }

  // Healthy: image + brand + category + active offers from 2+ sources
  if (activeOffers.length >= 1 && uniqueSources.size >= 2) {
    return "healthy";
  }

  return "incomplete";
}

// ============================================
// Full catalog health report
// ============================================

export async function getCatalogHealthReport(): Promise<CatalogHealthReport> {
  let totalProducts = 0;
  let healthyCnt = 0;
  let incompleteCnt = 0;
  let staleCnt = 0;
  let weakCanonicalCnt = 0;

  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        brandId: true,
        categoryId: true,
        listings: {
          select: {
            id: true,
            sourceId: true,
            offers: {
              select: { updatedAt: true, isActive: true },
            },
          },
        },
      },
    });

    totalProducts = products.length;

    for (const product of products) {
      const state = classifyProduct(product);
      switch (state) {
        case "healthy":
          healthyCnt++;
          break;
        case "incomplete":
          incompleteCnt++;
          break;
        case "stale":
          staleCnt++;
          break;
        case "weak-canonical":
          weakCanonicalCnt++;
          break;
      }
    }
  } catch (e) {
    logger.error("governance.health-report.error", { error: e });
  }

  // Orphan listings (no productId)
  let orphanCnt = 0;
  try {
    orphanCnt = await prisma.listing.count({
      where: { productId: null },
    });
  } catch (e) {
    logger.error("governance.orphan-count.error", { error: e });
  }

  return {
    total: totalProducts + orphanCnt,
    healthy: healthyCnt,
    incomplete: incompleteCnt,
    stale: staleCnt,
    orphan: orphanCnt,
    weakCanonical: weakCanonicalCnt,
    generatedAt: new Date(),
  };
}

// ============================================
// Orphan listings — not matched to any product
// ============================================

export async function getOrphanListings(): Promise<GovernanceIssue[]> {
  try {
    const orphans = await prisma.listing.findMany({
      where: { productId: null },
      select: {
        id: true,
        rawTitle: true,
        sourceId: true,
        externalId: true,
      },
      take: 50,
      orderBy: { createdAt: "desc" },
    });

    return orphans.map((l) => ({
      productId: null,
      productName: l.rawTitle,
      listingId: l.id,
      state: "orphan" as CatalogState,
      details: `Listing "${l.rawTitle}" (${l.externalId}) sem produto canonico`,
    }));
  } catch (e) {
    logger.error("governance.orphan-listings.error", { error: e });
    return [];
  }
}

// ============================================
// Stale offers — not updated in N days
// ============================================

export async function getStaleOffers(
  days: number = 30
): Promise<GovernanceIssue[]> {
  try {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const staleOffers: {
      productId: string;
      productName: string;
      offerId: string;
      lastUpdate: Date;
    }[] = await prisma.$queryRaw`
      SELECT
        p.id AS "productId",
        p.name AS "productName",
        o.id AS "offerId",
        o."updatedAt" AS "lastUpdate"
      FROM offers o
      JOIN listings l ON o."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      WHERE o."isActive" = true
      AND o."updatedAt" < ${cutoff}
      AND p.status = 'ACTIVE'
      ORDER BY o."updatedAt" ASC
      LIMIT 50
    `;

    return staleOffers.map((s) => ({
      productId: s.productId,
      productName: s.productName,
      state: "stale" as CatalogState,
      details: `Oferta ${s.offerId} sem atualizacao desde ${s.lastUpdate.toISOString().split("T")[0]}`,
    }));
  } catch (e) {
    logger.error("governance.stale-offers.error", { error: e });
    return [];
  }
}

// ============================================
// Weak canonicals — products with only 1 source
// ============================================

export async function getWeakCanonicals(): Promise<GovernanceIssue[]> {
  try {
    const weak: {
      productId: string;
      productName: string;
      sourceCount: number;
    }[] = await prisma.$queryRaw`
      SELECT
        p.id AS "productId",
        p.name AS "productName",
        COUNT(DISTINCT l."sourceId")::int AS "sourceCount"
      FROM products p
      JOIN listings l ON l."productId" = p.id AND l.status = 'ACTIVE'
      WHERE p.status = 'ACTIVE'
      GROUP BY p.id, p.name
      HAVING COUNT(DISTINCT l."sourceId") = 1
      ORDER BY p."popularityScore" DESC
      LIMIT 50
    `;

    return weak.map((w) => ({
      productId: w.productId,
      productName: w.productName,
      state: "weak-canonical" as CatalogState,
      details: `Apenas ${w.sourceCount} fonte — expandir para mais marketplaces`,
    }));
  } catch (e) {
    logger.error("governance.weak-canonicals.error", { error: e });
    return [];
  }
}

// ============================================
// Products missing specific fields
// ============================================

export async function getProductsWithoutImage(): Promise<GovernanceIssue[]> {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", imageUrl: null },
      select: { id: true, name: true },
      take: 50,
      orderBy: { popularityScore: "desc" },
    });

    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      state: "incomplete" as CatalogState,
      details: "Produto sem imagem principal",
    }));
  } catch (e) {
    logger.error("governance.products-without-image.error", { error: e });
    return [];
  }
}

export async function getProductsWithoutBrand(): Promise<GovernanceIssue[]> {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", brandId: null },
      select: { id: true, name: true },
      take: 50,
      orderBy: { popularityScore: "desc" },
    });

    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      state: "incomplete" as CatalogState,
      details: "Produto sem marca definida",
    }));
  } catch (e) {
    logger.error("governance.products-without-brand.error", { error: e });
    return [];
  }
}

export async function getProductsWithoutCategory(): Promise<GovernanceIssue[]> {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", categoryId: null },
      select: { id: true, name: true },
      take: 50,
      orderBy: { popularityScore: "desc" },
    });

    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      state: "incomplete" as CatalogState,
      details: "Produto sem categoria definida",
    }));
  } catch (e) {
    logger.error("governance.products-without-category.error", { error: e });
    return [];
  }
}
