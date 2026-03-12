import prisma from '@/lib/db/prisma'
import type { QualityGateResult, QualityReport } from './types'

const GATE_ITEM_LIMIT = 50

// ─── Gate: Products without images ───────────────────────────

async function gateProductsWithoutImages(): Promise<QualityGateResult> {
  try {
    const products = await prisma.product.findMany({
      where: {
        imageUrl: null,
        status: 'ACTIVE',
      },
      select: { id: true, name: true },
      take: GATE_ITEM_LIMIT,
    })
    return {
      gate: 'Products without images',
      severity: products.length > 0 ? 'warning' : 'info',
      count: products.length,
      items: products.map((p) => ({ id: p.id, name: p.name, issue: 'Missing imageUrl' })),
      suggestion: 'Add product images to improve conversion rates and SEO.',
    }
  } catch (error) {
    return {
      gate: 'Products without images',
      severity: 'critical',
      count: 0,
      items: [{ id: 'error', name: 'Query failed', issue: error instanceof Error ? error.message : 'unknown' }],
      suggestion: 'Fix database connectivity to run this gate.',
    }
  }
}

// ─── Gate: Products without brand/category ───────────────────

async function gateProductsWithoutTaxonomy(): Promise<QualityGateResult> {
  try {
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ brandId: null }, { categoryId: null }],
      },
      select: { id: true, name: true, brandId: true, categoryId: true },
      take: GATE_ITEM_LIMIT,
    })
    return {
      gate: 'Products without brand or category',
      severity: products.length > 0 ? 'warning' : 'info',
      count: products.length,
      items: products.map((p) => ({
        id: p.id,
        name: p.name,
        issue: [!p.brandId && 'Missing brand', !p.categoryId && 'Missing category'].filter(Boolean).join(', '),
      })),
      suggestion: 'Assign brands and categories to improve filtering and SEO.',
    }
  } catch (error) {
    return {
      gate: 'Products without brand or category',
      severity: 'critical',
      count: 0,
      items: [{ id: 'error', name: 'Query failed', issue: error instanceof Error ? error.message : 'unknown' }],
      suggestion: 'Fix database connectivity to run this gate.',
    }
  }
}

// ─── Gate: Offers without affiliateUrl ───────────────────────

async function gateOffersWithoutAffiliate(): Promise<QualityGateResult> {
  try {
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        affiliateUrl: null,
      },
      select: { id: true, listing: { select: { rawTitle: true } } },
      take: GATE_ITEM_LIMIT,
    })
    return {
      gate: 'Offers without affiliate URL',
      severity: offers.length > 0 ? 'critical' : 'info',
      count: offers.length,
      items: offers.map((o) => ({
        id: o.id,
        name: o.listing.rawTitle.slice(0, 80),
        issue: 'Missing affiliateUrl — no monetization',
      })),
      suggestion: 'Add affiliate URLs to all active offers to enable revenue.',
    }
  } catch (error) {
    return {
      gate: 'Offers without affiliate URL',
      severity: 'critical',
      count: 0,
      items: [{ id: 'error', name: 'Query failed', issue: error instanceof Error ? error.message : 'unknown' }],
      suggestion: 'Fix database connectivity to run this gate.',
    }
  }
}

// ─── Gate: Empty categories ──────────────────────────────────

async function gateEmptyCategories(): Promise<QualityGateResult> {
  try {
    const categories = await prisma.category.findMany({
      where: {
        products: { none: {} },
      },
      select: { id: true, name: true },
      take: GATE_ITEM_LIMIT,
    })
    return {
      gate: 'Empty categories',
      severity: categories.length > 0 ? 'warning' : 'info',
      count: categories.length,
      items: categories.map((c) => ({ id: c.id, name: c.name, issue: '0 products assigned' })),
      suggestion: 'Remove or populate empty categories to avoid thin pages.',
    }
  } catch (error) {
    return {
      gate: 'Empty categories',
      severity: 'critical',
      count: 0,
      items: [{ id: 'error', name: 'Query failed', issue: error instanceof Error ? error.message : 'unknown' }],
      suggestion: 'Fix database connectivity to run this gate.',
    }
  }
}

// ─── Gate: Brands with thin catalog ──────────────────────────

