import prisma from "@/lib/db/prisma";
import type {
  Opportunity,
  OpportunityType,
  OpportunityPriority,
  OpportunitySummary,
} from "./types";
import { OPPORTUNITY_TYPES } from "./types";
import {
  calculateImpact,
  calculateEffort,
  calculateConfidence,
  fetchGlobalAverages,
  type ScoringData,
} from "./scoring";

// ============================================
// Opportunity Engine — Generates prioritized
// opportunities from real Prisma data
// ============================================

/**
 * Generate all opportunities, optionally filtered by type.
 */
export async function getOpportunities(
  limit = 50,
  types?: OpportunityType[]
): Promise<Opportunity[]> {
  const activeTypes = types ?? [...OPPORTUNITY_TYPES];
  const globals = await fetchGlobalAverages();
  const opportunities: Opportunity[] = [];

  const generators: Partial<
    Record<OpportunityType, () => Promise<Opportunity[]>>
  > = {
    "catalog-weak": () => findCatalogWeak(globals),
    "high-potential-product": () => findHighPotential(globals),
    "category-gap": () => findCategoryGaps(globals),
    "low-monetization-page": () => findLowMonetization(globals),
    "low-trust-relevant": () => findLowTrust(globals),
    "highlight-candidate": () => findHighlightCandidates(globals),
    "content-missing": () => findContentMissing(globals),
    "needs-review": () => findNeedsReview(globals),
    "distribution-recommended": () => findDistributionRecommended(globals),
    "campaign-recommended": () => findCampaignRecommended(globals),
  };

  await Promise.all(
    activeTypes.map(async (type) => {
      const gen = generators[type];
      if (!gen) return;
      try {
        const items = await gen();
        opportunities.push(...items);
      } catch {
        // Silently skip failed generators to avoid breaking the whole engine
      }
    })
  );

  // Sort by priority weight then impact/effort ratio
  opportunities.sort((a, b) => {
    const wa = priorityWeight(a.priority);
    const wb = priorityWeight(b.priority);
    if (wa !== wb) return wb - wa;
    const ratioA = a.effortScore > 0 ? a.impactScore / a.effortScore : a.impactScore;
    const ratioB = b.effortScore > 0 ? b.impactScore / b.effortScore : b.impactScore;
    return ratioB - ratioA;
  });

  return opportunities.slice(0, limit);
}

/**
 * Get top opportunities ranked by impact/effort ratio.
 */
export async function getTopOpportunities(
  limit = 10
): Promise<Opportunity[]> {
  const all = await getOpportunities(200);
  all.sort((a, b) => {
    const ratioA = a.effortScore > 0 ? a.impactScore / a.effortScore : a.impactScore;
    const ratioB = b.effortScore > 0 ? b.impactScore / b.effortScore : b.impactScore;
    return ratioB - ratioA;
  });
  return all.slice(0, limit);
}

/**
 * Summarize opportunities.
 */
export function summarizeOpportunities(
  opportunities: Opportunity[]
): OpportunitySummary {
  const byCritical = opportunities.filter((o) => o.priority === "critical").length;
  const byHigh = opportunities.filter((o) => o.priority === "high").length;
  const byMedium = opportunities.filter((o) => o.priority === "medium").length;
  const byLow = opportunities.filter((o) => o.priority === "low").length;
  const avgImpact =
    opportunities.length > 0
      ? opportunities.reduce((s, o) => s + o.impactScore, 0) / opportunities.length
      : 0;

  const typeCounts = new Map<OpportunityType, number>();
  for (const o of opportunities) {
    typeCounts.set(o.type, (typeCounts.get(o.type) ?? 0) + 1);
  }
  const topTypes = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    total: opportunities.length,
    byCritical,
    byHigh,
    byMedium,
    byLow,
    topTypes,
    averageImpact: Math.round(avgImpact),
  };
}

// ============================================
// Individual Opportunity Generators
// ============================================

interface Globals {
  avgClickouts: number;
  avgSearches: number;
}

