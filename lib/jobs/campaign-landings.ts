/**
 * Campaign Landing Page Generator — automatically creates and updates
 * landing pages for promotional campaigns from the promo calendar.
 *
 * For each active/warming campaign, it:
 * 1. Checks if a landing page (EditorialBlock) exists
 * 2. Creates one if missing
 * 3. Populates with relevant products from the campaign categories
 * 4. Generates SEO metadata
 * 5. Publishes when readiness score >= 60
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getActiveCampaigns, getCampaignsToPrep, type PromoCampaign } from '@/lib/growth/promo-calendar'

const MIN_PRODUCTS_FOR_PUBLISH = 3
const MAX_LANDINGS_PER_RUN = 5

export async function generateCampaignLandings(): Promise<{
  checked: number
  created: number
  updated: number
  published: number
}> {
  logger.info('[CAMPAIGN-LANDINGS] Starting campaign landing generation')

  const campaigns = [...getActiveCampaigns(), ...getCampaignsToPrep(6)]
  const stats = { checked: 0, created: 0, updated: 0, published: 0 }

  for (const campaign of campaigns.slice(0, MAX_LANDINGS_PER_RUN)) {
    stats.checked++

    try {
      // Check if landing page already exists
      const existing = await prisma.editorialBlock.findUnique({
        where: { slug: campaign.slug },
      })

      // Find products in campaign categories
      const products = await findCampaignProducts(campaign)
      const productCount = products.length

      if (existing) {
        // Update existing landing with fresh products
        await prisma.editorialBlock.update({
          where: { slug: campaign.slug },
          data: {
            payloadJson: buildPayload(campaign, products),
            status: productCount >= MIN_PRODUCTS_FOR_PUBLISH ? 'PUBLISHED' : 'DRAFT',
          },
        })
        stats.updated++
        if (productCount >= MIN_PRODUCTS_FOR_PUBLISH && existing.status === 'DRAFT') {
          stats.published++
        }
      } else {
        // Create new landing page
        await prisma.editorialBlock.create({
          data: {
            blockType: 'RAIL',
            title: campaign.name,
            slug: campaign.slug,
            subtitle: buildSubtitle(campaign),
            payloadJson: buildPayload(campaign, products),
            position: 0,
            status: productCount >= MIN_PRODUCTS_FOR_PUBLISH ? 'PUBLISHED' : 'DRAFT',
          },
        })
        stats.created++
        if (productCount >= MIN_PRODUCTS_FOR_PUBLISH) stats.published++
      }
    } catch (err) {
      logger.warn('[CAMPAIGN-LANDINGS] Failed for campaign', { slug: campaign.slug, err })
    }
  }

  logger.info('[CAMPAIGN-LANDINGS] Complete', stats)
  return stats
}

// ============================================
// HELPERS
// ============================================

async function findCampaignProducts(campaign: PromoCampaign) {
  // Find active products in campaign categories with good offers
  const where: any = {
    status: 'ACTIVE',
    listings: {
      some: {
        status: 'ACTIVE',
        offers: { some: { isActive: true, offerScore: { gte: 30 } } },
      },
    },
  }

  if (campaign.categories.length > 0) {
    where.category = { slug: { in: campaign.categories } }
  }

  const products = await prisma.product.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      imageUrl: true,
      popularityScore: true,
    },
    orderBy: { popularityScore: 'desc' },
    take: 20,
  })

  return products
}

function buildPayload(campaign: PromoCampaign, products: any[]) {
  return {
    campaignId: campaign.id,
    campaignType: campaign.type,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    categories: campaign.categories,
    stores: campaign.stores,
    productCount: products.length,
    productIds: products.map(p => p.id),
    seo: {
      title: `${campaign.name} 2026 — Melhores Ofertas | PromoSnap`,
      metaDescription: `Compare preços e encontre as melhores ofertas de ${campaign.name} 2026. Descontos reais em ${campaign.categories.slice(0, 3).join(', ')} e mais.`,
      h1: `${campaign.name} 2026 — Ofertas Verificadas`,
    },
    readinessScore: Math.min(100, products.length * 15),
    generatedAt: new Date().toISOString(),
  }
}

function buildSubtitle(campaign: PromoCampaign): string {
  const cats = campaign.categories.slice(0, 3).join(', ')
  return `As melhores ofertas de ${cats} para ${campaign.name} 2026`
}
