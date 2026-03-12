// ============================================
// CANONICAL MATCH ENGINE — V18
// Maps listings to canonical Products with
// conservative, scored matching heuristics
// ============================================

import prisma from "@/lib/db/prisma";
import {
  extractBrand,
  normalizeTitle,
  extractModel,
  inferCategory,
  extractStorage,
  extractColor,
  normalizeForMatch,
  tokenSimilarity,
  BRAND_ALIASES,
} from "./normalize";

// ============================================
// Types
// ============================================

export type MatchConfidence = "strong" | "probable" | "weak";

export interface CanonicalMatch {
  productId: string;
  productName: string;
  score: number;
  confidence: MatchConfidence;
  matchedOn: string[]; // which heuristics contributed
}

export interface CanonicalCandidate {
  productId: string;
  productName: string;
  slug: string;
  brandId: string | null;
  categoryId: string | null;
  score: number;
  confidence: MatchConfidence;
  matchedOn: string[];
}

export interface ConfidenceAssessment {
  productId: string;
  overallConfidence: number; // 0-1
  listingCount: number;
  avgMatchScore: number;
  sourceDiversity: number; // unique sources
  hasStrongMatch: boolean;
  recommendation: "keep" | "review" | "split";
}

interface ListingInput {
  rawTitle: string;
  rawBrand?: string | null;
  rawCategory?: string | null;
  imageUrl?: string | null;
}

// ============================================
// Score confidence level from numeric score
// ============================================

function scoreToConfidence(score: number): MatchConfidence {
  if (score > 0.85) return "strong";
  if (score >= 0.6) return "probable";
  return "weak";
}

// ============================================
// Calculate match score between a listing and a product
// ============================================

function calculateMatchScore(
  listing: ListingInput,
  product: {
    name: string;
    brandId?: string | null;
    brand?: { name: string; slug: string } | null;
    categoryId?: string | null;
    category?: { slug: string } | null;
    specsJson?: unknown;
  }
): { score: number; matchedOn: string[] } {
  let totalWeight = 0;
  let earnedWeight = 0;
  const matchedOn: string[] = [];

  const listingTitle = listing.rawTitle;
  const productName = product.name;

  // ─── 1. Token similarity (weight: 30) ───
  const tokenSim = tokenSimilarity(listingTitle, productName);
  const tokenWeight = 30;
  totalWeight += tokenWeight;
  earnedWeight += tokenSim * tokenWeight;
  if (tokenSim > 0.5) matchedOn.push(`tokens(${(tokenSim * 100).toFixed(0)}%)`);

  // ─── 2. Brand match (weight: 25) ───
  const brandWeight = 25;
  totalWeight += brandWeight;
  const listingBrand = listing.rawBrand
    ? normalizeBrandName(listing.rawBrand)
    : extractBrand(listingTitle);
  const productBrand = product.brand?.name ?? null;

  if (listingBrand && productBrand) {
    if (normalizeBrandName(listingBrand) === normalizeBrandName(productBrand)) {
      earnedWeight += brandWeight;
      matchedOn.push("brand");
    }
  } else if (!listingBrand && !productBrand) {
    // Both unknown — neutral, give partial credit
    earnedWeight += brandWeight * 0.3;
  }

  // ─── 3. Model match (weight: 25) ───
  const modelWeight = 25;
  totalWeight += modelWeight;
  const listingModel = extractModel(listingTitle);
  const productModel = extractModel(productName);

  if (listingModel && productModel) {
    const modelNormA = listingModel.toLowerCase().replace(/\s+/g, '');
    const modelNormB = productModel.toLowerCase().replace(/\s+/g, '');
    if (modelNormA === modelNormB) {
      earnedWeight += modelWeight;
      matchedOn.push("model");
    } else if (modelNormA.includes(modelNormB) || modelNormB.includes(modelNormA)) {
      earnedWeight += modelWeight * 0.6;
      matchedOn.push("model(partial)");
    }
  } else if (listingModel || productModel) {
    // One has model, other doesn't — slight penalty
    earnedWeight += 0;
  } else {
    // Neither has a model — neutral
    earnedWeight += modelWeight * 0.2;
  }

  // ─── 4. Category match (weight: 10) ───
  const catWeight = 10;
  totalWeight += catWeight;
  const listingCat = listing.rawCategory ?? inferCategory(listingTitle);
  const productCat = product.category?.slug ?? null;

  if (listingCat && productCat) {
    if (listingCat.toLowerCase() === productCat.toLowerCase()) {
      earnedWeight += catWeight;
      matchedOn.push("category");
    }
  } else if (!listingCat && !productCat) {
    earnedWeight += catWeight * 0.3;
  }

  // ─── 5. Storage match (weight: 10) ───
  const storageWeight = 10;
  totalWeight += storageWeight;
  const listingStorage = extractStorage(listingTitle);
  const productStorage = extractStorage(productName);

  if (listingStorage && productStorage) {
    if (listingStorage === productStorage) {
      earnedWeight += storageWeight;
      matchedOn.push("storage");
    } else {
      // Different storage = penalty (different variant, not same canonical)
      earnedWeight -= storageWeight * 0.3;
    }
  } else {
    // Storage not relevant or unknown — neutral
    earnedWeight += storageWeight * 0.3;
  }

  const score = Math.max(0, Math.min(1, totalWeight > 0 ? earnedWeight / totalWeight : 0));

  return { score, matchedOn };
}

