// ============================================
// COMMERCE AUTOMATION — smart decisions
// ============================================

import type {
  CommerceDecision,
  HomeBlock,
  CampaignPriority,
  OfertaDoDia,
  TrendingCategoryResult,
} from "./types";

// ============================================
// Oferta do Dia — best deal picker
// ============================================

interface ProductCandidate {
  productId: string;
  productName: string;
  offerId: string;
  currentPrice: number;
  originalPrice?: number;
  offerScore: number;
  sourceSlug: string;
  sourceReliability?: number;
  affiliateUrl?: string;
  imageUrl?: string;
  rating?: number;
  reviewsCount?: number;
  isFreeShipping?: boolean;
  hasCoupon?: boolean;
}

export function decideOfertaDoDia(
  products: ProductCandidate[]
): OfertaDoDia | null {
  if (products.length === 0) return null;

  const scored = products.map((p) => {
    let score = 0;
    const reasons: string[] = [];

    // Quality signal: high offer score (0-30)
    if (p.offerScore >= 80) {
      score += 30;
      reasons.push("Oferta com score excelente");
    } else if (p.offerScore >= 60) {
      score += 20;
      reasons.push("Bom score de oferta");
    } else if (p.offerScore >= 40) {
      score += 10;
    }

    // Discount signal (0-25)
    const discount =
      p.originalPrice && p.originalPrice > p.currentPrice
        ? Math.round(
            ((p.originalPrice - p.currentPrice) / p.originalPrice) * 100
          )
        : 0;
    if (discount >= 40) {
      score += 25;
      reasons.push(`Desconto de ${discount}%`);
    } else if (discount >= 25) {
      score += 18;
      reasons.push(`Desconto de ${discount}%`);
    } else if (discount >= 10) {
      score += 8;
    }

    // Reliability signal (0-20)
    const reliability = p.sourceReliability ?? 70;
    if (reliability >= 90) {
      score += 20;
      reasons.push("Fonte altamente confiavel");
    } else if (reliability >= 70) {
      score += 12;
    } else if (reliability >= 50) {
      score += 5;
    }

    // Product quality signal (0-15)
    if ((p.rating ?? 0) >= 4.5 && (p.reviewsCount ?? 0) > 100) {
      score += 15;
      reasons.push("Produto bem avaliado");
    } else if ((p.rating ?? 0) >= 4.0 && (p.reviewsCount ?? 0) > 50) {
      score += 10;
    } else if ((p.rating ?? 0) >= 3.5) {
      score += 5;
    }

    // Bonus features (0-10)
    if (p.isFreeShipping) {
      score += 5;
      reasons.push("Frete gratis");
    }
    if (p.hasCoupon) {
      score += 5;
      reasons.push("Cupom disponivel");
    }

    return { ...p, totalScore: Math.min(100, score), discount, reasons };
  });

  // Sort by total score, pick the best
  scored.sort((a, b) => b.totalScore - a.totalScore);
  const winner = scored[0];

  return {
    productId: winner.productId,
    productName: winner.productName,
    offerId: winner.offerId,
    currentPrice: winner.currentPrice,
    originalPrice: winner.originalPrice,
    discount: winner.discount,
    offerScore: winner.offerScore,
    sourceSlug: winner.sourceSlug,
    affiliateUrl: winner.affiliateUrl,
    imageUrl: winner.imageUrl,
    reasons: winner.reasons,
  };
}

// ============================================
// Home blocks — decides layout and order
// ============================================

interface HomeContext {
  hasDealOfDay: boolean;
  trendingCategoryCount: number;
  topOffersCount: number;
  activeCouponsCount: number;
  publishedArticlesCount: number;
  editorialBlocksCount: number;
  hasHeroBanner: boolean;
}

export function decideHomeBlocks(context: HomeContext): HomeBlock[] {
  const blocks: HomeBlock[] = [];
  let position = 0;

  // Hero banner always first if available
  if (context.hasHeroBanner) {
    blocks.push({
      id: "hero",
      type: "hero_banner",
      title: "Destaque",
      position: position++,
      score: 100,
      payload: {},
    });
  }

  // Deal of the day — high priority when available
  if (context.hasDealOfDay) {
    blocks.push({
      id: "deal-of-day",
      type: "deal_of_day",
      title: "Oferta do Dia",
      subtitle: "Melhor oferta selecionada automaticamente",
      position: position++,
      score: 95,
      payload: {},
    });
  }

  // Top offers — always show if we have data
  if (context.topOffersCount >= 3) {
    blocks.push({
      id: "top-offers",
      type: "top_offers",
      title: "Melhores Ofertas",
      subtitle: "Ofertas com melhor score",
      position: position++,
      score: 90,
      payload: {},
    });
  }

  // Price drops — urgency driver
  blocks.push({
    id: "price-drops",
    type: "price_drops",
    title: "Caiu de Preco",
    subtitle: "Produtos com queda recente",
    position: position++,
    score: 85,
    payload: {},
  });

  // Trending category when available
  if (context.trendingCategoryCount > 0) {
    blocks.push({
      id: "trending-category",
      type: "trending_category",
      title: "Categoria em Alta",
      position: position++,
      score: 75,
      payload: {},
    });
  }

  // Coupon wall when enough coupons
  if (context.activeCouponsCount >= 3) {
    blocks.push({
      id: "coupon-wall",
      type: "coupon_wall",
      title: "Cupons Ativos",
      subtitle: `${context.activeCouponsCount} cupons disponiveis`,
      position: position++,
      score: 70,
      payload: {},
    });
  }

  // Best sellers
  blocks.push({
    id: "best-sellers",
    type: "best_sellers",
    title: "Mais Vendidos",
    position: position++,
    score: 65,
    payload: {},
  });

  // Editorial content
  if (context.publishedArticlesCount > 0 || context.editorialBlocksCount > 0) {
    blocks.push({
      id: "editorial",
      type: "editorial",
      title: "Conteudo",
      subtitle: "Artigos e guias de compra",
      position: position++,
      score: 50,
      payload: {},
    });
  }

  return blocks;
}