async function findCatalogWeak(globals: Globals): Promise<Opportunity[]> {
  // Products with 0 or 1 active offers
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      name: true,
      slug: true,
      listings: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          offers: { where: { isActive: true }, select: { id: true, offerScore: true } },
        },
      },
    },
    take: 200,
  });

  const results: Opportunity[] = [];
  for (const p of products) {
    const totalOffers = p.listings.reduce((s, l) => s + l.offers.length, 0);
    const sourcesCount = p.listings.length;
    if (totalOffers <= 1) {
      const data: ScoringData = {
        offerCount: totalOffers,
        sourceDiversity: sourcesCount,
        avgClickouts: globals.avgClickouts,
        avgSearches: globals.avgSearches,
      };
      const impact = calculateImpact("catalog-weak", data);
      const effort = calculateEffort("catalog-weak");
      const confidence = calculateConfidence("catalog-weak", data);
      if (impact < 30) continue;

      results.push({
        id: `catalog-weak-${p.id}`,
        type: "catalog-weak",
        title: `"${truncate(p.name, 40)}" tem apenas ${totalOffers} oferta(s)`,
        description: `Produto com cobertura fraca de fontes. Adicionar mais listings aumenta comparacao e confianca.`,
        priority: totalOffers === 0 ? "critical" : "high",
        impactScore: impact,
        effortScore: effort,
        confidenceScore: confidence,
        recommendedAction: "Buscar mais fontes para este produto",
        adminUrl: `/admin/produtos?search=${encodeURIComponent(p.name)}`,
        meta: { productId: p.id, slug: p.slug, offerCount: totalOffers },
      });
    }
  }
  return results.slice(0, 15);
}

async function findHighPotential(globals: Globals): Promise<Opportunity[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Top clicked offers
  const topClickouts = await prisma.clickout.groupBy({
    by: ["offerId"],
    _count: { id: true },
    where: { clickedAt: { gte: thirtyDaysAgo } },
    orderBy: { _count: { id: "desc" } },
    take: 20,
  });

  if (topClickouts.length === 0) return [];

  const offerIds = topClickouts.map((c) => c.offerId);
  const offers = await prisma.offer.findMany({
    where: { id: { in: offerIds } },
    select: {
      id: true,
      offerScore: true,
      listing: {
        select: {
          product: { select: { id: true, name: true, slug: true, featured: true } },
        },
      },
    },
  });

  const clickMap = new Map(topClickouts.map((c) => [c.offerId, c._count.id]));
  const results: Opportunity[] = [];

  for (const offer of offers) {
    const product = offer.listing?.product;
    if (!product || product.featured) continue;

    const clicks = clickMap.get(offer.id) ?? 0;
    const data: ScoringData = {
      clickoutCount: clicks,
      trustScore: offer.offerScore / 100,
      avgClickouts: globals.avgClickouts,
      avgSearches: globals.avgSearches,
    };
    const impact = calculateImpact("high-potential-product", data);
    const effort = calculateEffort("high-potential-product");
    const confidence = calculateConfidence("high-potential-product", data);

    results.push({
      id: `high-potential-${product.id}`,
      type: "high-potential-product",
      title: `"${truncate(product.name, 40)}" tem ${clicks} cliques e nao e destaque`,
      description: `Produto popular nao destacado. Promover pode aumentar conversao e receita.`,
      priority: clicks > 10 ? "high" : "medium",
      impactScore: impact,
      effortScore: effort,
      confidenceScore: confidence,
      recommendedAction: "Destacar este produto na home ou categoria",
      adminUrl: `/admin/produtos?search=${encodeURIComponent(product.name)}`,
      meta: { productId: product.id, clickouts: clicks },
    });
  }
  return results.slice(0, 10);
}

async function findCategoryGaps(globals: Globals): Promise<Opportunity[]> {
  // Categories with few products but search demand
  const categories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { products: true } },
    },
  });

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const searchLogs = await prisma.searchLog.groupBy({
    by: ["normalizedQuery"],
    _count: { id: true },
    where: { createdAt: { gte: thirtyDaysAgo }, normalizedQuery: { not: null } },
    orderBy: { _count: { id: "desc" } },
    take: 100,
  });

  const searchMap = new Map(
    searchLogs
      .filter((s) => s.normalizedQuery)
      .map((s) => [s.normalizedQuery!.toLowerCase(), s._count.id])
  );

  const results: Opportunity[] = [];
  for (const cat of categories) {
    const productCount = cat._count.products;
    const searchHits = searchMap.get(cat.name.toLowerCase()) ?? searchMap.get(cat.slug) ?? 0;

    if (productCount < 5 && searchHits > 3) {
      const data: ScoringData = {
        productCount,
        searchFrequency: searchHits,
        avgSearches: globals.avgSearches,
        avgClickouts: globals.avgClickouts,
      };
      const impact = calculateImpact("category-gap", data);
      const effort = calculateEffort("category-gap");
      const confidence = calculateConfidence("category-gap", data);

      results.push({
        id: `category-gap-${cat.id}`,
        type: "category-gap",
        title: `Categoria "${cat.name}" tem ${productCount} produtos e ${searchHits} buscas`,
        description: `Gap de catalogo detectado. Usuarios buscam esta categoria mas ha poucos produtos.`,
        priority: productCount === 0 ? "critical" : "high",
        impactScore: impact,
        effortScore: effort,
        confidenceScore: confidence,
        recommendedAction: "Adicionar mais produtos nesta categoria",
        adminUrl: `/admin/catalog-governance?category=${cat.slug}`,
        meta: { categoryId: cat.id, productCount, searchHits },
      });
    }
  }
  return results.slice(0, 10);
}

