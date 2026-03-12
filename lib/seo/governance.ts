// ============================================
// SEO GOVERNANCE — audit, health checks, rules
// ============================================

import prisma from '@/lib/db/prisma'
import { BEST_PAGES, BEST_PAGE_SLUGS } from '@/lib/seo/best-pages'
import { OFFER_PAGES, OFFER_PAGE_SLUGS } from '@/lib/seo/offer-pages'
import { COMPARISON_LIST, COMPARISON_SLUGS } from '@/lib/seo/comparisons'
import type {
  SEOAuditReport,
  SEOIssue,
  SEOIssueType,
  SEOIssueSeverity,
  SEOPageStatus,
  SEOScore,
  SEOAction,
} from './governance-types'

// ── Helpers ──────────────────────────────────────────

function scoreSeverity(severity: SEOIssueSeverity): number {
  return severity === 'critical' ? 15 : severity === 'warning' ? 8 : 3
}

function scoreLabel(score: number): SEOScore['label'] {
  if (score >= 85) return 'Excelente'
  if (score >= 65) return 'Bom'
  if (score >= 40) return 'Atencao'
  return 'Critico'
}

function scoreColor(score: number): string {
  if (score >= 85) return 'text-accent-green'
  if (score >= 65) return 'text-accent-blue'
  if (score >= 40) return 'text-accent-orange'
  return 'text-red-500'
}

// ── Get empty programmatic pages ─────────────────────

export async function getEmptyPages(): Promise<SEOPageStatus[]> {
  const pages: SEOPageStatus[] = []

  try {
    // Empty categories
    const categories = await prisma.category.findMany({
      select: {
        slug: true,
        name: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        _count: { select: { products: true } },
      },
    })
    for (const cat of categories) {
      if (cat._count.products === 0) {
        pages.push({
          slug: `/categoria/${cat.slug}`,
          title: cat.name,
          pageType: 'category',
          hasTitle: !!cat.seoTitle,
          hasDescription: !!cat.seoDescription,
          hasCanonical: true,
          hasInternalLinks: false,
          contentLength: (cat.description ?? '').length,
          productCount: 0,
          internalLinksCount: 0,
          issues: [{
            type: 'empty_page',
            severity: 'critical',
            pageType: 'category',
            pageSlug: cat.slug,
            pageTitle: cat.name,
            message: `Categoria "${cat.name}" tem 0 produtos ativos`,
            recommendation: 'Adicione produtos ou remova a categoria do indice',
          }],
          score: 20,
        })
      }
    }

    // Brands with no products
    const brands = await prisma.brand.findMany({
      select: {
        slug: true,
        name: true,
        _count: { select: { products: true } },
      },
    })
    for (const brand of brands) {
      if (brand._count.products === 0) {
        pages.push({
          slug: `/marca/${brand.slug}`,
          title: brand.name,
          pageType: 'brand',
          hasTitle: true,
          hasDescription: false,
          hasCanonical: true,
          hasInternalLinks: false,
          contentLength: 0,
          productCount: 0,
          internalLinksCount: 0,
          issues: [{
            type: 'empty_page',
            severity: 'critical',
            pageType: 'brand',
            pageSlug: brand.slug,
            pageTitle: brand.name,
            message: `Marca "${brand.name}" tem 0 produtos ativos`,
            recommendation: 'Adicione produtos ou remova a marca do indice',
          }],
          score: 20,
        })
      }
    }
  } catch {
    // graceful fallback
  }

  return pages
}

// ── Get pages missing metadata ───────────────────────

