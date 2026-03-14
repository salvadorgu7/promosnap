import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import { runImportPipeline, type ImportItem } from "@/lib/import";
import { mlFetch, batchHydrateItems, type HydrateEntry } from "@/lib/ml-discovery/items";
import { mlCategoryToSlug } from "@/lib/ml-discovery/categories";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for Vercel

/**
 * POST /api/admin/catalog/fill
 *
 * Fills the catalog by discovering ML subcategories, fetching highlights
 * for each, hydrating item details, and importing. The highlights API
 * works from Vercel IPs (unlike search which returns 403).
 *
 * Strategy: get subcategories of main ML categories → fetch highlights
 * for each subcategory → hydrate → import. This gives much more variety
 * than fetching only parent category highlights.
 */

const ML_API = "https://api.mercadolibre.com";

// Main ML category IDs to expand into subcategories
const PARENT_CATEGORIES = [
  "MLB1055",   // Celulares
  "MLB1652",   // Notebooks
  "MLB1002",   // TVs
  "MLB1676",   // Fones de Ouvido
  "MLB186456", // Consoles
  "MLB1659",   // Tablets
  "MLB352679", // Smartwatches
  "MLB1670",   // Monitores
  "MLB1648",   // Desktop
  "MLB1714",   // GPUs
  "MLB1576",   // Geladeiras
  "MLB1574",   // Aspiradores
  "MLB1246",   // Perfumes
  "MLB1430",   // Brinquedos
  "MLB1132",   // Jogos
  "MLB1694",   // Processadores
  "MLB1696",   // Memoria RAM
];

interface MLSubcategory {
  id: string;
  name: string;
}

async function getSubcategories(categoryId: string): Promise<MLSubcategory[]> {
  try {
    const res = await mlFetch(`${ML_API}/categories/${categoryId}`);
    if (!res.ok) return [];
    const data = await res.json();
    const children = data.children_categories || [];
    return children.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }));
  } catch {
    return [];
  }
}

interface HighlightEntry {
  id: string;
  type: "ITEM" | "PRODUCT";
}

