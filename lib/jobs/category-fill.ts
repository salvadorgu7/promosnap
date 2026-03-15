// ============================================================================
// Job: Category Fill — targeted category densification via Mercado Livre
// ============================================================================

import prisma from "@/lib/db/prisma";
import { runImportPipeline, type ImportItem } from "@/lib/import";
import { MercadoLivreSourceAdapter } from "@/lib/adapters/mercadolivre";
import { getPrioritizedCategories } from "@/lib/catalog/prioritization";

// ── Types ───────────────────────────────────────────────────────────────────

interface FillConfig {
  categorySlug: string;
  queries: string[];
  maxPerQuery: number;
  dryRun?: boolean;
}

interface FillResult {
  category: string;
  queriesProcessed: number;
  productsFound: number;
  productsCreated: number;
  productsUpdated: number;
  errors: string[];
}

// ── Default queries per category slug ───────────────────────────────────────

const CATEGORY_QUERIES: Record<string, string[]> = {
  celulares: [
    "celular samsung galaxy",
    "iphone apple",
    "celular xiaomi redmi",
    "celular motorola",
    "smartphone 5g",
  ],
  notebooks: [
    "notebook dell",
    "notebook lenovo ideapad",
    "macbook apple",
    "notebook gamer",
    "notebook asus",
  ],
  tvs: [
    "smart tv 50 polegadas",
    "smart tv 4k",
    "tv lg oled",
    "tv samsung crystal",
    "tv 65 polegadas",
  ],
  "fones-de-ouvido": [
    "fone bluetooth jbl",
    "airpods apple",
    "headset gamer",
    "fone sony wh",
    "fone sem fio",
  ],
  consoles: [
    "playstation 5",
    "xbox series",
    "nintendo switch",
    "console de video game",
    "ps5 controle",
  ],
  tablets: [
    "ipad apple",
    "tablet samsung galaxy tab",
    "tablet android",
    "tablet lenovo",
    "tablet infantil",
  ],
  smartwatches: [
    "apple watch",
    "smartwatch samsung galaxy",
    "smartwatch xiaomi",
    "relogio inteligente",
    "garmin smartwatch",
  ],
  monitores: [
    "monitor gamer 144hz",
    "monitor 27 polegadas",
    "monitor 4k",
    "monitor curvo",
    "monitor dell",
  ],
  "placas-de-video": [
    "placa de video nvidia rtx",
    "gpu amd radeon",
    "placa de video geforce",
    "gpu gamer",
    "placa de video 8gb",
  ],
  processadores: [
    "processador intel core",
    "processador amd ryzen",
    "cpu intel i7",
    "processador ryzen 5",
    "cpu gamer",
  ],
  geladeiras: [
    "geladeira frost free",
    "geladeira inverse",
    "geladeira brastemp",
    "geladeira electrolux",
    "geladeira duplex",
  ],
  aspiradores: [
    "aspirador robo",
    "aspirador vertical",
    "aspirador de po portatil",
    "aspirador wap",
    "aspirador sem fio",
  ],
  tenis: [
    "tenis nike",
    "tenis adidas",
    "tenis new balance",
    "tenis corrida masculino",
    "tenis casual feminino",
  ],
  perfumes: [
    "perfume masculino importado",
    "perfume feminino",
    "perfume carolina herrera",
    "perfume dolce gabbana",
    "perfume calvin klein",
  ],
};

// ── Core fill function ─────────────────────────────────────────────────────

/**
 * Category-targeted import job.
 * Instead of random discovery, focuses on specific categories with specific queries.
 * Uses the ML adapter search endpoint to find products, then imports via the
 * unified import pipeline. Fully idempotent — safe to run multiple times.
 */