export async function getMissingMetadata(): Promise<SEOIssue[]> {
  const issues: SEOIssue[] = []

  try {
    // Categories without SEO title/description
    const categories = await prisma.category.findMany({
      select: { slug: true, name: true, seoTitle: true, seoDescription: true },
    })
    for (const cat of categories) {
      if (!cat.seoTitle) {
        issues.push({
          type: 'missing_title',
          severity: 'warning',
          pageType: 'category',
          pageSlug: cat.slug,
          pageTitle: cat.name,
          message: `Categoria "${cat.name}" sem SEO title`,
          recommendation: 'Defina um seoTitle descritivo com 50-60 caracteres',
        })
      }
      if (!cat.seoDescription) {
        issues.push({
          type: 'missing_description',
          severity: 'warning',
          pageType: 'category',
          pageSlug: cat.slug,
          pageTitle: cat.name,
          message: `Categoria "${cat.name}" sem SEO description`,
          recommendation: 'Defina uma seoDescription com 120-160 caracteres',
        })
      }
    }

    // Products without description (acts as meta description)
    const productsNoDesc = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ description: null }, { description: '' }],
      },
      select: { slug: true, name: true },
      take: 100,
    })
    for (const product of productsNoDesc) {
      issues.push({
        type: 'missing_description',
        severity: 'warning',
        pageType: 'product',
        pageSlug: product.slug,
        pageTitle: product.name,
        message: `Produto "${product.name}" sem descricao`,
        recommendation: 'Adicione uma descricao do produto com pelo menos 100 caracteres',
      })
    }

    // Articles without subtitle (used as description)
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true, subtitle: true },
    })
    for (const art of articles) {
      if (!art.subtitle) {
        issues.push({
          type: 'missing_description',
          severity: 'info',
          pageType: 'article',
          pageSlug: art.slug,
          pageTitle: art.title,
          message: `Artigo "${art.title}" sem subtitle (meta description)`,
          recommendation: 'Adicione um subtitle descritivo para o artigo',
        })
      }
    }
  } catch {
    // graceful fallback
  }

  return issues
}

// ── Get weak content pages ───────────────────────────

export async function getWeakContent(): Promise<SEOIssue[]> {
  const issues: SEOIssue[] = []

  try {
    // Products with very short descriptions
    const products = await prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        description: { not: null },
      },
      select: { slug: true, name: true, description: true },
    })
    for (const p of products) {
      if (p.description && p.description.length > 0 && p.description.length < 100) {
        issues.push({
          type: 'weak_content',
          severity: 'info',
          pageType: 'product',
          pageSlug: p.slug,
          pageTitle: p.name,
          message: `Produto "${p.name}" tem descricao com apenas ${p.description.length} caracteres`,
          recommendation: 'Expanda a descricao para pelo menos 100 caracteres com detalhes relevantes',
        })
      }
    }

    // Categories with short descriptions
    const categories = await prisma.category.findMany({
      select: { slug: true, name: true, description: true },
    })
    for (const cat of categories) {
      if (!cat.description || cat.description.length < 100) {
        issues.push({
          type: 'weak_content',
          severity: 'warning',
          pageType: 'category',
          pageSlug: cat.slug,
          pageTitle: cat.name,
          message: `Categoria "${cat.name}" tem descricao ${cat.description ? `com ${cat.description.length} caracteres` : 'vazia'}`,
          recommendation: 'Crie uma descricao rica com pelo menos 200 caracteres para a categoria',
        })
      }
    }

    // Articles with short content
    const articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: { slug: true, title: true, content: true },
    })
    for (const art of articles) {
      if (art.content.length < 300) {
        issues.push({
          type: 'weak_content',
          severity: 'warning',
          pageType: 'article',
          pageSlug: art.slug,
          pageTitle: art.title,
          message: `Artigo "${art.title}" tem apenas ${art.content.length} caracteres`,
          recommendation: 'Expanda o artigo para pelo menos 600 palavras para melhor ranking',
        })
      }
    }
  } catch {
    // graceful fallback
  }

  return issues
}

// ── Internal linking report ──────────────────────────

