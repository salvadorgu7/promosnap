// ============================================================================
// Link Optimizer — gap analysis, bidirectional linking, link health scoring
// ============================================================================

import prisma from '@/lib/db/prisma'
import { CLUSTERS, CLUSTER_IDS, type ClusterDef } from '@/lib/seo/clusters'
import { BEST_PAGES, BEST_PAGE_SLUGS } from '@/lib/seo/best-pages'
import { COMPARISON_LIST } from '@/lib/seo/comparisons'
import { logger } from '@/lib/logger'

// ── Types ───────────────────────────────────────────────────────────────────

export interface LinkGap {
  page: string
  href: string
  type: 'orphan_category' | 'orphan_brand' | 'missing_reciprocal' | 'weak_cluster'
  severity: 'critical' | 'warning' | 'info'
  suggestion: string
}

export interface LinkHealth {
  score: number // 0-100
  totalPages: number
  linkedPages: number
  orphanPages: number
  gaps: LinkGap[]
  clusterCoverage: number // % of clusters with cross-links
}

// ── Gap Analysis ────────────────────────────────────────────────────────────

/**
 * Detect pages with few or no internal links pointing to them.
 */
export async function analyzeLinkingGaps(): Promise<LinkGap[]> {
  const gaps: LinkGap[] = []

  try {
    // 1. Orphan categories: categories with products but no best/offer/comparison page referencing them
    const categories = await prisma.category.findMany({
      select: { slug: true, name: true, _count: { select: { products: true } } },
    })

    const linkedCatSlugs = new Set<string>()

    // Categories referenced in best pages
    for (const slug of BEST_PAGE_SLUGS) {
      const page = BEST_PAGES[slug]
      for (const cat of page.query.categories ?? []) {
        linkedCatSlugs.add(cat)
      }
    }

    // Categories referenced in clusters
    for (const clusterId of CLUSTER_IDS) {
      const cluster = CLUSTERS[clusterId]
      for (const cat of cluster.categorySlugs) {
        linkedCatSlugs.add(cat)
      }
    }

    for (const cat of categories) {
      if (cat._count.products >= 5 && !linkedCatSlugs.has(cat.slug)) {
        gaps.push({
          page: `/categoria/${cat.slug}`,
          href: `/categoria/${cat.slug}`,
          type: 'orphan_category',
          severity: cat._count.products >= 20 ? 'critical' : 'warning',
          suggestion: `Categoria "${cat.name}" (${cat._count.products} produtos) sem link de melhores/ofertas/comparacao`,
        })
      }
    }

    // 2. Orphan brands: brands with 5+ products but no best/comparison page
    const brands = await prisma.brand.findMany({
      select: { slug: true, name: true, _count: { select: { products: true } } },
    })

    const linkedBrandSlugs = new Set<string>()
    for (const comp of COMPARISON_LIST) {
      const brandA = comp.productA.query.toLowerCase().replace(/\s+/g, '-')
      const brandB = comp.productB.query.toLowerCase().replace(/\s+/g, '-')
      linkedBrandSlugs.add(brandA)
      linkedBrandSlugs.add(brandB)
    }

    for (const brand of brands) {
      if (brand._count.products >= 5 && !linkedBrandSlugs.has(brand.slug)) {
        gaps.push({
          page: `/marca/${brand.slug}`,
          href: `/marca/${brand.slug}`,
          type: 'orphan_brand',
          severity: brand._count.products >= 15 ? 'critical' : 'warning',
          suggestion: `Marca "${brand.name}" (${brand._count.products} produtos) sem comparacao ou pagina melhores`,
        })
      }
    }

    // 3. Weak cluster cross-links
    for (const clusterId of CLUSTER_IDS) {
      const cluster = CLUSTERS[clusterId]
      if (cluster.relatedClusters.length === 0) {
        gaps.push({
          page: cluster.hub,
          href: cluster.hub,
          type: 'weak_cluster',
          severity: 'info',
          suggestion: `Cluster "${cluster.name}" sem clusters relacionados definidos`,
        })
      }
    }
  } catch (err) {
    logger.warn('link-optimizer.gap-analysis-failed', { error: err })
  }

  return gaps.sort((a, b) => {
    const sevOrder = { critical: 0, warning: 1, info: 2 }
    return sevOrder[a.severity] - sevOrder[b.severity]
  })
}

// ── Cross-Cluster Links ─────────────────────────────────────────────────────

/**
 * Get links to related clusters for a given cluster.
 */
export function getClusterCrossLinks(clusterId: string): Array<{ href: string; label: string }> {
  const cluster = CLUSTERS[clusterId]
  if (!cluster) return []

  return cluster.relatedClusters
    .map(id => {
      const related = CLUSTERS[id]
      if (!related) return null
      return { href: related.hub, label: related.hubLabel }
    })
    .filter(Boolean) as Array<{ href: string; label: string }>
}

/**
 * Find cross-cluster links for a page based on its category.
 */
export function getCrossLinksForCategory(categorySlug: string): Array<{ href: string; label: string }> {
  const links: Array<{ href: string; label: string }> = []

  for (const clusterId of CLUSTER_IDS) {
    const cluster = CLUSTERS[clusterId]
    if (cluster.categorySlugs.includes(categorySlug)) {
      // Found the cluster, get its related clusters
      for (const relatedId of cluster.relatedClusters) {
        const related = CLUSTERS[relatedId]
        if (related) {
          links.push({ href: related.hub, label: related.hubLabel })
        }
      }
      break
    }
  }

  return links.slice(0, 4)
}

// ── Link Health Score ───────────────────────────────────────────────────────

/**
 * Compute overall interlinking health score.
 */
export async function computeLinkHealth(): Promise<LinkHealth> {
  const gaps = await analyzeLinkingGaps()

  // Count total indexable pages
  const productCount = await prisma.product.count({ where: { status: 'ACTIVE' } })
  const categoryCount = await prisma.category.count()
  const brandCount = await prisma.brand.count()
  const bestPageCount = BEST_PAGE_SLUGS.length
  const comparisonCount = COMPARISON_LIST.length

  const totalPages = productCount + categoryCount + brandCount + bestPageCount + comparisonCount

  // Count linked vs orphan
  const criticalGaps = gaps.filter(g => g.severity === 'critical').length
  const warningGaps = gaps.filter(g => g.severity === 'warning').length
  const orphanPages = criticalGaps + warningGaps

  // Cluster coverage
  const clustersWithCrossLinks = CLUSTER_IDS.filter(id => CLUSTERS[id].relatedClusters.length > 0).length
  const clusterCoverage = CLUSTER_IDS.length > 0
    ? Math.round((clustersWithCrossLinks / CLUSTER_IDS.length) * 100)
    : 100

  // Score: start at 100, deduct for issues
  let score = 100
  score -= criticalGaps * 5
  score -= warningGaps * 2
  score -= (100 - clusterCoverage) * 0.2

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    totalPages,
    linkedPages: totalPages - orphanPages,
    orphanPages,
    gaps,
    clusterCoverage,
  }
}
