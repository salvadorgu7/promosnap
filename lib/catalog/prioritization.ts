// ============================================
// CATALOG PRIORITIZATION — opportunity scoring
// ============================================

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger"

export interface OpportunityScore {
  score: number;
  reasons: string[];
  suggestions: string[];
}

interface EntityInput {
  id: string;
  name: string;
  slug: string;
  type: "category" | "brand" | "product" | "keyword";
  searchVolume?: number;
  clickouts?: number;
  alertsCount?: number;
  favoritesEstimate?: number;
  offerCount?: number;
  productCount?: number;
  hasLandingPage?: boolean;
  hasSeoPage?: boolean;
  avgOfferScore?: number;
}

// ============================================
// Core scoring function
// ============================================

export function calculateOpportunityScore(entity: EntityInput): OpportunityScore {
  const reasons: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Search volume signal (0-25)
  const sv = entity.searchVolume ?? 0;
  if (sv > 100) {
    score += 25;
    reasons.push(`Alto volume de busca: ${sv} buscas recentes`);
  } else if (sv > 30) {
    score += 15;
    reasons.push(`Volume de busca moderado: ${sv} buscas`);
  } else if (sv > 5) {
    score += 5;
    reasons.push(`Volume de busca baixo: ${sv} buscas`);
  }

  // Clickout signal (0-20)
  const clicks = entity.clickouts ?? 0;
  if (clicks > 50) {
    score += 20;
    reasons.push(`Muitos clickouts: ${clicks}`);
  } else if (clicks > 10) {
    score += 12;
    reasons.push(`Clickouts moderados: ${clicks}`);
  } else if (clicks > 0) {
    score += 4;
  }

  // Alerts signal — users want price tracking (0-15)
  const alerts = entity.alertsCount ?? 0;
  if (alerts > 10) {
    score += 15;
    reasons.push(`${alerts} alertas de preco ativos`);
  } else if (alerts > 3) {
    score += 8;
    reasons.push(`${alerts} alertas de preco`);
  }

  // Favorites / engagement heuristic (0-10)
  const favs = entity.favoritesEstimate ?? 0;
  if (favs > 20) {
    score += 10;
    reasons.push(`Alta estimativa de favoritos: ${favs}`);
  } else if (favs > 5) {
    score += 5;
  }

  // Supply gap — high demand, low offers (0-20)
  const offers = entity.offerCount ?? 0;
  if (sv > 20 && offers < 3) {
    score += 20;
    reasons.push(`Gap de oferta: ${sv} buscas mas apenas ${offers} ofertas`);
    suggestions.push(`Adicionar mais ofertas para "${entity.name}"`);
  } else if (sv > 10 && offers < 5) {
    score += 10;
    reasons.push(`Poucas ofertas (${offers}) para a demanda`);
    suggestions.push(`Expandir catalogo de "${entity.name}"`);
  }

  // Revenue opportunity (0-10)
  const avgScore = entity.avgOfferScore ?? 0;
  if (clicks > 20 && avgScore > 60) {
    score += 10;
    reasons.push("Alto potencial de receita por clickout");
  } else if (clicks > 5 && avgScore > 40) {
    score += 5;
  }

  // Missing SEO pages (0-10)
  if (!entity.hasSeoPage && sv > 10) {
    score += 10;
    reasons.push("Sem pagina SEO dedicada");
    suggestions.push(`Criar pagina /ofertas/${entity.slug}`);
  }
  if (!entity.hasLandingPage && sv > 20) {
    suggestions.push(`Criar landing page para "${entity.name}"`);
  }

  // Type-specific suggestions
  if (entity.type === "brand" && (entity.productCount ?? 0) < 5) {
    suggestions.push(`Adicionar mais produtos da marca ${entity.name}`);
  }
  if (entity.type === "keyword" && !entity.hasLandingPage) {
    suggestions.push(`Criar artigo sobre "${entity.name}"`);
  }
  if (entity.type === "category" && (entity.productCount ?? 0) < 10) {
    suggestions.push(`Expandir categoria "${entity.name}" com mais produtos`);
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    reasons,
    suggestions,
  };
}

