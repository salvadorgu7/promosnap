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
  minPopularity?: number;
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
  | "suggest_article"
  | "suggest_content"
  | "suggest_expansion"
  | "suggest_import";

export interface RuleProduct {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  categorySlug: string | null;
  featured: boolean;
  popularityScore: number;
  editorialScore: number | null;
  /** Number of distinct sources/listings for this product */
  sourceCount?: number;
  /** Whether product has an associated article or guide */
  hasContent?: boolean;
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

export interface ActionSuggestion {
  type: "action";
  label: string;
  description: string;
  priority: "high" | "medium" | "low";
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
  /** Actionable suggestions for this match */
  suggestions: ActionSuggestion[];
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
  // ─── V19 Rules ──────────────────────────────────────────────────────────
  {
    id: "content-opportunity",
    name: "Oportunidade de Conteudo",
    description: "Produto popular sem guia/artigo associado — sugere criacao de conteudo",
    action: "suggest_content",
    isActive: true,
    priority: 60,
    thresholds: { minPopularity: 40, minOfferScore: 40 },
  },
  {
    id: "single-source-risk",
    name: "Risco de Fonte Unica",
    description: "Produto com apenas 1 fonte/loja — sugere expandir cobertura",
    action: "suggest_expansion",
    isActive: true,
    priority: 55,
    thresholds: { minPopularity: 30 },
  },
  {
    id: "trending-uncovered",
    name: "Tendencia sem Cobertura",
    description: "Keywords em alta sem produtos correspondentes — sugere importacao",
    action: "suggest_import",
    isActive: true,
    priority: 65,
    thresholds: {},
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
    if (offers.length === 0 && ruleId !== "trending-uncovered") return false;
    const bestOffer = offers.length > 0
      ? offers.reduce((best, o) => (o.offerScore > best.offerScore ? o : best))
      : null;

    switch (ruleId) {
      case "highlight-hot-deal": {
        if (!bestOffer) return false;
        const discount = getDiscount(bestOffer);
        return (
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 80) &&
          discount >= (thresholds.minDiscount ?? 30)
        );
      }
      case "carousel-worthy": {
        if (!bestOffer) return false;
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
        if (!bestOffer) return false;
        const discount = getDiscount(bestOffer);
        return (
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 70) &&
          discount >= (thresholds.minDiscount ?? 20)
        );
      }
      case "distribution-ready": {
        if (!bestOffer) return false;
        return (
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 60) &&
          bestOffer.offerScore >= (thresholds.minTrust ?? 70)
        );
      }
      case "needs-article": {
        if (!bestOffer) return false;
        return (
          _product.popularityScore > 50 &&
          bestOffer.offerScore >= (thresholds.minOfferScore ?? 50)
        );
      }
      case "content-opportunity": {
        // Product is popular enough but has no associated content
        return (
          _product.popularityScore >= (thresholds.minPopularity ?? 40) &&
          !_product.hasContent &&
          (bestOffer ? bestOffer.offerScore >= (thresholds.minOfferScore ?? 40) : true)
        );
      }
      case "single-source-risk": {
        // Product with only 1 source — risk of losing availability
        return (
          (_product.sourceCount ?? offers.length) <= 1 &&
          _product.popularityScore >= (thresholds.minPopularity ?? 30)
        );
      }
      case "trending-uncovered": {
        // This rule is evaluated differently — via getTrendingUncoveredResults
        // In per-product evaluation, it always returns false
        return false;
      }
      default:
        return false;
    }
  };
}

// ─── Suggestion builders per action ─────────────────────────────────────────

