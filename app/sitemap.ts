/**
 * app/sitemap.ts
 *
 * Sitemap Index — divide o sitemap em 5 grupos focados.
 * Next.js gera automaticamente /sitemap.xml como index apontando para:
 *   /sitemap/0.xml  →  páginas estáticas/institucionais
 *   /sitemap/1.xml  →  produtos (maior prioridade de crawl)
 *   /sitemap/2.xml  →  categorias + marcas
 *   /sitemap/3.xml  →  editorial (artigos, guias, guia-compra)
 *   /sitemap/4.xml  →  programático (melhores, comparar, vale-a-pena, faixa-preco, ofertas-keyword)
 *
 * Benefícios vs. sitemap único:
 * - Google pode re-crawl cada grupo em frequências diferentes
 * - Facilita debugging e monitoramento no Search Console
 * - Separa o que é importante do que é secundário
 * - Exclui páginas fracas/thin de concorrer com páginas fortes
 */

import { MetadataRoute } from "next";
import prisma from "@/lib/db/prisma";
import { BEST_PAGE_SLUGS } from "@/lib/seo/best-pages";
import { OFFER_PAGE_SLUGS } from "@/lib/seo/offer-pages";
import { COMPARISON_SLUGS } from "@/lib/seo/comparisons";
import { VALE_A_PENA_SLUGS } from "@/lib/seo/vale-a-pena";
import { PRICE_RANGE_SLUGS } from "@/lib/seo/price-range-pages";
import { BUYING_GUIDE_SLUGS } from "@/lib/seo/buying-guides";
import { getBaseUrl } from "@/lib/seo/url";

const APP_URL = getBaseUrl();

// ─── Sitemap IDs ─────────────────────────────────────────────────────────────
// 0 = static/institutional
// 1 = products
// 2 = categories + brands
// 3 = editorial
// 4 = programmatic

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
}

