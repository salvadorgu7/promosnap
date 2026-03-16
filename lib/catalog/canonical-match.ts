// ============================================
// CANONICAL MATCH ENGINE — V18→V19
// Maps listings to canonical Products with
// conservative, scored matching heuristics
// V19: EAN/GTIN matching, improved model extraction,
//      category mismatch penalty, accessory detection,
//      batchCanonicalMatch for bulk processing
// ============================================

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger"
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
  ean?: string | null;
  specsJson?: Record<string, unknown> | null;
}

export interface BatchMatchResult {
  listingId: string;
  match: CanonicalMatch | null;
  candidatesCount: number;
}

// ============================================
// V19 — Accessory detection keywords
// ============================================

const ACCESSORY_KEYWORDS = [
  'capa', 'capinha', 'case', 'pelicula', 'protetor', 'carregador',
  'cabo', 'adaptador', 'suporte', 'acessorio', 'acessório',
  'pulseira', 'bracelete', 'strap', 'holder', 'mount',
  'fone para', 'bateria para', 'teclado para', 'mouse para',
  'controle para', 'base para', 'dock para', 'hub para',
];

const MAIN_PRODUCT_KEYWORDS = [
  'smartphone', 'celular', 'notebook', 'tablet', 'monitor',
  'tv', 'fone', 'headphone', 'caixa de som', 'console',
  'geladeira', 'lavadora', 'air fryer', 'cafeteira',
];

// ============================================
// V19 — EAN/GTIN extraction from specsJson or title
// ============================================

function extractEAN(input: ListingInput): string | null {
  // Check specsJson for ean/gtin fields
  if (input.specsJson) {
    const specs = input.specsJson;
    for (const key of ['ean', 'gtin', 'barcode', 'upc', 'ean13']) {
      const val = specs[key];
      if (typeof val === 'string' && /^\d{8,14}$/.test(val.trim())) {
        return val.trim();
      }
    }
  }

  // Check title for EAN-13 pattern (13 consecutive digits, standalone)
  if (input.ean && /^\d{8,14}$/.test(input.ean.trim())) {
    return input.ean.trim();
  }

  return null;
}

// ============================================
// V19 — Improved model extraction
// Differentiates "Galaxy S24 Ultra" vs "Galaxy S24"
// ============================================

function extractModelPrecise(title: string): { model: string | null; variant: string | null } {
  // Enhanced model patterns with variant capture
  const patterns: { regex: RegExp; groupModel: number; groupVariant?: number }[] = [
    // iPhone — capture Pro Max/Pro/Plus/Mini as variant
    { regex: /\b(iPhone\s+\d+)\s*(Pro\s*Max|Pro|Plus|Mini)?\b/i, groupModel: 1, groupVariant: 2 },
    // Galaxy S/A/M — capture Ultra/Plus/FE as variant
    { regex: /\b(Galaxy\s+[A-Z]\d+)\s*(Ultra|Plus|\+|FE|Lite)?\b/i, groupModel: 1, groupVariant: 2 },
    // Redmi Note — capture Pro/Pro+ as variant
    { regex: /\b(Redmi\s+(?:Note\s+)?\d+)\s*(Pro\+?|Ultra|Turbo)?\b/i, groupModel: 1, groupVariant: 2 },
    // Moto G/E — capture Play/Power as variant
    { regex: /\b(Moto\s+[A-Z]\d+)\s*(Play|Power|Stylus)?\b/i, groupModel: 1, groupVariant: 2 },
    // MacBook — capture Air/Pro + chip as variant
    { regex: /\b(MacBook)\s*(Air|Pro)?\s*(M\d+)?\b/i, groupModel: 1, groupVariant: 2 },
    // PS5/PS4
    { regex: /\b(PS[45])\s*(Slim|Pro|Digital)?\b/i, groupModel: 1, groupVariant: 2 },
    // Xbox
    { regex: /\b(Xbox\s+Series)\s*([XS])\b/i, groupModel: 1, groupVariant: 2 },
    // Switch
    { regex: /\b(Switch)\s*(OLED|Lite)?\b/i, groupModel: 1, groupVariant: 2 },
    // GPU models
    { regex: /\b(RTX\s+\d{4})\s*(Ti|Super)?\b/i, groupModel: 1, groupVariant: 2 },
    { regex: /\b(GTX\s+\d{4})\s*(Ti)?\b/i, groupModel: 1, groupVariant: 2 },
    // Processors
    { regex: /\b(Ryzen\s+\d+\s+\d{4}\w?)\b/i, groupModel: 1 },
    { regex: /\b(Core\s+i\d+[\-\s]+\d{4,5}\w?)\b/i, groupModel: 1 },
    // Pixel
    { regex: /\b(Pixel\s+\d+)\s*(Pro|a)?\b/i, groupModel: 1, groupVariant: 2 },
    // OnePlus
    { regex: /\b(OnePlus\s+\d+)\s*(Pro|T|R)?\b/i, groupModel: 1, groupVariant: 2 },
  ];

  for (const { regex, groupModel, groupVariant } of patterns) {
    const match = title.match(regex);
    if (match) {
      const model = match[groupModel]?.trim() || null;
      const variant = (groupVariant && match[groupVariant]?.trim()) || null;
      return { model, variant };
    }
  }

  // Fallback to old extractModel
  const fallback = extractModel(title);
  return { model: fallback, variant: null };
}

