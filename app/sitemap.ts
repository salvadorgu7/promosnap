import { MetadataRoute } from "next";
import prisma from "@/lib/db/prisma";
import { BEST_PAGE_SLUGS } from "@/lib/seo/best-pages";
import { OFFER_PAGE_SLUGS } from "@/lib/seo/offer-pages";
import { COMPARISON_SLUGS } from "@/lib/seo/comparisons";
import { VALE_A_PENA_SLUGS } from "@/lib/seo/vale-a-pena";
import { PRICE_RANGE_SLUGS } from "@/lib/seo/price-range-pages";
import { BUYING_GUIDE_SLUGS } from "@/lib/seo/buying-guides";

export const dynamic = "force-dynamic";

import { getBaseUrl } from "@/lib/seo/url";

const APP_URL = getBaseUrl();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${APP_URL}/busca`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/ofertas`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${APP_URL}/menor-preco`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/mais-vendidos`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/cupons`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/sobre`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${APP_URL}/guias`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${APP_URL}/categorias`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${APP_URL}/marcas`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${APP_URL}/indicar`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
    { url: `${APP_URL}/politica-privacidade`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/termos`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${APP_URL}/transparencia`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${APP_URL}/lojas`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${APP_URL}/trending`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${APP_URL}/preco-hoje`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
  ];

  // Dynamic pages from DB (graceful fallback if DB unavailable)
  let categoryPages: MetadataRoute.Sitemap = [];
  let brandPages: MetadataRoute.Sitemap = [];
  let productPages: MetadataRoute.Sitemap = [];
  let articlePages: MetadataRoute.Sitemap = [];

  try {
    const [categories, brands, products, articles] = await Promise.all([
      prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.brand.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true, originType: true } }),
      prisma.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    ]);

    categoryPages = categories.map((c) => ({
      url: `${APP_URL}/categoria/${c.slug}`,
      lastModified: c.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));

    brandPages = brands.map((b) => ({
      url: `${APP_URL}/marca/${b.slug}`,
      lastModified: b.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

    productPages = products.flatMap((p) => [
      {
        url: `${APP_URL}/produto/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "daily" as const,
        priority: p.originType === "imported" ? 0.9 : 0.8,
      },
      {
        url: `${APP_URL}/preco/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: "daily" as const,
        priority: 0.6,
      },
    ]);

    articlePages = articles.map((a) => ({
      url: `${APP_URL}/guias/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));
  } catch {
    // DB unavailable at build time — return static pages only
  }

  // "Melhores" curated pages
  const melhoresPages: MetadataRoute.Sitemap = BEST_PAGE_SLUGS.map((slug) => ({
    url: `${APP_URL}/melhores/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // "Ofertas" keyword pages
  const ofertasPages: MetadataRoute.Sitemap = OFFER_PAGE_SLUGS.map((slug) => ({
    url: `${APP_URL}/ofertas/${slug}`,
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: 0.7,
  }));

  // "Comparar" pages
  const compararPages: MetadataRoute.Sitemap = COMPARISON_SLUGS.map((slug) => ({
    url: `${APP_URL}/comparar/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // "Vale a Pena" pages
  const valeAPenaPages: MetadataRoute.Sitemap = VALE_A_PENA_SLUGS.map((slug) => ({
    url: `${APP_URL}/vale-a-pena/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // "Faixa de Preco" pages
  const faixaPrecoPages: MetadataRoute.Sitemap = PRICE_RANGE_SLUGS.map((slug) => ({
    url: `${APP_URL}/faixa-preco/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // "Guia de Compra" pages
  const guiaCompraPages: MetadataRoute.Sitemap = BUYING_GUIDE_SLUGS.map((slug) => ({
    url: `${APP_URL}/guia-compra/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...brandPages,
    ...productPages,
    ...melhoresPages,
    ...ofertasPages,
    ...compararPages,
    ...articlePages,
    ...valeAPenaPages,
    ...faixaPrecoPages,
    ...guiaCompraPages,
  ];
}
