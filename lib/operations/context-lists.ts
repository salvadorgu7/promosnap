// ============================================
// CONTEXT LISTS — data-driven lists for each operational context
// ============================================

import prisma from "@/lib/db/prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ContextListItem {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  reason: string;
  metric: number;
  metricLabel: string;
}

// ─── Catalog Context ────────────────────────────────────────────────────────

/**
 * Products marked as needing review.
 */
export async function getNeedsReviewList(limit = 10): Promise<ContextListItem[]> {
  try {
    const products = await prisma.product.findMany({
      where: { needsReview: true, status: "ACTIVE" },
      orderBy: { popularityScore: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        popularityScore: true,
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl,
      reason: "Marcado para revisao",
      metric: p.popularityScore,
      metricLabel: "popularity",
    }));
  } catch {
    return [];
  }
}

/**
 * Listings with low match confidence to their canonical product.
 */
export async function getWeakMatchList(limit = 10): Promise<ContextListItem[]> {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: "ACTIVE",
        productId: { not: null },
        matchConfidence: { lt: 0.5 },
      },
      orderBy: { matchConfidence: "asc" },
      take: limit,
      select: {
        id: true,
        rawTitle: true,
        matchConfidence: true,
        product: { select: { name: true, slug: true, imageUrl: true } },
      },
    });

    return listings.map((l) => ({
      id: l.id,
      name: l.product?.name ?? l.rawTitle,
      slug: l.product?.slug ?? "",
      imageUrl: l.product?.imageUrl ?? null,
      reason: `Match confidence: ${((l.matchConfidence ?? 0) * 100).toFixed(0)}%`,
      metric: Math.round((l.matchConfidence ?? 0) * 100),
      metricLabel: "confidence %",
    }));
  } catch {
    return [];
  }
}

/**
 * Active products without an image.
 */
export async function getMissingImageList(limit = 10): Promise<ContextListItem[]> {
  try {
    const products = await prisma.product.findMany({
      where: { status: "ACTIVE", hidden: false, imageUrl: null },
      orderBy: { popularityScore: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        popularityScore: true,
      },
    });

    return products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: null,
      reason: "Sem imagem principal",
      metric: p.popularityScore,
      metricLabel: "popularity",
    }));
  } catch {
    return [];
  }
}

/**
 * Products missing key attributes (no brand, no category, no description).
 */
export async function getMissingAttributesList(limit = 10): Promise<ContextListItem[]> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        hidden: false,
        OR: [
          { brandId: null },
          { categoryId: null },
          { description: null },
        ],
      },
      orderBy: { popularityScore: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        brandId: true,
        categoryId: true,
        description: true,
        popularityScore: true,
      },
    });

    return products.map((p) => {
      const missing: string[] = [];
      if (!p.brandId) missing.push("marca");
      if (!p.categoryId) missing.push("categoria");
      if (!p.description) missing.push("descricao");

      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        imageUrl: p.imageUrl,
        reason: `Faltam: ${missing.join(", ")}`,
        metric: missing.length,
        metricLabel: "campos",
      };
    });
  } catch {
    return [];
  }
}

// ─── Growth Context ─────────────────────────────────────────────────────────

/**
 * Products with high popularity but low/zero clickout conversion.
 */
