/**
 * app/sitemap.ts — Single sitemap (no index splitting)
 *
 * Generates /sitemap.xml with ALL indexable URLs.
 * Simpler approach — no generateSitemaps() which was causing empty sitemaps on Vercel.
 *
 * ISR: regenerates every hour.
 */

import { MetadataRoute } from "next"
import prisma from "@/lib/db/prisma"
import { BEST_PAGE_SLUGS } from "@/lib/seo/best-pages"
import { OFFER_PAGE_SLUGS } from "@/lib/seo/offer-pages"
import { COMPARISON_SLUGS } from "@/lib/seo/comparisons"
import { VALE_A_PENA_SLUGS } from "@/lib/seo/vale-a-pena"
import { PRICE_RANGE_SLUGS } from "@/lib/seo/price-range-pages"
import { BUYING_GUIDE_SLUGS } from "@/lib/seo/buying-guides"
import { getBaseUrl } from "@/lib/seo/url"

const APP_URL = getBaseUrl()

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()
  const urls: MetadataRoute.Sitemap = []

  // ─── STATIC PAGES ───────────────────────────────────────────────────────
  urls.push(
    { url: APP_URL, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${APP_URL}/ofertas`, lastModified: now, changeFrequency: "hourly", priority: 0.95 },
    { url: `${APP_URL}/menor-preco`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${APP_URL}/mais-vendidos`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${APP_URL}/queda-de-preco`, lastModified: now, changeFrequency: "daily", priority: 0.85 },
    { url: `${APP_URL}/mais-buscados`, lastModified: now, changeFrequency: "daily", priority: 0.80 },
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
  )

  // ─── PRODUCTS (quality-gated: must have image + active offer) ───────────
  try {
    const products = await prisma.product.findMany({
      where: {
        status: "ACTIVE",
        imageUrl: { not: null },
        listings: {
          some: {
            status: "ACTIVE",
            offers: { some: { isActive: true, currentPrice: { gte: 5 } } },
          },
        },
      },
      select: { slug: true, updatedAt: true, popularityScore: true },
      orderBy: { popularityScore: "desc" },
    })

    for (const p of products) {
      const priority = p.popularityScore && p.popularityScore > 50 ? 0.9 : 0.8
      urls.push(
        { url: `${APP_URL}/produto/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily", priority },
        { url: `${APP_URL}/preco/${p.slug}`, lastModified: p.updatedAt, changeFrequency: "daily", priority: 0.60 },
      )
    }
  } catch (err) {
    console.error("[sitemap] Failed to fetch products:", err)
  }

  // ─── CATEGORIES + BRANDS ───────────────────────────────────────────────
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
    ])

    for (const c of categories) {
      urls.push({
        url: `${APP_URL}/categoria/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: "daily",
        priority: Math.min(0.85, 0.60 + (c._count.products / 100) * 0.25),
      })
    }

    for (const b of brands) {
      urls.push({
        url: `${APP_URL}/marca/${b.slug}`,
        lastModified: b.updatedAt,
        changeFrequency: "weekly",
        priority: Math.min(0.75, 0.50 + (b._count.products / 100) * 0.25),
      })
    }
  } catch (err) {
    console.error("[sitemap] Failed to fetch categories/brands:", err)
  }

  // ─── EDITORIAL ──────────────────────────────────────────────────────────
  try {
    const articles = await prisma.article.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
    })
    for (const a of articles) {
      urls.push({ url: `${APP_URL}/guias/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly", priority: 0.70 })
    }
  } catch (err) {
    console.error("[sitemap] Failed to fetch articles:", err)
  }

  for (const slug of BUYING_GUIDE_SLUGS) {
    urls.push({ url: `${APP_URL}/guia-compra/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.70 })
  }

  // ─── PROGRAMMATIC SEO ──────────────────────────────────────────────────
  for (const slug of BEST_PAGE_SLUGS) {
    urls.push({ url: `${APP_URL}/melhores/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.80 })
  }
  for (const slug of COMPARISON_SLUGS) {
    urls.push({ url: `${APP_URL}/comparar/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.75 })
  }
  for (const slug of VALE_A_PENA_SLUGS) {
    urls.push({ url: `${APP_URL}/vale-a-pena/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.70 })
  }
  for (const slug of PRICE_RANGE_SLUGS) {
    urls.push({ url: `${APP_URL}/faixa-preco/${slug}`, lastModified: now, changeFrequency: "weekly", priority: 0.65 })
  }
  for (const slug of OFFER_PAGE_SLUGS) {
    urls.push({ url: `${APP_URL}/ofertas/${slug}`, lastModified: now, changeFrequency: "daily", priority: 0.75 })
  }

  return urls
}
