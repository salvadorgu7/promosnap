import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import {
  fillCategory,
  fillPriorityCategories,
  getCategoryQueries,
  getAvailableCategorySlugs,
} from "@/lib/jobs/category-fill";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min for Vercel

/**
 * POST /api/admin/catalog/fill-category
 *
 * Targeted category densification — fills a specific category with products
 * from Mercado Livre using pre-defined or custom search queries.
 *
 * Body:
 *   { categorySlug: string, queries?: string[], maxPerQuery?: number, dryRun?: boolean }
 *
 * If categorySlug is "all", fills all priority categories.
 * If queries are omitted, uses the built-in query map for that category.
 */
export async function POST(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const categorySlug = typeof body.categorySlug === "string" ? body.categorySlug.trim() : "";
  const maxPerQuery = typeof body.maxPerQuery === "number" ? body.maxPerQuery : 20;
  const dryRun = body.dryRun === true;

  // Fill all priority categories
  if (categorySlug === "all") {
    try {
      const results = await fillPriorityCategories(maxPerQuery);
      const totalCreated = results.reduce((s, r) => s + r.productsCreated, 0);
      const totalUpdated = results.reduce((s, r) => s + r.productsUpdated, 0);
      const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

      return NextResponse.json({
        success: true,
        mode: "all-priority",
        categoriesProcessed: results.length,
        totalCreated,
        totalUpdated,
        totalErrors,
        results,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error("fill-category.priority-fill-failed", { error: err });
      return NextResponse.json(
        { error: `Priority fill failed: ${msg}` },
        { status: 500 }
      );
    }
  }

  // Fill a specific category
  if (!categorySlug) {
    return NextResponse.json(
      {
        error: 'Missing required field "categorySlug". Use "all" to fill all priority categories.',
        availableCategories: getAvailableCategorySlugs(),
      },
      { status: 400 }
    );
  }

  // Resolve queries: use provided queries, fall back to built-in map, or generate generic ones
  let queries: string[];
  if (Array.isArray(body.queries) && body.queries.length > 0) {
    queries = body.queries.filter((q): q is string => typeof q === "string" && q.trim().length > 0);
  } else {
    queries = getCategoryQueries(categorySlug);
    if (queries.length === 0) {
      // Generate generic queries from the slug
      const name = categorySlug.replace(/-/g, " ");
      queries = [name, `${name} oferta`, `${name} promocao`];
    }
  }

  if (queries.length === 0) {
    return NextResponse.json(
      { error: "No queries resolved for this category. Provide queries in the request body." },
      { status: 400 }
    );
  }

  try {
    const result = await fillCategory({
      categorySlug,
      queries,
      maxPerQuery,
      dryRun,
    });

    return NextResponse.json({
      success: result.errors.length === 0,
      ...result,
      queriesUsed: queries,
      dryRun,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error("fill-category.fill-failed", { error: err, categorySlug });
    return NextResponse.json(
      { error: `Fill failed: ${msg}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/catalog/fill-category
 * Returns available categories and their query mappings.
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  const slugs = getAvailableCategorySlugs();
  const categories = slugs.map((slug) => ({
    slug,
    queries: getCategoryQueries(slug),
    queryCount: getCategoryQueries(slug).length,
  }));

  return NextResponse.json({
    description:
      "Targeted category densification. POST with { categorySlug, queries?, maxPerQuery?, dryRun? } to fill a category. Use categorySlug='all' for batch fill.",
    availableCategories: categories,
    totalCategories: categories.length,
  });
}