export async function fillCategory(config: FillConfig): Promise<FillResult> {
  const result: FillResult = {
    category: config.categorySlug,
    queriesProcessed: 0,
    productsFound: 0,
    productsCreated: 0,
    productsUpdated: 0,
    errors: [],
  };

  // Instantiate the ML adapter
  const adapter = new MercadoLivreSourceAdapter();

  if (!adapter.isConfigured()) {
    result.errors.push(
      "ML adapter not configured — set ML_CLIENT_ID and ML_CLIENT_SECRET env vars"
    );
    return result;
  }

  const healthCheck = adapter.healthCheck();
  if (!healthCheck.healthy) {
    result.errors.push(`ML adapter unhealthy: ${healthCheck.message}`);
    return result;
  }

  console.log(
    `[category-fill] Starting fill for "${config.categorySlug}" with ${config.queries.length} queries (max ${config.maxPerQuery}/query, dryRun=${!!config.dryRun})`
  );

  const allImportItems: ImportItem[] = [];

  for (const query of config.queries) {
    try {
      const searchResults = await adapter.search(query, {
        limit: Math.min(config.maxPerQuery, 50), // ML API caps at 50
      });

      result.queriesProcessed++;
      result.productsFound += searchResults.length;

      console.log(
        `[category-fill] Query "${query}" returned ${searchResults.length} results`
      );

      for (const item of searchResults) {
        // Build affiliate URL (adapter already includes it if configured)
        const productUrl = item.affiliateUrl || item.productUrl;

        allImportItems.push({
          externalId: item.externalId,
          title: item.title,
          currentPrice: item.currentPrice,
          originalPrice: item.originalPrice,
          productUrl,
          imageUrl: item.imageUrl,
          isFreeShipping: item.isFreeShipping ?? false,
          availability: item.availability === "out_of_stock" ? "out_of_stock" : "in_stock",
          categorySlug: config.categorySlug,
          sourceSlug: "mercadolivre",
          discoverySource: "category_fill",
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Query "${query}" failed: ${msg}`);
      console.error(`[category-fill] Query "${query}" error:`, msg);
    }
  }

  if (allImportItems.length === 0) {
    console.log(`[category-fill] No products found for "${config.categorySlug}"`);
    return result;
  }

  // Deduplicate by externalId before importing
  const uniqueItems = deduplicateByExternalId(allImportItems);
  console.log(
    `[category-fill] ${uniqueItems.length} unique products (${allImportItems.length - uniqueItems.length} duplicates removed)`
  );

  if (config.dryRun) {
    console.log(
      `[category-fill] Dry run — skipping import of ${uniqueItems.length} products`
    );
    result.productsFound = uniqueItems.length;
    return result;
  }

  // Import in batches of 100
  const BATCH = 100;
  for (let i = 0; i < uniqueItems.length; i += BATCH) {
    const batch = uniqueItems.slice(i, i + BATCH);
    try {
      const importResult = await runImportPipeline(batch);
      result.productsCreated += importResult.created;
      result.productsUpdated += importResult.updated;

      console.log(
        `[category-fill] Batch ${Math.floor(i / BATCH) + 1}: created=${importResult.created} updated=${importResult.updated} skipped=${importResult.skipped} failed=${importResult.failed}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      result.errors.push(`Import batch failed: ${msg}`);
      console.error(`[category-fill] Import batch error:`, msg);
    }
  }

  console.log(
    `[category-fill] Completed "${config.categorySlug}": found=${result.productsFound} created=${result.productsCreated} updated=${result.productsUpdated} errors=${result.errors.length}`
  );

  return result;
}

// ── Priority categories batch fill ──────────────────────────────────────────

/**
 * Fills all priority categories by fetching the top prioritized categories
 * from the DB, resolving their queries, and running fillCategory for each.
 */
export async function fillPriorityCategories(
  maxPerCategory?: number
): Promise<FillResult[]> {
  const results: FillResult[] = [];
  const maxPerQuery = maxPerCategory ?? 20;

  // Get prioritized categories from the DB-driven scoring system
  let priorityCategories: { slug: string; name: string }[];
  try {
    const scored = await getPrioritizedCategories();
    priorityCategories = scored
      .filter((c) => c.score > 0)
      .slice(0, 15) // top 15 categories
      .map((c) => ({ slug: c.slug, name: c.name }));
  } catch (err) {
    console.warn(
      `[category-fill] Could not fetch prioritized categories, falling back to known slugs:`,
      err instanceof Error ? err.message : err
    );
    // Fallback: use the keys from CATEGORY_QUERIES
    priorityCategories = Object.keys(CATEGORY_QUERIES).map((slug) => ({
      slug,
      name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  if (priorityCategories.length === 0) {
    // If DB has no categories yet, use the built-in query map
    priorityCategories = Object.keys(CATEGORY_QUERIES).map((slug) => ({
      slug,
      name: slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    }));
  }

  console.log(
    `[category-fill] Filling ${priorityCategories.length} priority categories (maxPerQuery=${maxPerQuery})`
  );

  for (const cat of priorityCategories) {
    const queries = CATEGORY_QUERIES[cat.slug];
    if (!queries || queries.length === 0) {
      // Generate a generic query from the category name
      const genericQueries = [cat.name, `${cat.name} oferta`, `${cat.name} promocao`];
      const fillResult = await fillCategory({
        categorySlug: cat.slug,
        queries: genericQueries,
        maxPerQuery,
      });
      results.push(fillResult);
      continue;
    }

    const fillResult = await fillCategory({
      categorySlug: cat.slug,
      queries,
      maxPerQuery,
    });
    results.push(fillResult);
  }

  // Summary
  const totalCreated = results.reduce((s, r) => s + r.productsCreated, 0);
  const totalUpdated = results.reduce((s, r) => s + r.productsUpdated, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);
  console.log(
    `[category-fill] Priority fill complete: ${results.length} categories, ${totalCreated} created, ${totalUpdated} updated, ${totalErrors} errors`
  );

  return results;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function deduplicateByExternalId(items: ImportItem[]): ImportItem[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.externalId)) return false;
    seen.add(item.externalId);
    return true;
  });
}

/**
 * Get available queries for a given category slug.
 * Returns the built-in queries or an empty array if not mapped.
 */
export function getCategoryQueries(slug: string): string[] {
  return CATEGORY_QUERIES[slug] ?? [];
}

/**
 * List all category slugs that have built-in query mappings.
 */
export function getAvailableCategorySlugs(): string[] {
  return Object.keys(CATEGORY_QUERIES);
}
