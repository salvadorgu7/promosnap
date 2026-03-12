// ============================================
// CONTENT GOVERNANCE — article classification & health
// ============================================

import prisma from '@/lib/db/prisma'
import { calculateContentScore } from './score'
import type {
  ContentState,
  ArticleAudit,
  ContentHealthReport,
  ContentScore,
} from './governance-types'

interface ArticleInput {
  id: string
  slug: string
  title: string
  subtitle?: string | null
  content: string
  category?: string | null
  tags?: string[]
  imageUrl?: string | null
  status: string
  publishedAt?: Date | null
  updatedAt: Date
}

const STALE_DAYS = 90

/**
 * Classify an article into strong / weak / stale / thin.
 */
export function classifyArticle(article: ArticleInput): ContentState {
  const now = new Date()
  const daysSinceUpdate = Math.floor(
    (now.getTime() - article.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  )

  const len = article.content.length
  const hasInternalLinks =
    /\[[^\]]+\]\(\//.test(article.content) || /href=["']\//.test(article.content)
  const hasProductRefs =
    /\/produto\/|\/ofertas\/|R\$\s*[\d.,]+/.test(article.content)
  const hasH2 = /^##\s/m.test(article.content)
  const hasMetadata = !!(article.title && article.title.length > 5)

  // Thin: <500 chars or missing critical elements
  if (len < 500 || (!hasMetadata && !hasH2)) {
    return 'thin'
  }

  // Stale: not updated in 90+ days
  if (daysSinceUpdate >= STALE_DAYS) {
    return 'stale'
  }

  // Strong: 1000+ chars, has internal links, has related products, good metadata, proper headings
  if (
    len >= 1000 &&
    hasInternalLinks &&
    hasProductRefs &&
    hasMetadata &&
    hasH2
  ) {
    return 'strong'
  }

  // Weak: 500-1000 chars, or missing some elements
  return 'weak'
}

/**
 * Score an article from 0-100.
 */
export function scoreArticle(article: ArticleInput): number {
  const result = calculateContentScore({
    content: article.content,
    title: article.title,
    subtitle: article.subtitle,
    category: article.category,
    tags: article.tags,
  })
  return result.total
}

/**
 * Generate a full audit for an article.
 */
export function auditArticle(article: ArticleInput): ArticleAudit {
  const state = classifyArticle(article)
  const score = calculateContentScore({
    content: article.content,
    title: article.title,
    subtitle: article.subtitle,
    category: article.category,
    tags: article.tags,
  })

  const issues: string[] = []
  const len = article.content.length

  if (len < 500) issues.push('Conteudo muito curto (menos de 500 caracteres)')
  else if (len < 1000) issues.push('Conteudo abaixo do ideal (menos de 1000 caracteres)')

  if (!(/\[[^\]]+\]\(\//.test(article.content) || /href=["']\//.test(article.content))) {
    issues.push('Sem links internos')
  }

  if (!(/\/produto\/|\/ofertas\/|R\$\s*[\d.,]+/.test(article.content))) {
    issues.push('Sem referencias a produtos')
  }

  if (!/^##\s/m.test(article.content)) {
    issues.push('Sem subtitulos (H2)')
  }

  if (!/^###\s/m.test(article.content)) {
    issues.push('Sem subtitulos H3')
  }

  if (!article.subtitle) {
    issues.push('Sem subtitulo/descricao')
  }

  if (!article.imageUrl) {
    issues.push('Sem imagem de capa')
  }

  if (!article.tags || article.tags.length === 0) {
    issues.push('Sem tags')
  }

  const now = new Date()
  const daysSinceUpdate = Math.floor(
    (now.getTime() - article.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceUpdate >= STALE_DAYS) {
    issues.push(`Desatualizado ha ${daysSinceUpdate} dias`)
  }

  return {
    id: article.id,
    slug: article.slug,
    title: article.title,
    state,
    score,
    issues,
    updatedAt: article.updatedAt,
  }
}

/**
 * Generate a full content health report from the database.
 */
export async function getContentHealthReport(): Promise<ContentHealthReport> {
  let articles: ArticleInput[] = []

  try {
    articles = await prisma.article.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        slug: true,
        title: true,
        subtitle: true,
        content: true,
        category: true,
        tags: true,
        imageUrl: true,
        status: true,
        publishedAt: true,
        updatedAt: true,
      },
    })
  } catch {
    // graceful fallback
  }

  const audits = articles.map((a) => auditArticle(a))

  const strong = audits.filter((a) => a.state === 'strong')
  const weak = audits.filter((a) => a.state === 'weak')
  const stale = audits.filter((a) => a.state === 'stale')
  const thin = audits.filter((a) => a.state === 'thin')

  const totalScore = audits.reduce((sum, a) => sum + a.score.total, 0)
  const averageScore = audits.length > 0 ? Math.round(totalScore / audits.length) : 0

  return {
    total: audits.length,
    strong: { count: strong.length, articles: strong },
    weak: { count: weak.length, articles: weak },
    stale: { count: stale.length, articles: stale },
    thin: { count: thin.length, articles: thin },
    averageScore,
    generatedAt: new Date(),
  }
}