// ============================================
// Helper: normalize brand name for comparison
// ============================================

function normalizeBrandName(brand: string): string {
  const lower = brand.toLowerCase().trim();
  return BRAND_ALIASES[lower] ?? brand;
}

// ============================================
// findCanonicalCandidates
// Returns scored matches for a given title/brand/category
// ============================================

export async function findCanonicalCandidates(
  title: string,
  brand?: string | null,
  category?: string | null
): Promise<CanonicalCandidate[]> {
  const normalizedBrand = brand ? normalizeBrandName(brand) : extractBrand(title);
  const inferredCategory = category ?? inferCategory(title);
  const model = extractModel(title);

  // Build search conditions — conservative: require at least brand or category match
  const whereConditions: Record<string, unknown>[] = [];

  if (normalizedBrand) {
    whereConditions.push({
      brand: { name: { equals: normalizedBrand, mode: "insensitive" as const } },
    });
  }

  if (model) {
    // Search by model in product name
    whereConditions.push({
      name: { contains: model, mode: "insensitive" as const },
    });
  }

  // If we have no brand and no model, use token-based search with first significant words
  if (whereConditions.length === 0) {
    const normalized = normalizeTitle(title);
    const words = normalized.split(/\s+/).filter(w => w.length > 3).slice(0, 3);
    if (words.length > 0) {
      whereConditions.push({
        AND: words.map(w => ({
          name: { contains: w, mode: "insensitive" as const },
        })),
      });
    }
  }

  if (whereConditions.length === 0) {
    return [];
  }

  const products = await prisma.product.findMany({
    where: {
      status: { in: ["ACTIVE", "PENDING_REVIEW"] },
      OR: whereConditions,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      brandId: true,
      categoryId: true,
      specsJson: true,
      brand: { select: { name: true, slug: true } },
      category: { select: { slug: true } },
    },
    take: 50,
  });

  const candidates: CanonicalCandidate[] = [];

  for (const product of products) {
    const { score, matchedOn } = calculateMatchScore(
      { rawTitle: title, rawBrand: brand, rawCategory: category },
      product
    );

    candidates.push({
      productId: product.id,
      productName: product.name,
      slug: product.slug,
      brandId: product.brandId,
      categoryId: product.categoryId,
      score,
      confidence: scoreToConfidence(score),
      matchedOn,
    });
  }

  // Sort by score descending
  candidates.sort((a, b) => b.score - a.score);

  return candidates;
}

// ============================================
// canonicalMatch
// Takes listing data and finds/creates the best canonical Product
// Returns the match result (does NOT auto-create products)
// ============================================

export async function canonicalMatch(
  listing: ListingInput
): Promise<CanonicalMatch | null> {
  const candidates = await findCanonicalCandidates(
    listing.rawTitle,
    listing.rawBrand,
    listing.rawCategory
  );

  if (candidates.length === 0) {
    return null;
  }

  const best = candidates[0];

  // Only return if score is above weak threshold (>= 0.3)
  // Below that it's noise
  if (best.score < 0.3) {
    return null;
  }

  return {
    productId: best.productId,
    productName: best.productName,
    score: best.score,
    confidence: best.confidence,
    matchedOn: best.matchedOn,
  };
}

// ============================================
// calculateCanonicalConfidence
// Given a product and its listings, assess how confident
// the canonical grouping is
// ============================================

export async function calculateCanonicalConfidence(
  productId: string
): Promise<ConfidenceAssessment | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      listings: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          rawTitle: true,
          rawBrand: true,
          rawCategory: true,
          matchConfidence: true,
          sourceId: true,
        },
      },
    },
  });

  if (!product) return null;

  const listings = product.listings;
  if (listings.length === 0) {
    return {
      productId,
      overallConfidence: 0,
      listingCount: 0,
      avgMatchScore: 0,
      sourceDiversity: 0,
      hasStrongMatch: false,
      recommendation: "review",
    };
  }

  // Calculate avg match score from stored matchConfidence
  const scores = listings
    .map(l => l.matchConfidence)
    .filter((s): s is number => s !== null && s !== undefined);

  const avgMatchScore = scores.length > 0
    ? scores.reduce((a, b) => a + b, 0) / scores.length
    : 0;

  const sourceDiversity = new Set(listings.map(l => l.sourceId)).size;
  const hasStrongMatch = scores.some(s => s > 0.85);

  // Overall confidence formula
  const overallConfidence = Math.min(1,
    (avgMatchScore * 0.5) +
    (Math.min(sourceDiversity, 5) / 5 * 0.3) +
    (Math.min(listings.length, 10) / 10 * 0.2)
  );

  let recommendation: "keep" | "review" | "split";
  if (overallConfidence >= 0.7 && hasStrongMatch) {
    recommendation = "keep";
  } else if (overallConfidence < 0.4) {
    recommendation = "split";
  } else {
    recommendation = "review";
  }

  return {
    productId,
    overallConfidence,
    listingCount: listings.length,
    avgMatchScore,
    sourceDiversity,
    hasStrongMatch,
    recommendation,
  };
}
