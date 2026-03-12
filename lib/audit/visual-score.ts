// ============================================
// VISUAL / UX CONSISTENCY SCORE
// Heuristic scoring based on DB data, not DOM.
// ============================================

import prisma from '@/lib/db/prisma'

interface VisualScoreBreakdown {
  metadata: number      // 0-25
  images: number        // 0-25
  cardConsistency: number // 0-20
  emptyPages: number    // 0-15 (penalty subtracted)
  sectionStrength: number // 0-15
}

interface VisualScoreResult {
  score: number         // 0-100
  breakdown: VisualScoreBreakdown
  issues: string[]
}

export async function calculateVisualScore(): Promise<VisualScoreResult> {
  const issues: string[] = []

  // ---- Gather data ----
  const [
    totalProducts,
    productsWithImage,
    productsWithDescription,
    totalCategories,
    categoriesWithSeo,
    categoriesWithProducts,
    totalBrands,
    brandsWithLogo,
    totalListings,
    listingsWithImage,
    totalArticles,
    publishedArticles,
    articlesWithImage,
    totalEditorial,
    publishedEditorial,
    totalSources,
    activeSources,
  ] = await Promise.all([
    prisma.product.count({ where: { status: 'ACTIVE' } }),
    prisma.product.count({ where: { status: 'ACTIVE', imageUrl: { not: null } } }),
    prisma.product.count({ where: { status: 'ACTIVE', description: { not: null } } }),
    prisma.category.count(),
    prisma.category.count({ where: { AND: [{ seoTitle: { not: null } }, { seoDescription: { not: null } }] } }),
    prisma.category.count({ where: { products: { some: {} } } }),
    prisma.brand.count(),
    prisma.brand.count({ where: { logoUrl: { not: null } } }),
    prisma.listing.count({ where: { status: 'ACTIVE' } }),
    prisma.listing.count({ where: { status: 'ACTIVE', imageUrl: { not: null } } }),
    prisma.article.count(),
    prisma.article.count({ where: { status: 'PUBLISHED' } }),
    prisma.article.count({ where: { status: 'PUBLISHED', imageUrl: { not: null } } }),
    prisma.editorialBlock.count(),
    prisma.editorialBlock.count({ where: { status: 'PUBLISHED' } }),
    prisma.source.count(),
    prisma.source.count({ where: { status: 'ACTIVE' } }),
  ])

  // ---- 1. Metadata score (0-25) ----
  let metadata = 0
  if (totalCategories > 0) {
    const seoRatio = categoriesWithSeo / totalCategories
    metadata += Math.round(seoRatio * 10) // up to 10 pts for category SEO
    if (seoRatio < 0.5) issues.push(`Only ${Math.round(seoRatio * 100)}% of categories have SEO metadata`)
  } else {
    issues.push('No categories found — pages lack structural metadata')
  }
  if (totalProducts > 0) {
    const descRatio = productsWithDescription / totalProducts
    metadata += Math.round(descRatio * 10) // up to 10 pts for descriptions
    if (descRatio < 0.5) issues.push(`Only ${Math.round(descRatio * 100)}% of products have descriptions`)
  }
  // Published articles contribute to metadata richness
  if (publishedArticles > 0) {
    metadata += Math.min(5, publishedArticles) // up to 5 pts
  } else {
    issues.push('No published articles — content pages are empty')
  }
  metadata = Math.min(25, metadata)

  // ---- 2. Images score (0-25) ----
  let images = 0
  if (totalProducts > 0) {
    const imgRatio = productsWithImage / totalProducts
    images += Math.round(imgRatio * 12) // up to 12 pts
    if (imgRatio < 0.7) issues.push(`${Math.round((1 - imgRatio) * 100)}% of products missing images`)
  }
  if (totalListings > 0) {
    const listImgRatio = listingsWithImage / totalListings
    images += Math.round(listImgRatio * 8) // up to 8 pts
    if (listImgRatio < 0.7) issues.push(`${Math.round((1 - listImgRatio) * 100)}% of listings missing images`)
  }
  if (totalBrands > 0) {
    const logoRatio = brandsWithLogo / totalBrands
    images += Math.round(logoRatio * 3) // up to 3 pts
    if (logoRatio < 0.3) issues.push('Most brands lack logos — brand sections look bare')
  }
  if (publishedArticles > 0 && articlesWithImage > 0) {
    images += Math.round((articlesWithImage / publishedArticles) * 2) // up to 2 pts
  }
  images = Math.min(25, images)

  // ---- 3. Card consistency (0-20) ----
  // Heuristic: products that share the same data shape render consistently.
  // Penalize if some products have images and descriptions while others don't.
  let cardConsistency = 20
  if (totalProducts > 0) {
    const imgRatio = productsWithImage / totalProducts
    const descRatio = productsWithDescription / totalProducts
    // Variance penalty: the further from 100% coverage, the worse consistency
    const imgPenalty = Math.round((1 - imgRatio) * 8)
    const descPenalty = Math.round((1 - descRatio) * 6)
    cardConsistency -= imgPenalty + descPenalty
    if (imgRatio < 1 && imgRatio > 0) {
      issues.push('Mixed product image coverage causes inconsistent card layouts')
    }
    if (descRatio < 1 && descRatio > 0) {
      issues.push('Mixed description coverage causes inconsistent card heights')
    }
  }
  // Brands without logos cause inconsistency in brand grids
  if (totalBrands > 2) {
    const logoRatio = brandsWithLogo / totalBrands
    if (logoRatio > 0 && logoRatio < 0.8) {
      cardConsistency -= 3
      issues.push('Inconsistent brand logo coverage in brand displays')
    }
  }
  cardConsistency = Math.max(0, Math.min(20, cardConsistency))

  // ---- 4. Empty pages penalty (0-15, higher is better) ----
  let emptyPages = 15
  // Empty categories (no products) create blank pages
  if (totalCategories > 0) {
    const emptyRatio = 1 - (categoriesWithProducts / totalCategories)
    const penalty = Math.round(emptyRatio * 8)
    emptyPages -= penalty
    if (emptyRatio > 0.3) {
      issues.push(`${Math.round(emptyRatio * 100)}% of categories are empty — visitors see blank pages`)
    }
  }
  // No products at all
  if (totalProducts === 0) {
    emptyPages -= 5
    issues.push('No products in catalog — all product pages are empty')
  }
  // No editorial content
  if (publishedEditorial === 0 && totalEditorial > 0) {
    emptyPages -= 2
    issues.push('Editorial blocks exist but none are published — homepage may lack content')
  } else if (totalEditorial === 0) {
    emptyPages -= 2
    issues.push('No editorial blocks — homepage has no curated sections')
  }
  emptyPages = Math.max(0, Math.min(15, emptyPages))

  // ---- 5. Section strength (0-15) ----
  let sectionStrength = 0
  // Active sources feed the site
  if (activeSources > 0) sectionStrength += Math.min(3, activeSources)
  // Published editorial blocks give homepage strength
  if (publishedEditorial > 0) sectionStrength += Math.min(5, publishedEditorial)
  // Categories with products provide navigation depth
  if (categoriesWithProducts >= 3) sectionStrength += 3
  else if (categoriesWithProducts >= 1) sectionStrength += 1
  // Listings drive deal pages
  if (totalListings >= 50) sectionStrength += 2
  else if (totalListings >= 10) sectionStrength += 1
  // Articles contribute content strength
  if (publishedArticles >= 3) sectionStrength += 2
  else if (publishedArticles >= 1) sectionStrength += 1

  if (sectionStrength < 8) {
    issues.push('Overall section strength is weak — consider adding more editorial blocks and content')
  }
  sectionStrength = Math.min(15, sectionStrength)

  // ---- Final score ----
  const breakdown: VisualScoreBreakdown = {
    metadata,
    images,
    cardConsistency,
    emptyPages,
    sectionStrength,
  }

  const score = Math.max(0, Math.min(100,
    metadata + images + cardConsistency + emptyPages + sectionStrength
  ))

  return { score, breakdown, issues }
}
