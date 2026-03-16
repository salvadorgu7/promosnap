/**
 * Smart Internal Linking — connects related pages for SEO juice flow.
 */
import { BEST_PAGES } from "./best-pages";
import { OFFER_PAGES } from "./offer-pages";
import { COMPARISON_LIST } from "./comparisons";
import { VALE_A_PENA_PAGES } from "./vale-a-pena";

export interface InternalLink {
  href: string;
  label: string;
  type: "best" | "offer" | "comparison" | "vale-a-pena" | "category" | "brand" | "search";
}

/**
 * Get related internal links for a product based on its category, brand, and name.
 */
export function getRelatedLinks(opts: {
  categorySlug?: string;
  brandSlug?: string;
  productName?: string;
  limit?: number;
}): InternalLink[] {
  const links: InternalLink[] = [];
  const { categorySlug, brandSlug, productName, limit = 8 } = opts;
  const nameLower = (productName || "").toLowerCase();

  // Match best pages by category or keywords
  for (const [slug, page] of Object.entries(BEST_PAGES)) {
    if (links.length >= limit) break;
    const matchesCategory = page.query?.categories?.includes(categorySlug || "");
    const matchesBrand = page.query?.brands?.includes(brandSlug || "");
    const matchesKeyword = page.query?.keywords?.some((k: string) => nameLower.includes(k.toLowerCase()));

    if (matchesCategory || matchesBrand || matchesKeyword) {
      links.push({
        href: `/melhores/${slug}`,
        label: page.title,
        type: "best",
      });
    }
  }

  // Match offer pages by keyword
  for (const [slug, page] of Object.entries(OFFER_PAGES)) {
    if (links.length >= limit) break;
    if (nameLower.includes(page.searchQuery.toLowerCase()) ||
        page.searchQuery.toLowerCase().split(" ").some((w: string) => nameLower.includes(w) && w.length > 3)) {
      links.push({
        href: `/ofertas/${slug}`,
        label: `Ofertas: ${page.title}`,
        type: "offer",
      });
    }
  }

  // Match comparisons where this product might be involved
  for (const comp of COMPARISON_LIST) {
    if (links.length >= limit) break;
    const aLower = comp.productA.name.toLowerCase();
    const bLower = comp.productB.name.toLowerCase();
    if (nameLower.includes(aLower) || nameLower.includes(bLower) ||
        aLower.split(" ").some((w: string) => nameLower.includes(w) && w.length > 3) ||
        bLower.split(" ").some((w: string) => nameLower.includes(w) && w.length > 3)) {
      links.push({
        href: `/comparar/${comp.slug}`,
        label: comp.title,
        type: "comparison",
      });
    }
  }

  // Match vale-a-pena pages
  for (const [slug, page] of Object.entries(VALE_A_PENA_PAGES)) {
    if (links.length >= limit) break;
    const queryLower = page.productQuery.toLowerCase();
    if (nameLower.includes(queryLower) || queryLower.split(" ").some((w: string) => nameLower.includes(w) && w.length > 3)) {
      links.push({
        href: `/vale-a-pena/${slug}`,
        label: page.title,
        type: "vale-a-pena",
      });
    }
  }

  // Ensure at least one "melhores" link for the product's category (fallback)
  if (categorySlug && !links.some((l) => l.type === "best")) {
    for (const [slug, page] of Object.entries(BEST_PAGES)) {
      if (links.length >= limit) break;
      if (page.query?.categories?.includes(categorySlug)) {
        links.push({
          href: `/melhores/${slug}`,
          label: page.title,
          type: "best",
        });
      }
    }
    // If still no curated "melhores" page, add a generic search-based link
    if (!links.some((l) => l.type === "best") && links.length < limit) {
      const catLabel = categorySlug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      links.push({
        href: `/busca?q=melhores+${encodeURIComponent(catLabel)}`,
        label: `Melhores ${catLabel}`,
        type: "search",
      });
    }
  }

  // Ensure at least one comparison link for the product's category (fallback)
  if (categorySlug && !links.some((l) => l.type === "comparison") && links.length < limit) {
    const catName = categorySlug.replace(/-/g, " ");
    for (const comp of COMPARISON_LIST) {
      if (links.length >= limit) break;
      const compText = `${comp.productA.name} ${comp.productB.name}`.toLowerCase();
      if (compText.includes(catName)) {
        links.push({
          href: `/comparar/${comp.slug}`,
          label: comp.title,
          type: "comparison",
        });
      }
    }
  }

  // Always add category if available
  if (categorySlug && links.length < limit) {
    links.push({
      href: `/categoria/${categorySlug}`,
      label: `Ver todos em ${categorySlug}`,
      type: "category",
    });
  }

  // Always add brand if available
  if (brandSlug && links.length < limit) {
    links.push({
      href: `/marca/${brandSlug}`,
      label: `Mais de ${brandSlug}`,
      type: "brand",
    });
  }

  return links.slice(0, limit);
}

/**
 * Get cross-content links for category pages.
 */
export function getCategoryRelatedContent(categorySlug: string): InternalLink[] {
  const links: InternalLink[] = [];

  for (const [slug, page] of Object.entries(BEST_PAGES)) {
    if (page.query?.categories?.includes(categorySlug)) {
      links.push({
        href: `/melhores/${slug}`,
        label: page.title,
        type: "best",
      });
    }
  }

  for (const comp of COMPARISON_LIST) {
    if (links.length >= 6) break;
    // Comparisons don't have category directly, so match by common category keywords
    const compText = `${comp.productA.name} ${comp.productB.name}`.toLowerCase();
    if (compText.includes(categorySlug.replace(/-/g, " "))) {
      links.push({
        href: `/comparar/${comp.slug}`,
        label: comp.title,
        type: "comparison",
      });
    }
  }

  return links.slice(0, 8);
}
