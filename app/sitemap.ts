import { MetadataRoute } from "next";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const APP_URL = process.env.APP_URL || "https://promosnap.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${APP_URL}/ofertas`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${APP_URL}/menor-preco`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/mais-vendidos`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/cupons`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${APP_URL}/sobre`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
    { url: `${APP_URL}/lojas`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
  ];

  // Dynamic pages from DB (graceful fallback if DB unavailable)
  let categoryPages: MetadataRoute.Sitemap = [];
  let brandPages: MetadataRoute.Sitemap = [];
  let productPages: MetadataRoute.Sitemap = [];

  try {
    const [categories, brands, products] = await Promise.all([
      prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.brand.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
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

    productPages = products.map((p) => ({
      url: `${APP_URL}/produto/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.8,
    }));
  } catch {
    // DB unavailable at build time — return static pages only
  }

  const curatedSlugs = [
    "melhores-smartphones",
    "melhores-notebooks",
    "melhores-fones-bluetooth",
    "melhores-smart-tvs",
    "melhores-air-fryers",
  ];
  const curatedPages: MetadataRoute.Sitemap = curatedSlugs.map((slug) => ({
    url: `${APP_URL}/melhores/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...categoryPages,
    ...brandPages,
    ...productPages,
    ...curatedPages,
  ];
}
