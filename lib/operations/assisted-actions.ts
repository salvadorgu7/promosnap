// ============================================
// ASSISTED ACTIONS — context-specific quick actions from real data
// ============================================

import prisma from "@/lib/db/prisma";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ActionContext = "catalog" | "growth" | "distribution" | "merchandising";

export interface QuickAction {
  id: string;
  title: string;
  description: string;
  type:
    | "highlight"
    | "approve_batch"
    | "send_channel"
    | "create_banner"
    | "review_item"
    | "recalculate_match"
    | "publish_import"
    | "suggest_campaign";
  priority: "high" | "medium" | "low";
  actionUrl: string;
  canAutoExecute: boolean;
  meta?: Record<string, unknown>;
}

// ─── Catalog Actions ────────────────────────────────────────────────────────

async function getCatalogActions(): Promise<QuickAction[]> {
  const actions: QuickAction[] = [];

  try {
    // Products needing review
    const needsReview = await prisma.product.count({
      where: { needsReview: true, status: "ACTIVE" },
    });
    if (needsReview > 0) {
      actions.push({
        id: "review-products",
        title: `Revisar ${needsReview} produto(s)`,
        description: "Produtos marcados para revisao editorial ou de dados",
        type: "review_item",
        priority: needsReview >= 10 ? "high" : "medium",
        actionUrl: "/admin/produtos?filter=needs-review",
        canAutoExecute: false,
        meta: { count: needsReview },
      });
    }

    // Unmatched listings (low confidence)
    const weakMatches = await prisma.listing.count({
      where: {
        status: "ACTIVE",
        productId: { not: null },
        matchConfidence: { lt: 0.5 },
      },
    });
    if (weakMatches > 0) {
      actions.push({
        id: "fix-weak-matches",
        title: `Recalcular ${weakMatches} match(es) fracos`,
        description: "Listings com baixa confianca de match ao produto canonico",
        type: "recalculate_match",
        priority: weakMatches >= 20 ? "high" : "medium",
        actionUrl: "/admin/catalog-quality",
        canAutoExecute: true,
        meta: { count: weakMatches },
      });
    }

    // Products without images
    const noImage = await prisma.product.count({
      where: { status: "ACTIVE", hidden: false, imageUrl: null },
    });
    if (noImage > 0) {
      actions.push({
        id: "fix-missing-images",
        title: `${noImage} produto(s) sem imagem`,
        description: "Produtos ativos sem imagem principal",
        type: "review_item",
        priority: noImage >= 5 ? "high" : "low",
        actionUrl: "/admin/catalog-quality",
        canAutoExecute: false,
        meta: { count: noImage },
      });
    }

    // Pending import batches
    const pendingBatches = await prisma.importBatch.count({
      where: { status: "PENDING" },
    });
    if (pendingBatches > 0) {
      actions.push({
        id: "process-imports",
        title: `Processar ${pendingBatches} lote(s) de importacao`,
        description: "Lotes de importacao aguardando processamento",
        type: "publish_import",
        priority: "high",
        actionUrl: "/admin/imports",
        canAutoExecute: true,
        meta: { count: pendingBatches },
      });
    }

    // Pending catalog candidates
    const pendingCandidates = await prisma.catalogCandidate.count({
      where: { status: "PENDING" },
    });
    if (pendingCandidates > 0) {
      actions.push({
        id: "approve-candidates",
        title: `Aprovar ${pendingCandidates} candidato(s)`,
        description: "Candidatos de catalogo aguardando aprovacao",
        type: "approve_batch",
        priority: pendingCandidates >= 10 ? "high" : "medium",
        actionUrl: "/admin/imports",
        canAutoExecute: false,
        meta: { count: pendingCandidates },
      });
    }
  } catch {
    // fail gracefully
  }

  return actions;
}

// ─── Growth Actions ─────────────────────────────────────────────────────────

async function getGrowthActions(): Promise<QuickAction[]> {
  const actions: QuickAction[] = [];

  try {
    // Products with high popularity but zero clickouts (30d)
    const highPopRows: { cnt: number }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS cnt
      FROM products p
      LEFT JOIN (
        SELECT "productId", COUNT(*)::int AS co
        FROM clickouts WHERE "clickedAt" > NOW() - INTERVAL '30 days'
        GROUP BY "productId"
      ) cl ON cl."productId" = p.id
      WHERE p.status = 'ACTIVE' AND p.hidden = false
        AND p."popularityScore" >= 50 AND COALESCE(cl.co, 0) = 0
    `;
    const highPopLowConv = highPopRows[0]?.cnt ?? 0;
    if (highPopLowConv > 0) {
      actions.push({
        id: "fix-low-conversion",
        title: `${highPopLowConv} produto(s) popular(es) sem conversao`,
        description: "Produtos com alto trafego mas zero clickouts nos ultimos 30 dias",
        type: "review_item",
        priority: highPopLowConv >= 5 ? "high" : "medium",
        actionUrl: "/admin/growth-ops",
        canAutoExecute: false,
        meta: { count: highPopLowConv },
      });
    }

    // Trending keywords without products
    const trendGapRows: { cnt: number }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS cnt
      FROM (
        SELECT DISTINCT tk.keyword
        FROM trending_keywords tk
        WHERE tk."fetchedAt" > NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM products p
            WHERE p.status = 'ACTIVE' AND p.hidden = false
              AND (p.name ILIKE '%' || tk.keyword || '%'
                   OR p.slug ILIKE '%' || REPLACE(LOWER(tk.keyword), ' ', '-') || '%')
          )
      ) sub
    `;
    const uncoveredTrends = trendGapRows[0]?.cnt ?? 0;
    if (uncoveredTrends > 0) {
      actions.push({
        id: "cover-trends",
        title: `${uncoveredTrends} tendencia(s) sem cobertura`,
        description: "Keywords em alta sem nenhum produto correspondente no catalogo",
        type: "suggest_campaign",
        priority: uncoveredTrends >= 3 ? "high" : "medium",
        actionUrl: "/admin/imports",
        canAutoExecute: false,
        meta: { count: uncoveredTrends },
      });
    }
  } catch {
    // fail gracefully
  }

  return actions;
}

