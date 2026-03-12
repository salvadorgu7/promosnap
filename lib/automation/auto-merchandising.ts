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
  if (candidates.length === 0) return null;

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
      if (slot) slots.push(slot);
    }

    if (slots.length >= limit) break;
  }

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
  if (!deal) return null;

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

  if (!bestOffer || !bestOffer.listing.product) return null;

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
    }
  } catch (err) {
    errors.push(
      `Erro ao preencher banners: ${err instanceof Error ? err.message : "Erro desconhecido"}`
    );
  }

  return { slots: allSlots, bannersCreated, bannersSkipped, errors };
}
