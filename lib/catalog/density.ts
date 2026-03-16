// ============================================
// CATALOG DENSITY ENGINE — measures catalog depth per category
// Core intelligence for the Catalog Density Sprint
// ============================================

import prisma from "@/lib/db/prisma";
import { logger } from "@/lib/logger"

// ─── Priority Categories ────────────────────────────────────────────────────

/** Category tier classification for prioritization */
export type CategoryTier = "dense" | "promising" | "sparse" | "ignore";

export const PRIORITY_CATEGORIES = [
  // ─── TIER 1: Máxima prioridade (alta receita + volume) ────────────────────
  {
    slug: "celulares",
    name: "Celulares",
    target: 200,
    tier: "promising" as CategoryTier,
    reason: "Alta intenção de compra, forte potencial de comparação, ticket médio alto",
    anchorBrands: ["Apple", "Samsung", "Xiaomi", "Motorola"],
    anchorQueries: [
      "iPhone 15", "iPhone 14", "iPhone 13",
      "Galaxy S24", "Galaxy S23", "Galaxy A54", "Galaxy A15",
      "Xiaomi Redmi Note 13", "Xiaomi Redmi 13C",
      "Motorola Edge 40", "Motorola Moto G84", "Motorola Moto G54",
      "celular até 1000", "celular até 1500", "celular até 2000",
      "celular custo benefício", "celular 5G barato",
    ],
  },
  {
    slug: "notebooks",
    name: "Notebooks",
    target: 150,
    tier: "promising" as CategoryTier,
    reason: "Ticket alto, comparação intensa, longo ciclo de decisão",
    anchorBrands: ["Apple", "Dell", "Lenovo", "Samsung", "Acer", "HP"],
    anchorQueries: [
      "MacBook Air M2", "MacBook Air M3",
      "notebook gamer", "notebook gamer barato",
      "notebook até 2000", "notebook até 3000", "notebook até 4000",
      "notebook Dell Inspiron", "notebook Lenovo IdeaPad",
      "notebook para trabalho", "notebook para estudar",
      "notebook custo benefício", "notebook i5 8gb",
    ],
  },
  {
    slug: "esportes",
    name: "Esportes & Tênis",
    target: 150,
    tier: "promising" as CategoryTier,
    reason: "Volume altíssimo de busca, muitos modelos, desconto frequente, impulso",
    anchorBrands: ["Nike", "Adidas", "New Balance", "Asics", "Puma", "Olympikus"],
    anchorQueries: [
      "Nike Air Max", "Nike Air Force 1", "Nike Downshifter",
      "Adidas Ultraboost", "Adidas Runfalcon",
      "New Balance 574", "Asics Gel Nimbus",
      "tênis corrida", "tênis casual", "tênis feminino",
      "tênis até 200", "tênis até 300", "tênis promoção",
    ],
  },

  // ─── TIER 2: Alta prioridade (bom volume + boa margem) ────────────────────
  {
    slug: "tv-audio",
    name: "TV & Áudio",
    target: 100,
    tier: "promising" as CategoryTier,
    reason: "Ticket alto em TVs, impulso em fones, forte comparação",
    anchorBrands: ["Samsung", "LG", "TCL", "JBL", "Sony"],
    anchorQueries: [
      "smart tv 50", "smart tv 55 4k", "smart tv barata",
      "fone bluetooth", "caixa de som bluetooth", "soundbar",
      "JBL Flip", "JBL Charge", "fone TWS",
    ],
  },
  {
    slug: "casa",
    name: "Casa",
    target: 80,
    tier: "promising" as CategoryTier,
    reason: "Air fryer e cafeteira são campeões de busca e impulso",
    anchorBrands: ["Philco", "Mondial", "Electrolux", "Nespresso", "Xiaomi"],
    anchorQueries: [
      "air fryer", "cafeteira", "aspirador robô",
      "air fryer 9 litros", "cafeteira nespresso", "cafeteira dolce gusto",
      "aspirador vertical", "panela elétrica",
    ],
  },
  {
    slug: "gamer",
    name: "Gamer",
    target: 80,
    tier: "promising" as CategoryTier,
    reason: "Público engajado, alto AOV, forte cultura de comparação",
    anchorBrands: ["Sony", "Microsoft", "Redragon", "Logitech", "HyperX"],
    anchorQueries: [
      "PlayStation 5", "PS5 Slim", "Xbox Series", "Nintendo Switch",
      "teclado mecânico gamer", "mouse gamer", "headset gamer",
      "cadeira gamer", "monitor gamer 144hz",
    ],
  },

  // ─── TIER 3: Categorias em expansão ───────────────────────────────────────
  {
    slug: "beleza",
    name: "Beleza",
    target: 60,
    tier: "sparse" as CategoryTier,
    reason: "Alta margem de afiliado, recorrência, público fiel",
    anchorBrands: ["Boticário", "Natura", "Taiff", "Salon Line"],
    anchorQueries: [
      "perfume masculino", "perfume feminino", "prancha alisadora",
      "secador de cabelo", "kit skincare", "maquiagem",
    ],
  },
  {
    slug: "ferramentas",
    name: "Ferramentas",
    target: 40,
    tier: "sparse" as CategoryTier,
    reason: "Ticket médio, compra por necessidade, boa margem",
    anchorBrands: ["Bosch", "DeWalt", "Tramontina", "Makita"],
    anchorQueries: [
      "parafusadeira", "furadeira", "jogo de ferramentas",
      "serra circular", "lixadeira",
    ],
  },
  {
    slug: "brinquedos",
    name: "Brinquedos",
    target: 40,
    tier: "sparse" as CategoryTier,
    reason: "Picos sazonais (Natal, Dia das Crianças), impulso forte",
    anchorBrands: ["LEGO", "Mattel", "Hot Wheels", "Hasbro"],
    anchorQueries: [
      "LEGO", "Barbie", "Hot Wheels", "brinquedo educativo",
      "boneco ação", "jogo tabuleiro",
    ],
  },
];

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CategoryDensity {
  slug: string;
  name: string;
  target: number;
  current: {
    totalProducts: number;
    withActiveOffers: number;
    withImages: number;
    withAffiliateUrl: number;
    avgOffersPerProduct: number;
    sources: { slug: string; count: number }[];
    brands: { name: string; count: number }[];
    priceRange: { min: number; max: number; avg: number } | null;
    clickouts7d: number;
  };
  readiness: {
    densityScore: number;
    commercialScore: number;
    seoScore: number;
    overallScore: number;
  };
  gaps: {
    productsNeeded: number;
    missingImages: number;
    missingAffiliateUrls: number;
    lowOfferCoverage: number;
  };
}