async function fetchHighlights(categoryId: string): Promise<HighlightEntry[]> {
  try {
    const res = await mlFetch(`${ML_API}/highlights/MLB/category/${categoryId}`);
    if (!res.ok) return [];
    const data = await res.json();
    const content = data.content || [];
    return content
      .filter((e: { type: string }) => e.type === "ITEM" || e.type === "PRODUCT")
      .map((e: { id: string; type: string }) => ({ id: e.id, type: e.type as "ITEM" | "PRODUCT" }));
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const maxSubcategories = body.maxSubcategories || 8; // per parent
  const parentCats: string[] = body.categories || PARENT_CATEGORIES;

  const allEntries = new Map<string, HydrateEntry & { mlParentCategory: string }>();
  const categoryStats: { parent: string; subcats: number; items: number }[] = [];

  // Phase 1: Get subcategories and fetch highlights (with type hints)
  for (const parentId of parentCats) {
    const subcats = await getSubcategories(parentId);
    const selectedSubcats = subcats.slice(0, maxSubcategories);
    let parentItemCount = 0;

    // Also fetch parent highlights
    const parentHighlights = await fetchHighlights(parentId);
    for (const entry of parentHighlights) {
      if (!allEntries.has(entry.id)) allEntries.set(entry.id, { id: entry.id, type: entry.type, mlParentCategory: parentId });
    }
    parentItemCount += parentHighlights.length;

    // Fetch subcategory highlights in parallel (batches of 4)
    for (let i = 0; i < selectedSubcats.length; i += 4) {
      const batch = selectedSubcats.slice(i, i + 4);
      const results = await Promise.allSettled(
        batch.map((sc) => fetchHighlights(sc.id))
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          for (const entry of r.value) {
            if (!allEntries.has(entry.id)) allEntries.set(entry.id, { id: entry.id, type: entry.type, mlParentCategory: parentId });
          }
          parentItemCount += r.value.length;
        }
      }
    }

    categoryStats.push({
      parent: parentId,
      subcats: selectedSubcats.length,
      items: parentItemCount,
    });
  }

  if (allEntries.size === 0) {
    return NextResponse.json({
      success: false,
      message: "No item IDs found from highlights",
      categoryStats,
    });
  }

  // Phase 2: Hydrate items with type hints (ITEM vs PRODUCT)
  const entryList = Array.from(allEntries.values());
  const itemIdList = entryList.map(e => e.id);
  let hydratedProducts;
  try {
    const hydrated = await batchHydrateItems(entryList);
    // Products from batchHydrateItems are already normalized MLProduct objects
    hydratedProducts = hydrated.products.filter((p) => p.currentPrice > 0);
  } catch (err) {
    return NextResponse.json({
      success: false,
      message: `Hydration failed: ${err instanceof Error ? err.message : String(err)}`,
      uniqueItemIds: itemIdList.length,
      categoryStats,
    }, { status: 500 });
  }

  if (!hydratedProducts || hydratedProducts.length === 0) {
    return NextResponse.json({
      success: false,
      message: "Hydration returned no products",
      uniqueItemIds: itemIdList.length,
      categoryStats,
    });
  }

  // Phase 3: Import
  const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID;
  const affiliateWord = process.env.MERCADOLIVRE_AFFILIATE_WORD;

  // Build a map from externalId → mlParentCategory for category resolution
  // Note: highlight entry IDs may differ from hydrated externalIds (e.g., catalog product ID
  // vs buy_box_winner item_id). Map both the original highlight ID AND the hydrated externalId.
  const idToParent = new Map<string, string>();
  for (const entry of allEntries.values()) {
    idToParent.set(entry.id, entry.mlParentCategory);
  }
  // Also map hydrated products' externalIds → parent via catalogProductId
  for (const p of hydratedProducts) {
    if (p.catalogProductId && allEntries.has(p.catalogProductId)) {
      idToParent.set(p.externalId, allEntries.get(p.catalogProductId)!.mlParentCategory);
    }
    // For ITEM type, the highlight ID IS the externalId, so it's already in the map
  }

  const importItems: ImportItem[] = hydratedProducts.map((p) => {
    let productUrl = p.productUrl;
    if (affiliateId && productUrl) {
      try {
        const u = new URL(productUrl);
        u.searchParams.set("matt_tool", affiliateId);
        if (affiliateWord) u.searchParams.set("matt_word", affiliateWord);
        productUrl = u.toString();
      } catch { /* keep original */ }
    }

    // Resolve category: try product's own ML categoryId first, then parent category
    const categorySlug = mlCategoryToSlug(p.categoryId || "") || mlCategoryToSlug(idToParent.get(p.externalId) || "");

    return {
      externalId: p.externalId,
      title: p.title,
      currentPrice: p.currentPrice,
      originalPrice: p.originalPrice,
      productUrl,
      imageUrl: p.imageUrl,
      isFreeShipping: p.isFreeShipping ?? false,
      availability: p.availability === "out_of_stock" ? "out_of_stock" as const : "in_stock" as const,
      categorySlug,
      sourceSlug: "mercadolivre",
      discoverySource: "ml_discovery",
    };
  });

  // Import in batches of 100
  const BATCH = 100;
  const agg = { created: 0, updated: 0, skipped: 0, failed: 0 };
  for (let i = 0; i < importItems.length; i += BATCH) {
    try {
      const r = await runImportPipeline(importItems.slice(i, i + BATCH));
      agg.created += r.created;
      agg.updated += r.updated;
      agg.skipped += r.skipped;
      agg.failed += r.failed;
    } catch (err) {
      agg.failed += Math.min(BATCH, importItems.length - i);
      console.error(`[catalog/fill] Batch import failed:`, err);
    }
  }

  // Phase 4: Direct category backfill for orphan products (no category assigned)
  let backfilled = 0;
  let orphanCount = 0;
  try {
    const extIdToSlug = new Map<string, string>();
    for (const p of hydratedProducts) {
      const slug = mlCategoryToSlug(p.categoryId || "") || mlCategoryToSlug(idToParent.get(p.externalId) || "");
      if (slug) extIdToSlug.set(p.externalId, slug);
    }

    if (extIdToSlug.size > 0) {
      const orphanProducts = await prisma.product.findMany({
        where: { categoryId: null },
        select: { id: true, listings: { select: { externalId: true }, take: 1 } },
      });
      orphanCount = orphanProducts.length;

      for (const prod of orphanProducts) {
        const extId = prod.listings[0]?.externalId;
        if (!extId) continue;
        const slug = extIdToSlug.get(extId);
        if (!slug) continue;

        const cat = await prisma.category.upsert({
          where: { slug },
          create: { name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), slug },
          update: {},
        });
        await prisma.product.update({ where: { id: prod.id }, data: { categoryId: cat.id } });
        backfilled++;
      }
    }
    if (backfilled > 0 || orphanCount > 0) {
      console.log(`[catalog/fill] Category backfill: ${backfilled}/${orphanCount} orphan products categorized`);
    }
  } catch (err) {
    console.error(`[catalog/fill] Category backfill error:`, err);
  }

  return NextResponse.json({
    success: true,
    uniqueItemIds: itemIdList.length,
    hydratedProducts: hydratedProducts.length,
    imported: agg,
    categoryBackfill: { updated: backfilled, orphans: orphanCount },
    categoryStats,
  });
}

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  return NextResponse.json({
    description: "Fill catalog via ML subcategory highlights + hydration. POST to execute.",
    version: "v4",
    parentCategories: PARENT_CATEGORIES.length,
    strategy: "Expands each parent into subcategories → fetches highlights for each → hydrates item details → imports with category backfill",
  });
}
