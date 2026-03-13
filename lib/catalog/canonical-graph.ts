// ============================================
// CANONICAL GRAPH — V18→V19
// Product graph layer for consolidated views,
// variant trees, and safe merges
// V19: getCanonicalFamily, splitCanonical,
//      improved stats with coverage + confidence
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
  // V19 additions
  coveragePercentage: number; // matched / (matched + unmatched)
  avgConfidence: number; // avg matchConfidence across matched listings
  strongMatchCount: number; // listings with confidence > 0.85
  probableMatchCount: number; // listings with confidence 0.6-0.85
  weakMatchCount: number; // listings with confidence < 0.6
  productsWithVariants: number;
  productsNoListings: number;
}

export interface MergeResult {
  success: boolean;
  targetProductId: string;
  sourceProductId: string;
  listingsMoved: number;
  variantsMoved: number;
  error?: string;
}

// V19: Canonical Family types
export interface CanonicalFamilyMember {
  productId: string;
  productName: string;
  slug: string;
  relation: "self" | "variant" | "similar-brand" | "same-category";
  sharedAttributes: string[];
  listingCount: number;
}

export interface CanonicalFamily {
  product: {
    id: string;
    name: string;
    slug: string;
    brandName: string | null;
    categoryName: string | null;
  };
  members: CanonicalFamilyMember[];
  totalRelated: number;
}

// V19: Split result
export interface SplitResult {
  success: boolean;
  newProductId: string | null;
  listingsMoved: number;
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
// V19: getCanonicalFamily
// Returns a product + all related canonicals
// (same brand+category variants, similar products)
// ============================================

export async function getCanonicalFamily(productId: string): Promise<CanonicalFamily | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      brandId: true,
      categoryId: true,
      specsJson: true,
      brand: { select: { name: true } },
      category: { select: { name: true } },
      _count: { select: { listings: true } },
    },
  });

  if (!product) return null;

  const members: CanonicalFamilyMember[] = [];

  // Self
  members.push({
    productId: product.id,
    productName: product.name,
    slug: product.slug,
    relation: "self",
    sharedAttributes: [],
    listingCount: product._count.listings,
  });

  // Find variants: same brand, same category, similar name (likely different storage/color)
  if (product.brandId && product.categoryId) {
    const variants = await prisma.product.findMany({
      where: {
        id: { not: product.id },
        brandId: product.brandId,
        categoryId: product.categoryId,
        status: { in: ["ACTIVE", "PENDING_REVIEW"] },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        specsJson: true,
        _count: { select: { listings: true } },
      },
      take: 20,
    });

    for (const v of variants) {
      const shared: string[] = [];
      if (product.brandId) shared.push("brand");
      if (product.categoryId) shared.push("category");

      // Determine if it's a variant (very similar name) or just similar
      const nameA = product.name.toLowerCase().replace(/\d+\s*gb|\d+\s*tb/gi, '').trim();
      const nameB = v.name.toLowerCase().replace(/\d+\s*gb|\d+\s*tb/gi, '').trim();
      const isVariant = nameA === nameB || nameA.includes(nameB) || nameB.includes(nameA);

      if (isVariant) shared.push("model-base");

      members.push({
        productId: v.id,
        productName: v.name,
        slug: v.slug,
        relation: isVariant ? "variant" : "same-category",
        sharedAttributes: shared,
        listingCount: v._count.listings,
      });
    }
  } else if (product.brandId) {
    // Same brand, different category
    const sameBrand = await prisma.product.findMany({
      where: {
        id: { not: product.id },
        brandId: product.brandId,
        status: { in: ["ACTIVE", "PENDING_REVIEW"] },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: { select: { listings: true } },
      },
      take: 10,
    });

    for (const sb of sameBrand) {
      members.push({
        productId: sb.id,
        productName: sb.name,
        slug: sb.slug,
        relation: "similar-brand",
        sharedAttributes: ["brand"],
        listingCount: sb._count.listings,
      });
    }
  }

  return {
    product: {
      id: product.id,
      name: product.name,
      slug: product.slug,
      brandName: product.brand?.name ?? null,
      categoryName: product.category?.name ?? null,
    },
    members,
    totalRelated: members.length - 1, // exclude self
  };
}

// ============================================
// V19: splitCanonical
// Split specific listings from a product into a new product
// (reverse of merge)
// ============================================

