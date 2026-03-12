import { MetadataRoute } from "next";
import prisma from "@/lib/db/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://promosnap.com.br";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: APP_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${APP_URL}/ofertas`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${APP_URL}/menor-preco`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${APP_URL}/mais-vendidos`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.8 },
    { url: `${APP_URL}/busca`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
    { url: `${APP_URL}/lojas`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  ];

  // Category pages
  const categories = ["eletronicos", "casa", "moda", "beleza", "gamer", "infantil", "esportes", "livros"];
  const categoryPages: MetadataRoute.Sitemap = categories.map((slug) => ({
    url: `${APP_URL}/categoria/${slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 0.7,
  }));

  // Product pages from DB
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const listings = await prisma.listing.findMany({
      where: { status: "ACTIVE" },
      select: { externalId: true, updatedAt: true },
      take: 5000,
    });
    productPages = listings.map((l) => ({
      url: `${APP_URL}/produto/${l.externalId}`,
      lastModified: l.updatedAt,
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));
  } catch {
    // DB not available, skip product pages
  }

  return [...staticPages, ...categoryPages, ...productPages];
}
