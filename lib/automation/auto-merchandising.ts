// ============================================
// AUTO MERCHANDISING — automatic slot filling
// ============================================

import prisma from "@/lib/db/prisma";
import { calculateDecisionValue } from "@/lib/commerce/decision-value";
import { decideOfertaDoDia } from "@/lib/commerce/automation";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MerchandisingSlot {
  type: "hero" | "carousel" | "deal_of_day" | "promo_strip";
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  price: number;
  originalPrice: number | null;
  discount: number;
  offerScore: number;
  decisionScore: number;
  sourceSlug: string;
  affiliateUrl: string | null;
  reasons: string[];
}

interface AutoFillResult {
  slots: MerchandisingSlot[];
  bannersCreated: number;
  bannersSkipped: number;
  errors: string[];
  /** V19: detailed log of what was auto-filled and why */
  log: AutoFillLogEntry[];
}

/** V19: structured log entry for auto-fill operations */
export interface AutoFillLogEntry {
  timestamp: string;
  slotType: string;
  action: "filled" | "skipped" | "error";
  productName?: string;
  reason: string;
  score?: number;
}

/** V19: content suggestion for articles/guides */
export interface ContentSuggestion {
  productId: string;
  productName: string;
  productSlug: string;
  categorySlug: string | null;
  popularityScore: number;
  reason: string;
  suggestedType: "guide" | "review" | "comparison" | "tips";
  priority: "high" | "medium" | "low";
}

/** V19: import suggestion based on trends + catalog gaps */
export interface ImportSuggestion {
  keyword: string;
  trendPosition: number;
  reason: string;
  suggestedAction: "import" | "expand" | "monitor";
  priority: "high" | "medium" | "low";
  matchingProducts: number;
}

// ─── Internal state for logging ─────────────────────────────────────────────

const fillLog: AutoFillLogEntry[] = [];
const MAX_LOG_ENTRIES = 200;

function logEntry(entry: Omit<AutoFillLogEntry, "timestamp">) {
  fillLog.unshift({ ...entry, timestamp: new Date().toISOString() });
  if (fillLog.length > MAX_LOG_ENTRIES) fillLog.length = MAX_LOG_ENTRIES;
}

/**
 * Get recent auto-fill log entries.
 */
export function getAutoFillLog(limit = 50): AutoFillLogEntry[] {
  return fillLog.slice(0, limit);
}

// ─── Internal helpers ───────────────────────────────────────────────────────

async function fetchTopCandidates(limit: number) {
  return prisma.offer.findMany({
    where: {
      isActive: true,
      offerScore: { gte: 30 },
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
          product: {
            include: { category: true },
          },
          source: true,
        },
      },
    },
  });
}