async function gateThinBrands(): Promise<QualityGateResult> {
  try {
    const brands = await prisma.brand.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { products: true } },
      },
    })
    const thin = brands.filter((b) => b._count.products < 3)
    return {
      gate: 'Brands with thin catalog (<3 products)',
      severity: thin.length > 0 ? 'info' : 'info',
      count: thin.length,
      items: thin.slice(0, GATE_ITEM_LIMIT).map((b) => ({
        id: b.id,
        name: b.name,
        issue: `Only ${b._count.products} product(s)`,
      })),
      suggestion: 'Add more products to thin brands or merge them.',
    }
  } catch (error) {
    return {
      gate: 'Brands with thin catalog (<3 products)',
      severity: 'critical',
      count: 0,
      items: [{ id: 'error', name: 'Query failed', issue: error instanceof Error ? error.message : 'unknown' }],
      suggestion: 'Fix database connectivity to run this gate.',
    }
  }
}

// ─── Gate: Articles without enough content ───────────────────

async function gateShortArticles(): Promise<QualityGateResult> {
  try {
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, title: true, content: true },
    })
    const short = articles.filter((a) => a.content.length < 200)
    return {
      gate: 'Articles with thin content (<200 chars)',
      severity: short.length > 0 ? 'warning' : 'info',
      count: short.length,
      items: short.slice(0, GATE_ITEM_LIMIT).map((a) => ({
        id: a.id,
        name: a.title,
        issue: `Only ${a.content.length} chars`,
      })),
      suggestion: 'Expand article content to at least 200+ characters for SEO value.',
    }
  } catch (error) {
    return {
      gate: 'Articles with thin content (<200 chars)',
      severity: 'critical',
      count: 0,
      items: [{ id: 'error', name: 'Query failed', issue: error instanceof Error ? error.message : 'unknown' }],
      suggestion: 'Fix database connectivity to run this gate.',
    }
  }
}

// ─── Gate: Products with incoherent pricing ──────────────────

async function gateIncoherentPricing(): Promise<QualityGateResult> {
  try {
    const offers = await prisma.offer.findMany({
      where: {
        isActive: true,
        originalPrice: { not: null },
      },
      select: {
        id: true,
        currentPrice: true,
        originalPrice: true,
        listing: { select: { rawTitle: true } },
      },
    })
    const incoherent = offers.filter(
      (o) => o.originalPrice !== null && o.originalPrice < o.currentPrice
    )
    return {
      gate: 'Offers with incoherent pricing',
      severity: incoherent.length > 0 ? 'warning' : 'info',
      count: incoherent.length,
      items: incoherent.slice(0, GATE_ITEM_LIMIT).map((o) => ({
        id: o.id,
        name: o.listing.rawTitle.slice(0, 80),
        issue: `Original R$${o.originalPrice} < current R$${o.currentPrice}`,
      })),
      suggestion: 'Fix offers where original price is less than current price.',
    }
  } catch (error) {
    return {
      gate: 'Offers with incoherent pricing',
      severity: 'critical',
      count: 0,
      items: [{ id: 'error', name: 'Query failed', issue: error instanceof Error ? error.message : 'unknown' }],
      suggestion: 'Fix database connectivity to run this gate.',
    }
  }
}

// ─── Gate: Listings with no active offers ────────────────────

async function gateListingsWithoutOffers(): Promise<QualityGateResult> {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        status: 'ACTIVE',
        offers: { none: { isActive: true } },
      },
      select: { id: true, rawTitle: true },
      take: GATE_ITEM_LIMIT,
    })
    return {
      gate: 'Active listings with no active offers',
      severity: listings.length > 0 ? 'warning' : 'info',
      count: listings.length,
      items: listings.map((l) => ({
        id: l.id,
        name: l.rawTitle.slice(0, 80),
        issue: 'No active offer — invisible to users',
      })),
      suggestion: 'Deactivate stale listings or create new offers for them.',
    }
  } catch (error) {
    return {
      gate: 'Active listings with no active offers',
      severity: 'critical',
      count: 0,
      items: [{ id: 'error', name: 'Query failed', issue: error instanceof Error ? error.message : 'unknown' }],
      suggestion: 'Fix database connectivity to run this gate.',
    }
  }
}

// ─── Aggregate ───────────────────────────────────────────────

export async function runAllQualityGates(): Promise<QualityReport> {
  const gates = await Promise.all([
    gateProductsWithoutImages(),
    gateProductsWithoutTaxonomy(),
    gateOffersWithoutAffiliate(),
    gateEmptyCategories(),
    gateThinBrands(),
    gateShortArticles(),
    gateIncoherentPricing(),
    gateListingsWithoutOffers(),
  ])

  const summary = {
    total: gates.length,
    critical: gates.filter((g) => g.severity === 'critical' && g.count > 0).length,
    warning: gates.filter((g) => g.severity === 'warning' && g.count > 0).length,
    info: gates.filter((g) => g.severity === 'info').length,
    totalIssues: gates.reduce((acc, g) => acc + g.count, 0),
  }

  return {
    timestamp: new Date().toISOString(),
    gates,
    summary,
  }
}