async function findLowMonetization(globals: Globals): Promise<Opportunity[]> {
  // Products with searches but few clickouts
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const topSearched = await prisma.searchLog.groupBy({
    by: ["normalizedQuery"],
    _count: { id: true },
    where: { createdAt: { gte: thirtyDaysAgo }, normalizedQuery: { not: null } },
    orderBy: { _count: { id: "desc" } },
    take: 30,
  });

  const results: Opportunity[] = [];
  for (const search of topSearched) {
    if (!search.normalizedQuery) continue;
    const searchCount = search._count.id;
    if (searchCount < 3) continue;

    const data: ScoringData = {
      searchFrequency: searchCount,
      clickoutCount: 0,
      avgSearches: globals.avgSearches,
      avgClickouts: globals.avgClickouts,
    };
    const impact = calculateImpact("low-monetization-page", data);
    const effort = calculateEffort("low-monetization-page");
    const confidence = calculateConfidence("low-monetization-page", data);
    if (impact < 40) continue;

    results.push({
      id: `low-monet-${search.normalizedQuery}`,
      type: "low-monetization-page",
      title: `"${truncate(search.normalizedQuery, 35)}" com ${searchCount} buscas e baixa conversao`,
      description: `Termo popular sem boa conversao. Melhorar ofertas ou resultados de busca.`,
      priority: searchCount > 10 ? "high" : "medium",
      impactScore: impact,
      effortScore: effort,
      confidenceScore: confidence,
      recommendedAction: "Revisar resultados de busca e adicionar ofertas relevantes",
      adminUrl: `/admin/analytics`,
      meta: { query: search.normalizedQuery, searches: searchCount },
    });
  }
  return results.slice(0, 10);
}

async function findLowTrust(globals: Globals): Promise<Opportunity[]> {
  // Active offers with low trust score but some clickouts
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const lowTrustOffers = await prisma.offer.findMany({
    where: { isActive: true, offerScore: { lt: 30 } },
    select: {
      id: true,
      offerScore: true,
      listing: {
        select: {
          product: { select: { id: true, name: true, slug: true } },
        },
      },
      _count: { select: { clickouts: true } },
    },
    orderBy: { offerScore: "asc" },
    take: 20,
  });

  const results: Opportunity[] = [];
  for (const offer of lowTrustOffers) {
    const product = offer.listing?.product;
    if (!product) continue;
    const clicks = offer._count.clickouts;
    if (clicks < 1) continue;

    const data: ScoringData = {
      trustScore: offer.offerScore / 100,
      clickoutCount: clicks,
      avgClickouts: globals.avgClickouts,
      avgSearches: globals.avgSearches,
    };
    const impact = calculateImpact("low-trust-relevant", data);
    const effort = calculateEffort("low-trust-relevant");
    const confidence = calculateConfidence("low-trust-relevant", data);

    results.push({
      id: `low-trust-${offer.id}`,
      type: "low-trust-relevant",
      title: `"${truncate(product.name, 35)}" — trust ${offer.offerScore} com ${clicks} cliques`,
      description: `Oferta com baixa confianca sendo clicada. Risco de experiencia ruim para o usuario.`,
      priority: offer.offerScore < 15 ? "critical" : "high",
      impactScore: impact,
      effortScore: effort,
      confidenceScore: confidence,
      recommendedAction: "Revisar qualidade da oferta e fonte",
      adminUrl: `/admin/data-trust`,
      meta: { offerId: offer.id, trustScore: offer.offerScore },
    });
  }
  return results.slice(0, 10);
}

