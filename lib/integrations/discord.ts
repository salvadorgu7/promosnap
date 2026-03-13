// ============================================
// INTEGRATIONS — Discord Notifications
// ============================================

import { sendWebhook } from './webhooks'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DiscordOffer {
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

interface DiscordReadiness {
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

export function isDiscordConfigured(): boolean {
  return !!process.env.DISCORD_WEBHOOK_URL
}

export function getDiscordReadiness(): DiscordReadiness {
  return {
    configured: isDiscordConfigured(),
    lastSent,
    lastError,
  }
}

// ---------------------------------------------------------------------------
// Send notification
// ---------------------------------------------------------------------------

export async function sendDiscordNotification(
  message: string
): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL

  if (!webhookUrl) {
    const err = 'DISCORD_WEBHOOK_URL nao configurado'
    lastError = err
    return { success: false, error: err }
  }

  const result = await sendWebhook(webhookUrl, { content: message }, { style: 'discord' })

  if (result.success) {
    lastSent = new Date()
    lastError = null
  } else {
    lastError = result.error ?? 'Erro desconhecido'
  }

  return result
}

// ---------------------------------------------------------------------------
// Format offer for Discord (embed style as text)
// ---------------------------------------------------------------------------

export function formatOfferForDiscord(offer: DiscordOffer): string {
  const price = formatBRL(offer.currentPrice)
  const link = offer.affiliateUrl || offer.productUrl

  const lines: string[] = []

  // Header
  if (offer.discount && offer.discount >= 30) {
    lines.push(`**OFERTACO -${offer.discount}% OFF**`)
  } else if (offer.discount && offer.discount > 0) {
    lines.push(`**OFERTA -${offer.discount}% OFF**`)
  } else {
    lines.push(`**OFERTA**`)
  }

  lines.push('')

  // Product
  lines.push(`**${offer.productName}**`)
  lines.push('')

  // Price
  if (offer.originalPrice && offer.originalPrice > offer.currentPrice) {
    lines.push(`~~De: ${formatBRL(offer.originalPrice)}~~`)
    lines.push(`**Por: ${price}**`)
    const economia = formatBRL(offer.originalPrice - offer.currentPrice)
    lines.push(`Economia de ${economia}`)
  } else {
    lines.push(`**${price}**`)
  }

  lines.push('')

  // Extras
  const extras: string[] = []
  if (offer.isFreeShipping) extras.push('Frete gratis')
  if (offer.couponText) extras.push(`Cupom: ${offer.couponText}`)

  if (extras.length > 0) {
    lines.push(extras.join(' | '))
    lines.push('')
  }

  // Source
  lines.push(`Loja: ${offer.sourceName}`)
  lines.push('')

  // CTA + image
  lines.push(`[Ver Oferta](${link})`)

  if (offer.imageUrl) {
    lines.push('')
    lines.push(offer.imageUrl)
  }

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
