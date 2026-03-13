// ============================================
// AUTOMATION BRIDGE — canonical products to actionable suggestions
// ============================================

import prisma from "@/lib/db/prisma";
import { simulateRules } from "./rules";
import { autoSuggestContent, autoSuggestImports } from "./auto-merchandising";
import type { ActionSuggestion } from "./rules";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CanonicalAction {
  type: "feature" | "distribute" | "banner" | "guide";
  label: string;
  description: string;
  priority: "high" | "medium" | "low";
}

export interface CanonicalActionResult {
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
  canonicalScore: number;
  actions: CanonicalAction[];
}

export type AutomationSuggestionType =
  | "feature"
  | "distribute"
  | "content"
  | "import"
  | "expand"
  | "banner"
  | "carousel";

export interface AutomationSuggestion {
  id: string;
  type: AutomationSuggestionType;
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  productId?: string;
  productName?: string;
  productSlug?: string;
  keyword?: string;
  action: string;
  source: string; // which engine generated this suggestion
}

// ─── Priority scoring ───────────────────────────────────────────────────────

const PRIORITY_SCORE: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function sortByPriority<T extends { priority: "high" | "medium" | "low" }>(
  items: T[]
): T[] {
  return items.sort(
    (a, b) => (PRIORITY_SCORE[b.priority] ?? 0) - (PRIORITY_SCORE[a.priority] ?? 0)
  );
}

// ─── Canonical to Actions ───────────────────────────────────────────────────

/**
 * When a strong canonical product is found, suggest a set of actions:
 * - Feature on homepage
 * - Distribute to channels
 * - Create banner
 * - Associate with guide
 */
export async function bridgeCanonicalToActions(
  productId: string
): Promise<CanonicalActionResult | null> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        popularityScore: true,
        editorialScore: true,
        featured: true,
        category: { select: { slug: true, name: true } },
        listings: {
          where: { status: "ACTIVE" },
          select: {
            source: { select: { slug: true, name: true } },
            offers: {
              where: { isActive: true },
              orderBy: { offerScore: "desc" },
              take: 1,
              select: {
                offerScore: true,
                currentPrice: true,
                originalPrice: true,
                isFreeShipping: true,
              },
            },
          },
        },
        _count: { select: { listings: true } },
      },
    });

    if (!product) return null;

    const bestOffer = product.listings
      .flatMap((l) => l.offers)
      .sort((a, b) => b.offerScore - a.offerScore)[0];

    const canonicalScore = bestOffer
      ? bestOffer.offerScore * 0.5 + product.popularityScore * 0.3 + (product._count.listings > 1 ? 20 : 0)
      : product.popularityScore;

    const actions: CanonicalAction[] = [];

    // Feature on homepage if strong enough
    if (canonicalScore >= 60 && !product.featured) {
      actions.push({
        type: "feature",
        label: "Destacar na Homepage",
        description: `Adicionar "${product.name}" como produto destaque na home`,
        priority: canonicalScore >= 80 ? "high" : "medium",
      });
    }

    // Distribute to channels if good offer exists
    if (bestOffer && bestOffer.offerScore >= 60) {
      const discount =
        bestOffer.originalPrice && bestOffer.originalPrice > bestOffer.currentPrice
          ? Math.round(((bestOffer.originalPrice - bestOffer.currentPrice) / bestOffer.originalPrice) * 100)
          : 0;
      actions.push({
        type: "distribute",
        label: "Distribuir em Canais",
        description: `Publicar oferta${discount > 0 ? ` (${discount}% OFF)` : ""} em Telegram e WhatsApp`,
        priority: bestOffer.offerScore >= 80 ? "high" : "medium",
      });
    }

    // Create banner if has image and high score
    if (product.imageUrl && canonicalScore >= 50) {
      actions.push({
        type: "banner",
        label: "Criar Banner",
        description: `Gerar banner promocional automatico`,
        priority: canonicalScore >= 70 ? "medium" : "low",
      });
    }

    // Associate with guide if popular but lacks content
    let hasArticle = false;
    try {
      const articleCount: { cnt: number }[] = await prisma.$queryRaw`
        SELECT COUNT(*)::int AS cnt FROM article_products WHERE "productId" = ${productId}
      `;
      hasArticle = (articleCount[0]?.cnt ?? 0) > 0;
    } catch {
      // table may not exist
    }

    if (!hasArticle && product.popularityScore >= 40) {
      actions.push({
        type: "guide",
        label: "Criar Guia de Compra",
        description: `Criar artigo/guia editorial para "${product.name}"`,
        priority: product.popularityScore >= 60 ? "high" : "medium",
      });
    }

    return {
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      imageUrl: product.imageUrl,
      canonicalScore,
      actions: sortByPriority(actions),
    };
  } catch {
    return null;
  }
}

