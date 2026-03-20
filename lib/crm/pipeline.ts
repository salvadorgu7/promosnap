/**
 * CRM Pipeline Orchestrator — the main engine that ties together:
 * 1. Signal detection (events)
 * 2. Segment classification
 * 3. Quality gates
 * 4. Message generation
 * 5. Delivery scheduling
 * 6. Audit trail
 *
 * This is the "brain" of the CRM system.
 */

import prisma from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { classifySubscriber, type SegmentResult } from './segment-engine'
import { runQualityGates, type QualityGateResult } from './quality-gates'
import { generateAlertMessage, type MessageContext, type MessageReason } from './message-generator'
import { formatPrice } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface PipelineInput {
  subscriberId: string
  email: string
  reason: MessageReason
  product?: {
    id: string
    name: string
    currentPrice: number
    previousPrice?: number
    originalPrice?: number
    discount?: number
    storeName: string
    sourceSlug: string
    affiliateUrl: string
    categoryName?: string
    brandName?: string
  }
  targetPrice?: number
}

export interface PipelineResult {
  status: 'sent' | 'queued' | 'suppressed' | 'error'
  messageId?: string
  channel?: string
  gateResult?: QualityGateResult
  segmentResult?: SegmentResult
  error?: string
}

// ============================================
// MAIN PIPELINE
// ============================================

export async function runCrmPipeline(input: PipelineInput): Promise<PipelineResult> {
  try {
    // 1. Classify subscriber
    const segment = await classifySubscriber(input.subscriberId)

    // 2. Choose channel based on segment + subscriber preferences
    const channel = segment.recommendedChannel

    // 3. Build quality gate input
    const gateResult = await runQualityGates({
      subscriberId: input.subscriberId,
      email: input.email,
      channel,
      messageType: input.reason,
      productId: input.product?.id,
      offerId: undefined,
      price: input.product?.currentPrice,
      originalPrice: input.product?.originalPrice,
      affiliateUrl: input.product?.affiliateUrl,
      sourceSlug: input.product?.sourceSlug,
    })

    // 4. If blocked, log and return
    if (!gateResult.pass) {
      await logSuppressedMessage(input, channel, gateResult)
      logger.info('[CRM] Message suppressed', {
        subscriber: input.email,
        reason: input.reason,
        blocked: gateResult.blocked,
      })
      return {
        status: 'suppressed',
        channel,
        gateResult,
        segmentResult: segment,
      }
    }

    // 5. Generate message
    const ctx: MessageContext = {
      productName: input.product?.name || 'PromoSnap',
      currentPrice: input.product?.currentPrice || 0,
      previousPrice: input.product?.previousPrice,
      targetPrice: input.targetPrice,
      discount: input.product?.discount,
      storeName: input.product?.storeName || 'PromoSnap',
      categoryName: input.product?.categoryName,
      brandName: input.product?.brandName,
      affiliateUrl: input.product?.affiliateUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'}/ofertas`,
      reason: input.reason,
    }

    // Fetch subscriber name
    const sub = await prisma.subscriber.findUnique({
      where: { id: input.subscriberId },
      select: { name: true },
    })
    if (sub?.name) ctx.subscriberName = sub.name

    const channelLower = channel === 'EMAIL' ? 'email' : channel === 'WHATSAPP' ? 'whatsapp' : 'onsite'
    const msg = generateAlertMessage(ctx, channelLower)

    // 6. Store message in audit trail
    const crmMsg = await prisma.crmMessage.create({
      data: {
        subscriberId: input.subscriberId,
        channel: channel as any,
        messageType: input.reason,
        subject: msg.subject,
        body: msg.body,
        productId: input.product?.id,
        status: 'QUEUED',
        valueScore: gateResult.valueScore,
        spamRiskScore: gateResult.spamRiskScore,
        dedupKey: gateResult.dedupKey,
      },
    })

    // 7. Send via appropriate channel
    let sendSuccess = false
    if (channel === 'EMAIL') {
      sendSuccess = await sendViaEmail(input.email, msg)
    } else if (channel === 'WHATSAPP') {
      sendSuccess = await sendViaWhatsApp(input.email, msg)
    } else {
      // ONSITE — just mark as sent, will be picked up by frontend
      sendSuccess = true
    }

    // 8. Update message status
    await prisma.crmMessage.update({
      where: { id: crmMsg.id },
      data: {
        status: sendSuccess ? 'SENT' : 'FAILED',
        sentAt: sendSuccess ? new Date() : undefined,
        errorMessage: sendSuccess ? undefined : 'Delivery failed',
      },
    })

    logger.info('[CRM] Message delivered', {
      subscriber: input.email,
      channel,
      reason: input.reason,
      messageId: crmMsg.id,
    })

    return {
      status: sendSuccess ? 'sent' : 'error',
      messageId: crmMsg.id,
      channel,
      gateResult,
      segmentResult: segment,
      error: sendSuccess ? undefined : 'Delivery failed',
    }
  } catch (err) {
    logger.error('[CRM] Pipeline error', { subscriber: input.email, reason: input.reason, err })
    return { status: 'error', error: String(err) }
  }
}

// ============================================
// DELIVERY ADAPTERS
// ============================================

async function sendViaEmail(email: string, msg: any): Promise<boolean> {
  try {
    // Use existing Resend integration
    const { sendEmail, isEmailConfigured } = await import('@/lib/email/send')
    if (!isEmailConfigured()) return false

    await sendEmail({
      to: email,
      subject: msg.subject || msg.headline,
      html: buildEmailHtml(msg),
      template: msg.channel === 'email' ? 'crm_alert' : 'crm_generic',
    })
    return true
  } catch {
    return false
  }
}

async function sendViaWhatsApp(_email: string, _msg: any): Promise<boolean> {
  // WhatsApp delivery — currently in preview mode (manual copy-paste)
  // Will be automated when WHATSAPP_API_URL + WHATSAPP_API_TOKEN are configured
  try {
    const { getReadinessStatus } = await import('@/lib/distribution/whatsapp')
    const ready = getReadinessStatus()
    if (!ready.configured) return false

    // TODO: actual API call when webhook is configured
    logger.info('[CRM] WhatsApp message formatted (preview mode)')
    return true
  } catch {
    return false
  }
}

function buildEmailHtml(msg: any): string {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="font-size: 20px; color: #1a1a2e; margin-bottom: 8px;">${msg.headline}</h1>
      <p style="font-size: 15px; color: #444; line-height: 1.6;">${msg.body}</p>
      <a href="${msg.ctaUrl}" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #6c5ce7; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">${msg.cta}</a>
      <p style="font-size: 12px; color: #999; margin-top: 24px;">${msg.reason}</p>
    </div>
  `
}

// ============================================
// SUPPRESSION LOG
// ============================================

async function logSuppressedMessage(input: PipelineInput, channel: string, gate: QualityGateResult): Promise<void> {
  try {
    await prisma.crmMessage.create({
      data: {
        subscriberId: input.subscriberId,
        channel: channel as any,
        messageType: input.reason,
        body: `[SUPPRESSED] ${gate.blocked.join(', ')}`,
        productId: input.product?.id,
        status: 'SUPPRESSED',
        valueScore: gate.valueScore,
        spamRiskScore: gate.spamRiskScore,
        dedupKey: gate.dedupKey,
      },
    })
  } catch { /* non-blocking */ }
}