// ISR: regenerate sitemaps hourly (force-dynamic caused empty sitemaps on Vercel cold starts)
export const revalidate = 3600;

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  switch (id) {
    // ─── 0: STATIC / INSTITUTIONAL ──────────────────────────────────────────
    case 0:
      return [
        { url: APP_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
        { url: `${APP_URL}/ofertas`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
        { url: `${APP_URL}/menor-preco`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
        { url: `${APP_URL}/mais-vendidos`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
        { url: `${APP_URL}/cupons`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
        { url: `${APP_URL}/preco-hoje`, lastModified: now, changeFrequency: "daily", priority: 0.80 },
        { url: `${APP_URL}/categorias`, lastModified: now, changeFrequency: "weekly", priority: 0.75 },
        { url: `${APP_URL}/marcas`, lastModified: now, changeFrequency: "weekly", priority: 0.65 },
        { url: `${APP_URL}/busca`, lastModified: now, changeFrequency: "daily", priority: 0.70 },
        { url: `${APP_URL}/guias`, lastModified: now, changeFrequency: "weekly", priority: 0.65 },
        { url: `${APP_URL}/lojas`, lastModified: now, changeFrequency: "weekly", priority: 0.50 },
        { url: `${APP_URL}/sobre`, lastModified: now, changeFrequency: "monthly", priority: 0.30 },
        { url: `${APP_URL}/politica-privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.20 },
        { url: `${APP_URL}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.20 },
        { url: `${APP_URL}/transparencia`, lastModified: now, changeFrequency: "yearly", priority: 0.25 },
        // NOTE: /trending, /canais, /indicar, /radar, /favoritos, /minha-conta → noindex, excluídos do sitemap
      ];

    // ─── 1: PRODUCTS ────────────────────────────────────────────────────────
    case 1: {
      let productPages: MetadataRoute.Sitemap = [];
      try {
        const products = await prisma.product.findMany({
          where: { status: "ACTIVE", imageUrl: { not: null } },
          select: { slug: true, updatedAt: true, originType: true, popularityScore: true },
          orderBy: { popularityScore: "desc" },
        });
        productPages = products.flatMap((p) => {
          // Products with higher popularity get higher priority
          const priority = p.popularityScore && p.popularityScore > 50 ? 0.9 : 0.8;
          return [
            {
              url: `${APP_URL}/produto/${p.slug}`,
              lastModified: p.updatedAt,
              changeFrequency: "daily" as const,
              priority,
            },
            {
              // /preco/[slug] — price history page — lower priority than product page
              url: `${APP_URL}/preco/${p.slug}`,
              lastModified: p.updatedAt,
              changeFrequency: "daily" as const,
              priority: 0.60,
            },
          ];
        });
      } catch (err) {
        console.error("[sitemap/1] Failed to fetch products:", err)
      }
      return productPages;
    }

    // ─── 2: CATEGORIES + BRANDS ─────────────────────────────────────────────
    case 2: {
      let pages: MetadataRoute.Sitemap = [];
      try {
        const [categories, brands] = await Promise.all([
          prisma.category.findMany({
            where: { products: { some: { status: "ACTIVE" } } },
            select: { slug: true, updatedAt: true, _count: { select: { products: { where: { status: "ACTIVE" } } } } },
          }),
          prisma.brand.findMany({
            where: { products: { some: { status: "ACTIVE" } } },
            select: { slug: true, updatedAt: true, _count: { select: { products: { where: { status: "ACTIVE" } } } } },
          }),
        ]);

        const categoryPages = categories.map((c) => ({
          url: `${APP_URL}/categoria/${c.slug}`,
          lastModified: c.updatedAt,
          changeFrequency: "daily" as const,
          // More products = higher priority (cap at 0.85)
          priority: Math.min(0.85, 0.60 + (c._count.products / 100) * 0.25) as number,
        }));

        const brandPages = brands.map((b) => ({
          url: `${APP_URL}/marca/${b.slug}`,
          lastModified: b.updatedAt,
          changeFrequency: "weekly" as const,
          priority: Math.min(0.75, 0.50 + (b._count.products / 100) * 0.25) as number,
        }));

        pages = [...categoryPages, ...brandPages];
      } catch (err) {
        console.error("[sitemap/2] Failed to fetch categories/brands:", err)
      }
      return pages;
    }

    // ─── 3: EDITORIAL ───────────────────────────────────────────────────────
    case 3: {
      let pages: MetadataRoute.Sitemap = [];
      try {
        const articles = await prisma.article.findMany({
          where: { status: "PUBLISHED" },
          select: { slug: true, updatedAt: true },
        });
        const articlePages = articles.map((a) => ({
          url: `${APP_URL}/guias/${a.slug}`,
          lastModified: a.updatedAt,
          changeFrequency: "weekly" as const,
          priority: 0.70,
        }));
        const buyingGuidePages = BUYING_GUIDE_SLUGS.map((slug) => ({
          url: `${APP_URL}/guia-compra/${slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.70,
        }));
        pages = [...articlePages, ...buyingGuidePages];
      } catch (err) {
        console.error("[sitemap/3] Failed to fetch articles:", err)
        // Fallback: at least include static buying guide pages
        return BUYING_GUIDE_SLUGS.map((slug) => ({
          url: `${APP_URL}/guia-compra/${slug}`,
          lastModified: now,
          changeFrequency: "weekly" as const,
          priority: 0.70,
        }));
      }
      return pages;
    }

    // ─── 4: PROGRAMMATIC SEO PAGES ──────────────────────────────────────────
    case 4: {
      const melhoresPages = BEST_PAGE_SLUGS.map((slug) => ({
        url: `${APP_URL}/melhores/${slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.80, // High — commercial intent "melhores X 2026"
      }));
      const compararPages = COMPARISON_SLUGS.map((slug) => ({
        url: `${APP_URL}/comparar/${slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.75, // High — commercial intent "A vs B"
      }));
      const valeAPenaPages = VALE_A_PENA_SLUGS.map((slug) => ({
        url: `${APP_URL}/vale-a-pena/${slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.70,
      }));
      const faixaPrecoPages = PRICE_RANGE_SLUGS.map((slug) => ({
        url: `${APP_URL}/faixa-preco/${slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.65,
      }));
      const ofertasKeywordPages = OFFER_PAGE_SLUGS.map((slug) => ({
        url: `${APP_URL}/ofertas/${slug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.75,
      }));

      return [
        ...melhoresPages,
        ...compararPages,
        ...valeAPenaPages,
        ...faixaPrecoPages,
        ...ofertasKeywordPages,
      ];
    }

    default:
      return [];
  }
}
