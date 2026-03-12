// ============================================
// SMART LINKING — intelligent internal link suggestions
// ============================================

import prisma from '@/lib/db/prisma'
import { BEST_PAGES, BEST_PAGE_SLUGS } from '@/lib/seo/best-pages'
import { OFFER_PAGES, OFFER_PAGE_SLUGS } from '@/lib/seo/offer-pages'
import { COMPARISON_LIST } from '@/lib/seo/comparisons'

export interface SmartLink {
  href: string
  label: string
  relevance: number // 0-100
  type: 'category' | 'brand' | 'guide' | 'comparison' | 'offer' | 'article'
}

interface SmartLinkContext {
  type: 'product' | 'category' | 'brand' | 'article'
  slug: string
  category?: string
  brand?: string
}

/**
 * Returns relevant internal links based on content context.
 * More intelligent than the static InternalLinks component:
 * considers category, brand, related articles, comparisons and best pages.
 */
export async function getSmartLinks(context: SmartLinkContext): Promise<SmartLink[]> {
  const links: SmartLink[] = []

  // 1. Related categories — fetch sibling categories
  if (context.category) {
    try {
      const currentCat = await prisma.category.findFirst({
        where: { slug: context.category },
        select: { id: true, parentId: true },
      })

      if (currentCat) {
        const siblings = await prisma.category.findMany({
          where: {
            parentId: currentCat.parentId,
            slug: { not: context.category },
          },
          select: { slug: true, name: true, _count: { select: { products: true } } },
          take: 5,
          orderBy: { position: 'asc' },
        })

        for (const sib of siblings) {
          if (sib._count.products > 0) {
            links.push({
              href: `/categoria/${sib.slug}`,
              label: sib.name,
              relevance: 80,
              type: 'category',
            })
          }
        }
      }
    } catch {
      // graceful fallback
    }
  }

  // 2. Brand pages — if context is product/category, link to the brand
  if (context.brand) {
    links.push({
      href: `/marca/${context.brand}`,
      label: `Produtos ${context.brand}`,
      relevance: 75,
      type: 'brand',
    })
  }

  // 3. Related "melhores" pages based on category/brand keywords
  for (const slug of BEST_PAGE_SLUGS) {
    const page = BEST_PAGES[slug]
    const queryCats = page.query.categories ?? []
    const queryKws = page.query.keywords ?? []
    const queryBrands = page.query.brands ?? []

    let relevance = 0

    if (context.category && queryCats.includes(context.category)) {
      relevance += 60
    }
    if (context.brand && queryBrands.includes(context.brand)) {
      relevance += 50
    }
    // keyword match in slug
    if (context.slug && queryKws.some((kw) => context.slug.includes(kw.replace(/\s+/g, '-')))) {
      relevance += 30
    }

    if (relevance > 0) {
      links.push({
        href: `/melhores/${slug}`,
        label: page.title,
        relevance: Math.min(100, relevance),
        type: 'guide',
      })
    }
  }

  // 4. Related offer pages
  for (const slug of OFFER_PAGE_SLUGS) {
    const page = OFFER_PAGES[slug]
    const searchQ = page.searchQuery.toLowerCase()

    let relevance = 0
    if (context.category && searchQ.includes(context.category.toLowerCase())) {
      relevance += 55
    }
    if (context.brand && searchQ.includes(context.brand.toLowerCase())) {
      relevance += 50
    }
    if (context.slug && context.slug.includes(searchQ.replace(/\s+/g, '-'))) {
      relevance += 35
    }

    if (relevance > 0) {
      links.push({
        href: `/ofertas/${slug}`,
        label: page.title,
        relevance: Math.min(100, relevance),
        type: 'offer',
      })
    }
  }

  // 5. Comparisons involving the brand
  if (context.brand) {
    const brandLower = context.brand.toLowerCase()
    for (const comp of COMPARISON_LIST) {
      if (
        comp.productA.query.toLowerCase().includes(brandLower) ||
        comp.productB.query.toLowerCase().includes(brandLower)
      ) {
        links.push({
          href: `/comparar/${comp.slug}`,
          label: comp.title,
          relevance: 70,
          type: 'comparison',
        })
      }
    }
  }

  // 6. Related articles
  try {
    const where: Record<string, unknown> = { status: 'PUBLISHED' as const }
    if (context.category) {
      where.category = context.category
    }

    const articles = await prisma.article.findMany({
      where,
      select: { slug: true, title: true },
      orderBy: { publishedAt: 'desc' },
      take: 4,
    })

    for (const art of articles) {
      links.push({
        href: `/blog/${art.slug}`,
        label: art.title,
        relevance: 55,
        type: 'article',
      })
    }
  } catch {
    // fallback
  }

  // Deduplicate by href and sort by relevance
  const seen = new Set<string>()
  const unique = links.filter((l) => {
    if (seen.has(l.href)) return false
    seen.add(l.href)
    return true
  })

  return unique.sort((a, b) => b.relevance - a.relevance).slice(0, 12)
}
