// ============================================
// CATALOG QUALITY REVIEW — at scale
// ============================================

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

// ─── Types ──────────────────────────────────────────────────────────────────

export type QualityIssueType =
  | "weak-match"
  | "missing-attributes"
  | "probable-duplicate"
  | "missing-image"
  | "weak-affiliate-url"
  | "inconsistent-source";

export interface QualityIssue {
  productId: string;
  productName: string;
  issueType: QualityIssueType;
  severity: "high" | "medium" | "low";
  details: string;
}

export interface QualityScore {
  productId: string;
  score: number; // 0-100
  breakdown: {
    hasImage: boolean;
    hasBrand: boolean;
    hasCategory: boolean;
    hasDescription: boolean;
    hasActiveOffers: boolean;
    hasMultipleSources: boolean;
    hasAffiliateUrl: boolean;
    hasSpecs: boolean;
  };
}

export interface QualityReport {
  totalProducts: number;
  averageScore: number;
  scoreDistribution: {
    excellent: number; // 80-100
    good: number; // 60-79
    fair: number; // 40-59
    poor: number; // 0-39
  };
  issues: {
    weakMatches: QualityIssue[];
    missingAttributes: QualityIssue[];
    probableDuplicates: QualityIssue[];
    missingImages: QualityIssue[];
    weakAffiliateUrls: QualityIssue[];
    inconsistentSources: QualityIssue[];
  };
}

// ─── Quality Score ──────────────────────────────────────────────────────────

interface ProductForScoring {
  id: string;
  name: string;
  imageUrl?: string | null;
  description?: string | null;
  brandId?: string | null;
  categoryId?: string | null;
  specsJson?: unknown;
  listings?: {
    id: string;
    sourceId: string;
    matchConfidence?: number | null;
    offers?: {
      isActive: boolean;
      affiliateUrl?: string | null;
    }[];
  }[];
}

/**
 * Returns a 0-100 quality score for a product.
 */
export function getQualityScore(product: ProductForScoring): QualityScore {
  const listings = product.listings ?? [];
  const allOffers = listings.flatMap((l) => l.offers ?? []);
  const activeOffers = allOffers.filter((o) => o.isActive);
  const uniqueSources = new Set(listings.map((l) => l.sourceId));
  const hasAffiliate = activeOffers.some(
    (o) => o.affiliateUrl && o.affiliateUrl.startsWith("http")
  );

  const breakdown = {
    hasImage: !!product.imageUrl,
    hasBrand: !!product.brandId,
    hasCategory: !!product.categoryId,
    hasDescription: !!product.description && product.description.length > 20,
    hasActiveOffers: activeOffers.length > 0,
    hasMultipleSources: uniqueSources.size >= 2,
    hasAffiliateUrl: hasAffiliate,
    hasSpecs: !!product.specsJson,
  };

  // Weight each factor
  let score = 0;
  if (breakdown.hasImage) score += 20;
  if (breakdown.hasBrand) score += 10;
  if (breakdown.hasCategory) score += 10;
  if (breakdown.hasDescription) score += 10;
  if (breakdown.hasActiveOffers) score += 20;
  if (breakdown.hasMultipleSources) score += 15;
  if (breakdown.hasAffiliateUrl) score += 10;
  if (breakdown.hasSpecs) score += 5;

  return {
    productId: product.id,
    score: Math.min(100, score),
    breakdown,
  };
}

// ─── Quality Issues ─────────────────────────────────────────────────────────

/**
 * Returns all quality issues across the catalog.
 */
