/**
 * AI Content Enrichment Job — daily cron that enriches the catalog with AI content.
 *
 * Runs daily and:
 * 1. Generates FAQs for top products (SEO rich results)
 * 2. Generates category guides (content marketing)
 * 3. Generates social posts for top deals (distribution)
 *
 * Cost control: max 15 GPT calls per run (~$0.015 with gpt-4o-mini)
 */

import { enrichCatalogContent, generateCategoryGuide, generateDealPost } from '@/lib/ai/content-engine'
import { sendTelegramMessage, formatTelegramMessage, isTelegramConfigured } from '@/lib/distribution/telegram'
import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const log = logger.child({ job: 'ai-content-enrichment' })

export async function runAIContentEnrichment() {
  if (!process.env.OPENAI_API_KEY) {
    return { status: 'SKIPPED', reason: 'OPENAI_API_KEY não configurado' }
  }

  const results: Record<string, unknown> = {}

  // 1. Enrich product FAQs (max 5 products)
  try {
    const faqResult = await enrichCatalogContent()
    results.faqs = faqResult
    log.info('ai-enrichment.faqs', faqResult)
  } catch (err) {
    results.faqs = { error: String(err) }
  }

  // 2. Generate AI social post for today's best deal
  try {
    const topDeal = await prisma.offer.findFirst({
      where: { isActive: true, currentPrice: { gt: 0 }, originalPrice: { gt: 0 } },
      orderBy: { offerScore: 'desc' },
      include: {
        listing: {
          include: {
            source: { select: { name: true } },
            product: { select: { name: true, slug: true } },
          },
        },
      },
    })

    if (topDeal?.listing?.product) {
      const discount = topDeal.originalPrice
        ? Math.round((1 - topDeal.currentPrice / topDeal.originalPrice) * 100)
        : 0

      const post = await generateDealPost(
        topDeal.listing.product.name,
        topDeal.currentPrice,
        topDeal.originalPrice,
        discount,
        topDeal.listing.source?.name || 'PromoSnap',
        `https://www.promosnap.com.br/produto/${topDeal.listing.product.slug}`
      )

      if (post) {
        results.socialPost = { generated: true, product: topDeal.listing.product.name.slice(0, 40) }

        // Auto-send to Telegram if configured
        if (isTelegramConfigured() && post.telegram) {
          const sendResult = await sendTelegramMessage(post.telegram)
          results.telegramSent = sendResult.success
        }
      }
    }
  } catch (err) {
    results.socialPost = { error: String(err) }
  }

  return { status: 'OK', ...results }
}