export async function splitCanonical(
  productId: string,
  listingIds: string[]
): Promise<SplitResult> {
  if (listingIds.length === 0) {
    return { success: false, newProductId: null, listingsMoved: 0, error: "No listing IDs provided" };
  }

  // Get the source product and verify listings belong to it
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      slug: true,
      brandId: true,
      categoryId: true,
      imageUrl: true,
      _count: { select: { listings: true } },
    },
  });

  if (!product) {
    return { success: false, newProductId: null, listingsMoved: 0, error: "Product not found" };
  }

  // Verify all listing IDs belong to this product
  const listings = await prisma.listing.findMany({
    where: { id: { in: listingIds }, productId },
    select: { id: true, rawTitle: true, imageUrl: true },
  });

  if (listings.length === 0) {
    return { success: false, newProductId: null, listingsMoved: 0, error: "No matching listings found for this product" };
  }

  // Don't allow splitting ALL listings — at least one must remain
  if (listings.length >= product._count.listings) {
    return { success: false, newProductId: null, listingsMoved: 0, error: "Cannot split all listings — at least one must remain on the original product" };
  }

  // Create new product from the first listing's title
  const newName = listings[0].rawTitle;
  const baseSlug = newName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 100);

  const result = await prisma.$transaction(async (tx) => {
    // Check for slug collision
    const existing = await tx.product.findUnique({ where: { slug: baseSlug } });
    const slug = existing ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    // Create the new product
    const newProduct = await tx.product.create({
      data: {
        name: newName,
        slug,
        brandId: product.brandId,
        categoryId: product.categoryId,
        imageUrl: listings[0].imageUrl ?? product.imageUrl,
        status: "PENDING_REVIEW",
      },
    });

    // Move the specified listings
    const updated = await tx.listing.updateMany({
      where: { id: { in: listingIds }, productId },
      data: { productId: newProduct.id },
    });

    return { newProductId: newProduct.id, listingsMoved: updated.count };
  });

  return {
    success: true,
    newProductId: result.newProductId,
    listingsMoved: result.listingsMoved,
  };
}

// ============================================
// getCanonicalStats — V19: improved graph-wide statistics
// ============================================

export async function getCanonicalStats(): Promise<CanonicalStats> {
  const [
    totalProducts,
    matchedListings,
    unmatchedListings,
    totalVariants,
    productsNoListingsCount,
  ] = await Promise.all([
    prisma.product.count({ where: { status: { in: ["ACTIVE", "PENDING_REVIEW"] } } }),
    prisma.listing.count({ where: { productId: { not: null } } }),
    prisma.listing.count({ where: { productId: null } }),
    prisma.productVariant.count(),
    prisma.product.count({
      where: {
        status: { in: ["ACTIVE", "PENDING_REVIEW"] },
        listings: { none: {} },
      },
    }),
  ]);

  const avgListingsPerProduct = totalProducts > 0
    ? matchedListings / totalProducts
    : 0;

  const totalListings = matchedListings + unmatchedListings;
  const coveragePercentage = totalListings > 0
    ? Math.round((matchedListings / totalListings) * 10000) / 100
    : 0;

  // V19: Confidence distribution
  let avgConfidence = 0;
  let strongMatchCount = 0;
  let probableMatchCount = 0;
  let weakMatchCount = 0;

  try {
    const confidenceRows: {
      avg_conf: number | null;
      strong: bigint;
      probable: bigint;
      weak: bigint;
    }[] = await prisma.$queryRaw`
      SELECT
        AVG("matchConfidence")::float AS avg_conf,
        COUNT(*) FILTER (WHERE "matchConfidence" > 0.85)::bigint AS strong,
        COUNT(*) FILTER (WHERE "matchConfidence" >= 0.6 AND "matchConfidence" <= 0.85)::bigint AS probable,
        COUNT(*) FILTER (WHERE "matchConfidence" < 0.6 AND "matchConfidence" IS NOT NULL)::bigint AS weak
      FROM listings
      WHERE "productId" IS NOT NULL AND "matchConfidence" IS NOT NULL
    `;
    if (confidenceRows[0]) {
      avgConfidence = Math.round((confidenceRows[0].avg_conf ?? 0) * 100) / 100;
      strongMatchCount = Number(confidenceRows[0].strong);
      probableMatchCount = Number(confidenceRows[0].probable);
      weakMatchCount = Number(confidenceRows[0].weak);
    }
  } catch (e) {
    console.error("[canonical-graph] confidence query error:", e);
  }

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

  // V19: Products with at least one variant
  let productsWithVariants = 0;
  try {
    const variantResult: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT "productId")::bigint AS cnt FROM product_variants
    `;
    productsWithVariants = Number(variantResult[0]?.cnt ?? 0);
  } catch (e) {
    console.error("[canonical-graph] variantsCount query error:", e);
  }

  return {
    totalProducts,
    matchedListings,
    unmatchedListings,
    avgListingsPerProduct: Math.round(avgListingsPerProduct * 100) / 100,
    productsWithMultipleSources,
    totalVariants,
    coveragePercentage,
    avgConfidence,
    strongMatchCount,
    probableMatchCount,
    weakMatchCount,
    productsWithVariants,
    productsNoListings: productsNoListingsCount,
  };
}