export async function getQualityIssues(): Promise<QualityReport> {
  const [
    weakMatches,
    missingAttributes,
    probableDuplicates,
    missingImages,
    weakAffiliateUrls,
    inconsistentSources,
    totalProducts,
  ] = await Promise.all([
    getWeakMatchIssues(),
    getMissingAttributeIssues(),
    getDuplicateCandidates(),
    getImageQualityIssues(),
    getWeakAffiliateUrlIssues(),
    getInconsistentSourceIssues(),
    prisma.product.count({ where: { status: "ACTIVE" } }),
  ]);

  // Calculate score distribution
  let excellent = 0;
  let good = 0;
  let fair = 0;
  let poor = 0;
  let totalScore = 0;

  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        imageUrl: true,
        description: true,
        brandId: true,
        categoryId: true,
        specsJson: true,
        listings: {
          select: {
            id: true,
            sourceId: true,
            matchConfidence: true,
            offers: {
              select: { isActive: true, affiliateUrl: true },
            },
          },
        },
      },
      take: 500,
    });

    for (const product of products) {
      const qs = getQualityScore(product);
      totalScore += qs.score;

      if (qs.score >= 80) excellent++;
      else if (qs.score >= 60) good++;
      else if (qs.score >= 40) fair++;
      else poor++;
    }
  } catch (e) {
    logger.error("quality-review.score-distribution.error", { error: e });
  }

  return {
    totalProducts,
    averageScore:
      totalProducts > 0
        ? Math.round(totalScore / Math.max(excellent + good + fair + poor, 1))
        : 0,
    scoreDistribution: { excellent, good, fair, poor },
    issues: {
      weakMatches,
      missingAttributes,
      probableDuplicates,
      missingImages,
      weakAffiliateUrls,
      inconsistentSources,
    },
  };
}

// ─── Weak Canonical Matches ─────────────────────────────────────────────────

async function getWeakMatchIssues(): Promise<QualityIssue[]> {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        productId: { not: null },
        matchConfidence: { lt: 0.6 },
        status: "ACTIVE",
      },
      select: {
        id: true,
        rawTitle: true,
        matchConfidence: true,
        product: { select: { id: true, name: true } },
      },
      take: 50,
      orderBy: { matchConfidence: "asc" },
    });

    return listings
      .filter((l) => l.product)
      .map((l) => ({
        productId: l.product!.id,
        productName: l.product!.name,
        issueType: "weak-match" as QualityIssueType,
        severity: (l.matchConfidence ?? 0) < 0.3 ? "high" : "medium" as "high" | "medium",
        details: `Match ${((l.matchConfidence ?? 0) * 100).toFixed(0)}% com listing "${l.rawTitle}"`,
      }));
  } catch (e) {
    logger.error("quality-review.weak-match-issues.error", { error: e });
    return [];
  }
}

// ─── Missing Attributes ─────────────────────────────────────────────────────

async function getMissingAttributeIssues(): Promise<QualityIssue[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { brandId: null },
          { categoryId: null },
          { description: null },
        ],
      },
      select: {
        id: true,
        name: true,
        brandId: true,
        categoryId: true,
        description: true,
      },
      take: 50,
      orderBy: { popularityScore: "desc" },
    });

    return products.map((p) => {
      const missing: string[] = [];
      if (!p.brandId) missing.push("marca");
      if (!p.categoryId) missing.push("categoria");
      if (!p.description) missing.push("descricao");

      return {
        productId: p.id,
        productName: p.name,
        issueType: "missing-attributes" as QualityIssueType,
        severity: missing.length >= 2 ? "high" : "medium" as "high" | "medium",
        details: `Faltando: ${missing.join(", ")}`,
      };
    });
  } catch (e) {
    logger.error("quality-review.missing-attribute-issues.error", { error: e });
    return [];
  }
}

// ─── Duplicate Candidates ───────────────────────────────────────────────────

/**
 * Finds probable duplicates by comparing product names with basic string similarity.
 */
