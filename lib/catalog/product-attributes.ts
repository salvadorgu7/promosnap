// ============================================
// PRODUCT ATTRIBUTES — V18→V19
// Extract, store, and assess product attributes
// V19: Better RAM/processor extraction, connectivity,
//      battery extraction, improved frequency voting
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
  // V19 additions
  battery: string | null;
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
// V19 — Improved RAM extraction patterns
// Handles: "8GB RAM", "16GB de RAM", "8/128GB",
//          "16GB/512GB", "8 GB RAM"
// ============================================

function extractRAM(title: string): string | null {
  const patterns = [
    // "8GB RAM" or "8GB de RAM" or "8 GB RAM"
    /\b(\d+)\s*GB\s*(?:de\s+)?RAM\b/i,
    // "8GB+128GB" or "8/128" or "8GB/128GB" — RAM is the smaller number
    /\b(\d+)\s*GB\s*[\/+]\s*\d+\s*GB\b/i,
    // "RAM 8GB" or "RAM: 8GB"
    /\bRAM\s*:?\s*(\d+)\s*GB\b/i,
    // "Memoria RAM 8GB"
    /\bMem[oó]ria\s*RAM\s*:?\s*(\d+)\s*GB\b/i,
    // "8GB LPDDR5" or "8GB DDR4"
    /\b(\d+)\s*GB\s*(?:LP)?DDR\d\w?\b/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const val = parseInt(match[1], 10);
      // RAM is typically 1-128GB; filter out storage values
      if (val >= 1 && val <= 128) {
        return `${val}GB`;
      }
    }
  }

  return null;
}

// ============================================
// V19 — Improved processor extraction
// ============================================

function extractProcessor(title: string): string | null {
  const patterns = [
    // Qualcomm Snapdragon — V19: captures Gen variants
    /\b(Snapdragon\s+\d+\s*(?:Gen\s*\d+)?(?:\s*\+|\s+Plus)?)\b/i,
    // MediaTek Dimensity
    /\b(Dimensity\s+\d+\s*\+?)\b/i,
    // MediaTek Helio
    /\b(Helio\s+[A-Z]\d+)\b/i,
    // Samsung Exynos
    /\b(Exynos\s+\d+\s*\w*)\b/i,
    // Google Tensor
    /\b(Tensor\s+G\d+)\b/i,
    // Apple A-series — V19: captures "Pro" suffix
    /\b(A\d+\s*(?:Pro|Bionic)?)\b/i,
    // Apple M-series for Mac/iPad
    /\b(M[1-4]\s*(?:Pro|Max|Ultra)?)\b/i,
    // Intel Core — V19: handles 12th/13th/14th gen naming
    /\b(Core\s+(?:Ultra\s+)?\d?\s*i\d[\s\-]+\d{4,5}\w?)\b/i,
    /\b(Intel\s+Core\s+(?:Ultra\s+)?\d?\s*i\d)\b/i,
    // AMD Ryzen
    /\b(Ryzen\s+\d+\s+\d{4}\w?)\b/i,
    /\b(Ryzen\s+\d+\s+PRO\s+\d{4}\w?)\b/i,
    // Unisoc
    /\b(Unisoc\s+\w+\d+)\b/i,
    // Kirin
    /\b(Kirin\s+\d+\w*)\b/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }

  return null;
}

// ============================================
// V19 — Connectivity extraction
// ============================================

function extractConnectivity(title: string): string | null {
  const connectivityFeatures: string[] = [];
  const lower = title.toLowerCase();

  // 5G / 4G / LTE
  if (/\b5g\b/i.test(title)) connectivityFeatures.push("5G");
  else if (/\b4g\s*lte\b/i.test(title) || /\blte\b/i.test(title)) connectivityFeatures.push("4G LTE");
  else if (/\b4g\b/i.test(title)) connectivityFeatures.push("4G");

  // Wi-Fi versions
  if (/\bwi-?fi\s*7\b/i.test(title) || /\bwifi\s*7\b/i.test(title)) connectivityFeatures.push("Wi-Fi 7");
  else if (/\bwi-?fi\s*6e\b/i.test(title) || /\bwifi\s*6e\b/i.test(title)) connectivityFeatures.push("Wi-Fi 6E");
  else if (/\bwi-?fi\s*6\b/i.test(title) || /\bwifi\s*6\b/i.test(title)) connectivityFeatures.push("Wi-Fi 6");

  // Bluetooth
  if (/\bbluetooth\s*5\.\d/i.test(title)) {
    const btMatch = title.match(/\bbluetooth\s*(5\.\d)/i);
    if (btMatch) connectivityFeatures.push(`Bluetooth ${btMatch[1]}`);
  } else if (/\bbluetooth\b/i.test(title)) {
    connectivityFeatures.push("Bluetooth");
  }

  // NFC
  if (/\bnfc\b/i.test(title)) connectivityFeatures.push("NFC");

  // USB-C / USB
  if (/\busb[\s-]?c\b/i.test(title) || /\busb\s*type[\s-]?c\b/i.test(title)) {
    connectivityFeatures.push("USB-C");
  }

  // eSIM / Dual SIM
  if (lower.includes('esim')) connectivityFeatures.push("eSIM");
  if (/\bdual\s*sim\b/i.test(title)) connectivityFeatures.push("Dual SIM");

  return connectivityFeatures.length > 0 ? connectivityFeatures.join(", ") : null;
}

