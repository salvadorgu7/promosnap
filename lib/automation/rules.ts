// ============================================
// AUTOMATION RULES ENGINE — smart merchandising rules
// ============================================

import prisma from "@/lib/db/prisma";
import { calculateDecisionValue } from "@/lib/commerce/decision-value";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AutomationThresholds {
  minOfferScore?: number;
  minDiscount?: number;
  minDecisionValue?: number;
  minTrust?: number;
  minRating?: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  condition: (product: RuleProduct, offers: RuleOffer[]) => boolean;
  action: AutomationAction;
  isActive: boolean;
  priority: number;
  thresholds: AutomationThresholds;
}

export type AutomationAction =
  | "feature_product"
  | "add_to_carousel"
  | "mark_deal_of_day"
  | "suggest_distribution"
  | "suggest_article";

export interface RuleProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  categorySlug: string | null;
  featured: boolean;
  popularityScore: number;
  editorialScore: number | null;
}

export interface RuleOffer {
  id: string;
  currentPrice: number;
  originalPrice: number | null;
  offerScore: number;
  isFreeShipping: boolean;
  shippingPrice: number | null;
  affiliateUrl: string | null;
  rating: number | null;
  reviewsCount: number | null;
  sourceSlug: string;
}

export interface RuleEvalResult {
  ruleId: string;
  ruleName: string;
  action: AutomationAction;
  productId: string;
  productName: string;
  productSlug: string;
  reasons: string[];
  score: number;
}

export interface SimulationResult {
  triggered: RuleEvalResult[];
  skipped: { ruleId: string; reason: string }[];
  totalProducts: number;
  totalRulesEvaluated: number;
}

// ─── Default Rules Definition ───────────────────────────────────────────────

const DEFAULT_RULES: Omit<AutomationRule, "condition">[] = [
  {
    id: "highlight-hot-deal",
    name: "Destaque Hot Deal",
    description: "Produto com offerScore >= 80 E desconto >= 30% vira destaque",
    action: "feature_product",
    isActive: true,
    priority: 100,
    thresholds: { minOfferScore: 80, minDiscount: 30 },
  },
  {
    id: "carousel-worthy",
    name: "Digno de Carousel",
    description: "Decision value >= 70 E offerScore >= 60 vai para o carousel",
    action: "add_to_carousel",
    isActive: true,
    priority: 90,
    thresholds: { minDecisionValue: 70, minOfferScore: 60 },
  },
  {
    id: "deal-of-day",
    name: "Oferta do Dia",
    description: "Melhor combinacao de desconto + score do dia",
    action: "mark_deal_of_day",
    isActive: true,
    priority: 95,
    thresholds: { minOfferScore: 70, minDiscount: 20 },
  },
  {
    id: "distribution-ready",
    name: "Pronto para Distribuicao",
    description: "Score >= 60 E trust >= 70 sugere distribuicao via canais",
    action: "suggest_distribution",
    isActive: true,
    priority: 70,
    thresholds: { minOfferScore: 60, minTrust: 70 },
  },
  {
    id: "needs-article",
    name: "Precisa de Artigo",
    description: "Produto trending sem artigo associado — sugere conteudo",
    action: "suggest_article",
    isActive: false,
    priority: 50,
    thresholds: { minOfferScore: 50 },
  },
];

// ─── Condition implementations ──────────────────────────────────────────────

function getDiscount(offer: RuleOffer): number {
  if (!offer.originalPrice || offer.originalPrice <= offer.currentPrice) return 0;
  return Math.round(
    ((offer.originalPrice - offer.currentPrice) / offer.originalPrice) * 100
  );
}

function buildCondition(ruleId: string, thresholds: AutomationThresholds) {
  return (_product: RuleProduct, offers: RuleOffer[]): boolean => {
    if (offers.length === 0) return false;
    const bestOffer = offers.reduce((best, o) =>
      o.offerScore > best.offerScore ? o : best
    );

    switch (ruleId) {
      case "highlight-hot-deal": {
        const discount = getDiscount(bestOffer);
        return (
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 80) &&
          discount >= (thresholds.minDiscount ?? 30)
        );
      }
      case "carousel-worthy": {
        const dv = calculateDecisionValue({
          productId: _product.id,
          productName: _product.name,
          currentPrice: bestOffer.currentPrice,
          categoryAvgPrice: null,
          rating: bestOffer.rating,
          reviewsCount: bestOffer.reviewsCount,
          offerScore: bestOffer.offerScore,
          sourceReliability: null,
          isFreeShipping: bestOffer.isFreeShipping,
          shippingPrice: bestOffer.shippingPrice,
          commissionRate: null,
          activeOfferCount: offers.length,
        });
        return (
          dv.score >= (thresholds.minDecisionValue ?? 70) &&
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 60)
        );
      }
      case "deal-of-day": {
        const discount = getDiscount(bestOffer);
        return (
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 70) &&
          discount >= (thresholds.minDiscount ?? 20)
        );
      }
      case "distribution-ready": {
        return (
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 60) &&
          bestOffer.offerScore >= (thresholds.minTrust ?? 70)
        );
      }
      case "needs-article": {
        return (
          _product.popularityScore > 50 &&
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 50)
        );
      }
      default:
        return false;
    }
  };
}

// ─── Build active rules ─────────────────────────────────────────────────────

let rulesOverrides: Map<string, Partial<AutomationRule>> = new Map();