// ─── Distribution Actions ───────────────────────────────────────────────────

async function getDistributionActions(): Promise<QuickAction[]> {
  const actions: QuickAction[] = [];

  try {
    // Offers with high scores ready to distribute
    const readyOffers = await prisma.offer.count({
      where: {
        isActive: true,
        offerScore: { gte: 70 },
        listing: {
          status: "ACTIVE",
          product: { status: "ACTIVE", hidden: false, featured: false },
        },
      },
    });
    if (readyOffers > 0) {
      actions.push({
        id: "distribute-offers",
        title: `Distribuir ${readyOffers} oferta(s) prontas`,
        description: "Ofertas com score >= 70 ainda nao distribuidas",
        type: "send_channel",
        priority: readyOffers >= 5 ? "high" : "medium",
        actionUrl: "/admin/distribution",
        canAutoExecute: true,
        meta: { count: readyOffers },
      });
    }

    // Featured products that could be campaigns
    const featuredCount = await prisma.product.count({
      where: { featured: true, status: "ACTIVE", hidden: false },
    });
    if (featuredCount > 0) {
      actions.push({
        id: "campaign-from-featured",
        title: `Criar campanha com ${featuredCount} destaque(s)`,
        description: "Produtos em destaque que podem gerar campanha de distribuicao",
        type: "suggest_campaign",
        priority: "medium",
        actionUrl: "/admin/distribution",
        canAutoExecute: false,
        meta: { count: featuredCount },
      });
    }
  } catch {
    // fail gracefully
  }

  return actions;
}

// ─── Merchandising Actions ──────────────────────────────────────────────────

async function getMerchandisingActions(): Promise<QuickAction[]> {
  const actions: QuickAction[] = [];

  try {
    // Products with high offer score that are not featured
    const highlightCandidates = await prisma.offer.count({
      where: {
        isActive: true,
        offerScore: { gte: 80 },
        listing: {
          status: "ACTIVE",
          product: { status: "ACTIVE", hidden: false, featured: false },
        },
      },
    });
    if (highlightCandidates > 0) {
      actions.push({
        id: "highlight-top-products",
        title: `Destacar ${highlightCandidates} produto(s) com score alto`,
        description: "Produtos com offerScore >= 80 que nao estao em destaque",
        type: "highlight",
        priority: "high",
        actionUrl: "/admin/merchandising",
        canAutoExecute: true,
        meta: { count: highlightCandidates },
      });
    }

    // Banners that could be auto-created
    const activeBanners = await prisma.banner.count({
      where: { isActive: true },
    });
    if (activeBanners < 3) {
      actions.push({
        id: "create-banners",
        title: "Criar banners automaticos",
        description: `Apenas ${activeBanners} banner(s) ativo(s) — criar mais para melhor merchandising`,
        type: "create_banner",
        priority: activeBanners === 0 ? "high" : "medium",
        actionUrl: "/admin/banners",
        canAutoExecute: true,
        meta: { currentCount: activeBanners },
      });
    }

    // Products with good discounts for deal of day
    const dealCandidates = await prisma.offer.count({
      where: {
        isActive: true,
        offerScore: { gte: 60 },
        originalPrice: { not: null },
        listing: {
          status: "ACTIVE",
          product: { status: "ACTIVE", hidden: false, imageUrl: { not: null } },
        },
      },
    });
    if (dealCandidates > 0) {
      actions.push({
        id: "pick-deal-of-day",
        title: `${dealCandidates} candidato(s) para Oferta do Dia`,
        description: "Produtos com bom desconto e score para promover como deal",
        type: "highlight",
        priority: "medium",
        actionUrl: "/admin/merchandising",
        canAutoExecute: true,
        meta: { count: dealCandidates },
      });
    }
  } catch {
    // fail gracefully
  }

  return actions;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get context-specific quick actions based on real catalog data.
 * Returns prioritized list of actions the admin can take.
 */
export async function getQuickActions(
  context?: ActionContext
): Promise<QuickAction[]> {
  const allActions: QuickAction[] = [];

  try {
    if (!context || context === "catalog") {
      allActions.push(...(await getCatalogActions()));
    }
    if (!context || context === "growth") {
      allActions.push(...(await getGrowthActions()));
    }
    if (!context || context === "distribution") {
      allActions.push(...(await getDistributionActions()));
    }
    if (!context || context === "merchandising") {
      allActions.push(...(await getMerchandisingActions()));
    }
  } catch {
    // fail gracefully
  }

  // Sort by priority
  const priorityOrder: Record<string, number> = { high: 3, medium: 2, low: 1 };
  return allActions.sort(
    (a, b) => (priorityOrder[b.priority] ?? 0) - (priorityOrder[a.priority] ?? 0)
  );
}
