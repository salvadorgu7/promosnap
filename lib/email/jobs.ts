// ============================================
// EMAIL JOBS — send daily deals, campaigns, and segmented newsletters
// ============================================

import prisma from '@/lib/db/prisma'
import { dailyDealsEmail } from '@/lib/email/templates'
import { sendEmail, isEmailConfigured } from '@/lib/email/send'
import { segmentSubscribers, getSegmentedDeals } from '@/lib/email/segmentation'
import { logger } from '@/lib/logger'

interface SendResult {
  sent: number
  failed: number
  skipped: number
}

/**
 * Sends the daily deals email to all active subscribers with daily frequency.
 * If segmentation data exists, sends segmented deals; otherwise sends global top deals.
 */
export async function runDailyDealsJob(): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, skipped: 0 }

  if (!isEmailConfigured()) {
    logger.warn("email-jobs.daily-deals-skipped", { reason: "email not configured" })
    return result
  }

  try {
    const subscribers = await prisma.subscriber.findMany({
      where: {
        status: 'ACTIVE',
        frequency: { in: ['daily', 'weekly'] },
      },
    })

    if (subscribers.length === 0) return result

    const segments = segmentSubscribers(subscribers)
    const today = new Date().toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
    })

    // Process each segment
    const sentEmails = new Set<string>()

    for (const segment of segments) {
      const deals = await getSegmentedDeals(segment)
      if (deals.length === 0) continue

      const html = dailyDealsEmail(deals)

      for (const sub of segment.subscribers) {
        // Avoid sending duplicate emails to the same subscriber
        if (sentEmails.has(sub.email)) continue
        sentEmails.add(sub.email)

        const ok = await sendEmail({
          to: sub.email,
          subject: `🛍️ ${deals.length} ofertas selecionadas para hoje — ${today}`,
          html,
          template: 'daily-deals',
        })

        if (ok) result.sent++
        else result.failed++
      }
    }

    // Handle subscribers that were not in any segment
    const unsegmented = subscribers.filter((s) => !sentEmails.has(s.email))
    if (unsegmented.length > 0) {
      // Get generic top deals
      const genericSegment = { key: 'unsegmented', label: 'Geral', subscribers: unsegmented }
      const deals = await getSegmentedDeals(genericSegment)

      if (deals.length > 0) {
        const html = dailyDealsEmail(deals)

        for (const sub of unsegmented) {
          const ok = await sendEmail({
            to: sub.email,
            subject: `🛍️ ${deals.length} ofertas selecionadas para hoje — ${today}`,
            html,
            template: 'daily-deals',
          })

          if (ok) result.sent++
          else result.failed++
        }
      } else {
        result.skipped += unsegmented.length
      }
    }
  } catch (error) {
    logger.error("email-jobs.daily-deals-error", { error })
  }

  return result
}

/**
 * Sends a campaign email to all active subscribers.
 * campaignId is used for logging and deduplication.
 */
export async function runCampaignEmailJob(campaignId: string): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, skipped: 0 }

  if (!isEmailConfigured()) {
    logger.warn("email-jobs.campaign-skipped", { reason: "email not configured" })
    return result
  }

  try {
    // Check if this campaign was already sent (deduplication)
    const alreadySent = await prisma.emailLog.count({
      where: { template: `campaign:${campaignId}` },
    })

    if (alreadySent > 0) {
      logger.warn("email-jobs.campaign-already-sent", { campaignId, alreadySent })
      return result
    }

    // Get top deals for the campaign
    const genericSegment = { key: 'unsegmented', label: 'Campanha', subscribers: [] }
    const deals = await getSegmentedDeals(genericSegment)

    if (deals.length === 0) {
      logger.warn("email-jobs.campaign-no-deals")
      return result
    }

    const html = dailyDealsEmail(deals)

    const subscribers = await prisma.subscriber.findMany({
      where: { status: 'ACTIVE' },
    })

    for (const sub of subscribers) {
      const ok = await sendEmail({
        to: sub.email,
        subject: `⭐ Ofertas especiais selecionadas para você — PromoSnap`,
        html,
        template: `campaign:${campaignId}`,
      })

      if (ok) result.sent++
      else result.failed++
    }
  } catch (error) {
    logger.error("email-jobs.campaign-error", { error })
  }

  return result
}

/**
 * Sends personalized newsletter by segment.
 * Each segment receives deals tailored to their interests/tags.
 */
export async function runSegmentedNewsletterJob(): Promise<SendResult> {
  const result: SendResult = { sent: 0, failed: 0, skipped: 0 }

  if (!isEmailConfigured()) {
    logger.warn("email-jobs.newsletter-skipped", { reason: "email not configured" })
    return result
  }

  try {
    const subscribers = await prisma.subscriber.findMany({
      where: { status: 'ACTIVE' },
    })

    if (subscribers.length === 0) return result

    const segments = segmentSubscribers(subscribers)
    const sentEmails = new Set<string>()

    for (const segment of segments) {
      const deals = await getSegmentedDeals(segment)
      if (deals.length === 0) {
        result.skipped += segment.subscribers.length
        continue
      }

      const html = dailyDealsEmail(deals)
      const segmentLabel = segment.label.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()

      for (const sub of segment.subscribers) {
        if (sentEmails.has(sub.email)) continue
        sentEmails.add(sub.email)

        const ok = await sendEmail({
          to: sub.email,
          subject: `🎯 Selecionamos ofertas de ${segment.label} para você`,
          html,
          template: `newsletter:${segmentLabel}`,
        })

        if (ok) result.sent++
        else result.failed++
      }
    }

    // Count subscribers not reached
    const notReached = subscribers.filter((s) => !sentEmails.has(s.email))
    result.skipped += notReached.length
  } catch (error) {
    logger.error("email-jobs.newsletter-error", { error })
  }

  return result
}
