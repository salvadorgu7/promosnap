import prisma from "@/lib/db/prisma";

interface AutoBannerContent {
  title: string;
  subtitle: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
}

/**
 * Generate banner content from the best offers today.
 * Picks the offer with the highest offerScore and creates
 * compelling banner copy around it.
 */
export async function getTopOffersContent(): Promise<AutoBannerContent> {
  const topOffer = await prisma.offer.findFirst({
    where: { isActive: true },
    orderBy: { offerScore: "desc" },
    select: {
      currentPrice: true,
      originalPrice: true,
      offerScore: true,
      listing: {
        select: {
          rawTitle: true,
          product: { select: { slug: true, name: true } },
          source: { select: { name: true } },
        },
      },
    },
  });

  if (!topOffer) {
    return {
      title: "Melhores Ofertas do Dia",
      subtitle: "Confira as ofertas selecionadas para voce",
      ctaText: "Ver Ofertas",
      ctaUrl: "/ofertas",
    };
  }

  const productName = topOffer.listing?.product?.name || topOffer.listing?.rawTitle || "Produto";
  const slug = topOffer.listing?.product?.slug;
  const discount = topOffer.originalPrice && topOffer.originalPrice > topOffer.currentPrice
    ? Math.round(((topOffer.originalPrice - topOffer.currentPrice) / topOffer.originalPrice) * 100)
    : null;

  return {
    title: discount
      ? `${productName} com ${discount}% OFF`
      : `Oferta Destaque: ${productName}`,
    subtitle: `A partir de R$ ${topOffer.currentPrice.toFixed(2)} ${topOffer.listing?.source?.name ? `na ${topOffer.listing.source.name}` : ""}`.trim(),
    ctaText: "Ver Oferta",
    ctaUrl: slug ? `/produto/${slug}` : "/ofertas",
  };
}

/**
 * Generate banner content based on the biggest discount available.
 */
export async function getTopDiscountContent(): Promise<AutoBannerContent> {
  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      originalPrice: { not: null },
    },
    orderBy: { offerScore: "desc" },
    take: 20,
    select: {
      currentPrice: true,
      originalPrice: true,
      listing: {
        select: {
          rawTitle: true,
          product: { select: { slug: true, name: true } },
          source: { select: { name: true } },
        },
      },
    },
  });

  // Find biggest discount
  let bestDiscount = 0;
  let bestOffer: (typeof offers)[0] | null = null;
  for (const offer of offers) {
    if (offer.originalPrice && offer.originalPrice > offer.currentPrice) {
      const discount = Math.round(
        ((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100
      );
      if (discount > bestDiscount) {
        bestDiscount = discount;
        bestOffer = offer;
      }
    }
  }

  if (!bestOffer) {
    return {
      title: "Descontos Imperdíveis",
      subtitle: "Encontre os melhores precos do mercado",
      ctaText: "Ver Descontos",
      ctaUrl: "/ofertas",
    };
  }

  const productName = bestOffer.listing?.product?.name || bestOffer.listing?.rawTitle || "Produto";
  const slug = bestOffer.listing?.product?.slug;

  return {
    title: `${bestDiscount}% de Desconto!`,
    subtitle: `${productName} por apenas R$ ${bestOffer.currentPrice.toFixed(2)}`,
    ctaText: "Aproveitar",
    ctaUrl: slug ? `/produto/${slug}` : "/ofertas",
  };
}

/**
 * Generate banner content for active campaigns/coupons.
 */
export async function getCampaignContent(): Promise<AutoBannerContent> {
  const activeCoupons = await prisma.coupon.findMany({
    where: {
      status: "ACTIVE",
      OR: [
        { endAt: null },
        { endAt: { gte: new Date() } },
      ],
    },
    take: 3,
    orderBy: { createdAt: "desc" },
    select: {
      code: true,
      description: true,
      source: { select: { name: true } },
    },
  });

  if (activeCoupons.length === 0) {
    return {
      title: "Cupons e Campanhas",
      subtitle: "Novas ofertas em breve!",
      ctaText: "Ver Cupons",
      ctaUrl: "/cupons",
    };
  }

  const coupon = activeCoupons[0];
  const sourceName = coupon.source?.name || "";

  return {
    title: `Cupom ${coupon.code}${sourceName ? ` — ${sourceName}` : ""}`,
    subtitle: coupon.description || "Use este cupom e economize!",
    ctaText: "Ver Cupons",
    ctaUrl: "/cupons",
  };
}

/**
 * Resolve auto-mode banner content by mode string.
 */
export async function resolveAutoContent(autoMode: string): Promise<AutoBannerContent | null> {
  switch (autoMode) {
    case "top-offers":
      return getTopOffersContent();
    case "top-discount":
      return getTopDiscountContent();
    case "campaign":
      return getCampaignContent();
    default:
      return null;
  }
}
