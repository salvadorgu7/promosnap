/**
 * Zero-Result Actions — suggests alternatives when search yields no results.
 */
import prisma from "@/lib/db/prisma";

export interface ZeroResultAction {
  type: "related_query" | "category" | "trending" | "popular_product";
  label: string;
  href: string;
  reason: string;
}

/**
 * Generate smart suggestions when a search query returns zero results.
 */
export async function getZeroResultActions(query: string): Promise<ZeroResultAction[]> {
  const actions: ZeroResultAction[] = [];
  const q = query.toLowerCase().trim();

  try {
    // 1. Find categories that match query words
    const words = q.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      const categories = await prisma.category.findMany({
        where: {
          OR: words.map(w => ({
            name: { contains: w, mode: "insensitive" as const },
          })),
        },
        take: 3,
        select: { name: true, slug: true },
      });

      for (const cat of categories) {
        actions.push({
          type: "category",
          label: cat.name,
          href: `/categoria/${cat.slug}`,
          reason: `Explore a categoria ${cat.name}`,
        });
      }
    }

    // 2. Find related products by partial match
    const relatedProducts = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: words.map(w => ({
          name: { contains: w, mode: "insensitive" as const },
        })),
      },
      take: 3,
      select: { name: true, slug: true },
      orderBy: { popularityScore: "desc" },
    });

    for (const p of relatedProducts) {
      actions.push({
        type: "popular_product",
        label: p.name,
        href: `/produto/${p.slug}`,
        reason: "Produto relacionado",
      });
    }

    // 3. Suggest trending searches
    const trending = await prisma.trendingKeyword.findMany({
      take: 4,
      orderBy: { position: "asc" },
      select: { keyword: true },
    });

    for (const t of trending) {
      actions.push({
        type: "trending",
        label: t.keyword,
        href: `/busca?q=${encodeURIComponent(t.keyword)}`,
        reason: "Em alta agora",
      });
    }

    // 4. Suggest popular queries from history
    const popularSearches = await prisma.$queryRaw<Array<{
      query: string;
      count: bigint;
    }>>`
      SELECT query, COUNT(*) as count
      FROM "search_logs"
      WHERE "resultsCount" > 0
        AND query IS NOT NULL AND query != ''
      GROUP BY query
      ORDER BY count DESC
      LIMIT 5
    `;

    for (const s of popularSearches) {
      if (!actions.some(a => a.label.toLowerCase() === s.query.toLowerCase())) {
        actions.push({
          type: "related_query",
          label: s.query,
          href: `/busca?q=${encodeURIComponent(s.query)}`,
          reason: "Busca popular",
        });
      }
    }
  } catch {
    // Graceful fallback
  }

  return actions.slice(0, 8);
}