export async function getInternalLinkingReport(): Promise<SEOIssue[]> {
  const issues: SEOIssue[] = []

  try {
    // Categories without sibling links (orphan categories)
    const categories = await prisma.category.findMany({
      select: { slug: true, name: true, parentId: true, _count: { select: { products: true } } },
    })
    const parentGroups = new Map<string | null, number>()
    for (const cat of categories) {
      const key = cat.parentId ?? '__root__'
      parentGroups.set(key, (parentGroups.get(key) ?? 0) + 1)
    }
    for (const cat of categories) {
      const groupKey = cat.parentId ?? '__root__'
      const siblings = parentGroups.get(groupKey) ?? 0
      if (siblings <= 1 && cat._count.products > 0) {
        issues.push({
          type: 'poor_internal_linking',
          severity: 'info',
          pageType: 'category',
          pageSlug: cat.slug,
          pageTitle: cat.name,
          message: `Categoria "${cat.name}" nao tem categorias irmas (sem links de navegacao lateral)`,
          recommendation: 'Crie categorias relacionadas ou adicione links manuais para conteudo similar',
        })
      }
    }

    // Brands with products but not referenced in best pages or offer pages
    const brands = await prisma.brand.findMany({
      select: { slug: true, name: true, _count: { select: { products: true } } },
    })
    const linkedBrands = new Set<string>()
    for (const slug of BEST_PAGE_SLUGS) {
      const page = BEST_PAGES[slug]
      for (const b of page.query.brands ?? []) {
        linkedBrands.add(b.toLowerCase())
      }
    }
    for (const slug of OFFER_PAGE_SLUGS) {
      const page = OFFER_PAGES[slug]
      linkedBrands.add(page.searchQuery.toLowerCase())
    }
    for (const comp of COMPARISON_LIST) {
      linkedBrands.add(comp.productA.query.toLowerCase())
      linkedBrands.add(comp.productB.query.toLowerCase())
    }

    for (const brand of brands) {
      if (brand._count.products >= 3 && !linkedBrands.has(brand.slug.toLowerCase())) {
        issues.push({
          type: 'poor_internal_linking',
          severity: 'warning',
          pageType: 'brand',
          pageSlug: brand.slug,
          pageTitle: brand.name,
          message: `Marca "${brand.name}" (${brand._count.products} produtos) nao e referenciada em paginas best/offer/comparison`,
          recommendation: 'Crie uma pagina "Melhores" ou "Ofertas" para esta marca',
        })
      }
    }
  } catch {
    // graceful fallback
  }

  return issues
}

// ── Calculate SEO Score ──────────────────────────────

