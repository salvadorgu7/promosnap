// ============================================
// CANONICAL GRAPH — V18
// Product graph layer for consolidated views,
// variant trees, and safe merges
// ============================================

import prisma from "@/lib/db/prisma";

// ============================================
// Types
// ============================================

export interface CanonicalView {
  product: {
    id: string;
    name: string;
    slug: string;
    imageUrl: string | null;
    description: string | null;
    specsJson: unknown;
    status: string;
    brandId: string | null;
    brandName: string | null;
    categoryId: string | null;
    categoryName: string | null;
    popularityScore: number;
    featured: boolean;
    editorialScore: number | null;
    createdAt: Date;
    updatedAt: Date;
  };
  listings: CanonicalListing[];
  variants: VariantNode[];
  stats: {
    listingCount: number;
    activeOfferCount: number;
    sourceCount: number;
    minPrice: number | null;
    maxPrice: number | null;
    avgPrice: number | null;
  };
}

export interface CanonicalListing {
  id: string;
  sourceId: string;
  sourceName?: string;
  rawTitle: string;
  rawBrand: string | null;
  rawCategory: string | null;
  imageUrl: string | null;
  matchConfidence: number | null;
  status: string;
  variantId: string | null;
  offers: {
    id: string;
    currentPrice: number;
    originalPrice: number | null;
    isActive: boolean;
    affiliateUrl: string | null;
    shippingPrice: number | null;
    isFreeShipping: boolean;
    updatedAt: Date;
  }[];
}

export interface VariantNode {
  id: string;
  variantName: string;
  color: string | null;
  size: string | null;
  storage: string | null;
  modelCode: string | null;
  gtin: string | null;
  listingCount: number;
}

export interface VariantGroup {
  groupKey: string; // e.g. "storage:128GB" or "color:Preto"
  groupType: "storage" | "color" | "size" | "other";
  groupValue: string;
  variants: VariantNode[];
}

export interface CanonicalStats {
  totalProducts: number;
  matchedListings: number;
  unmatchedListings: number;
  avgListingsPerProduct: number;
  productsWithMultipleSources: number;
  totalVariants: number;
}

export interface MergeResult {
  success: boolean;
  targetProductId: string;
  sourceProductId: string;
  listingsMoved: number;
  variantsMoved: number;
  error?: string;
}

// ============================================
// getCanonicalView
// Consolidated view: product + all listings + offers + variants
// ============================================

export async function getCanonicalView(productId: string): Promise<CanonicalView | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      variants: {
        select: {
          id: true,
          variantName: true,
          color: true,
          size: true,
          storage: true,
          modelCode: true,
          gtin: true,
          _count: { select: { listings: true } },
        },
      },
      listings: {
        select: {
          id: true,
          sourceId: true,
          rawTitle: true,
          rawBrand: true,
          rawCategory: true,
          imageUrl: true,
          matchConfidence: true,
          status: true,
          variantId: true,
          source: { select: { name: true } },
          offers: {
            select: {
              id: true,
              currentPrice: true,
              originalPrice: true,
              isActive: true,
              affiliateUrl: true,
              shippingPrice: true,
              isFreeShipping: true,
              updatedAt: true,
            },
            orderBy: { offerScore: "desc" },
          },
        },
      },
    },
  });

  if (!product) return null;

  // Build listings array
  const listings: CanonicalListing[] = product.listings.map(l => ({
    id: l.id,
    sourceId: l.sourceId,
    sourceName: l.source.name,
    rawTitle: l.rawTitle,
    rawBrand: l.rawBrand,
    rawCategory: l.rawCategory,
    imageUrl: l.imageUrl,
    matchConfidence: l.matchConfidence,
    status: l.status,
    variantId: l.variantId,
    offers: l.offers.map(o => ({
      id: o.id,
      currentPrice: o.currentPrice,
      originalPrice: o.originalPrice,
      isActive: o.isActive,
      affiliateUrl: o.affiliateUrl,
      shippingPrice: o.shippingPrice,
      isFreeShipping: o.isFreeShipping,
      updatedAt: o.updatedAt,
    })),
  }));

  // Build variant nodes
  const variants: VariantNode[] = product.variants.map(v => ({
    id: v.id,
    variantName: v.variantName,
    color: v.color,
    size: v.size,
    storage: v.storage,
    modelCode: v.modelCode,
    gtin: v.gtin,
    listingCount: v._count.listings,
  }));

  // Calculate stats
  const activeOffers = listings.flatMap(l => l.offers.filter(o => o.isActive));
  const prices = activeOffers.map(o => o.currentPrice).filter(p => p > 0);
  const uniqueSources = new Set(listings.map(l => l.sourceId));

  return {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl,
      description: product.description,
      specsJson: product.specsJson,
      status: product.status,
      brandId: product.brandId,
      brandName: product.brand?.name ?? null,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      popularityScore: product.popularityScore,
      featured: product.featured,
      editorialScore: product.editorialScore,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    },
    listings,
    variants,
    stats: {
      listingCount: listings.length,
      activeOfferCount: activeOffers.length,
      sourceCount: uniqueSources.size,
      minPrice: prices.length > 0 ? Math.min(...prices) : null,
      maxPrice: prices.length > 0 ? Math.max(...prices) : null,
      avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : null,
    },
  };
}