// ============================================
// V19 — Battery extraction
// ============================================

function extractBattery(title: string): string | null {
  const patterns = [
    // "5000mAh" or "5000 mAh" or "5.000mAh"
    /\b(\d[\d.]*)\s*mAh\b/i,
    // "Bateria 5000mAh" or "Bateria de 5000mAh"
    /\bBateria\s*(?:de\s+)?(\d[\d.]*)\s*mAh\b/i,
    // "Battery: 5000mAh"
    /\bBatter[yia]\s*:?\s*(\d[\d.]*)\s*mAh\b/i,
    // Wh for laptops: "56Wh" or "56.5Wh"
    /\b(\d+\.?\d*)\s*Wh\b/i,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const val = match[1].replace(/\./g, ''); // remove thousand separators
      if (pattern.source.includes('Wh')) {
        return `${match[1]}Wh`;
      }
      return `${val}mAh`;
    }
  }

  return null;
}

// ============================================
// extractAndStoreAttributes
// Reads product title + listings, extracts attributes, stores in specsJson
// V19: uses improved extractors + frequency voting with tie-breaking
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
    battery: null,
  };

  // V19: Use frequency-based extraction with weight-aware voting
  // Product name gets double weight since it's the canonical source
  const brandVotes = new Map<string, number>();
  const modelVotes = new Map<string, number>();
  const storageVotes = new Map<string, number>();
  const colorVotes = new Map<string, number>();
  const screenVotes = new Map<string, number>();
  const capacityVotes = new Map<string, number>();
  const genderVotes = new Map<string, number>();
  const categoryVotes = new Map<string, number>();
  const ramVotes = new Map<string, number>();
  const processorVotes = new Map<string, number>();
  const connectivityVotes = new Map<string, number>();
  const batteryVotes = new Map<string, number>();

  for (let i = 0; i < allTitles.length; i++) {
    const title = allTitles[i];
    const weight = i === 0 ? 2 : 1; // V19: product name gets double weight
    const attrs = extractAllAttributes(title);

    if (attrs.brand) incrementVote(brandVotes, attrs.brand, weight);
    if (attrs.model) incrementVote(modelVotes, attrs.model, weight);
    if (attrs.storage) incrementVote(storageVotes, attrs.storage, weight);
    if (attrs.color) incrementVote(colorVotes, attrs.color, weight);
    if (attrs.screenSize) incrementVote(screenVotes, attrs.screenSize, weight);
    if (attrs.capacity) incrementVote(capacityVotes, attrs.capacity, weight);
    if (attrs.gender) incrementVote(genderVotes, attrs.gender, weight);
    if (attrs.category) incrementVote(categoryVotes, attrs.category, weight);

    // V19: Extract new attributes
    const ram = extractRAM(title);
    if (ram) incrementVote(ramVotes, ram, weight);

    const proc = extractProcessor(title);
    if (proc) incrementVote(processorVotes, proc, weight);

    const conn = extractConnectivity(title);
    if (conn) incrementVote(connectivityVotes, conn, weight);

    const bat = extractBattery(title);
    if (bat) incrementVote(batteryVotes, bat, weight);
  }

  // Also check rawBrand from listings
  for (const l of product.listings) {
    if (l.rawBrand) {
      const normalized = extractBrand(l.rawBrand) ?? l.rawBrand;
      incrementVote(brandVotes, normalized, 1);
    }
    if (l.rawCategory) {
      incrementVote(categoryVotes, l.rawCategory, 1);
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
  extracted.ram = topVote(ramVotes);
  extracted.processor = topVote(processorVotes);
  extracted.connectivity = topVote(connectivityVotes);
  extracted.battery = topVote(batteryVotes);

  // Extract line (product line like "Galaxy S", "iPhone Pro", "Moto G")
  for (const title of allTitles) {
    const linePatterns = [
      /\b(Galaxy\s+[A-Z])\d/i,
      /\b(iPhone)\s+\d/i,
      /\b(Redmi\s+Note)\b/i,
      /\b(Redmi)\s+\d/i,
      /\b(Poco\s+[A-Z])\d/i,
      /\b(Moto\s+[A-Z])\d/i,
      /\b(MacBook\s+(?:Air|Pro))\b/i,
      /\b(ThinkPad\s+[A-Z])\d/i,
      /\b(Ideapad)\b/i,
      /\b(Pixel)\s+\d/i,
      /\b(OnePlus)\s+\d/i,
      /\b(Zenfone)\s+\d/i,
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
    battery: (specs.battery as string) ?? null,
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
// Helpers — V19: weight-aware voting
// ============================================

function incrementVote(map: Map<string, number>, key: string, weight: number = 1): void {
  map.set(key, (map.get(key) ?? 0) + weight);
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