// ─── Get Category Density ───────────────────────────────────────────────────

export async function getCategoryDensity(
  categorySlug: string
): Promise<CategoryDensity | null> {
  try {
    // 1. Find category by slug
    const catRows: { id: string; slug: string; name: string }[] =
      await prisma.$queryRaw`
        SELECT id, slug, name
        FROM categories
        WHERE slug = ${categorySlug}
        LIMIT 1
      `;

    if (!catRows.length) return null;
    const category = catRows[0];

    // Look up target from priority config
    const priorityConfig = PRIORITY_CATEGORIES.find(
      (c) => c.slug === categorySlug
    );
    const target = priorityConfig?.target ?? 100;

    // 2. Count total active products
    const totalRows: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS cnt
      FROM products
      WHERE "categoryId" = ${category.id} AND status = 'ACTIVE'
    `;
    const totalProducts = Number(totalRows[0]?.cnt ?? 0);

    // 3. Count products with at least 1 active offer
    const withOffersRows: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT p.id)::bigint AS cnt
      FROM products p
      JOIN offers o ON o."productId" = p.id AND o."isActive" = true
      WHERE p."categoryId" = ${category.id} AND p.status = 'ACTIVE'
    `;
    const withActiveOffers = Number(withOffersRows[0]?.cnt ?? 0);

    // 4. Count products with images
    const withImagesRows: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS cnt
      FROM products
      WHERE "categoryId" = ${category.id}
        AND status = 'ACTIVE'
        AND "imageUrl" IS NOT NULL
        AND "imageUrl" != ''
    `;
    const withImages = Number(withImagesRows[0]?.cnt ?? 0);

    // 5. Count products with affiliate URLs on their offers
    const withAffiliateRows: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(DISTINCT p.id)::bigint AS cnt
      FROM products p
      JOIN offers o ON o."productId" = p.id AND o."isActive" = true
      WHERE p."categoryId" = ${category.id}
        AND p.status = 'ACTIVE'
        AND o."affiliateUrl" IS NOT NULL
        AND o."affiliateUrl" != ''
    `;
    const withAffiliateUrl = Number(withAffiliateRows[0]?.cnt ?? 0);

    // 6. Average offers per product
    const avgOffersRows: { avg_offers: number }[] = await prisma.$queryRaw`
      SELECT COALESCE(AVG(offer_count), 0)::float AS avg_offers
      FROM (
        SELECT p.id, COUNT(o.id)::int AS offer_count
        FROM products p
        LEFT JOIN offers o ON o."productId" = p.id AND o."isActive" = true
        WHERE p."categoryId" = ${category.id} AND p.status = 'ACTIVE'
        GROUP BY p.id
      ) sub
    `;
    const avgOffersPerProduct = Math.round(
      (avgOffersRows[0]?.avg_offers ?? 0) * 100
    ) / 100;

    // 7. Source distribution
    const sourceRows: { slug: string; cnt: bigint }[] =
      await prisma.$queryRaw`
        SELECT s.slug, COUNT(DISTINCT p.id)::bigint AS cnt
        FROM products p
        JOIN offers o ON o."productId" = p.id AND o."isActive" = true
        JOIN sources s ON s.id = o."sourceId"
        WHERE p."categoryId" = ${category.id} AND p.status = 'ACTIVE'
        GROUP BY s.slug
        ORDER BY cnt DESC
      `;
    const sources = sourceRows.map((r) => ({
      slug: r.slug,
      count: Number(r.cnt),
    }));

    // 8. Brand distribution (top 10)
    const brandRows: { brand: string; cnt: bigint }[] =
      await prisma.$queryRaw`
        SELECT p.brand AS brand, COUNT(*)::bigint AS cnt
        FROM products p
        WHERE p."categoryId" = ${category.id}
          AND p.status = 'ACTIVE'
          AND p.brand IS NOT NULL
          AND p.brand != ''
        GROUP BY p.brand
        ORDER BY cnt DESC
        LIMIT 10
      `;
    const brands = brandRows.map((r) => ({
      name: r.brand,
      count: Number(r.cnt),
    }));

    // 9. Price range (min, max, avg of best offer prices)
    const priceRows: {
      min_price: number | null;
      max_price: number | null;
      avg_price: number | null;
    }[] = await prisma.$queryRaw`
      SELECT
        MIN(o.price)::float AS min_price,
        MAX(o.price)::float AS max_price,
        AVG(o.price)::float AS avg_price
      FROM products p
      JOIN offers o ON o."productId" = p.id AND o."isActive" = true
      WHERE p."categoryId" = ${category.id}
        AND p.status = 'ACTIVE'
        AND o.price > 0
    `;
    const priceRange =
      priceRows[0]?.min_price != null
        ? {
            min: Math.round(priceRows[0].min_price * 100) / 100,
            max: Math.round((priceRows[0].max_price ?? 0) * 100) / 100,
            avg: Math.round((priceRows[0].avg_price ?? 0) * 100) / 100,
          }
        : null;

    // 10. Clickouts last 7 days for this category
    const clickoutRows: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS cnt
      FROM clickouts c
      WHERE c."categorySlug" = ${categorySlug}
        AND c."clickedAt" >= NOW() - INTERVAL '7 days'
    `;
    const clickouts7d = Number(clickoutRows[0]?.cnt ?? 0);

    // 11. Calculate scores

    // Density: current products vs target (capped at 100)
    const densityScore = Math.min(
      100,
      Math.round((totalProducts / target) * 100)
    );

    // Commercial: affiliate coverage + offer depth
    const affiliateCoverage =
      totalProducts > 0 ? withAffiliateUrl / totalProducts : 0;
    const offerDepth = Math.min(1, avgOffersPerProduct / 3);
    const commercialScore = Math.min(
      100,
      Math.round((affiliateCoverage * 60 + offerDepth * 40))
    );

    // SEO: images + descriptions (using image coverage as proxy)
    const imageCoverage = totalProducts > 0 ? withImages / totalProducts : 0;
    const seoScore = Math.min(100, Math.round(imageCoverage * 100));

    // Overall: weighted average
    const overallScore = Math.round(
      densityScore * 0.4 + commercialScore * 0.35 + seoScore * 0.25
    );

    // 11. Calculate gaps
    const productsNeeded = Math.max(0, target - totalProducts);
    const missingImages = totalProducts - withImages;
    const missingAffiliateUrls = withActiveOffers - withAffiliateUrl;

    // Products with fewer than 2 offers
    const lowOfferRows: { cnt: bigint }[] = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS cnt
      FROM (
        SELECT p.id
        FROM products p
        LEFT JOIN offers o ON o."productId" = p.id AND o."isActive" = true
        WHERE p."categoryId" = ${category.id} AND p.status = 'ACTIVE'
        GROUP BY p.id
        HAVING COUNT(o.id) < 2
      ) sub
    `;
    const lowOfferCoverage = Number(lowOfferRows[0]?.cnt ?? 0);

    return {
      slug: category.slug,
      name: category.name,
      target,
      current: {
        totalProducts,
        withActiveOffers,
        withImages,
        withAffiliateUrl,
        avgOffersPerProduct,
        sources,
        brands,
        priceRange,
        clickouts7d,
      },
      readiness: {
        densityScore,
        commercialScore,
        seoScore,
        overallScore,
      },
      gaps: {
        productsNeeded,
        missingImages,
        missingAffiliateUrls,
        lowOfferCoverage,
      },
    };
  } catch (error) {
    console.error(
      `[catalog-density] Error getting density for "${categorySlug}":`,
      error
    );
    return null;
  }
}

