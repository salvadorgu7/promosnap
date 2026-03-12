// ============================================
// ATTRIBUTE FILTERS — filter engine for product catalog
// ============================================

import prisma from "@/lib/db/prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FilterValue {
  value: string;
  label: string;
  count: number;
}

export interface ProductFilter {
  key: string;
  label: string;
  type: "checkbox" | "range" | "toggle";
  values: FilterValue[];
}

export interface ActiveFilters {
  storage?: string[];
  color?: string[];
  screenSize?: string[];
  brand?: string[];
  priceRange?: { min: number; max: number };
  freeShipping?: boolean;
  minRating?: number;
}

interface FilterableProduct {
  id: string;
  name: string;
  brandName: string | null;
  categorySlug: string | null;
  specsJson: Record<string, unknown> | null;
  currentPrice: number;
  isFreeShipping: boolean;
  rating: number | null;
  storage: string | null;
  color: string | null;
}

// ─── Spec extractors ────────────────────────────────────────────────────────

function extractStorage(product: FilterableProduct): string | null {
  if (product.storage) return product.storage;
  const specs = product.specsJson;
  if (specs && typeof specs === "object") {
    const val = specs.storage || specs.armazenamento || specs.capacidade;
    if (typeof val === "string") return val;
  }
  // Try to extract from name
  const match = product.name.match(/\b(\d+)\s*(?:GB|TB)\b/i);
  if (match) {
    const num = parseInt(match[1]);
    const unit = match[0].toUpperCase().includes("TB") ? "TB" : "GB";
    return `${num}${unit}`;
  }
  return null;
}

function extractColor(product: FilterableProduct): string | null {
  if (product.color) return product.color;
  const specs = product.specsJson;
  if (specs && typeof specs === "object") {
    const val = specs.color || specs.cor;
    if (typeof val === "string") return val;
  }
  return null;
}