export async function calculateSEOScore(): Promise<SEOScore> {
  let metadataScore = 100
  let contentScore = 100
  let linkingScore = 100
  let coverageScore = 100

  try {
    // Metadata: penalize missing titles/descriptions
    const categories = await prisma.category.findMany({
      select: { seoTitle: true, seoDescription: true },
    })
    const totalCats = categories.length || 1
    const missingTitles = categories.filter(c => !c.seoTitle).length
    const missingDescs = categories.filter(c => !c.seoDescription).length
    metadataScore -= Math.round((missingTitles / totalCats) * 40)
    metadataScore -= Math.round((missingDescs / totalCats) * 30)

    const totalProducts = await prisma.product.count({ where: { status: 'ACTIVE' } })
    const productsNoDesc = await prisma.product.count({
      where: { status: 'ACTIVE', OR: [{ description: null }, { description: '' }] },
    })
    if (totalProducts > 0) {
      metadataScore -= Math.round((productsNoDesc / totalProducts) * 30)
    }

    // Content quality
    const productsWithDesc = await prisma.product.findMany({
      where: { status: 'ACTIVE', description: { not: null } },
      select: { description: true },
    })
    const thinProducts = productsWithDesc.filter(p => (p.description ?? '').length < 100).length
    if (productsWithDesc.length > 0) {
      contentScore -= Math.round((thinProducts / productsWithDesc.length) * 30)
    }

    const emptyCats = await prisma.category.findMany({
      select: { _count: { select: { products: true } } },
    })
    const emptyCatCount = emptyCats.filter(c => c._count.products === 0).length
    if (emptyCats.length > 0) {
      contentScore -= Math.round((emptyCatCount / emptyCats.length) * 40)
    }

    const productsNoImage = await prisma.product.count({
      where: { status: 'ACTIVE', imageUrl: null },
    })
    if (totalProducts > 0) {
      contentScore -= Math.round((productsNoImage / totalProducts) * 30)
    }

    // Internal linking score
    const totalBrands = await prisma.brand.count()
    const totalBestPages = BEST_PAGE_SLUGS.length
    const totalOfferPages = OFFER_PAGE_SLUGS.length
    const totalComparisons = COMPARISON_SLUGS.length
    const programmaticPages = totalBestPages + totalOfferPages + totalComparisons
    if (totalBrands > 0) {
      const linkedRatio = Math.min(1, programmaticPages / (totalBrands * 0.5))
      linkingScore = Math.round(50 + linkedRatio * 50)
    }

    // Coverage
    const brandsWithProducts = await prisma.brand.count({
      where: { products: { some: { status: 'ACTIVE' } } },
    })
    const catsWithProducts = emptyCats.filter(c => c._count.products > 0).length
    if (totalBrands > 0 && emptyCats.length > 0) {
      coverageScore = Math.round(
        ((brandsWithProducts / totalBrands) * 50) +
        ((catsWithProducts / emptyCats.length) * 50)
      )
    }
  } catch {
    // graceful fallback
  }

  metadataScore = Math.max(0, Math.min(100, metadataScore))
  contentScore = Math.max(0, Math.min(100, contentScore))
  linkingScore = Math.max(0, Math.min(100, linkingScore))
  coverageScore = Math.max(0, Math.min(100, coverageScore))

  const overall = Math.round(
    metadataScore * 0.3 +
    contentScore * 0.3 +
    linkingScore * 0.2 +
    coverageScore * 0.2
  )

  return {
    overall,
    metadata: metadataScore,
    content: contentScore,
    internalLinking: linkingScore,
    coverage: coverageScore,
    label: scoreLabel(overall),
    color: scoreColor(overall),
  }
}

// ── Full SEO Audit ───────────────────────────────────

export async function auditSEOHealth(): Promise<SEOAuditReport> {
  const [score, emptyPages, missingMeta, weakContent, linkingIssues] = await Promise.all([
    calculateSEOScore(),
    getEmptyPages(),
    getMissingMetadata(),
    getWeakContent(),
    getInternalLinkingReport(),
  ])

  const emptyPageIssues = emptyPages.flatMap(p => p.issues)
  const allIssues = [...emptyPageIssues, ...missingMeta, ...weakContent, ...linkingIssues]

  // Count by type
  const issuesByType: Record<SEOIssueType, number> = {
    missing_title: 0,
    missing_description: 0,
    weak_title: 0,
    missing_canonical: 0,
    orphan_page: 0,
    empty_page: 0,
    weak_content: 0,
    poor_internal_linking: 0,
  }
  const issuesBySeverity: Record<SEOIssueSeverity, number> = {
    critical: 0,
    warning: 0,
    info: 0,
  }

  for (const issue of allIssues) {
    issuesByType[issue.type]++
    issuesBySeverity[issue.severity]++
  }

  // Count total pages
  let totalPages = 0
  try {
    const [products, cats, brands, articles] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.category.count(),
      prisma.brand.count(),
      prisma.article.count({ where: { status: 'PUBLISHED' } }),
    ])
    totalPages = products + cats + brands + articles +
      BEST_PAGE_SLUGS.length + OFFER_PAGE_SLUGS.length + COMPARISON_SLUGS.length
  } catch {
    // fallback
  }

  const pagesWithIssues = new Set(allIssues.map(i => `${i.pageType}:${i.pageSlug}`)).size

  return {
    score,
    totalPages,
    pagesWithIssues,
    issuesByType,
    issuesBySeverity,
    issues: allIssues.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    }),
    pageStatuses: emptyPages,
    generatedAt: new Date().toISOString(),
  }
}