// ============================================
// V19 — Detect if title describes an accessory
// ============================================

function isAccessoryTitle(title: string): boolean {
  const lower = title.toLowerCase();
  for (const kw of ACCESSORY_KEYWORDS) {
    if (lower.includes(kw)) {
      // But check if it's actually a main product that just mentions these words
      const isMainProduct = MAIN_PRODUCT_KEYWORDS.some(pk => lower.includes(pk));
      if (!isMainProduct) return true;
    }
  }
  return false;
}

function isMainProductTitle(title: string): boolean {
  const lower = title.toLowerCase();
  return MAIN_PRODUCT_KEYWORDS.some(kw => lower.includes(kw));
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
// V19: EAN/GTIN matching, category penalty, accessory penalty
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

  // ─── 0. EAN/GTIN match (weight: 40, overrides other signals) ───
  const listingEAN = extractEAN(listing);
  if (listingEAN) {
    const productSpecs = (product.specsJson as Record<string, unknown>) ?? {};
    const productEAN = productSpecs.ean as string
      ?? productSpecs.gtin as string
      ?? productSpecs.barcode as string
      ?? null;

    if (productEAN && listingEAN === productEAN) {
      // EAN match is extremely strong — near-certain match
      return { score: 0.98, matchedOn: ["ean"] };
    }
  }

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

  // ─── 3. Model match (weight: 25) — V19: precise model+variant matching ───
  const modelWeight = 25;
  totalWeight += modelWeight;
  const listingModelInfo = extractModelPrecise(listingTitle);
  const productModelInfo = extractModelPrecise(productName);

  if (listingModelInfo.model && productModelInfo.model) {
    const modelNormA = listingModelInfo.model.toLowerCase().replace(/\s+/g, '');
    const modelNormB = productModelInfo.model.toLowerCase().replace(/\s+/g, '');

    if (modelNormA === modelNormB) {
      // Base models match — check variant
      const varA = listingModelInfo.variant?.toLowerCase().replace(/\s+/g, '') ?? '';
      const varB = productModelInfo.variant?.toLowerCase().replace(/\s+/g, '') ?? '';

      if (varA === varB) {
        // Exact model+variant match
        earnedWeight += modelWeight;
        matchedOn.push("model+variant");
      } else if (!varA || !varB) {
        // One has variant, other doesn't — partial match
        earnedWeight += modelWeight * 0.7;
        matchedOn.push("model(base)");
      } else {
        // Both have different variants (e.g., "Pro" vs "Pro Max") — very partial
        earnedWeight += modelWeight * 0.3;
        matchedOn.push("model(diff-variant)");
      }
    } else if (modelNormA.includes(modelNormB) || modelNormB.includes(modelNormA)) {
      earnedWeight += modelWeight * 0.5;
      matchedOn.push("model(partial)");
    }
  } else if (listingModelInfo.model || productModelInfo.model) {
    // One has model, other doesn't — slight penalty
    earnedWeight += 0;
  } else {
    // Neither has a model — neutral
    earnedWeight += modelWeight * 0.2;
  }

  // ─── 4. Category match (weight: 10) — V19: penalty for mismatch ───
  const catWeight = 10;
  totalWeight += catWeight;
  const listingCat = listing.rawCategory ?? inferCategory(listingTitle);
  const productCat = product.category?.slug ?? null;

  if (listingCat && productCat) {
    if (listingCat.toLowerCase() === productCat.toLowerCase()) {
      earnedWeight += catWeight;
      matchedOn.push("category");
    } else {
      // V19: Active penalty for category mismatch — likely different product types
      earnedWeight -= catWeight * 0.5;
      matchedOn.push("category(mismatch)");
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

  // ─── 6. V19: Accessory vs main product penalty ───
  const listingIsAccessory = isAccessoryTitle(listingTitle);
  const productIsAccessory = isAccessoryTitle(productName);
  const listingIsMain = isMainProductTitle(listingTitle);
  const productIsMain = isMainProductTitle(productName);

  if (listingIsAccessory && !productIsAccessory && productIsMain) {
    // Listing is an accessory, product is a main product — big penalty
    earnedWeight -= 15;
    matchedOn.push("accessory-mismatch");
  } else if (!listingIsAccessory && productIsAccessory && listingIsMain) {
    // Listing is a main product, product is an accessory — big penalty
    earnedWeight -= 15;
    matchedOn.push("accessory-mismatch");
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
  category?: string | null,
  ean?: string | null,
  specsJson?: Record<string, unknown> | null
): Promise<CanonicalCandidate[]> {
  const normalizedBrand = brand ? normalizeBrandName(brand) : extractBrand(title);
  const inferredCategory = category ?? inferCategory(title);
  const model = extractModel(title);

  // V19: Try EAN match first — if we find an exact EAN match, return immediately
  const eanValue = ean
    ?? (specsJson?.ean as string)
    ?? (specsJson?.gtin as string)
    ?? null;

  if (eanValue && /^\d{8,14}$/.test(eanValue)) {
    try {
      const eanProducts = await prisma.product.findMany({
        where: {
          status: { in: ["ACTIVE", "PENDING_REVIEW"] },
          specsJson: { path: ["ean"], equals: eanValue },
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
        take: 5,
      });

      if (eanProducts.length > 0) {
        return eanProducts.map(p => ({
          productId: p.id,
          productName: p.name,
          slug: p.slug,
          brandId: p.brandId,
          categoryId: p.categoryId,
          score: 0.98,
          confidence: "strong" as MatchConfidence,
          matchedOn: ["ean"],
        }));
      }
    } catch (err) { logger.debug("canonical-match.failed", { error: err }) }
  }

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
      { rawTitle: title, rawBrand: brand, rawCategory: category, ean, specsJson },
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
    listing.rawCategory,
    listing.ean,
    listing.specsJson
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
// V19: batchCanonicalMatch
// Process multiple listings in bulk for efficiency
// ============================================

export async function batchCanonicalMatch(
  listingIds: string[],
  limit: number = 100
): Promise<BatchMatchResult[]> {
  const ids = listingIds.slice(0, limit);

  // Fetch all listings in one query
  const listings = await prisma.listing.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      rawTitle: true,
      rawBrand: true,
      rawCategory: true,
      rawPayloadJson: true,
    },
  });

  const results: BatchMatchResult[] = [];

  for (const listing of listings) {
    const payload = (listing.rawPayloadJson as Record<string, unknown>) ?? {};
    const ean = (payload.ean as string) ?? (payload.gtin as string) ?? null;

    try {
      const candidates = await findCanonicalCandidates(
        listing.rawTitle,
        listing.rawBrand,
        listing.rawCategory,
        ean,
        payload
      );

      const best = candidates.length > 0 && candidates[0].score >= 0.3
        ? {
            productId: candidates[0].productId,
            productName: candidates[0].productName,
            score: candidates[0].score,
            confidence: candidates[0].confidence,
            matchedOn: candidates[0].matchedOn,
          }
        : null;

      results.push({
        listingId: listing.id,
        match: best,
        candidatesCount: candidates.length,
      });
    } catch (err) {
      console.error(`[batchCanonicalMatch] error for listing ${listing.id}:`, err);
      results.push({
        listingId: listing.id,
        match: null,
        candidatesCount: 0,
      });
    }
  }

  return results;
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
