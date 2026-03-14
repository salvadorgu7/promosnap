import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import { runImportPipeline, type ImportItem } from "@/lib/import";
import { MercadoLivreSourceAdapter } from "@/lib/adapters/mercadolivre";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for Vercel

/**
 * POST /api/admin/catalog/fill
 *
 * Fills the catalog by searching ML for products across many queries.
 * Uses the Search API (public, no auth needed) which returns different
 * products than the highlights API, giving much more variety.
 *
 * Body (optional):
 *  - queries: string[] — custom search queries (default: built-in list)
 *  - limitPerQuery: number — max results per query (default: 50, max: 50)
 */

// Default queries covering major categories — each returns different products
const DEFAULT_QUERIES = [
  // Smartphones
  "iphone 15", "iphone 16", "samsung galaxy a", "samsung galaxy s24",
  "xiaomi redmi note", "motorola moto g", "poco x7",
  // Notebooks
  "notebook lenovo ideapad", "notebook dell inspiron", "notebook acer aspire",
  "macbook air", "notebook samsung", "notebook asus vivobook", "notebook gamer",
  // TVs
  "smart tv 55 4k", "smart tv 50", "smart tv lg", "smart tv samsung",
  // Audio
  "fone bluetooth jbl", "airpods", "headset gamer", "caixa de som bluetooth",
  "soundbar", "fone sony",
  // Gaming
  "playstation 5", "xbox series", "nintendo switch", "controle ps5",
  "jogo ps5", "cadeira gamer",
  // Tablets & Watches
  "ipad", "tablet samsung", "apple watch", "galaxy watch", "smartband xiaomi",
  // Peripherals
  "mouse gamer logitech", "teclado mecanico", "monitor gamer 27",
  "ssd 1tb", "webcam", "impressora hp",
  // Home
  "air fryer", "cafeteira nespresso", "aspirador robo",
  "geladeira frost free", "maquina lavar", "micro-ondas",
  "panela pressao", "ventilador", "ar condicionado split",
  // Beauty & Fashion
  "perfume masculino", "perfume feminino", "tenis nike", "tenis adidas",
  "mochila nike", "relogio casio",
  // Kids & Books
  "lego", "boneca barbie", "hot wheels",
  "kindle", "echo dot alexa",
  // Fitness
  "esteira eletrica", "bicicleta ergometrica", "halter",
];

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const queries: string[] = body.queries || DEFAULT_QUERIES;
  const limitPerQuery = Math.min(body.limitPerQuery || 50, 50);

  const adapter = new MercadoLivreSourceAdapter();

  const allItems: ImportItem[] = [];
  const seenExternalIds = new Set<string>();
  const queryStats: { query: string; found: number; new: number }[] = [];
  let totalSearched = 0;

  for (const query of queries) {
    try {
      // Search with pagination: page 0 and page 1 for more variety
      for (let page = 0; page < 2; page++) {
        const results = await adapter.search(query, { limit: limitPerQuery, page });
        totalSearched++;

        let newCount = 0;
        for (const r of results) {
          if (!r.externalId || seenExternalIds.has(r.externalId)) continue;
          seenExternalIds.add(r.externalId);
          newCount++;
          allItems.push({
            externalId: r.externalId,
            title: r.title,
            currentPrice: r.currentPrice,
            originalPrice: r.originalPrice,
            productUrl: r.productUrl,
            imageUrl: r.imageUrl,
            isFreeShipping: r.isFreeShipping ?? false,
            availability: (r.availability === "in_stock" || r.availability === "out_of_stock") ? r.availability : "in_stock",
            sourceSlug: "mercadolivre",
            discoverySource: "ml_discovery",
          });
        }

        if (page === 0) {
          queryStats.push({ query, found: results.length, new: newCount });
        }

        // If first page returned fewer than expected, skip page 2
        if (results.length < limitPerQuery * 0.5) break;
      }
    } catch (err) {
      queryStats.push({ query, found: 0, new: 0 });
      console.error(`[catalog/fill] Search "${query}" failed:`, err);
    }
  }

  if (allItems.length === 0) {
    return NextResponse.json({
      success: false,
      message: "No products found from any query",
      totalSearched,
      queryStats,
    });
  }

  // Import in batches of 100
  const BATCH = 100;
  const aggregated = { created: 0, updated: 0, skipped: 0, failed: 0 };

  for (let i = 0; i < allItems.length; i += BATCH) {
    const batch = allItems.slice(i, i + BATCH);
    try {
      const result = await runImportPipeline(batch);
      aggregated.created += result.created;
      aggregated.updated += result.updated;
      aggregated.skipped += result.skipped;
      aggregated.failed += result.failed;
    } catch (err) {
      aggregated.failed += batch.length;
      console.error(`[catalog/fill] Batch import failed:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    totalQueries: queries.length,
    totalSearched,
    uniqueProducts: allItems.length,
    imported: aggregated,
    queryStats: queryStats.slice(0, 20), // First 20 for brevity
  });
}

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  return NextResponse.json({
    description: "Fill catalog via ML Search API. POST to execute.",
    defaultQueries: DEFAULT_QUERIES.length,
    usage: "POST with optional { queries: string[], limitPerQuery: number }",
  });
}