async function findHighlightCandidates(globals: Globals): Promise<Opportunity[]> {
  // Products with good scores not yet featured
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", featured: false },
    select: {
      id: true,
      name: true,
      slug: true,
      popularityScore: true,
      listings: {
        where: { status: "ACTIVE" },
        select: {
          offers: {
            where: { isActive: true },
            select: { id: true, offerScore: true, currentPrice: true, originalPrice: true },
          },
        },
      },
    },
    orderBy: { popularityScore: "desc" },
    take: 20,
  });

  const results: Opportunity[] = [];
  for (const p of products) {
    const allOffers = p.listings.flatMap((l) => l.offers);
    if (allOffers.length === 0) continue;

    const bestScore = Math.max(...allOffers.map((o) => o.offerScore));
    const bestDrop = Math.max(
      ...allOffers.map((o) =>
        o.originalPrice && o.originalPrice > o.currentPrice
          ? ((o.originalPrice - o.currentPrice) / o.originalPrice) * 100
          : 0
      )
    );

    if (bestScore < 50 && bestDrop < 10) continue;

    const data: ScoringData = {
      trustScore: bestScore / 100,
      priceDropPercent: bestDrop,
      avgClickouts: globals.avgClickouts,
      avgSearches: globals.avgSearches,
    };
    const impact = calculateImpact("highlight-candidate", data);
    const effort = calculateEffort("highlight-candidate");
    const confidence = calculateConfidence("highlight-candidate", data);

    results.push({
      id: `highlight-${p.id}`,
      type: "highlight-candidate",
      title: `"${truncate(p.name, 35)}" e candidato a destaque`,
      description: `Trust score ${bestScore}${bestDrop > 0 ? `, queda de ${Math.round(bestDrop)}%` : ""}. Bom para destaque.`,
      priority: "medium",
      impactScore: impact,
      effortScore: effort,
      confidenceScore: confidence,
      recommendedAction: "Avaliar e marcar como destaque",
      adminUrl: `/admin/produtos?search=${encodeURIComponent(p.name)}`,
      meta: { productId: p.id, trustScore: bestScore, priceDrop: bestDrop },
    });
  }
  return results.slice(0, 10);
}

async function findContentMissing(globals: Globals): Promise<Opportunity[]> {
  // Categories without articles
  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true },
  });

  const articles = await prisma.article.findMany({
    where: { status: "PUBLISHED" },
    select: { category: true },
  });

  const coveredCategories = new Set(
    articles.map((a) => a.category?.toLowerCase()).filter(Boolean)
  );

  const results: Opportunity[] = [];
  for (const cat of categories) {
    if (coveredCategories.has(cat.slug.toLowerCase()) || coveredCategories.has(cat.name.toLowerCase())) {
      continue;
    }

    const data: ScoringData = {
      avgClickouts: globals.avgClickouts,
      avgSearches: globals.avgSearches,
    };
    const impact = calculateImpact("content-missing", data);
    const effort = calculateEffort("content-missing");
    const confidence = calculateConfidence("content-missing", data);

    results.push({
      id: `content-missing-${cat.id}`,
      type: "content-missing",
      title: `Categoria "${cat.name}" sem conteudo editorial`,
      description: `Nenhum artigo publicado para esta categoria. Conteudo ajuda SEO e conversao.`,
      priority: "low",
      impactScore: impact,
      effortScore: effort,
      confidenceScore: confidence,
      recommendedAction: "Criar artigo ou guia de compra para esta categoria",
      adminUrl: `/admin/artigos`,
      meta: { categoryId: cat.id, categoryName: cat.name },
    });
  }
  return results.slice(0, 10);
}

async function findNeedsReview(globals: Globals): Promise<Opportunity[]> {
  const products = await prisma.product.findMany({
    where: { needsReview: true, status: "ACTIVE" },
    select: { id: true, name: true, slug: true },
    take: 20,
  });

  return products.map((p) => {
    const data: ScoringData = {
      avgClickouts: globals.avgClickouts,
      avgSearches: globals.avgSearches,
    };
    return {
      id: `needs-review-${p.id}`,
      type: "needs-review" as OpportunityType,
      title: `"${truncate(p.name, 40)}" precisa de revisao`,
      description: `Produto marcado para revisao manual. Pode ter dados inconsistentes.`,
      priority: "high" as OpportunityPriority,
      impactScore: calculateImpact("needs-review", data),
      effortScore: calculateEffort("needs-review"),
      confidenceScore: calculateConfidence("needs-review", data),
      recommendedAction: "Revisar e aprovar ou corrigir dados do produto",
      adminUrl: `/admin/produtos?search=${encodeURIComponent(p.name)}`,
      meta: { productId: p.id },
    };
  });
}