function buildSlot(
  type: MerchandisingSlot["type"],
  offer: Awaited<ReturnType<typeof fetchTopCandidates>>[number],
  decisionScore: number,
  reasons: string[]
): MerchandisingSlot | null {
  const product = offer.listing.product;
  if (!product) return null;

  const originalPrice = offer.originalPrice ?? null;
  const discount =
    originalPrice && originalPrice > offer.currentPrice
      ? Math.round(
          ((originalPrice - offer.currentPrice) / originalPrice) * 100
        )
      : 0;

  return {
    type,
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    imageUrl: product.imageUrl,
    price: offer.currentPrice,
    originalPrice,
    discount,
    offerScore: offer.offerScore,
    decisionScore,
    sourceSlug: offer.listing.source.slug,
    affiliateUrl: offer.affiliateUrl,
    reasons,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Find the best product for the hero banner slot.
 */
export async function autoFillHeroSlot(): Promise<MerchandisingSlot | null> {
  const candidates = await fetchTopCandidates(20);
  if (candidates.length === 0) {
    logEntry({ slotType: "hero", action: "skipped", reason: "Nenhum candidato encontrado" });
    return null;
  }

  let bestSlot: MerchandisingSlot | null = null;
  let bestScore = -1;

  for (const offer of candidates) {
    const product = offer.listing.product;
    if (!product) continue;

    const dv = calculateDecisionValue({
      productId: product.id,
      productName: product.name,
      currentPrice: offer.currentPrice,
      categoryAvgPrice: null,
      rating: offer.listing.rating,
      reviewsCount: offer.listing.reviewsCount,
      offerScore: offer.offerScore,
      sourceReliability: null,
      isFreeShipping: offer.isFreeShipping,
      shippingPrice: offer.shippingPrice,
      commissionRate: null,
      activeOfferCount: 1,
    });

    // Hero needs high visual appeal + good deal
    const originalPrice = offer.originalPrice ?? null;
    const discount =
      originalPrice && originalPrice > offer.currentPrice
        ? Math.round(
            ((originalPrice - offer.currentPrice) / originalPrice) * 100
          )
        : 0;

    const heroScore = dv.score * 0.4 + offer.offerScore * 0.3 + discount * 0.3;

    if (heroScore > bestScore && product.imageUrl) {
      bestScore = heroScore;
      const reasons: string[] = [];
      if (discount >= 20) reasons.push(`${discount}% de desconto`);
      if (offer.offerScore >= 80) reasons.push("Score excelente");
      if (offer.isFreeShipping) reasons.push("Frete gratis");

      bestSlot = buildSlot("hero", offer, dv.score, reasons);
    }
  }

  if (bestSlot) {
    logEntry({
      slotType: "hero",
      action: "filled",
      productName: bestSlot.productName,
      reason: `Score combinado: ${bestScore.toFixed(1)} | ${bestSlot.reasons.join(", ")}`,
      score: bestScore,
    });
  }

  return bestSlot;
}

/**
 * Find top N products for the carousel.
 */
export async function autoFillCarousel(
  limit = 8
): Promise<MerchandisingSlot[]> {
  const candidates = await fetchTopCandidates(limit * 3);
  const slots: MerchandisingSlot[] = [];
  const seenProducts = new Set<string>();

  for (const offer of candidates) {
    const product = offer.listing.product;
    if (!product || seenProducts.has(product.id)) continue;
    seenProducts.add(product.id);

    const dv = calculateDecisionValue({
      productId: product.id,
      productName: product.name,
      currentPrice: offer.currentPrice,
      categoryAvgPrice: null,
      rating: offer.listing.rating,
      reviewsCount: offer.listing.reviewsCount,
      offerScore: offer.offerScore,
      sourceReliability: null,
      isFreeShipping: offer.isFreeShipping,
      shippingPrice: offer.shippingPrice,
      commissionRate: null,
      activeOfferCount: 1,
    });

    if (dv.score >= 50) {
      const reasons: string[] = [];
      const originalPrice = offer.originalPrice ?? null;
      const discount =
        originalPrice && originalPrice > offer.currentPrice
          ? Math.round(
              ((originalPrice - offer.currentPrice) / originalPrice) * 100
            )
          : 0;
      if (discount >= 15) reasons.push(`${discount}% OFF`);
      if (offer.isFreeShipping) reasons.push("Frete gratis");

      const slot = buildSlot("carousel", offer, dv.score, reasons);
      if (slot) {
        slots.push(slot);
        logEntry({
          slotType: "carousel",
          action: "filled",
          productName: product.name,
          reason: `DV: ${dv.score.toFixed(0)} | OfferScore: ${offer.offerScore}`,
          score: dv.score,
        });
      }
    }

    if (slots.length >= limit) break;
  }

  logEntry({
    slotType: "carousel",
    action: slots.length > 0 ? "filled" : "skipped",
    reason: `${slots.length}/${limit} slots preenchidos`,
  });

  return slots.sort((a, b) => b.decisionScore - a.decisionScore);
}

/**
 * Pick the deal of the day.
 */
export async function autoFillDealOfDay(): Promise<MerchandisingSlot | null> {
  const candidates = await fetchTopCandidates(30);

  const productCandidates = candidates
    .filter((o) => o.listing.product)
    .map((o) => ({
      productId: o.listing.product!.id,
      productName: o.listing.product!.name,
      offerId: o.id,
      currentPrice: o.currentPrice,
      originalPrice: o.originalPrice ?? undefined,
      offerScore: o.offerScore,
      sourceSlug: o.listing.source.slug,
      affiliateUrl: o.affiliateUrl ?? undefined,
      imageUrl: o.listing.product!.imageUrl ?? undefined,
      rating: o.listing.rating ?? undefined,
      reviewsCount: o.listing.reviewsCount ?? undefined,
      isFreeShipping: o.isFreeShipping,
    }));

  const deal = decideOfertaDoDia(productCandidates);
  if (!deal) {
    logEntry({ slotType: "deal_of_day", action: "skipped", reason: "Nenhum candidato qualificado" });
    return null;
  }

  // Find the matching offer
  const matchingOffer = candidates.find((o) => o.id === deal.offerId);
  if (!matchingOffer || !matchingOffer.listing.product) return null;

  const dv = calculateDecisionValue({
    productId: deal.productId,
    productName: deal.productName,
    currentPrice: deal.currentPrice,
    categoryAvgPrice: null,
    rating: matchingOffer.listing.rating,
    reviewsCount: matchingOffer.listing.reviewsCount,
    offerScore: deal.offerScore,
    sourceReliability: null,
    isFreeShipping: matchingOffer.isFreeShipping,
    shippingPrice: matchingOffer.shippingPrice,
    commissionRate: null,
    activeOfferCount: 1,
  });

  logEntry({
    slotType: "deal_of_day",
    action: "filled",
    productName: deal.productName,
    reason: `Score: ${deal.offerScore} | ${deal.reasons.join(", ")}`,
    score: deal.offerScore,
  });

  return buildSlot("deal_of_day", matchingOffer, dv.score, deal.reasons);
}

/**
 * Pick promo strip content.
 */
export async function autoFillPromoStrip(): Promise<MerchandisingSlot | null> {
  const candidates = await fetchTopCandidates(10);

  // Find the offer with the best discount
  let bestDiscount = 0;
  let bestOffer: (typeof candidates)[number] | null = null;

  for (const offer of candidates) {
    if (!offer.listing.product) continue;
    const originalPrice = offer.originalPrice ?? null;
    if (originalPrice && originalPrice > offer.currentPrice) {
      const discount = Math.round(
        ((originalPrice - offer.currentPrice) / originalPrice) * 100
      );
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestOffer = offer;
      }
    }
  }

  if (!bestOffer || !bestOffer.listing.product) {
    logEntry({ slotType: "promo_strip", action: "skipped", reason: "Nenhum produto com desconto encontrado" });
    return null;
  }

  const dv = calculateDecisionValue({
    productId: bestOffer.listing.product.id,
    productName: bestOffer.listing.product.name,
    currentPrice: bestOffer.currentPrice,
    categoryAvgPrice: null,
    rating: bestOffer.listing.rating,
    reviewsCount: bestOffer.listing.reviewsCount,
    offerScore: bestOffer.offerScore,
    sourceReliability: null,
    isFreeShipping: bestOffer.isFreeShipping,
    shippingPrice: bestOffer.shippingPrice,
    commissionRate: null,
    activeOfferCount: 1,
  });

  logEntry({
    slotType: "promo_strip",
    action: "filled",
    productName: bestOffer.listing.product.name,
    reason: `${bestDiscount}% de desconto`,
    score: bestOffer.offerScore,
  });

  return buildSlot("promo_strip", bestOffer, dv.score, [
    `${bestDiscount}% de desconto`,
  ]);
}

/**
 * Create/update auto banners based on merchandising slots.
 * Respects manual overrides: if a manual Banner exists with higher priority, skip.
 */
export async function autoFillBanners(): Promise<AutoFillResult> {
  const errors: string[] = [];
  const log: AutoFillLogEntry[] = [];
  let bannersCreated = 0;
  let bannersSkipped = 0;
  const allSlots: MerchandisingSlot[] = [];

  try {
    // Gather slots
    const [hero, carousel, dealOfDay, promoStrip] = await Promise.all([
      autoFillHeroSlot(),
      autoFillCarousel(8),
      autoFillDealOfDay(),
      autoFillPromoStrip(),
    ]);

    if (hero) allSlots.push(hero);
    allSlots.push(...carousel);
    if (dealOfDay) allSlots.push(dealOfDay);
    if (promoStrip) allSlots.push(promoStrip);

    // Process banner creation for hero and strip slots
    const bannerSlots = allSlots.filter(
      (s) => s.type === "hero" || s.type === "promo_strip"
    );

    for (const slot of bannerSlots) {
      const bannerType = slot.type === "hero" ? "HERO" : "STRIP";
      const autoMode = slot.type === "hero" ? "auto-hero" : "auto-strip";

      // Check for manual override with higher priority
      const manualBanner = await prisma.banner.findFirst({
        where: {
          bannerType: bannerType as "HERO" | "STRIP",
          isActive: true,
          autoMode: null, // Manual banners have no autoMode
          priority: { gte: 10 },
        },
        orderBy: { priority: "desc" },
      });

      if (manualBanner) {
        bannersSkipped++;
        logEntry({
          slotType: slot.type,
          action: "skipped",
          productName: slot.productName,
          reason: `Banner manual com prioridade ${manualBanner.priority} prevalece`,
        });
        continue;
      }

      // Upsert auto banner
      const existingAuto = await prisma.banner.findFirst({
        where: {
          autoMode,
          bannerType: bannerType as "HERO" | "STRIP",
        },
      });

      const bannerData = {
        title:
          slot.discount > 0
            ? `${slot.productName} com ${slot.discount}% OFF`
            : `Oferta: ${slot.productName}`,
        subtitle: `A partir de R$ ${slot.price.toFixed(2)}`,
        ctaText: "Ver Oferta",
        ctaUrl: `/produto/${slot.productSlug}`,
        imageUrl: slot.imageUrl,
        bannerType: bannerType as "HERO" | "STRIP",
        priority: 5, // Lower priority than manual
        isActive: true,
        autoMode,
      };

      if (existingAuto) {
        await prisma.banner.update({
          where: { id: existingAuto.id },
          data: bannerData,
        });
      } else {
        await prisma.banner.create({ data: bannerData });
      }
      bannersCreated++;
      logEntry({
        slotType: slot.type,
        action: "filled",
        productName: slot.productName,
        reason: `Banner ${existingAuto ? "atualizado" : "criado"}: ${bannerData.title}`,
        score: slot.offerScore,
      });
    }
  } catch (err) {
    const msg = `Erro ao preencher banners: ${err instanceof Error ? err.message : "Erro desconhecido"}`;
    errors.push(msg);
    logEntry({ slotType: "banners", action: "error", reason: msg });
  }

  // Collect recent log entries relevant to this run
  log.push(...getAutoFillLog(20));

  return { slots: allSlots, bannersCreated, bannersSkipped, errors, log };
}

// ─── V19: Content Suggestions ─────────────────────────────────────────────

/**
 * Suggest articles/guides based on product catalog gaps.
 * Finds popular products that lack associated editorial content.
 */
export async function autoSuggestContent(
  limit = 10
): Promise<ContentSuggestion[]> {
  try {
    // Find popular products without articles
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        hidden: false,
        popularityScore: { gte: 30 },
      },
      orderBy: { popularityScore: "desc" },
      take: limit * 3,
      select: {
        id: true,
        name: true,
        slug: true,
        popularityScore: true,
        category: { select: { slug: true, name: true } },
        _count: { select: { listings: true } },
      },
    });

    // Check which products already have articles
    const productIds = products.map((p) => p.id);
    let productsWithArticles = new Set<string>();
    try {
      const articleLinks: { productId: string }[] = await prisma.$queryRaw`
        SELECT DISTINCT "productId" FROM article_products WHERE "productId" = ANY(${productIds}::text[])
      `;
      productsWithArticles = new Set(articleLinks.map((a) => a.productId));
    } catch {
      // table may not exist
    }

    const suggestions: ContentSuggestion[] = [];

    for (const product of products) {
      if (productsWithArticles.has(product.id)) continue;

      const priority: ContentSuggestion["priority"] =
        product.popularityScore >= 70 ? "high" :
        product.popularityScore >= 50 ? "medium" : "low";

      // Determine suggested content type
      let suggestedType: ContentSuggestion["suggestedType"] = "review";
      if (product._count.listings >= 3) suggestedType = "comparison";
      else if (product.category?.slug) suggestedType = "guide";

      let reason = `Produto popular (score: ${product.popularityScore}) sem conteudo editorial`;
      if (product._count.listings >= 3) {
        reason += ` — ${product._count.listings} listings, ideal para comparativo`;
      }

      suggestions.push({
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        categorySlug: product.category?.slug ?? null,
        popularityScore: product.popularityScore,
        reason,
        suggestedType,
        priority,
      });

      if (suggestions.length >= limit) break;
    }

    return suggestions;
  } catch {
    return [];
  }
}