// ─── Aggregated Automation Suggestions ──────────────────────────────────────

/**
 * Aggregate all automation suggestions for the admin dashboard.
 * Pulls from: rules engine, content suggestions, import suggestions.
 */
export async function getAutomationSuggestions(
  limit = 30
): Promise<AutomationSuggestion[]> {
  const suggestions: AutomationSuggestion[] = [];
  let idCounter = 0;

  try {
    // 1. Rules engine — simulate and gather triggered
    const simulation = await simulateRules(30);
    for (const result of simulation.triggered) {
      const actionLabel = getActionLabel(result.action);
      suggestions.push({
        id: `rule-${++idCounter}`,
        type: mapActionToType(result.action),
        priority: result.score >= 80 ? "high" : result.score >= 60 ? "medium" : "low",
        title: `${actionLabel}: ${result.productName}`,
        description: result.reasons.join(" | "),
        productId: result.productId,
        productName: result.productName,
        productSlug: result.productSlug,
        action: actionLabel,
        source: `Regra: ${result.ruleName}`,
      });
    }

    // 2. Content suggestions
    const contentSuggestions = await autoSuggestContent(10);
    for (const cs of contentSuggestions) {
      suggestions.push({
        id: `content-${++idCounter}`,
        type: "content",
        priority: cs.priority,
        title: `Criar ${getSuggestedTypeLabel(cs.suggestedType)}: ${cs.productName}`,
        description: cs.reason,
        productId: cs.productId,
        productName: cs.productName,
        productSlug: cs.productSlug,
        action: `Criar ${getSuggestedTypeLabel(cs.suggestedType)}`,
        source: "Auto-Conteudo",
      });
    }

    // 3. Import suggestions
    const importSuggestions = await autoSuggestImports(10);
    for (const is of importSuggestions) {
      suggestions.push({
        id: `import-${++idCounter}`,
        type: is.suggestedAction === "import" ? "import" : "expand",
        priority: is.priority,
        title: `${is.suggestedAction === "import" ? "Importar" : "Expandir"}: "${is.keyword}"`,
        description: is.reason,
        keyword: is.keyword,
        action: is.suggestedAction === "import" ? "Importar Produto" : "Expandir Cobertura",
        source: "Trend-Catalog Bridge",
      });
    }
  } catch {
    // Fail gracefully
  }

  // Sort by priority and return top N
  return sortByPriority(suggestions).slice(0, limit);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    feature_product: "Destacar",
    add_to_carousel: "Carousel",
    mark_deal_of_day: "Oferta do Dia",
    suggest_distribution: "Distribuir",
    suggest_article: "Criar Artigo",
    suggest_content: "Criar Conteudo",
    suggest_expansion: "Expandir Fontes",
    suggest_import: "Importar",
  };
  return labels[action] ?? action;
}

function mapActionToType(action: string): AutomationSuggestionType {
  const mapping: Record<string, AutomationSuggestionType> = {
    feature_product: "feature",
    add_to_carousel: "carousel",
    mark_deal_of_day: "feature",
    suggest_distribution: "distribute",
    suggest_article: "content",
    suggest_content: "content",
    suggest_expansion: "expand",
    suggest_import: "import",
  };
  return mapping[action] ?? "feature";
}

function getSuggestedTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    guide: "Guia de Compra",
    review: "Review Editorial",
    comparison: "Comparativo",
    tips: "Dicas e Truques",
  };
  return labels[type] ?? "Conteudo";
}
