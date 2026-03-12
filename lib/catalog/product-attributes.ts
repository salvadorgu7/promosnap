// ============================================
// PRODUCT ATTRIBUTES — V18
// Extract, store, and assess product attributes
// ============================================

import { Prisma } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import {
  extractBrand,
  extractModel,
  extractStorage,
  extractColor,
  extractScreenSize,
  extractCapacity,
  extractGender,
  inferCategory,
  extractAllAttributes,
} from "./normalize";

// ============================================
// Types
// ============================================

export interface ProductAttributes {
  brand: string | null;
  model: string | null;
  line: string | null;
  storage: string | null;
  color: string | null;
  screenSize: string | null;
  capacity: string | null;
  gender: string | null;
  category: string | null;
  // Additional fields that may be extracted
  ram: string | null;
  processor: string | null;
  material: string | null;
  connectivity: string | null;
  warranty: string | null;
}

export interface AttributeCompletenessResult {
  score: number; // 0-100
  filled: string[];
  missing: string[];
}

// Core attribute fields and their weights for completeness scoring
const ATTRIBUTE_WEIGHTS: Record<string, number> = {
  brand: 20,
  model: 20,
  category: 15,
  storage: 10,
  color: 10,
  screenSize: 5,
  capacity: 5,
  gender: 5,
  line: 5,
  ram: 5,
};

// ============================================
// extractAndStoreAttributes
// Reads product title + listings, extracts attributes, stores in specsJson
// ============================================

export async function extractAndStoreAttributes(productId: string): Promise<ProductAttributes | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      id: true,
      name: true,
      specsJson: true,
      listings: {
        where: { status: "ACTIVE" },
        select: {
          rawTitle: true,
          rawBrand: true,
          rawCategory: true,
        },
        take: 20,
      },
    },
  });

  if (!product) return null;

  // Gather all titles for extraction (product name + listing titles)
  const allTitles = [product.name, ...product.listings.map(l => l.rawTitle)];

  // Extract attributes from each title, pick the most common/best
  const extracted: ProductAttributes = {
    brand: null,
    model: null,
    line: null,
    storage: null,
    color: null,
    screenSize: null,
    capacity: null,
    gender: null,
    category: null,
    ram: null,
    processor: null,
    material: null,
    connectivity: null,
    warranty: null,
  };

  // Use frequency-based extraction: the value that appears most wins
  const brandVotes = new Map<string, number>();
  const modelVotes = new Map<string, number>();
  const storageVotes = new Map<string, number>();
  const colorVotes = new Map<string, number>();
  const screenVotes = new Map<string, number>();
  const capacityVotes = new Map<string, number>();
  const genderVotes = new Map<string, number>();
  const categoryVotes = new Map<string, number>();

  for (const title of allTitles) {
    const attrs = extractAllAttributes(title);

    if (attrs.brand) incrementVote(brandVotes, attrs.brand);
    if (attrs.model) incrementVote(modelVotes, attrs.model);
    if (attrs.storage) incrementVote(storageVotes, attrs.storage);
    if (attrs.color) incrementVote(colorVotes, attrs.color);
    if (attrs.screenSize) incrementVote(screenVotes, attrs.screenSize);
    if (attrs.capacity) incrementVote(capacityVotes, attrs.capacity);
    if (attrs.gender) incrementVote(genderVotes, attrs.gender);
    if (attrs.category) incrementVote(categoryVotes, attrs.category);
  }

  // Also check rawBrand from listings
  for (const l of product.listings) {
    if (l.rawBrand) {
      const normalized = extractBrand(l.rawBrand) ?? l.rawBrand;
      incrementVote(brandVotes, normalized);
    }
    if (l.rawCategory) {
      incrementVote(categoryVotes, l.rawCategory);
    }
  }

  extracted.brand = topVote(brandVotes);
  extracted.model = topVote(modelVotes);
  extracted.storage = topVote(storageVotes);
  extracted.color = topVote(colorVotes);
  extracted.screenSize = topVote(screenVotes);
  extracted.capacity = topVote(capacityVotes);
  extracted.gender = topVote(genderVotes);
  extracted.category = topVote(categoryVotes);

  // Extract RAM from titles (common pattern: "8GB RAM", "16GB de RAM")
  for (const title of allTitles) {
    const ramMatch = title.match(/\b(\d+)\s*GB\s*(?:de\s+)?RAM\b/i);
    if (ramMatch) {
      extracted.ram = `${ramMatch[1]}GB`;
      break;
    }
  }

  // Extract processor
  for (const title of allTitles) {
    const procPatterns = [
      /\b(Snapdragon\s+\d+\s*\w*)/i,
      /\b(Dimensity\s+\d+\s*\w*)/i,
      /\b(Helio\s+[A-Z]\d+)/i,
      /\b(Exynos\s+\d+)/i,
      /\b(A\d+\s+Bionic)/i,
      /\b(M[1-4]\s*(?:Pro|Max|Ultra)?)\b/i,
    ];
    for (const pattern of procPatterns) {
      const match = title.match(pattern);
      if (match) {
        extracted.processor = match[1].trim();
        break;
      }
    }
    if (extracted.processor) break;
  }

  // Extract line (product line like "Galaxy S", "iPhone Pro", "Moto G")
  for (const title of allTitles) {
    const linePatterns = [
      /\b(Galaxy\s+[A-Z])\d/i,
      /\b(iPhone)\s+\d/i,
      /\b(Redmi\s+Note)\b/i,
      /\b(Moto\s+[A-Z])\d/i,
      /\b(MacBook\s+(?:Air|Pro))\b/i,
      /\b(ThinkPad\s+[A-Z])\d/i,
      /\b(Ideapad)\b/i,
    ];
    for (const pattern of linePatterns) {
      const match = title.match(pattern);
      if (match) {
        extracted.line = match[1].trim();
        break;
      }
    }
    if (extracted.line) break;
  }

  // Merge with existing specsJson (don't overwrite manually set values)
  const existingSpecs = (product.specsJson as Record<string, unknown>) ?? {};
  const mergedSpecs: Record<string, unknown> = { ...existingSpecs };

  // Only set values that aren't already present in specsJson
  for (const [key, value] of Object.entries(extracted)) {
    if (value !== null && mergedSpecs[key] === undefined) {
      mergedSpecs[key] = value;
    }
  }

  // Store
  await prisma.product.update({
    where: { id: productId },
    data: { specsJson: mergedSpecs as Prisma.InputJsonValue },
  });

  return extracted;
}