// ============================================
// Campaign priority
// ============================================

interface CampaignInput {
  id: string;
  title: string;
  startAt?: Date;
  endAt?: Date;
  discountPercent?: number;
  productCount?: number;
  clickoutsLast7d?: number;
  isExclusive?: boolean;
}

export function decideCampaignPriority(
  campaigns: CampaignInput[]
): CampaignPriority[] {
  const now = new Date();

  return campaigns
    .map((camp) => {
      let score = 0;
      const reasons: string[] = [];

      // Time urgency — ending soon (0-30)
      if (camp.endAt) {
        const hoursLeft =
          (camp.endAt.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursLeft > 0 && hoursLeft <= 24) {
          score += 30;
          reasons.push("Termina em menos de 24h");
        } else if (hoursLeft > 0 && hoursLeft <= 72) {
          score += 20;
          reasons.push("Termina em breve");
        } else if (hoursLeft > 0) {
          score += 5;
        } else {
          // Expired
          return null;
        }
      }

      // Discount level (0-25)
      const disc = camp.discountPercent ?? 0;
      if (disc >= 40) {
        score += 25;
        reasons.push(`Desconto de ${disc}%`);
      } else if (disc >= 20) {
        score += 15;
        reasons.push(`${disc}% de desconto`);
      } else if (disc > 0) {
        score += 5;
      }

      // Engagement (0-20)
      const clicks = camp.clickoutsLast7d ?? 0;
      if (clicks > 100) {
        score += 20;
        reasons.push("Alto engajamento");
      } else if (clicks > 20) {
        score += 12;
      }

      // Product breadth (0-15)
      const prods = camp.productCount ?? 0;
      if (prods > 50) {
        score += 15;
        reasons.push(`${prods} produtos na campanha`);
      } else if (prods > 10) {
        score += 8;
      }

      // Exclusivity bonus (0-10)
      if (camp.isExclusive) {
        score += 10;
        reasons.push("Campanha exclusiva");
      }

      // Decide placement
      let recommendedPlacement: CampaignPriority["recommendedPlacement"];
      if (score >= 70) recommendedPlacement = "hero";
      else if (score >= 50) recommendedPlacement = "rail";
      else if (score >= 30) recommendedPlacement = "newsletter";
      else recommendedPlacement = "sidebar";

      return {
        campaignId: camp.id,
        title: camp.title,
        score: Math.min(100, score),
        reasons,
        recommendedPlacement,
      } satisfies CampaignPriority;
    })
    .filter((c): c is CampaignPriority => c !== null)
    .sort((a, b) => b.score - a.score);
}

// ============================================
// Top category — trending pick
// ============================================

interface CategoryInput {
  id: string;
  name: string;
  slug: string;
  productCount: number;
  clickoutsLast7d?: number;
  searchesLast7d?: number;
  avgOfferScore?: number;
}

export function decideTopCategory(
  categories: CategoryInput[]
): TrendingCategoryResult | null {
  if (categories.length === 0) return null;

  const scored = categories.map((cat) => {
    let score = 0;
    const reasons: string[] = [];

    // Search trend (0-35)
    const searches = cat.searchesLast7d ?? 0;
    if (searches > 100) {
      score += 35;
      reasons.push(`${searches} buscas na ultima semana`);
    } else if (searches > 30) {
      score += 20;
      reasons.push(`${searches} buscas recentes`);
    } else if (searches > 5) {
      score += 8;
    }

    // Clickout engagement (0-30)
    const clicks = cat.clickoutsLast7d ?? 0;
    if (clicks > 50) {
      score += 30;
      reasons.push(`${clicks} clickouts recentes`);
    } else if (clicks > 15) {
      score += 18;
    } else if (clicks > 0) {
      score += 5;
    }

    // Catalog depth (0-20)
    if (cat.productCount > 20) {
      score += 20;
      reasons.push("Catalogo robusto");
    } else if (cat.productCount > 10) {
      score += 12;
    } else if (cat.productCount > 3) {
      score += 5;
    }

    // Offer quality (0-15)
    const avg = cat.avgOfferScore ?? 0;
    if (avg > 70) {
      score += 15;
      reasons.push("Ofertas de alta qualidade");
    } else if (avg > 50) {
      score += 8;
    }

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      slug: cat.slug,
      score: Math.min(100, score),
      reasons,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}