// ── SEO Actions Queue ────────────────────────────────

export async function getSEOActions(): Promise<SEOAction[]> {
  const actions: SEOAction[] = []

  try {
    const [emptyPages, missingMeta, weakContent, linkingIssues] = await Promise.all([
      getEmptyPages(),
      getMissingMetadata(),
      getWeakContent(),
      getInternalLinkingReport(),
    ])

    // From empty pages: create content or noindex
    for (const page of emptyPages) {
      actions.push({
        type: 'create_page',
        target: page.title,
        targetSlug: page.slug,
        reason: `Pagina vazia sem produtos — prejudica SEO`,
        priority: 90,
        estimatedImpact: 'high',
        pageType: page.pageType,
      })
    }

    // From missing metadata
    for (const issue of missingMeta) {
      actions.push({
        type: 'fix_metadata',
        target: issue.pageTitle,
        targetSlug: issue.pageSlug,
        reason: issue.message,
        priority: issue.severity === 'warning' ? 75 : 50,
        estimatedImpact: issue.severity === 'warning' ? 'medium' : 'low',
        pageType: issue.pageType,
      })
    }

    // From weak content
    for (const issue of weakContent) {
      actions.push({
        type: 'improve_content',
        target: issue.pageTitle,
        targetSlug: issue.pageSlug,
        reason: issue.message,
        priority: issue.pageType === 'category' ? 70 : 45,
        estimatedImpact: issue.pageType === 'category' ? 'medium' : 'low',
        pageType: issue.pageType,
      })
    }

    // From linking issues
    for (const issue of linkingIssues) {
      actions.push({
        type: 'add_internal_links',
        target: issue.pageTitle,
        targetSlug: issue.pageSlug,
        reason: issue.message,
        priority: issue.severity === 'warning' ? 65 : 40,
        estimatedImpact: issue.severity === 'warning' ? 'medium' : 'low',
        pageType: issue.pageType,
      })
    }

    // Uncovered brands and categories — create pages
    const brands = await prisma.brand.findMany({
      select: { slug: true, name: true, _count: { select: { products: true } } },
    })
    const bestPageSlugsSet = new Set(BEST_PAGE_SLUGS)
    for (const brand of brands) {
      if (brand._count.products >= 5 && !bestPageSlugsSet.has(`melhores-${brand.slug}`)) {
        actions.push({
          type: 'create_page',
          target: `Melhores ${brand.name}`,
          targetSlug: `melhores-${brand.slug}`,
          reason: `Marca com ${brand._count.products} produtos sem pagina "Melhores"`,
          priority: Math.min(95, 50 + brand._count.products),
          estimatedImpact: brand._count.products >= 20 ? 'high' : 'medium',
          pageType: 'brand',
        })
      }
    }

    const categories = await prisma.category.findMany({
      select: { slug: true, name: true, _count: { select: { products: true } } },
    })
    for (const cat of categories) {
      if (cat._count.products >= 3 && !bestPageSlugsSet.has(`melhores-${cat.slug}`)) {
        actions.push({
          type: 'create_page',
          target: `Melhores ${cat.name}`,
          targetSlug: `melhores-${cat.slug}`,
          reason: `Categoria com ${cat._count.products} produtos sem landing page`,
          priority: Math.min(95, 55 + cat._count.products * 2),
          estimatedImpact: cat._count.products >= 10 ? 'high' : 'medium',
          pageType: 'category',
        })
      }
    }
  } catch {
    // graceful fallback
  }

  // Deduplicate by targetSlug + type
  const seen = new Set<string>()
  const unique = actions.filter(a => {
    const key = `${a.type}:${a.targetSlug}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return unique.sort((a, b) => b.priority - a.priority)
}