// ============================================
// getProductListings — grouped by source
// ============================================

export async function getProductListings(
  productId: string
): Promise<Record<string, CanonicalListing[]>> {
  const listings = await prisma.listing.findMany({
    where: { productId },
    select: {
      id: true,
      sourceId: true,
      rawTitle: true,
      rawBrand: true,
      rawCategory: true,
      imageUrl: true,
      matchConfidence: true,
      status: true,
      variantId: true,
      source: { select: { name: true } },
      offers: {
        select: {
          id: true,
          currentPrice: true,
          originalPrice: true,
          isActive: true,
          affiliateUrl: true,
          shippingPrice: true,
          isFreeShipping: true,
          updatedAt: true,
        },
        orderBy: { offerScore: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const grouped: Record<string, CanonicalListing[]> = {};

  for (const l of listings) {
    const key = l.source.name || l.sourceId;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push({
      id: l.id,
      sourceId: l.sourceId,
      sourceName: l.source.name,
      rawTitle: l.rawTitle,
      rawBrand: l.rawBrand,
      rawCategory: l.rawCategory,
      imageUrl: l.imageUrl,
      matchConfidence: l.matchConfidence,
      status: l.status,
      variantId: l.variantId,
      offers: l.offers.map(o => ({
        id: o.id,
        currentPrice: o.currentPrice,
        originalPrice: o.originalPrice,
        isActive: o.isActive,
        affiliateUrl: o.affiliateUrl,
        shippingPrice: o.shippingPrice,
        isFreeShipping: o.isFreeShipping,
        updatedAt: o.updatedAt,
      })),
    });
  }

  return grouped;
}

// ============================================
// getVariantMap — variant tree grouped by attribute type
// ============================================

export async function getVariantMap(productId: string): Promise<VariantGroup[]> {
  const variants = await prisma.productVariant.findMany({
    where: { productId },
    select: {
      id: true,
      variantName: true,
      color: true,
      size: true,
      storage: true,
      modelCode: true,
      gtin: true,
      _count: { select: { listings: true } },
    },
  });

  const groups: VariantGroup[] = [];
  const storageMap = new Map<string, VariantNode[]>();
  const colorMap = new Map<string, VariantNode[]>();
  const sizeMap = new Map<string, VariantNode[]>();
  const otherList: VariantNode[] = [];

  for (const v of variants) {
    const node: VariantNode = {
      id: v.id,
      variantName: v.variantName,
      color: v.color,
      size: v.size,
      storage: v.storage,
      modelCode: v.modelCode,
      gtin: v.gtin,
      listingCount: v._count.listings,
    };

    let classified = false;

    if (v.storage) {
      const key = v.storage;
      if (!storageMap.has(key)) storageMap.set(key, []);
      storageMap.get(key)!.push(node);
      classified = true;
    }

    if (v.color) {
      const key = v.color;
      if (!colorMap.has(key)) colorMap.set(key, []);
      colorMap.get(key)!.push(node);
      classified = true;
    }

    if (v.size) {
      const key = v.size;
      if (!sizeMap.has(key)) sizeMap.set(key, []);
      sizeMap.get(key)!.push(node);
      classified = true;
    }

    if (!classified) {
      otherList.push(node);
    }
  }

  Array.from(storageMap.entries()).forEach(([val, nodes]) => {
    groups.push({ groupKey: `storage:${val}`, groupType: "storage", groupValue: val, variants: nodes });
  });
  Array.from(colorMap.entries()).forEach(([val, nodes]) => {
    groups.push({ groupKey: `color:${val}`, groupType: "color", groupValue: val, variants: nodes });
  });
  Array.from(sizeMap.entries()).forEach(([val, nodes]) => {
    groups.push({ groupKey: `size:${val}`, groupType: "size", groupValue: val, variants: nodes });
  });
  if (otherList.length > 0) {
    groups.push({ groupKey: "other", groupType: "other", groupValue: "other", variants: otherList });
  }

  return groups;
}

// ============================================
// mergeIntoCanonical — safely merge two products
// Moves listings + variants from source to target, marks source as MERGED
// ============================================

export async function mergeIntoCanonical(
  targetProductId: string,
  sourceProductId: string
): Promise<MergeResult> {
  if (targetProductId === sourceProductId) {
    return {
      success: false,
      targetProductId,
      sourceProductId,
      listingsMoved: 0,
      variantsMoved: 0,
      error: "Cannot merge a product into itself",
    };
  }

  // Verify both products exist
  const [target, source] = await Promise.all([
    prisma.product.findUnique({ where: { id: targetProductId }, select: { id: true, status: true } }),
    prisma.product.findUnique({ where: { id: sourceProductId }, select: { id: true, status: true } }),
  ]);

  if (!target) {
    return { success: false, targetProductId, sourceProductId, listingsMoved: 0, variantsMoved: 0, error: "Target product not found" };
  }
  if (!source) {
    return { success: false, targetProductId, sourceProductId, listingsMoved: 0, variantsMoved: 0, error: "Source product not found" };
  }
  if (source.status === "MERGED") {
    return { success: false, targetProductId, sourceProductId, listingsMoved: 0, variantsMoved: 0, error: "Source product already merged" };
  }

  // Perform merge in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Move listings from source to target
    const listingUpdate = await tx.listing.updateMany({
      where: { productId: sourceProductId },
      data: { productId: targetProductId },
    });

    // Move variants from source to target
    const variantUpdate = await tx.productVariant.updateMany({
      where: { productId: sourceProductId },
      data: { productId: targetProductId },
    });

    // Mark source as MERGED
    await tx.product.update({
      where: { id: sourceProductId },
      data: {
        status: "MERGED",
        description: `Merged into ${targetProductId} at ${new Date().toISOString()}`,
      },
    });

    return {
      listingsMoved: listingUpdate.count,
      variantsMoved: variantUpdate.count,
    };
  });

  return {
    success: true,
    targetProductId,
    sourceProductId,
    listingsMoved: result.listingsMoved,
    variantsMoved: result.variantsMoved,
  };
}

// ============================================
// getCanonicalStats — graph-wide statistics
// ============================================

export async function getCanonicalStats(): Promise<CanonicalStats> {
  const [
    totalProducts,
    matchedListings,
    unmatchedListings,
    totalVariants,
  ] = await Promise.all([
    prisma.product.count({ where: { status: { in: ["ACTIVE", "PENDING_REVIEW"] } } }),
    prisma.listing.count({ where: { productId: { not: null } } }),
    prisma.listing.count({ where: { productId: null } }),
    prisma.productVariant.count(),
  ]);

  const avgListingsPerProduct = totalProducts > 0
    ? matchedListings / totalProducts
    : 0;

  // Products with listings from 2+ sources
  let productsWithMultipleSources = 0;
  try {
    const multiSourceResult: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS cnt FROM (
        SELECT l."productId"
        FROM listings l
        WHERE l."productId" IS NOT NULL
        AND l.status = 'ACTIVE'
        GROUP BY l."productId"
        HAVING COUNT(DISTINCT l."sourceId") >= 2
      ) sub
    `;
    productsWithMultipleSources = Number(multiSourceResult[0]?.cnt ?? 0);
  } catch (e) {
    console.error("[canonical-graph] multiSource query error:", e);
  }

  return {
    totalProducts,
    matchedListings,
    unmatchedListings,
    avgListingsPerProduct: Math.round(avgListingsPerProduct * 100) / 100,
    productsWithMultipleSources,
    totalVariants,
  };
}