// ============================================
// Prioritized categories
// ============================================

export async function getPrioritizedCategories(): Promise<
  (EntityInput & OpportunityScore)[]
> {
  let searchVolumes: { term: string; count: number }[] = [];
  try {
    searchVolumes = await prisma.$queryRaw`
      SELECT "normalizedQuery" as term, COUNT(*)::int as count
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
      AND "normalizedQuery" IS NOT NULL AND "normalizedQuery" != ''
      GROUP BY "normalizedQuery"
      ORDER BY count DESC
      LIMIT 200
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  let clickoutsByCategory: { slug: string; clicks: number }[] = [];
  try {
    clickoutsByCategory = await prisma.$queryRaw`
      SELECT c2.slug, COUNT(c.id)::int as clicks
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      JOIN listings l ON o."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      JOIN categories c2 ON p."categoryId" = c2.id
      WHERE c."clickedAt" > NOW() - INTERVAL '30 days'
      GROUP BY c2.slug
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
    },
  });

  let alertsByCategory: { categoryId: string; cnt: number }[] = [];
  try {
    alertsByCategory = await prisma.$queryRaw`
      SELECT p."categoryId" as "categoryId", COUNT(pa.id)::int as cnt
      FROM price_alerts pa
      JOIN listings l ON pa."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      WHERE pa."isActive" = true AND p."categoryId" IS NOT NULL
      GROUP BY p."categoryId"
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  const clickMap = new Map(clickoutsByCategory.map((c) => [c.slug, c.clicks]));
  const alertMap = new Map(
    alertsByCategory.map((a) => [a.categoryId, a.cnt])
  );

  const results = categories.map((cat) => {
    // Match search volume by checking if category name is in any search term
    const catSearchVol = searchVolumes
      .filter((s) =>
        s.term.toLowerCase().includes(cat.name.toLowerCase()) ||
        cat.name.toLowerCase().includes(s.term.toLowerCase())
      )
      .reduce((sum, s) => sum + s.count, 0);

    const entity: EntityInput = {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      type: "category",
      searchVolume: catSearchVol,
      clickouts: clickMap.get(cat.slug) ?? 0,
      alertsCount: alertMap.get(cat.id) ?? 0,
      productCount: cat._count.products,
      offerCount: cat._count.products, // approximate
      hasSeoPage: !!cat.seoTitle,
      hasLandingPage: !!cat.description,
    };

    return { ...entity, ...calculateOpportunityScore(entity) };
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

// ============================================
// Prioritized brands
// ============================================

export async function getPrioritizedBrands(): Promise<
  (EntityInput & OpportunityScore)[]
> {
  let searchVolumes: { term: string; count: number }[] = [];
  try {
    searchVolumes = await prisma.$queryRaw`
      SELECT "normalizedQuery" as term, COUNT(*)::int as count
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
      AND "normalizedQuery" IS NOT NULL AND "normalizedQuery" != ''
      GROUP BY "normalizedQuery"
      ORDER BY count DESC
      LIMIT 200
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  let clickoutsByBrand: { brandId: string; clicks: number }[] = [];
  try {
    clickoutsByBrand = await prisma.$queryRaw`
      SELECT p."brandId" as "brandId", COUNT(c.id)::int as clicks
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      JOIN listings l ON o."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      WHERE c."clickedAt" > NOW() - INTERVAL '30 days'
      AND p."brandId" IS NOT NULL
      GROUP BY p."brandId"
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  const brands = await prisma.brand.findMany({
    include: {
      _count: { select: { products: true } },
    },
  });

  let offerCountByBrand: { brandId: string; cnt: number }[] = [];
  try {
    offerCountByBrand = await prisma.$queryRaw`
      SELECT p."brandId" as "brandId", COUNT(DISTINCT o.id)::int as cnt
      FROM offers o
      JOIN listings l ON o."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      WHERE o."isActive" = true AND p."brandId" IS NOT NULL
      GROUP BY p."brandId"
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  const clickMap = new Map(
    clickoutsByBrand.map((c) => [c.brandId, c.clicks])
  );
  const offerMap = new Map(
    offerCountByBrand.map((o) => [o.brandId, o.cnt])
  );

  const results = brands.map((brand) => {
    const brandSearchVol = searchVolumes
      .filter((s) =>
        s.term.toLowerCase().includes(brand.name.toLowerCase()) ||
        brand.name.toLowerCase().includes(s.term.toLowerCase())
      )
      .reduce((sum, s) => sum + s.count, 0);

    const entity: EntityInput = {
      id: brand.id,
      name: brand.name,
      slug: brand.slug,
      type: "brand",
      searchVolume: brandSearchVol,
      clickouts: clickMap.get(brand.id) ?? 0,
      productCount: brand._count.products,
      offerCount: offerMap.get(brand.id) ?? 0,
      hasSeoPage: false,
      hasLandingPage: false,
    };

    return { ...entity, ...calculateOpportunityScore(entity) };
  });

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

// ============================================
// Prioritized products
// ============================================

export async function getPrioritizedProducts(): Promise<
  (EntityInput & OpportunityScore)[]
> {
  let topSearchedProducts: {
    productId: string;
    name: string;
    slug: string;
    searches: number;
  }[] = [];
  try {
    topSearchedProducts = await prisma.$queryRaw`
      SELECT
        p.id as "productId",
        p.name,
        p.slug,
        COUNT(sl.id)::int as searches
      FROM search_logs sl
      JOIN products p ON LOWER(p.name) LIKE '%' || LOWER(sl."normalizedQuery") || '%'
      WHERE sl."createdAt" > NOW() - INTERVAL '30 days'
      AND sl."normalizedQuery" IS NOT NULL AND sl."normalizedQuery" != ''
      AND p.status = 'ACTIVE'
      GROUP BY p.id, p.name, p.slug
      ORDER BY searches DESC
      LIMIT 50
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  let clickoutsByProduct: { productId: string; clicks: number }[] = [];
  try {
    clickoutsByProduct = await prisma.$queryRaw`
      SELECT p.id as "productId", COUNT(c.id)::int as clicks
      FROM clickouts c
      JOIN offers o ON c."offerId" = o.id
      JOIN listings l ON o."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      WHERE c."clickedAt" > NOW() - INTERVAL '30 days'
      GROUP BY p.id
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  let offersByProduct: {
    productId: string;
    cnt: number;
    avgScore: number;
  }[] = [];
  try {
    offersByProduct = await prisma.$queryRaw`
      SELECT p.id as "productId", COUNT(o.id)::int as cnt, AVG(o."offerScore")::float as "avgScore"
      FROM offers o
      JOIN listings l ON o."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      WHERE o."isActive" = true
      GROUP BY p.id
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  let alertsByProduct: { productId: string; cnt: number }[] = [];
  try {
    alertsByProduct = await prisma.$queryRaw`
      SELECT p.id as "productId", COUNT(pa.id)::int as cnt
      FROM price_alerts pa
      JOIN listings l ON pa."listingId" = l.id
      JOIN products p ON l."productId" = p.id
      WHERE pa."isActive" = true
      GROUP BY p.id
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  const clickMap = new Map(
    clickoutsByProduct.map((c) => [c.productId, c.clicks])
  );
  const offerMap = new Map(
    offersByProduct.map((o) => [o.productId, { cnt: o.cnt, avg: o.avgScore }])
  );
  const alertMap = new Map(
    alertsByProduct.map((a) => [a.productId, a.cnt])
  );

  // Merge unique products
  const productMap = new Map<string, EntityInput>();

  for (const sp of topSearchedProducts) {
    const offers = offerMap.get(sp.productId);
    productMap.set(sp.productId, {
      id: sp.productId,
      name: sp.name,
      slug: sp.slug,
      type: "product",
      searchVolume: sp.searches,
      clickouts: clickMap.get(sp.productId) ?? 0,
      alertsCount: alertMap.get(sp.productId) ?? 0,
      offerCount: offers?.cnt ?? 0,
      avgOfferScore: offers?.avg ?? 0,
      hasSeoPage: true, // products have their own page
      hasLandingPage: true,
    });
  }

  // Also include products with high clickouts not in search results
  for (const cp of clickoutsByProduct) {
    if (!productMap.has(cp.productId) && cp.clicks > 3) {
      const product = await prisma.product.findUnique({
        where: { id: cp.productId },
        select: { id: true, name: true, slug: true },
      });
      if (product) {
        const offers = offerMap.get(cp.productId);
        productMap.set(cp.productId, {
          id: product.id,
          name: product.name,
          slug: product.slug,
          type: "product",
          searchVolume: 0,
          clickouts: cp.clicks,
          alertsCount: alertMap.get(cp.productId) ?? 0,
          offerCount: offers?.cnt ?? 0,
          avgOfferScore: offers?.avg ?? 0,
          hasSeoPage: true,
          hasLandingPage: true,
        });
      }
    }
  }

  const results = Array.from(productMap.values()).map((entity) => ({
    ...entity,
    ...calculateOpportunityScore(entity),
  }));

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}

// ============================================
// Keyword opportunities
// ============================================

export async function getKeywordOpportunities(): Promise<
  (EntityInput & OpportunityScore)[]
> {
  let topKeywords: { term: string; count: number }[] = [];
  try {
    topKeywords = await prisma.$queryRaw`
      SELECT "normalizedQuery" as term, COUNT(*)::int as count
      FROM search_logs
      WHERE "createdAt" > NOW() - INTERVAL '30 days'
      AND "normalizedQuery" IS NOT NULL AND "normalizedQuery" != ''
      GROUP BY "normalizedQuery"
      ORDER BY count DESC
      LIMIT 100
    `;
  } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

  // Check which keywords have landing pages (category or article)
  const categorySlugs = new Set(
    (await prisma.category.findMany({ select: { slug: true } })).map(
      (c) => c.slug
    )
  );
  const articleSlugs = new Set(
    (
      await prisma.article.findMany({
        where: { status: "PUBLISHED" },
        select: { slug: true },
      })
    ).map((a) => a.slug)
  );

  // Check product coverage per keyword
  const results: (EntityInput & OpportunityScore)[] = [];

  for (const kw of topKeywords) {
    const kwSlug = kw.term
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const hasPage =
      categorySlugs.has(kwSlug) || articleSlugs.has(kwSlug);

    // Count products matching this keyword
    let productCount = 0;
    try {
      const result: { cnt: number }[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int as cnt FROM products
        WHERE status = 'ACTIVE'
        AND LOWER(name) LIKE '%' || ${kw.term.toLowerCase()} || '%'
      `;
      productCount = result[0]?.cnt ?? 0;
    } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

    // Count active offers for these products
    let offerCount = 0;
    try {
      const result: { cnt: number }[] = await prisma.$queryRaw`
        SELECT COUNT(DISTINCT o.id)::int as cnt
        FROM offers o
        JOIN listings l ON o."listingId" = l.id
        JOIN products p ON l."productId" = p.id
        WHERE o."isActive" = true
        AND p.status = 'ACTIVE'
        AND LOWER(p.name) LIKE '%' || ${kw.term.toLowerCase()} || '%'
      `;
      offerCount = result[0]?.cnt ?? 0;
    } catch (err) { logger.warn("prioritization.query-failed", { error: err }) }

    const entity: EntityInput = {
      id: kwSlug,
      name: kw.term,
      slug: kwSlug,
      type: "keyword",
      searchVolume: kw.count,
      productCount,
      offerCount,
      hasSeoPage: hasPage,
      hasLandingPage: hasPage,
    };

    const scored = calculateOpportunityScore(entity);

    // Only include keywords with meaningful score and no landing page
    if (scored.score > 10 || !hasPage) {
      results.push({ ...entity, ...scored });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, 20);
}
