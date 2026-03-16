import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // ── byCategory ───────────────────────────────────────────────────────
    let byCategory: { name: string; total: number; imported: number; seed: number; coverage: number }[] = [];
    try {
      // Try with originType first
      const catStats = await prisma.$queryRaw<{
        name: string; total: number; imported: number;
      }[]>`
        SELECT
          c.name,
          COUNT(p.id)::int as total,
          COUNT(CASE WHEN p."originType" = 'imported' THEN 1 END)::int as imported
        FROM categories c
        LEFT JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
        GROUP BY c.id, c.name
        ORDER BY total DESC
      `;
      byCategory = (catStats as any[]).map(r => ({
        name: r.name,
        total: r.total || 0,
        imported: r.imported || 0,
        seed: (r.total || 0) - (r.imported || 0),
        coverage: r.total > 0 ? Math.round((r.imported / r.total) * 100) : 0,
      }));
    } catch {
      // Fallback without originType
      const catStats = await prisma.$queryRaw<{
        name: string; total: number;
      }[]>`
        SELECT
          c.name,
          COUNT(p.id)::int as total
        FROM categories c
        LEFT JOIN products p ON p."categoryId" = c.id AND p.status = 'ACTIVE'
        GROUP BY c.id, c.name
        ORDER BY total DESC
      `;
      byCategory = (catStats as any[]).map(r => ({
        name: r.name,
        total: r.total || 0,
        imported: 0,
        seed: r.total || 0,
        coverage: 0,
      }));
    }

    // ── byBrand ──────────────────────────────────────────────────────────
    let byBrand: { name: string; total: number; imported: number; seed: number }[] = [];
    try {
      const brandStats = await prisma.$queryRaw<{
        name: string; total: number; imported: number;
      }[]>`
        SELECT
          b.name,
          COUNT(p.id)::int as total,
          COUNT(CASE WHEN p."originType" = 'imported' THEN 1 END)::int as imported
        FROM brands b
        LEFT JOIN products p ON p."brandId" = b.id AND p.status = 'ACTIVE'
        GROUP BY b.id, b.name
        HAVING COUNT(p.id) > 0
        ORDER BY total DESC
        LIMIT 20
      `;
      byBrand = (brandStats as any[]).map(r => ({
        name: r.name,
        total: r.total || 0,
        imported: r.imported || 0,
        seed: (r.total || 0) - (r.imported || 0),
      }));
    } catch {
      const brandStats = await prisma.$queryRaw<{
        name: string; total: number;
      }[]>`
        SELECT
          b.name,
          COUNT(p.id)::int as total
        FROM brands b
        LEFT JOIN products p ON p."brandId" = b.id AND p.status = 'ACTIVE'
        GROUP BY b.id, b.name
        HAVING COUNT(p.id) > 0
        ORDER BY total DESC
        LIMIT 20
      `;
      byBrand = (brandStats as any[]).map(r => ({
        name: r.name,
        total: r.total || 0,
        imported: 0,
        seed: r.total || 0,
      }));
    }

    // ── bySource ─────────────────────────────────────────────────────────
    let bySource: { name: string; products: number; activeOffers: number; lastImport: string | null }[] = [];
    try {
      const sourceStats = await prisma.$queryRaw<{
        name: string; products: number; active_offers: number; last_import: Date | null;
      }[]>`
        SELECT
          s.name,
          COUNT(DISTINCT l."productId")::int as products,
          COUNT(DISTINCT CASE WHEN o."isActive" = true THEN o.id END)::int as active_offers,
          MAX(l."createdAt") as last_import
        FROM sources s
        LEFT JOIN listings l ON l."sourceId" = s.id
        LEFT JOIN offers o ON o."listingId" = l.id
        GROUP BY s.id, s.name
        ORDER BY products DESC
      `;
      bySource = (sourceStats as any[]).map(r => ({
        name: r.name,
        products: r.products || 0,
        activeOffers: r.active_offers || 0,
        lastImport: r.last_import ? new Date(r.last_import).toISOString() : null,
      }));
    } catch { /* non-critical */ }

    // ── gaps (zero-result searches) ──────────────────────────────────────
    let gaps: { type: string; query: string; count: number; suggestedCategory: string | null }[] = [];
    try {
      const zeroResults = await prisma.searchLog.groupBy({
        by: ['normalizedQuery'],
        where: {
          resultsCount: 0,
          createdAt: { gte: sevenDaysAgo },
          normalizedQuery: { not: null },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 20,
      });

      // Try to suggest categories based on keyword overlap
      const categories = await prisma.category.findMany({
        select: { name: true, slug: true },
      });

      gaps = zeroResults
        .filter(r => r.normalizedQuery)
        .map(r => {
          const query = r.normalizedQuery!;
          // Simple category suggestion: find category whose name is contained in query or vice versa
          const match = categories.find(c =>
            query.toLowerCase().includes(c.name.toLowerCase()) ||
            c.name.toLowerCase().includes(query.toLowerCase())
          );
          return {
            type: 'zero_result_search',
            query,
            count: r._count.id,
            suggestedCategory: match?.slug || null,
          };
        });
    } catch { /* non-critical */ }

    return NextResponse.json({
      byCategory,
      byBrand,
      bySource,
      gaps,
    });
  } catch (error) {
    logger.error("catalog-coverage.failed", { error });
    return NextResponse.json(
      { error: "Failed to generate catalog coverage report" },
      { status: 500 }
    );
  }
}