export async function getHighPotentialLowConversion(limit = 10): Promise<ContextListItem[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        p.id, p.name, p.slug, p."imageUrl" AS image_url,
        p."popularityScore" AS popularity,
        COALESCE(cl.co, 0)::int AS clickouts
      FROM products p
      LEFT JOIN (
        SELECT "productId", COUNT(*)::int AS co
        FROM clickouts WHERE "clickedAt" > NOW() - INTERVAL '30 days'
        GROUP BY "productId"
      ) cl ON cl."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p.hidden = false AND p."popularityScore" >= 40
      ORDER BY p."popularityScore" DESC, COALESCE(cl.co, 0) ASC
      LIMIT ${limit}
    `;

    return rows
      .filter((r) => r.clickouts <= 2)
      .map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        imageUrl: r.image_url,
        reason: `Score ${r.popularity}, apenas ${r.clickouts} clickout(s)/30d`,
        metric: r.popularity,
        metricLabel: "popularity",
      }));
  } catch {
    return [];
  }
}

/**
 * Trending keywords without matching products in catalog.
 */
export async function getUncoveredTrends(limit = 10): Promise<ContextListItem[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT DISTINCT tk.keyword, tk.position
      FROM trending_keywords tk
      WHERE tk."fetchedAt" > NOW() - INTERVAL '7 days'
        AND NOT EXISTS (
          SELECT 1 FROM products p
          WHERE p.status = 'ACTIVE' AND p.hidden = false
            AND (p.name ILIKE '%' || tk.keyword || '%'
                 OR p.slug ILIKE '%' || REPLACE(LOWER(tk.keyword), ' ', '-') || '%')
        )
      ORDER BY tk.position ASC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: `trend-${r.keyword}`,
      name: r.keyword,
      slug: "",
      imageUrl: null,
      reason: `Trending #${r.position}, sem produtos no catalogo`,
      metric: r.position,
      metricLabel: "posicao",
    }));
  } catch {
    return [];
  }
}

/**
 * Pages/products with good traffic but low monetization.
 */
export async function getLowMonetizationPages(limit = 10): Promise<ContextListItem[]> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT
        p.id, p.name, p.slug, p."imageUrl" AS image_url,
        p."popularityScore" AS popularity,
        COALESCE(cl.co, 0)::int AS clickouts
      FROM products p
      LEFT JOIN (
        SELECT "productId", COUNT(*)::int AS co
        FROM clickouts WHERE "clickedAt" > NOW() - INTERVAL '30 days'
        GROUP BY "productId"
      ) cl ON cl."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p.hidden = false AND p."popularityScore" >= 40
        AND COALESCE(cl.co, 0) <= 1
      ORDER BY p."popularityScore" DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      imageUrl: r.image_url,
      reason: `Pagina popular (${r.popularity}) com ${r.clickouts} clickout(s)`,
      metric: r.popularity,
      metricLabel: "popularity",
    }));
  } catch {
    return [];
  }
}

// ─── Distribution Context ───────────────────────────────────────────────────

/**
 * Offers ready to distribute (high score, active, not yet featured).
 */