function extractScreenSize(product: FilterableProduct): string | null {
  const specs = product.specsJson;
  if (specs && typeof specs === "object") {
    const val = specs.screenSize || specs.tela || specs.tamanho_tela;
    if (typeof val === "string") return val;
  }
  const match = product.name.match(/\b(\d{2,3})\s*["'']\s*/);
  if (match) return `${match[1]}"`;
  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Fetches available filter options from real database data.
 * Optionally scoped to a specific category.
 */
export async function getAvailableFilters(
  categorySlug?: string
): Promise<ProductFilter[]> {
  const where: Record<string, unknown> = {
    status: "ACTIVE",
    hidden: false,
    listings: {
      some: {
        status: "ACTIVE",
        offers: { some: { isActive: true } },
      },
    },
  };

  if (categorySlug) {
    where.category = { slug: categorySlug };
  }

  const products = await prisma.product.findMany({
    where,
    take: 500,
    select: {
      id: true,
      name: true,
      specsJson: true,
      brand: { select: { name: true } },
      category: { select: { slug: true } },
      variants: {
        select: { storage: true, color: true },
        take: 1,
      },
      listings: {
        where: { status: "ACTIVE" },
        take: 1,
        select: {
          rating: true,
          offers: {
            where: { isActive: true },
            take: 1,
            orderBy: { currentPrice: "asc" },
            select: {
              currentPrice: true,
              isFreeShipping: true,
            },
          },
        },
      },
    },
  });

  const filterables: FilterableProduct[] = products
    .filter((p) => p.listings[0]?.offers[0])
    .map((p) => ({
      id: p.id,
      name: p.name,
      brandName: p.brand?.name ?? null,
      categorySlug: p.category?.slug ?? null,
      specsJson: p.specsJson as Record<string, unknown> | null,
      currentPrice: p.listings[0].offers[0].currentPrice,
      isFreeShipping: p.listings[0].offers[0].isFreeShipping,
      rating: p.listings[0].rating,
      storage: p.variants[0]?.storage ?? null,
      color: p.variants[0]?.color ?? null,
    }));

  const filters: ProductFilter[] = [];

  // Brand filter
  const brandCounts = new Map<string, number>();
  for (const p of filterables) {
    if (p.brandName) {
      brandCounts.set(p.brandName, (brandCounts.get(p.brandName) ?? 0) + 1);
    }
  }
  if (brandCounts.size > 1) {
    filters.push({
      key: "brand",
      label: "Marca",
      type: "checkbox",
      values: Array.from(brandCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([brand, count]) => ({ value: brand, label: brand, count })),
    });
  }

  // Storage filter
  const storageCounts = new Map<string, number>();
  for (const p of filterables) {
    const s = extractStorage(p);
    if (s) storageCounts.set(s, (storageCounts.get(s) ?? 0) + 1);
  }
  if (storageCounts.size > 1) {
    filters.push({
      key: "storage",
      label: "Armazenamento",
      type: "checkbox",
      values: Array.from(storageCounts.entries())
        .sort((a, b) => {
          const numA = parseInt(a[0]) || 0;
          const numB = parseInt(b[0]) || 0;
          return numA - numB;
        })
        .map(([val, count]) => ({ value: val, label: val, count })),
    });
  }

  // Color filter
  const colorCounts = new Map<string, number>();
  for (const p of filterables) {
    const c = extractColor(p);
    if (c) colorCounts.set(c, (colorCounts.get(c) ?? 0) + 1);
  }
  if (colorCounts.size > 1) {
    filters.push({
      key: "color",
      label: "Cor",
      type: "checkbox",
      values: Array.from(colorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([val, count]) => ({ value: val, label: val, count })),
    });
  }

  // Screen size filter
  const screenCounts = new Map<string, number>();
  for (const p of filterables) {
    const s = extractScreenSize(p);
    if (s) screenCounts.set(s, (screenCounts.get(s) ?? 0) + 1);
  }
  if (screenCounts.size > 1) {
    filters.push({
      key: "screenSize",
      label: "Tamanho da Tela",
      type: "checkbox",
      values: Array.from(screenCounts.entries())
        .sort((a, b) => {
          const numA = parseInt(a[0]) || 0;
          const numB = parseInt(b[0]) || 0;
          return numA - numB;
        })
        .map(([val, count]) => ({ value: val, label: val, count })),
    });
  }

  // Price range filter
  const prices = filterables.map((p) => p.currentPrice).filter((p) => p > 0);
  if (prices.length > 0) {
    const min = Math.floor(Math.min(...prices));
    const max = Math.ceil(Math.max(...prices));
    if (max > min) {
      const ranges = buildPriceRanges(min, max);
      const rangeCounts = ranges.map((range) => ({
        ...range,
        count: filterables.filter(
          (p) => p.currentPrice >= range.min && p.currentPrice <= range.max
        ).length,
      }));
      filters.push({
        key: "priceRange",
        label: "Faixa de Preco",
        type: "checkbox",
        values: rangeCounts
          .filter((r) => r.count > 0)
          .map((r) => ({
            value: `${r.min}-${r.max}`,
            label: r.label,
            count: r.count,
          })),
      });
    }
  }

  // Free shipping toggle
  const freeCount = filterables.filter((p) => p.isFreeShipping).length;
  if (freeCount > 0 && freeCount < filterables.length) {
    filters.push({
      key: "freeShipping",
      label: "Frete Gratis",
      type: "toggle",
      values: [
        { value: "true", label: "Frete gratis", count: freeCount },
      ],
    });
  }

  // Rating filter
  const ratingBuckets = [4.5, 4.0, 3.5, 3.0];
  const ratingValues: FilterValue[] = [];
  for (const threshold of ratingBuckets) {
    const count = filterables.filter(
      (p) => p.rating !== null && p.rating >= threshold
    ).length;
    if (count > 0) {
      ratingValues.push({
        value: threshold.toString(),
        label: `${threshold}+ estrelas`,
        count,
      });
    }
  }
  if (ratingValues.length > 0) {
    filters.push({
      key: "minRating",
      label: "Avaliacao",
      type: "checkbox",
      values: ratingValues,
    });
  }

  return filters;
}

/**
 * Apply selected filters to a product list (in-memory filtering).
 */
export function applyFilters<T extends FilterableProduct>(
  products: T[],
  filters: ActiveFilters
): T[] {
  return products.filter((p) => {
    // Brand filter
    if (filters.brand?.length) {
      if (!p.brandName || !filters.brand.includes(p.brandName)) return false;
    }

    // Storage filter
    if (filters.storage?.length) {
      const s = extractStorage(p);
      if (!s || !filters.storage.includes(s)) return false;
    }

    // Color filter
    if (filters.color?.length) {
      const c = extractColor(p);
      if (!c || !filters.color.includes(c)) return false;
    }

    // Screen size filter
    if (filters.screenSize?.length) {
      const sc = extractScreenSize(p);
      if (!sc || !filters.screenSize.includes(sc)) return false;
    }

    // Price range filter
    if (filters.priceRange) {
      if (
        p.currentPrice < filters.priceRange.min ||
        p.currentPrice > filters.priceRange.max
      ) {
        return false;
      }
    }

    // Free shipping toggle
    if (filters.freeShipping === true) {
      if (!p.isFreeShipping) return false;
    }

    // Min rating filter
    if (filters.minRating !== undefined) {
      if (p.rating === null || p.rating < filters.minRating) return false;
    }

    return true;
  });
}

/**
 * Get count per value for a specific filter key from a product list.
 */
export function getFilterCounts(
  products: FilterableProduct[],
  filterKey: string
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const p of products) {
    let val: string | null = null;

    switch (filterKey) {
      case "brand":
        val = p.brandName;
        break;
      case "storage":
        val = extractStorage(p);
        break;
      case "color":
        val = extractColor(p);
        break;
      case "screenSize":
        val = extractScreenSize(p);
        break;
      case "freeShipping":
        val = p.isFreeShipping ? "true" : null;
        break;
      default:
        break;
    }

    if (val) {
      counts.set(val, (counts.get(val) ?? 0) + 1);
    }
  }

  return counts;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPriceRanges(
  min: number,
  max: number
): { min: number; max: number; label: string }[] {
  const ranges: { min: number; max: number; label: string }[] = [];
  const steps = [100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

  let prev = 0;
  for (const step of steps) {
    if (step > min && prev < max) {
      ranges.push({
        min: prev,
        max: step,
        label:
          prev === 0
            ? `Ate R$ ${step.toLocaleString("pt-BR")}`
            : `R$ ${prev.toLocaleString("pt-BR")} - R$ ${step.toLocaleString("pt-BR")}`,
      });
    }
    prev = step;
    if (prev >= max) break;
  }

  if (prev < max) {
    ranges.push({
      min: prev,
      max: Infinity,
      label: `Acima de R$ ${prev.toLocaleString("pt-BR")}`,
    });
  }

  return ranges;
}