async function findDistributionRecommended(globals: Globals): Promise<Opportunity[]> {
  // Products with good performance that could benefit from email/social distribution
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const topPerformers = await prisma.clickout.groupBy({
    by: ["offerId"],
    _count: { id: true },
    where: { clickedAt: { gte: thirtyDaysAgo } },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  if (topPerformers.length === 0) return [];

  const offerIds = topPerformers.map((c) => c.offerId);
  const offers = await prisma.offer.findMany({
    where: { id: { in: offerIds } },
    select: {
      id: true,
      currentPrice: true,
      originalPrice: true,
      listing: {
        select: { product: { select: { id: true, name: true, slug: true } } },
      },
    },
  });

  const clickMap = new Map(topPerformers.map((c) => [c.offerId, c._count.id]));
  const results: Opportunity[] = [];

  for (const offer of offers) {
    const product = offer.listing?.product;
    if (!product) continue;
    const clicks = clickMap.get(offer.id) ?? 0;
    const drop =
      offer.originalPrice && offer.originalPrice > offer.currentPrice
        ? ((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100
        : 0;

    const data: ScoringData = {
      clickoutCount: clicks,
      priceDropPercent: drop,
      avgClickouts: globals.avgClickouts,
      avgSearches: globals.avgSearches,
    };
    const impact = calculateImpact("distribution-recommended", data);
    const effort = calculateEffort("distribution-recommended");
    const confidence = calculateConfidence("distribution-recommended", data);

    results.push({
      id: `distrib-${product.id}`,
      type: "distribution-recommended",
      title: `Distribuir "${truncate(product.name, 30)}" — ${clicks} cliques`,
      description: `Produto popular que pode beneficiar de distribuicao via email ou social.`,
      priority: "medium",
      impactScore: impact,
      effortScore: effort,
      confidenceScore: confidence,
      recommendedAction: "Incluir em proxima newsletter ou campanha social",
      adminUrl: `/admin/distribution`,
      meta: { productId: product.id, clickouts: clicks },
    });
  }
  return results.slice(0, 8);
}

async function findCampaignRecommended(globals: Globals): Promise<Opportunity[]> {
  // Offers with significant price drops — good for campaigns
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      originalPrice: { not: null },
    },
    select: {
      id: true,
      currentPrice: true,
      originalPrice: true,
      listing: {
        select: { product: { select: { id: true, name: true, slug: true } } },
      },
    },
    orderBy: { offerScore: "desc" },
    take: 50,
  });

  const results: Opportunity[] = [];
  for (const offer of offers) {
    const product = offer.listing?.product;
    if (!product || !offer.originalPrice) continue;

    const drop =
      ((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100;
    if (drop < 15) continue;

    const data: ScoringData = {
      priceDropPercent: drop,
      avgClickouts: globals.avgClickouts,
      avgSearches: globals.avgSearches,
    };
    const impact = calculateImpact("campaign-recommended", data);
    const effort = calculateEffort("campaign-recommended");
    const confidence = calculateConfidence("campaign-recommended", data);

    results.push({
      id: `campaign-${offer.id}`,
      type: "campaign-recommended",
      title: `${Math.round(drop)}% off em "${truncate(product.name, 30)}"`,
      description: `Queda de preco significativa. Ideal para campanha de email ou banner.`,
      priority: drop > 30 ? "high" : "medium",
      impactScore: impact,
      effortScore: effort,
      confidenceScore: confidence,
      recommendedAction: "Criar campanha ou banner para esta oferta",
      adminUrl: `/admin/banners`,
      meta: { offerId: offer.id, productId: product.id, dropPercent: Math.round(drop) },
    });
  }
  return results
    .sort((a, b) => b.impactScore - a.impactScore)
    .slice(0, 8);
}

// ============================================
// Helpers
// ============================================

function priorityWeight(p: OpportunityPriority): number {
  switch (p) {
    case "critical": return 4;
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
  }
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + "\u2026" : s;
}
