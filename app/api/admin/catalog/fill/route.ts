import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import { runImportPipeline, type ImportItem } from "@/lib/import";
import { getMLToken } from "@/lib/ml-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for Vercel

/**
 * POST /api/admin/catalog/fill
 *
 * Fills the catalog by searching ML for products across many queries.
 * Uses ML Search API with auth token for reliable results from Vercel.
 *
 * Body (optional):
 *  - queries: string[] — custom search queries (default: built-in list)
 *  - limitPerQuery: number — max results per query (default: 50, max: 50)
 */

const ML_API = "https://api.mercadolibre.com";
const ML_SITE = "MLB";

// Default queries covering major categories
const DEFAULT_QUERIES = [
  "iphone 15", "iphone 16", "samsung galaxy a", "samsung galaxy s24",
  "xiaomi redmi note", "motorola moto g", "poco x7",
  "notebook lenovo ideapad", "notebook dell inspiron", "notebook acer aspire",
  "macbook air", "notebook samsung", "notebook asus vivobook", "notebook gamer",
  "smart tv 55 4k", "smart tv 50", "smart tv lg", "smart tv samsung",
  "fone bluetooth jbl", "airpods", "headset gamer", "caixa de som bluetooth",
  "soundbar", "fone sony",
  "playstation 5", "xbox series", "nintendo switch", "controle ps5",
  "jogo ps5", "cadeira gamer",
  "ipad", "tablet samsung", "apple watch", "galaxy watch", "smartband xiaomi",
  "mouse gamer logitech", "teclado mecanico", "monitor gamer 27",
  "ssd 1tb", "webcam", "impressora hp",
  "air fryer", "cafeteira nespresso", "aspirador robo",
  "geladeira frost free", "maquina lavar", "micro-ondas",
  "panela pressao", "ventilador", "ar condicionado split",
  "perfume masculino", "perfume feminino", "tenis nike", "tenis adidas",
  "mochila nike", "relogio casio",
  "lego", "boneca barbie", "hot wheels",
  "kindle", "echo dot alexa",
  "esteira eletrica", "bicicleta ergometrica", "halter",
];

interface MLSearchItem {
  id: string;
  title: string;
  price: number;
  original_price: number | null;
  permalink: string;
  thumbnail: string;
  shipping: { free_shipping: boolean };
  available_quantity: number;
}

async function mlSearch(
  query: string,
  limit: number,
  offset: number,
  token: string | null
): Promise<MLSearchItem[]> {
  const url = new URL(`${ML_API}/sites/${ML_SITE}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("limit", String(Math.min(limit, 50)));
  url.searchParams.set("offset", String(offset));

  const headers: Record<string, string> = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error(`[catalog/fill] ML search "${query}" failed: ${res.status} — ${errText.slice(0, 200)}`);
    return [];
  }
  const data = await res.json();
  return data.results || [];
}

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  const body = await req.json().catch(() => ({}));
  const queries: string[] = body.queries || DEFAULT_QUERIES;
  const limitPerQuery = Math.min(body.limitPerQuery || 50, 50);

  // Get ML auth token for reliable search from server IPs
  let token: string | null = null;
  try {
    token = await getMLToken();
  } catch {
    console.warn("[catalog/fill] No ML token available, trying without auth");
  }

  const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID;
  const affiliateWord = process.env.MERCADOLIVRE_AFFILIATE_WORD;

  const allItems: ImportItem[] = [];
  const seenExternalIds = new Set<string>();
  const queryStats: { query: string; found: number; new: number; error?: string }[] = [];
  let totalSearched = 0;

  for (const query of queries) {
    try {
      for (let page = 0; page < 2; page++) {
        const results = await mlSearch(query, limitPerQuery, page * limitPerQuery, token);
        totalSearched++;

        let newCount = 0;
        for (const item of results) {
          if (!item.id || seenExternalIds.has(item.id)) continue;
          if (item.price <= 0) continue;
          seenExternalIds.add(item.id);
          newCount++;

          // Build affiliate URL
          let affiliateUrl = item.permalink;
          if (affiliateId && affiliateUrl) {
            const u = new URL(affiliateUrl);
            u.searchParams.set("matt_tool", affiliateId);
            if (affiliateWord) u.searchParams.set("matt_word", affiliateWord);
            affiliateUrl = u.toString();
          }

          allItems.push({
            externalId: item.id,
            title: item.title,
            currentPrice: item.price,
            originalPrice: item.original_price ?? undefined,
            productUrl: affiliateUrl,
            imageUrl: item.thumbnail?.replace(/-I\.jpg$/, "-O.jpg"),
            isFreeShipping: item.shipping?.free_shipping ?? false,
            availability: item.available_quantity > 0 ? "in_stock" : "out_of_stock",
            sourceSlug: "mercadolivre",
            discoverySource: "ml_discovery",
          });
        }

        if (page === 0) {
          queryStats.push({ query, found: results.length, new: newCount });
        }
        if (results.length < limitPerQuery * 0.5) break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      queryStats.push({ query, found: 0, new: 0, error: msg });
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
