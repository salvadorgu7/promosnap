// ============================================
// CONTENT SCORE — editorial quality scoring
// ============================================

import type { ContentScore, ContentGrade } from './governance-types'

interface ScoringInput {
  content: string
  title: string
  subtitle?: string | null
  category?: string | null
  tags?: string[]
}

/**
 * Score content richness: length, formatting, headings (0-30 pts)
 */
function scoreRichness(content: string, title: string, subtitle?: string | null): number {
  let score = 0
  const len = content.length

  // Length score (0-12)
  if (len >= 3000) score += 12
  else if (len >= 2000) score += 10
  else if (len >= 1000) score += 7
  else if (len >= 500) score += 4
  else score += 1

  // Heading structure (0-8)
  const h2Count = (content.match(/^##\s/gm) || []).length
  const h3Count = (content.match(/^###\s/gm) || []).length
  if (h2Count >= 3) score += 5
  else if (h2Count >= 1) score += 3
  if (h3Count >= 2) score += 3
  else if (h3Count >= 1) score += 1

  // Has title and subtitle (0-4)
  if (title && title.length > 10) score += 2
  if (subtitle && subtitle.length > 10) score += 2

  // Formatting elements: bold, italic, lists (0-6)
  const hasBold = /\*\*[^*]+\*\*/.test(content)
  const hasItalic = /\*[^*]+\*/.test(content)
  const hasLists = /^[-*]\s/m.test(content) || /^\d+\.\s/m.test(content)
  if (hasBold) score += 2
  if (hasItalic) score += 1
  if (hasLists) score += 3

  return Math.min(30, score)
}

/**
 * Score internal links (0-25 pts)
 */
function scoreLinking(content: string): number {
  let score = 0

  // Markdown links [text](url)
  const markdownLinks = content.match(/\[[^\]]+\]\([^)]+\)/g) || []
  // HTML links <a href="...">
  const htmlLinks = content.match(/href=["'][^"']+["']/g) || []
  const totalLinks = markdownLinks.length + htmlLinks.length

  // Internal links specifically (relative or same domain)
  const internalMarkdown = markdownLinks.filter(
    (l) => l.includes('](/') || l.includes('promosnap')
  )
  const internalHtml = htmlLinks.filter(
    (l) => l.includes('href="/') || l.includes('promosnap')
  )
  const internalCount = internalMarkdown.length + internalHtml.length

  // Total links (0-10)
  if (totalLinks >= 8) score += 10
  else if (totalLinks >= 5) score += 8
  else if (totalLinks >= 3) score += 5
  else if (totalLinks >= 1) score += 2

  // Internal links bonus (0-15)
  if (internalCount >= 5) score += 15
  else if (internalCount >= 3) score += 10
  else if (internalCount >= 1) score += 5

  return Math.min(25, score)
}

/**
 * Score related products mentions (0-25 pts)
 */
function scoreProducts(content: string): number {
  let score = 0

  // Product-related patterns
  const pricePatterns = (content.match(/R\$\s*[\d.,]+/g) || []).length
  const productLinks = (content.match(/\/produto\/|\/ofertas\/|\/precos\//g) || []).length
  const comparisonWords = (
    content.match(
      /\b(compara|preco|oferta|produto|desconto|melhor|custo-beneficio|avaliacao)\b/gi
    ) || []
  ).length

  // Price mentions (0-8)
  if (pricePatterns >= 5) score += 8
  else if (pricePatterns >= 2) score += 5
  else if (pricePatterns >= 1) score += 2

  // Product page links (0-10)
  if (productLinks >= 4) score += 10
  else if (productLinks >= 2) score += 7
  else if (productLinks >= 1) score += 3

  // Commerce vocabulary (0-7)
  if (comparisonWords >= 10) score += 7
  else if (comparisonWords >= 5) score += 5
  else if (comparisonWords >= 2) score += 3

  return Math.min(25, score)
}

/**
 * Score topic coverage — keyword density proxy (0-20 pts)
 */
function scoreCoverage(content: string, title: string, category?: string | null, tags?: string[]): number {
  let score = 0
  const lowerContent = content.toLowerCase()

  // Title words appear in body (0-8)
  const titleWords = title
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 3)
  const titleInBody = titleWords.filter((w) => lowerContent.includes(w)).length
  const titleRatio = titleWords.length > 0 ? titleInBody / titleWords.length : 0
  if (titleRatio >= 0.8) score += 8
  else if (titleRatio >= 0.5) score += 5
  else if (titleRatio >= 0.3) score += 3

  // Category mention (0-4)
  if (category && lowerContent.includes(category.toLowerCase())) {
    score += 4
  }

  // Tag coverage (0-4)
  if (tags && tags.length > 0) {
    const tagHits = tags.filter((t) => lowerContent.includes(t.toLowerCase())).length
    const tagRatio = tagHits / tags.length
    if (tagRatio >= 0.5) score += 4
    else if (tagRatio >= 0.25) score += 2
  }

  // Paragraph diversity — multiple sections (0-4)
  const paragraphs = content.split(/\n\n+/).filter((p) => p.trim().length > 50)
  if (paragraphs.length >= 6) score += 4
  else if (paragraphs.length >= 3) score += 2

  return Math.min(20, score)
}

function gradeFromScore(total: number): ContentGrade {
  if (total >= 80) return 'A'
  if (total >= 60) return 'B'
  if (total >= 40) return 'C'
  if (total >= 20) return 'D'
  return 'F'
}

/**
 * Calculate full editorial score for an article or page content.
 */
export function calculateContentScore(input: ScoringInput): ContentScore {
  const richness = scoreRichness(input.content, input.title, input.subtitle)
  const linking = scoreLinking(input.content)
  const products = scoreProducts(input.content)
  const coverage = scoreCoverage(input.content, input.title, input.category, input.tags)

  const total = richness + linking + products + coverage

  return {
    total,
    breakdown: { richness, linking, products, coverage },
    grade: gradeFromScore(total),
  }
}