// ============================================
// getProductAttributes
// Returns typed attributes from specsJson
// ============================================

export async function getProductAttributes(productId: string): Promise<ProductAttributes | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { specsJson: true },
  });

  if (!product) return null;

  const specs = (product.specsJson as Record<string, unknown>) ?? {};

  return {
    brand: (specs.brand as string) ?? null,
    model: (specs.model as string) ?? null,
    line: (specs.line as string) ?? null,
    storage: (specs.storage as string) ?? null,
    color: (specs.color as string) ?? null,
    screenSize: (specs.screenSize as string) ?? null,
    capacity: (specs.capacity as string) ?? null,
    gender: (specs.gender as string) ?? null,
    category: (specs.category as string) ?? null,
    ram: (specs.ram as string) ?? null,
    processor: (specs.processor as string) ?? null,
    material: (specs.material as string) ?? null,
    connectivity: (specs.connectivity as string) ?? null,
    warranty: (specs.warranty as string) ?? null,
  };
}

// ============================================
// attributeCompleteness
// Returns a score 0-100 based on how many attributes are filled
// ============================================

export async function attributeCompleteness(
  productId: string
): Promise<AttributeCompletenessResult> {
  const attrs = await getProductAttributes(productId);

  if (!attrs) {
    return { score: 0, filled: [], missing: Object.keys(ATTRIBUTE_WEIGHTS) };
  }

  let totalWeight = 0;
  let earnedWeight = 0;
  const filled: string[] = [];
  const missing: string[] = [];

  for (const [key, weight] of Object.entries(ATTRIBUTE_WEIGHTS)) {
    totalWeight += weight;
    const value = attrs[key as keyof ProductAttributes];
    if (value !== null && value !== undefined && value !== "") {
      earnedWeight += weight;
      filled.push(key);
    } else {
      missing.push(key);
    }
  }

  const score = totalWeight > 0
    ? Math.round((earnedWeight / totalWeight) * 100)
    : 0;

  return { score, filled, missing };
}

// ============================================
// Helpers
// ============================================

function incrementVote(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function topVote(map: Map<string, number>): string | null {
  if (map.size === 0) return null;
  let best: string | null = null;
  let bestCount = 0;
  Array.from(map.entries()).forEach(([key, count]) => {
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  });
  return best;
}