function buildSuggestions(
  action: AutomationAction,
  product: RuleProduct,
  _offers: RuleOffer[]
): ActionSuggestion[] {
  switch (action) {
    case "feature_product":
      return [
        { type: "action", label: "Destacar na Home", description: `Adicionar "${product.name}" como destaque na homepage`, priority: "high" },
        { type: "action", label: "Criar Banner", description: `Gerar banner automatico para "${product.name}"`, priority: "medium" },
      ];
    case "add_to_carousel":
      return [
        { type: "action", label: "Adicionar ao Carousel", description: `Incluir no carousel de ofertas quentes`, priority: "high" },
      ];
    case "mark_deal_of_day":
      return [
        { type: "action", label: "Marcar como Oferta do Dia", description: `Promover "${product.name}" como deal of the day`, priority: "high" },
        { type: "action", label: "Distribuir via Canais", description: `Publicar oferta em Telegram/WhatsApp`, priority: "medium" },
      ];
    case "suggest_distribution":
      return [
        { type: "action", label: "Distribuir", description: `Publicar em canais de distribuicao`, priority: "medium" },
      ];
    case "suggest_article":
    case "suggest_content":
      return [
        { type: "action", label: "Criar Guia de Compra", description: `Criar artigo/guia para "${product.name}"`, priority: "medium" },
        { type: "action", label: "Review Editorial", description: `Criar review editorial com comparativo`, priority: "low" },
      ];
    case "suggest_expansion":
      return [
        { type: "action", label: "Expandir Fontes", description: `Buscar "${product.name}" em mais marketplaces`, priority: "high" },
        { type: "action", label: "Importar Similar", description: `Importar produtos similares de outras lojas`, priority: "medium" },
      ];
    case "suggest_import":
      return [
        { type: "action", label: "Importar Produto", description: `Importar produtos para cobrir tendencia`, priority: "high" },
      ];
    default:
      return [];
  }
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
 * Now returns actionable suggestions per match.
 */
export function evaluateRules(
  product: RuleProduct,
  offers: RuleOffer[]
): RuleEvalResult[] {
  const rules = buildRules().filter((r) => r.isActive);
  const results: RuleEvalResult[] = [];

  for (const rule of rules) {
    if (rule.condition(product, offers)) {
      const bestOffer = offers.length > 0
        ? offers.reduce((best, o) => (o.offerScore > best.offerScore ? o : best))
        : null;
      const discount = bestOffer ? getDiscount(bestOffer) : 0;
      const reasons: string[] = [];

      if (discount > 0) reasons.push(`${discount}% de desconto`);
      if (bestOffer && bestOffer.offerScore >= 80)
        reasons.push("Score excelente");
      else if (bestOffer && bestOffer.offerScore >= 60)
        reasons.push("Bom score");
      if (bestOffer?.isFreeShipping) reasons.push("Frete gratis");

      // Rule-specific reasons
      if (rule.id === "content-opportunity") {
        reasons.push("Sem guia ou artigo associado");
      }
      if (rule.id === "single-source-risk") {
        reasons.push("Apenas 1 fonte/loja disponivel");
      }

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        reasons,
        score: bestOffer?.offerScore ?? product.popularityScore,
        suggestions: buildSuggestions(rule.action, product, offers),
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
 * Get all products that match a specific rule.
 */
export async function getRuleResults(
  ruleId: string,
  limit = 20
): Promise<RuleEvalResult[]> {
  const rule = buildRules().find((r) => r.id === ruleId);
  if (!rule) return [];

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", hidden: false },
    take: limit * 2, // fetch extra to filter
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
      _count: { select: { listings: true } },
    },
  });

  // Check for article association
  const productIds = products.map((p) => p.id);
  let productsWithArticles = new Set<string>();
  try {
    const articleLinks: { productId: string }[] = await prisma.$queryRaw`
      SELECT DISTINCT "productId" FROM article_products WHERE "productId" = ANY(${productIds}::text[])
    `;
    productsWithArticles = new Set(articleLinks.map((a) => a.productId));
  } catch {
    // article_products table may not exist
  }

  const results: RuleEvalResult[] = [];

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
      sourceCount: product._count.listings,
      hasContent: productsWithArticles.has(product.id),
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

    // Force-evaluate just this one rule
    if (rule.condition(ruleProduct, ruleOffers)) {
      const bestOffer = ruleOffers.length > 0
        ? ruleOffers.reduce((best, o) => (o.offerScore > best.offerScore ? o : best))
        : null;
      const discount = bestOffer ? getDiscount(bestOffer) : 0;
      const reasons: string[] = [];
      if (discount > 0) reasons.push(`${discount}% de desconto`);
      if (bestOffer && bestOffer.offerScore >= 80) reasons.push("Score excelente");
      if (bestOffer?.isFreeShipping) reasons.push("Frete gratis");
      if (ruleId === "content-opportunity") reasons.push("Sem conteudo editorial");
      if (ruleId === "single-source-risk") reasons.push("Fonte unica");

      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        action: rule.action,
        productId: product.id,
        productName: product.name,
        productSlug: product.slug,
        reasons,
        score: bestOffer?.offerScore ?? product.popularityScore,
        suggestions: buildSuggestions(rule.action, ruleProduct, ruleOffers),
      });
    }

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Simulate rules against all active products.
 * Enhanced: now includes sourceCount and hasContent for V19 rules.
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
      _count: { select: { listings: true } },
    },
  });

  // Check article associations
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
      sourceCount: product._count.listings,
      hasContent: productsWithArticles.has(product.id),
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
        case "suggest_content":
        case "suggest_expansion":
        case "suggest_import":
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
