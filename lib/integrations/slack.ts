// ============================================
// INTEGRATIONS — Slack Notifications
// ============================================

import { sendWebhook } from './webhooks'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SlackOffer {
  productName: string
  currentPrice: number
  originalPrice?: number | null
  discount?: number
  sourceName: string
  affiliateUrl?: string | null
  productUrl: string
  imageUrl?: string | null
  couponText?: string | null
  isFreeShipping?: boolean
}

interface SlackReadiness {
  configured: boolean
  lastSent: Date | null
  lastError: string | null
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let lastSent: Date | null = null
let lastError: string | null = null

// ---------------------------------------------------------------------------
// Configuration check
// ---------------------------------------------------------------------------

export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_WEBHOOK_URL
}

export function getSlackReadiness(): SlackReadiness {
  return {
    configured: isSlackConfigured(),
    lastSent,
    lastError,
  }
}

// ---------------------------------------------------------------------------
// Send notification
// ---------------------------------------------------------------------------

export async function sendSlackNotification(
  message: string,
  channel?: string
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL

  if (!webhookUrl) {
    const err = 'SLACK_WEBHOOK_URL nao configurado'
    lastError = err
    return { success: false, error: err }
  }

  const payload: Record<string, unknown> = { text: message }
  if (channel) {
    payload.channel = channel
  }

  const result = await sendWebhook(webhookUrl, payload, { style: 'slack' })

  if (result.success) {
    lastSent = new Date()
    lastError = null
  } else {
    lastError = result.error ?? 'Erro desconhecido'
  }

  return result
}

// ---------------------------------------------------------------------------
// Format offer for Slack (Block Kit style)
// ---------------------------------------------------------------------------

export function formatOfferForSlack(offer: SlackOffer): string {
  const price = formatBRL(offer.currentPrice)
  const link = offer.affiliateUrl || offer.productUrl

  const lines: string[] = []

  // Header
  if (offer.discount && offer.discount >= 30) {
    lines.push(`:fire: *OFERTACO -${offer.discount}% OFF*`)
  } else if (offer.discount && offer.discount > 0) {
    lines.push(`:moneybag: *OFERTA -${offer.discount}% OFF*`)
  } else {
    lines.push(`:moneybag: *OFERTA*`)
  }

  lines.push('')

  // Product
  lines.push(`*${offer.productName}*`)
  lines.push('')

  // Price
  if (offer.originalPrice && offer.originalPrice > offer.currentPrice) {
    lines.push(`~De: ${formatBRL(offer.originalPrice)}~`)
    lines.push(`*Por: ${price}*`)
    const economia = formatBRL(offer.originalPrice - offer.currentPrice)
    lines.push(`:white_check_mark: Economia de ${economia}`)
  } else {
    lines.push(`*${price}*`)
  }

  lines.push('')

  // Extras
  const extras: string[] = []
  if (offer.isFreeShipping) extras.push(':package: Frete gratis')
  if (offer.couponText) extras.push(`:ticket: Cupom: ${offer.couponText}`)

  if (extras.length > 0) {
    lines.push(extras.join(' | '))
    lines.push('')
  }

  // Source
  lines.push(`:convenience_store: ${offer.sourceName}`)
  lines.push('')

  // CTA
  lines.push(`:point_right: <${link}|Ver Oferta>`)
  lines.push('')
  lines.push('_via PromoSnap_')

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}