export async function getReadyToDistribute(limit = 10): Promise<ContextListItem[]> {
  try {
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        offerScore: { gte: 60 },
        listing: {
          status: "ACTIVE",
          product: { status: "ACTIVE", hidden: false },
        },
      },
      orderBy: { offerScore: "desc" },
      take: limit,
      include: {
        listing: {
          include: {
            product: { select: { id: true, name: true, slug: true, imageUrl: true } },
            source: { select: { name: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    return offers
      .filter((o) => {
        const pid = o.listing.product?.id;
        if (!pid || seen.has(pid)) return false;
        seen.add(pid);
        return true;
      })
      .map((o) => ({
        id: o.id,
        name: o.listing.product?.name ?? o.listing.rawTitle,
        slug: o.listing.product?.slug ?? "",
        imageUrl: o.listing.product?.imageUrl ?? null,
        reason: `Score ${o.offerScore} | R$ ${o.currentPrice.toFixed(2)} | ${o.listing.source.name}`,
        metric: o.offerScore,
        metricLabel: "score",
      }));
  } catch {
    return [];
  }
}

/**
 * Import batches completed and ready for campaign creation.
 */
export async function getReadyCampaigns(limit = 10): Promise<ContextListItem[]> {
  try {
    const batches = await prisma.importBatch.findMany({
      where: { status: "COMPLETED", imported: { gte: 1 } },
      orderBy: { processedAt: "desc" },
      take: limit,
      select: {
        id: true,
        fileName: true,
        imported: true,
        processedAt: true,
      },
    });

    return batches.map((b) => ({
      id: b.id,
      name: b.fileName ?? `Lote ${b.id.slice(0, 8)}`,
      slug: "",
      imageUrl: null,
      reason: `${b.imported} produtos importados`,
      metric: b.imported,
      metricLabel: "importados",
    }));
  } catch {
    return [];
  }
}

// ─── Merchandising Context ──────────────────────────────────────────────────

/**
 * Products eligible for carousel placement.
 */
export async function getCarouselCandidates(limit = 10): Promise<ContextListItem[]> {
  try {
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        offerScore: { gte: 60 },
        listing: {
          status: "ACTIVE",
          product: {
            status: "ACTIVE",
            hidden: false,
            imageUrl: { not: null },
          },
        },
      },
      orderBy: { offerScore: "desc" },
      take: limit * 2,
      include: {
        listing: {
          include: {
            product: { select: { id: true, name: true, slug: true, imageUrl: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    return offers
      .filter((o) => {
        const pid = o.listing.product?.id;
        if (!pid || seen.has(pid)) return false;
        seen.add(pid);
        return true;
      })
      .slice(0, limit)
      .map((o) => ({
        id: o.id,
        name: o.listing.product?.name ?? "",
        slug: o.listing.product?.slug ?? "",
        imageUrl: o.listing.product?.imageUrl ?? null,
        reason: `Score ${o.offerScore} | R$ ${o.currentPrice.toFixed(2)}`,
        metric: o.offerScore,
        metricLabel: "score",
      }));
  } catch {
    return [];
  }
}

/**
 * Products eligible for banner placement (high discount + image).
 */
export async function getBannerCandidates(limit = 10): Promise<ContextListItem[]> {
  try {
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        offerScore: { gte: 50 },
        originalPrice: { not: null },
        listing: {
          status: "ACTIVE",
          product: {
            status: "ACTIVE",
            hidden: false,
            imageUrl: { not: null },
          },
        },
      },
      orderBy: { offerScore: "desc" },
      take: limit * 2,
      include: {
        listing: {
          include: {
            product: { select: { id: true, name: true, slug: true, imageUrl: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    return offers
      .filter((o) => {
        const pid = o.listing.product?.id;
        if (!pid || seen.has(pid)) return false;
        if (!o.originalPrice || o.originalPrice <= o.currentPrice) return false;
        seen.add(pid);
        return true;
      })
      .slice(0, limit)
      .map((o) => {
        const discount = o.originalPrice
          ? Math.round(((o.originalPrice - o.currentPrice) / o.originalPrice) * 100)
          : 0;
        return {
          id: o.id,
          name: o.listing.product?.name ?? "",
          slug: o.listing.product?.slug ?? "",
          imageUrl: o.listing.product?.imageUrl ?? null,
          reason: `${discount}% OFF | Score ${o.offerScore}`,
          metric: discount,
          metricLabel: "desconto %",
        };
      });
  } catch {
    return [];
  }
}

/**
 * Products eligible for deal of the day (high discount + high score).
 */
export async function getDealOfDayCandidates(limit = 10): Promise<ContextListItem[]> {
  try {
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        offerScore: { gte: 70 },
        originalPrice: { not: null },
        listing: {
          status: "ACTIVE",
          product: {
            status: "ACTIVE",
            hidden: false,
            imageUrl: { not: null },
          },
        },
      },
      orderBy: { offerScore: "desc" },
      take: limit * 2,
      include: {
        listing: {
          include: {
            product: { select: { id: true, name: true, slug: true, imageUrl: true } },
          },
        },
      },
    });

    const seen = new Set<string>();
    return offers
      .filter((o) => {
        const pid = o.listing.product?.id;
        if (!pid || seen.has(pid)) return false;
        if (!o.originalPrice || o.originalPrice <= o.currentPrice) return false;
        const disc = Math.round(((o.originalPrice - o.currentPrice) / o.originalPrice) * 100);
        if (disc < 15) return false;
        seen.add(pid);
        return true;
      })
      .slice(0, limit)
      .map((o) => {
        const discount = o.originalPrice
          ? Math.round(((o.originalPrice - o.currentPrice) / o.originalPrice) * 100)
          : 0;
        return {
          id: o.id,
          name: o.listing.product?.name ?? "",
          slug: o.listing.product?.slug ?? "",
          imageUrl: o.listing.product?.imageUrl ?? null,
          reason: `${discount}% OFF | Score ${o.offerScore} | R$ ${o.currentPrice.toFixed(2)}`,
          metric: o.offerScore,
          metricLabel: "score",
        };
      });
  } catch {
    return [];
  }
}