// ─── V19: Import Suggestions ──────────────────────────────────────────────

/**
 * Suggest product imports based on trending keywords + catalog gaps.
 * Finds trending keywords that have no or few matching products.
 */
export async function autoSuggestImports(
  limit = 10
): Promise<ImportSuggestion[]> {
  try {
    // Get trending keywords
    const keywords = await prisma.trendingKeyword.findMany({
      orderBy: [{ fetchedAt: "desc" }, { position: "asc" }],
      take: 30,
    });

    const suggestions: ImportSuggestion[] = [];

    for (const kw of keywords) {
      // Check how many products match this keyword
      const matchCount = await prisma.product.count({
        where: {
          status: "ACTIVE",
          hidden: false,
          OR: [
            { name: { contains: kw.keyword, mode: "insensitive" } },
            { slug: { contains: kw.keyword.toLowerCase().replace(/\s+/g, "-") } },
          ],
        },
      });

      let suggestedAction: ImportSuggestion["suggestedAction"];
      let priority: ImportSuggestion["priority"];
      let reason: string;

      if (matchCount === 0) {
        suggestedAction = "import";
        priority = kw.position <= 5 ? "high" : "medium";
        reason = `Keyword trending (#${kw.position}) sem nenhum produto no catalogo`;
      } else if (matchCount <= 2) {
        suggestedAction = "expand";
        priority = kw.position <= 10 ? "medium" : "low";
        reason = `Apenas ${matchCount} produto(s) para keyword trending (#${kw.position})`;
      } else {
        suggestedAction = "monitor";
        priority = "low";
        reason = `${matchCount} produtos existem, monitorar competitividade`;
      }

      // Skip if well covered
      if (matchCount > 5) continue;

      suggestions.push({
        keyword: kw.keyword,
        trendPosition: kw.position,
        reason,
        suggestedAction,
        priority,
        matchingProducts: matchCount,
      });

      if (suggestions.length >= limit) break;
    }

    return suggestions;
  } catch {
    return [];
  }
}