export async function getDuplicateCandidates(): Promise<QualityIssue[]> {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
      take: 200,
      orderBy: { name: "asc" },
    });

    const duplicates: QualityIssue[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < products.length; i++) {
      if (seen.has(products[i].id)) continue;

      for (let j = i + 1; j < products.length; j++) {
        if (seen.has(products[j].id)) continue;

        const similarity = calculateSimilarity(
          normalizeTitle(products[i].name),
          normalizeTitle(products[j].name)
        );

        if (similarity > 0.85) {
          duplicates.push({
            productId: products[i].id,
            productName: products[i].name,
            issueType: "probable-duplicate",
            severity: similarity > 0.95 ? "high" : "medium",
            details: `${(similarity * 100).toFixed(0)}% similar a "${products[j].name}"`,
          });
          seen.add(products[j].id);

          if (duplicates.length >= 50) break;
        }
      }

      if (duplicates.length >= 50) break;
    }

    return duplicates;
  } catch (e) {
    logger.error("quality-review.duplicate-candidates.error", { error: e });
    return [];
  }
}

function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const wordsA = new Set(a.split(" "));
  const wordsB = new Set(b.split(" "));
  const union = new Set([...wordsA, ...wordsB]);
  let intersection = 0;

  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  return intersection / union.size;
}

// ─── Image Quality Issues ───────────────────────────────────────────────────

/**
 * Finds products with missing or placeholder images.
 */
export async function getImageQualityIssues(): Promise<QualityIssue[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          { imageUrl: null },
          { imageUrl: "" },
        ],
      },
      select: { id: true, name: true, imageUrl: true },
      take: 50,
      orderBy: { popularityScore: "desc" },
    });

    return products.map((p) => ({
      productId: p.id,
      productName: p.name,
      issueType: "missing-image" as QualityIssueType,
      severity: "high" as const,
      details: p.imageUrl ? "Imagem parece ser placeholder" : "Sem imagem principal",
    }));
  } catch (e) {
    logger.error("quality-review.image-quality-issues.error", { error: e });
    return [];
  }
}

// ─── Weak Affiliate URLs ────────────────────────────────────────────────────

async function getWeakAffiliateUrlIssues(): Promise<QualityIssue[]> {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        productId: { not: null },
      },
      select: {
        id: true,
        product: { select: { id: true, name: true } },
        offers: {
          where: { isActive: true },
          select: { affiliateUrl: true },
        },
      },
      take: 200,
    });

    const issues: QualityIssue[] = [];

    for (const listing of listings) {
      if (!listing.product) continue;

      const activeOffers = listing.offers;
      const hasGoodUrl = activeOffers.some(
        (o) => o.affiliateUrl && o.affiliateUrl.startsWith("http")
      );

      if (activeOffers.length > 0 && !hasGoodUrl) {
        issues.push({
          productId: listing.product.id,
          productName: listing.product.name,
          issueType: "weak-affiliate-url",
          severity: "medium",
          details: "Ofertas ativas sem URL de afiliado valida",
        });
      }

      if (issues.length >= 50) break;
    }

    return issues;
  } catch (e) {
    logger.error("quality-review.weak-affiliate-url-issues.error", { error: e });
    return [];
  }
}

// ─── Inconsistent Source ────────────────────────────────────────────────────

async function getInconsistentSourceIssues(): Promise<QualityIssue[]> {
  try {
    // Products with listings from inactive sources
    const results: { productId: string; productName: string; sourceName: string }[] =
      await prisma.$queryRaw`
        SELECT DISTINCT
          p.id AS "productId",
          p.name AS "productName",
          s.name AS "sourceName"
        FROM products p
        JOIN listings l ON l."productId" = p.id
        JOIN sources s ON l."sourceId" = s.id
        WHERE p.status = 'ACTIVE'
        AND l.status = 'ACTIVE'
        AND s.status != 'ACTIVE'
        LIMIT 50
      `;

    return results.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      issueType: "inconsistent-source" as QualityIssueType,
      severity: "medium" as const,
      details: `Listing ativo de fonte inativa: ${r.sourceName}`,
    }));
  } catch (e) {
    logger.error("quality-review.inconsistent-source-issues.error", { error: e });
    return [];
  }
}