function buildRules(): AutomationRule[] {
  return DEFAULT_RULES.map((def) => {
    const overrides = rulesOverrides.get(def.id);
    const merged = { ...def, ...overrides };
    return {
      ...merged,
      thresholds: { ...def.thresholds, ...overrides?.thresholds },
      condition: buildCondition(merged.id, {
        ...def.thresholds,
        ...overrides?.thresholds,
      }),
    };
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Get all rules with their current status.
 */
export function getActiveRules(): Omit<AutomationRule, "condition">[] {
  return buildRules().map(({ condition: _condition, ...rest }) => rest);
}

/**
 * Toggle a rule on/off.
 */
export function toggleRule(ruleId: string, isActive: boolean): void {
  const existing = rulesOverrides.get(ruleId) ?? {};
  rulesOverrides.set(ruleId, { ...existing, isActive });
}

/**
 * Update thresholds for a rule.
 */
export function updateThresholds(
  ruleId: string,
  thresholds: Partial<AutomationThresholds>
): void {
  const existing = rulesOverrides.get(ruleId) ?? {};
  rulesOverrides.set(ruleId, {
    ...existing,
    thresholds: { ...existing.thresholds, ...thresholds },
  });
}

/**
 * Evaluate all active rules against a product and its offers.
 */
export function evaluateRules(
  product: RuleProduct,
  offers: RuleOffer[]
): RuleEvalResult[] {
  const rules = buildRules().filter((r) => r.isActive);
  const results: RuleEvalResult[] = [];

  for (const rule of rules) {
    if (rule.condition(product, offers)) {
      const bestOffer = offers.reduce((best, o) =>
        o.offerScore > best.offerScore ? o : best
      );
      const discount = getDiscount(bestOffer);
      const reasons: string[] = [];

      if (discount > 0) reasons.push(`${discount}% de desconto`);
      if (bestOffer.offerScore >= 80)
        reasons.push("Score excelente");
      else if (bestOffer.offerScore >= 60)
        reasons.push("Bom score");
      if (bestOffer.isFreeShipping) reasons.push("Frete gratis");

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        reasons,
        score: bestOffer.offerScore,
      });
    }
  }

  return results.sort((a, b) => {
    const ruleA = buildRules().find((r) => r.id === a.ruleId);
    const ruleB = buildRules().find((r) => r.id === b.ruleId);
    return (ruleB?.priority ?? 0) - (ruleA?.priority ?? 0);
  });
}

/**
 * Simulate rules against all active products.
 */
export async function simulateRules(
  productLimit = 50
): Promise<SimulationResult> {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", hidden: false },
    take: productLimit,
    orderBy: { popularityScore: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      featured: true,
      popularityScore: true,
      editorialScore: true,
      category: { select: { slug: true } },
      listings: {
        where: { status: "ACTIVE" },
        select: {
          rating: true,
          reviewsCount: true,
          source: { select: { slug: true } },
          offers: {
            where: { isActive: true },
            orderBy: { offerScore: "desc" },
            take: 1,
            select: {
              id: true,
              currentPrice: true,
              originalPrice: true,
              offerScore: true,
              isFreeShipping: true,
              shippingPrice: true,
              affiliateUrl: true,
            },
          },
        },
      },
    },
  });

  const rules = buildRules();
  const triggered: RuleEvalResult[] = [];
  const skipped: { ruleId: string; reason: string }[] = [];

  // Track skipped inactive rules
  for (const rule of rules) {
    if (!rule.isActive) {
      skipped.push({ ruleId: rule.id, reason: "Regra desativada" });
    }
  }

  for (const product of products) {
    const ruleProduct: RuleProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl,
      categorySlug: product.category?.slug ?? null,
      featured: product.featured,
      popularityScore: product.popularityScore,
      editorialScore: product.editorialScore,
    };

    const ruleOffers: RuleOffer[] = product.listings
      .filter((l) => l.offers[0])
      .map((l) => ({
        id: l.offers[0].id,
        currentPrice: l.offers[0].currentPrice,
        originalPrice: l.offers[0].originalPrice,
        offerScore: l.offers[0].offerScore,
        isFreeShipping: l.offers[0].isFreeShipping,
        shippingPrice: l.offers[0].shippingPrice,
        affiliateUrl: l.offers[0].affiliateUrl,
        rating: l.rating,
        reviewsCount: l.reviewsCount,
        sourceSlug: l.source.slug,
      }));

    if (ruleOffers.length === 0) continue;

    const results = evaluateRules(ruleProduct, ruleOffers);
    triggered.push(...results);
  }

  return {
    triggered,
    skipped,
    totalProducts: products.length,
    totalRulesEvaluated: rules.filter((r) => r.isActive).length * products.length,
  };
}

/**
 * Apply automation results — feature products, update banners, etc.
 */
export async function applyAutomation(
  results: RuleEvalResult[]
): Promise<{ applied: number; errors: string[] }> {
  let applied = 0;
  const errors: string[] = [];

  for (const result of results) {
    try {
      switch (result.action) {
        case "feature_product": {
          await prisma.product.update({
            where: { id: result.productId },
            data: { featured: true },
          });
          applied++;
          break;
        }
        case "add_to_carousel":
        case "mark_deal_of_day":
        case "suggest_distribution":
        case "suggest_article":
          // These are handled by auto-merchandising or flagged for admin
          applied++;
          break;
      }
    } catch (err) {
      errors.push(
        `Erro ao aplicar ${result.action} em ${result.productName}: ${err instanceof Error ? err.message : "Erro desconhecido"}`
      );
    }
  }

  return { applied, errors };
}