// ─── All Priority Category Densities ────────────────────────────────────────

export async function getAllPriorityCategoryDensities(): Promise<
  CategoryDensity[]
> {
  try {
    const results = await Promise.all(
      PRIORITY_CATEGORIES.map((c) => getCategoryDensity(c.slug))
    );
    return results.filter((r): r is CategoryDensity => r !== null);
  } catch (error) {
    console.error(
      "[catalog-density] Error getting all priority densities:",
      error
    );
    return [];
  }
}

// ─── Category Expansion Plan ────────────────────────────────────────────────

export async function getCategoryExpansionPlan(categorySlug: string): Promise<{
  category: string;
  currentCount: number;
  targetCount: number;
  gap: number;
  suggestedQueries: string[];
  suggestedBrands: string[];
  priceRangeGaps: string[];
}> {
  try {
    const density = await getCategoryDensity(categorySlug);
    const config = PRIORITY_CATEGORIES.find((c) => c.slug === categorySlug);

    const currentCount = density?.current.totalProducts ?? 0;
    const targetCount = config?.target ?? 100;
    const gap = Math.max(0, targetCount - currentCount);

    // Determine which anchor brands are missing or underrepresented
    const existingBrands = new Set(
      (density?.current.brands ?? []).map((b) => b.name.toLowerCase())
    );
    const suggestedBrands = (config?.anchorBrands ?? []).filter(
      (b) => !existingBrands.has(b.toLowerCase())
    );

    // Suggest queries that may not yet have coverage
    // Check which anchor queries returned zero or few results
    const suggestedQueries: string[] = [];
    if (config?.anchorQueries) {
      for (const query of config.anchorQueries) {
        try {
          const logRows: { resultsCount: number | null }[] =
            await prisma.$queryRaw`
              SELECT "resultsCount"
              FROM search_logs
              WHERE query ILIKE ${query}
              ORDER BY "createdAt" DESC
              LIMIT 1
            `;
          const lastCount = logRows[0]?.resultsCount;
          if (lastCount == null || Number(lastCount) < 5) {
            suggestedQueries.push(query);
          }
        } catch {
          // If query check fails, include it as suggestion
          suggestedQueries.push(query);
        }
      }
    }

    // Identify price range gaps
    const priceRangeGaps: string[] = [];
    if (density?.current.priceRange) {
      const { min, max } = density.current.priceRange;

      // Check for gaps in common consumer price tiers
      const priceTiers = [
        { label: "Até R$500", from: 0, to: 500 },
        { label: "R$500–R$1.000", from: 500, to: 1000 },
        { label: "R$1.000–R$2.000", from: 1000, to: 2000 },
        { label: "R$2.000–R$4.000", from: 2000, to: 4000 },
        { label: "Acima de R$4.000", from: 4000, to: 99999 },
      ];

      for (const tier of priceTiers) {
        try {
          const tierRows: { cnt: bigint }[] = await prisma.$queryRaw`
            SELECT COUNT(DISTINCT p.id)::bigint AS cnt
            FROM products p
            JOIN categories c ON c.id = p."categoryId"
            JOIN offers o ON o."productId" = p.id AND o."isActive" = true
            WHERE c.slug = ${categorySlug}
              AND p.status = 'ACTIVE'
              AND o.price >= ${tier.from}
              AND o.price < ${tier.to}
          `;
          const count = Number(tierRows[0]?.cnt ?? 0);
          if (count < 3) {
            priceRangeGaps.push(`${tier.label} (${count} produtos)`);
          }
        } catch {
          priceRangeGaps.push(`${tier.label} (sem dados)`);
        }
      }
    } else {
      priceRangeGaps.push("Sem dados de preço — nenhuma oferta ativa");
    }

    return {
      category: categorySlug,
      currentCount,
      targetCount,
      gap,
      suggestedQueries,
      suggestedBrands,
      priceRangeGaps,
    };
  } catch (error) {
    console.error(
      `[catalog-density] Error getting expansion plan for "${categorySlug}":`,
      error
    );
    return {
      category: categorySlug,
      currentCount: 0,
      targetCount: 100,
      gap: 100,
      suggestedQueries: [],
      suggestedBrands: [],
      priceRangeGaps: [],
    };
  }
}
