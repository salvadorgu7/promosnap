// ============================================================================
// Generate Content Job — auto-creates article drafts from recommendations
// ============================================================================

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getContentRecommendations } from '@/lib/content/recommendations'
import { generateArticle, type ArticleInput } from '@/lib/ai/article-generator'

const MAX_ARTICLES_PER_RUN = 10
const MIN_PRIORITY = 70

export async function generateContentJob() {
  const recommendations = await getContentRecommendations()

  // Filter by priority
  const candidates = recommendations
    .filter(r => r.priority >= MIN_PRIORITY)
    .slice(0, MAX_ARTICLES_PER_RUN * 2) // Get double to account for duplicates

  let created = 0
  let skipped = 0

  for (const rec of candidates) {
    if (created >= MAX_ARTICLES_PER_RUN) break

    const slug = rec.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

    // Check if article already exists
    const existing = await prisma.article.findUnique({ where: { slug } })
    if (existing) {
      skipped++
      continue
    }

    try {
      // Map recommendation types to article types
      const typeMap: Record<string, ArticleInput['type']> = {
        guide: 'guide',
        comparison: 'comparison',
        price: 'vale-a-pena',
        'hot-topic': 'hot-topic',
        'vale-a-pena': 'vale-a-pena',
      }
      const articleType = typeMap[rec.type] ?? 'guide'

      const article = await generateArticle({
        type: articleType,
        topic: rec.topic,
      })

      await prisma.article.create({
        data: {
          slug: article.slug,
          title: article.title,
          content: article.content,
          category: article.category,
          tags: article.tags,
          status: 'DRAFT',
          author: 'PromoSnap AI',
        },
      })

      created++
      logger.info('generate-content.created', { slug: article.slug, type: rec.type })
    } catch (err) {
      logger.warn('generate-content.failed', { topic: rec.topic, error: err })
      skipped++
    }
  }

  logger.info('generate-content.complete', { created, skipped, candidates: candidates.length })

  return {
    status: 'SUCCESS',
    itemsTotal: candidates.length,
    itemsDone: created,
    metadata: { created, skipped },
  }
}
