// ============================================
// WhatsApp Broadcast — Message Composer
// Monta mensagens completas por estrutura e contexto
// ============================================

import type {
  SelectedOffer,
  ComposedMessage,
  MessageStructure,
  MessageTonality,
  TimeWindow,
  GroupType,
  BroadcastChannel,
  BroadcastCampaign,
} from "./types"
import {
  getOpening,
  getTimeWindowOpening,
  getTransition,
  getCta,
  getGroupHeader,
  detectTimeWindow,
  getRecommendedTonality,
  getRecommendedStructure,
} from "./templates"
import type { AiMiniCopy } from "./ai-copy"

// ============================================
// Price formatting (pt-BR)
// ============================================

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`
}

function formatDiscount(discount: number): string {
  return `-${discount}%`
}

// ============================================
// Single offer formatting
// ============================================

function formatOfferLine(offer: SelectedOffer, showPosition: boolean = false): string {
  const lines: string[] = []
  const prefix = showPosition ? `${offer.position + 1}. ` : ""

  // Product name (truncate for mobile-first)
  const name = offer.productName.length > 80
    ? offer.productName.slice(0, 77) + "..."
    : offer.productName

  lines.push(`${prefix}*${name}*`)

  // Price block
  if (offer.originalPrice && offer.discount > 0) {
    const economia = formatBRL(offer.originalPrice - offer.currentPrice)
    lines.push(`~${formatBRL(offer.originalPrice)}~ por *${formatBRL(offer.currentPrice)}* (${formatDiscount(offer.discount)} | -${economia})`)
  } else {
    lines.push(`*${formatBRL(offer.currentPrice)}*`)
  }

  // Extras on same line for compactness
  const extras: string[] = []
  if (offer.isFreeShipping) extras.push("Frete gratis")
  if (offer.couponText) extras.push(`Cupom: ${offer.couponText}`)
  if (extras.length > 0) {
    lines.push(extras.join(" | "))
  }

  // Store + link
  lines.push(`${offer.sourceName} -> ${offer.affiliateUrl}`)

  return lines.join("\n")
}

/**
 * Format hero offer (larger, more prominent).
 */
function formatHeroOffer(offer: SelectedOffer): string {
  const lines: string[] = []

  const name = offer.productName.length > 100
    ? offer.productName.slice(0, 97) + "..."
    : offer.productName

  lines.push(`*${name}*`)
  lines.push("")

  if (offer.originalPrice && offer.discount > 0) {
    const economia = formatBRL(offer.originalPrice - offer.currentPrice)
    lines.push(`De: ~${formatBRL(offer.originalPrice)}~`)
    lines.push(`Por: *${formatBRL(offer.currentPrice)}*`)
    lines.push(`Economia de *${economia}* (${formatDiscount(offer.discount)})`)
  } else {
    lines.push(`*${formatBRL(offer.currentPrice)}*`)
  }

  const extras: string[] = []
  if (offer.isFreeShipping) extras.push("Frete gratis")
  if (offer.couponText) extras.push(`Cupom: ${offer.couponText}`)
  if (offer.rating && offer.rating >= 4.0) extras.push(`Nota ${offer.rating.toFixed(1)}/5`)
  if (extras.length > 0) {
    lines.push(extras.join(" | "))
  }

  lines.push("")
  lines.push(`${offer.sourceName}`)
  lines.push(`${offer.affiliateUrl}`)

  return lines.join("\n")
}

// ============================================
// Composer por estrutura
// ============================================

/**
 * Estrutura A — Shortlist direta
 * 1. abertura curta
 * 2. 3 a 5 itens
 * 3. CTA final
 */
function composeShortlist(
  offers: SelectedOffer[],
  tonality: MessageTonality,
  timeWindow: TimeWindow,
  groupType: GroupType,
): string {
  const lines: string[] = []

  // Header
  const header = getGroupHeader(groupType)
  lines.push(`*${header}*`)
  lines.push("")

  // Opening
  lines.push(getTimeWindowOpening(timeWindow))
  lines.push("")

  // Items
  for (const offer of offers) {
    lines.push(formatOfferLine(offer, true))
    lines.push("")
  }

  // CTA
  lines.push(getCta("click"))

  return lines.join("\n")
}

/**
 * Estrutura B — Radar com contexto
 * 1. linha de abertura
 * 2. observacao curta do momento
 * 3. bloco principal
 * 4. outras opcoes
 * 5. CTA final
 */
function composeRadar(
  offers: SelectedOffer[],
  tonality: MessageTonality,
  timeWindow: TimeWindow,
  groupType: GroupType,
): string {
  const lines: string[] = []

  // Header
  const header = getGroupHeader(groupType)
  lines.push(`*${header}*`)
  lines.push("")

  // Opening with context
  lines.push(getOpening(tonality))
  lines.push("")

  // Context observation
  const topDiscount = Math.max(...offers.map(o => o.discount))
  if (topDiscount >= 30) {
    lines.push(`Destaque para descontos de ate ${topDiscount}% nesta rodada.`)
    lines.push("")
  }

  // Main offers (first 3)
  const main = offers.slice(0, 3)
  for (const offer of main) {
    lines.push(formatOfferLine(offer, true))
    lines.push("")
  }

  // Secondary offers (rest)
  const secondary = offers.slice(3)
  if (secondary.length > 0) {
    lines.push(getTransition())
    lines.push("")
    for (const offer of secondary) {
      lines.push(formatOfferLine(offer, true))
      lines.push("")
    }
  }

  // CTA
  lines.push(getCta("site"))

  return lines.join("\n")
}

/**
 * Estrutura C — Hero + apoio
 * 1. item hero
 * 2. 2 a 4 apoios
 * 3. CTA final
 */
function composeHero(
  offers: SelectedOffer[],
  tonality: MessageTonality,
  timeWindow: TimeWindow,
  groupType: GroupType,
): string {
  const lines: string[] = []

  if (offers.length === 0) return ""

  // Pick hero: highest discount or highest score
  const hero = offers.reduce((best, o) =>
    o.discount > best.discount ? o : best
  , offers[0])
  const support = offers.filter(o => o.offerId !== hero.offerId).slice(0, 4)

  // Header
  lines.push(`*${getGroupHeader(groupType)}*`)
  lines.push("")

  // Opening
  lines.push(getOpening(tonality))
  lines.push("")

  // Hero
  lines.push("DESTAQUE")
  lines.push("")
  lines.push(formatHeroOffer(hero))
  lines.push("")

  // Support offers
  if (support.length > 0) {
    lines.push(getTransition())
    lines.push("")
    for (const offer of support) {
      lines.push(formatOfferLine(offer, true))
      lines.push("")
    }
  }

  // CTA
  lines.push(getCta("click"))

  return lines.join("\n")
}

/**
 * Estrutura D — Comparativo rapido
 * 1. abertura por perfil
 * 2. item 1
 * 3. item 2
 * 4. opcional item 3
 * 5. conclusao curta
 * 6. CTA final
 */
function composeComparativo(
  offers: SelectedOffer[],
  tonality: MessageTonality,
  timeWindow: TimeWindow,
  groupType: GroupType,
): string {
  const lines: string[] = []

  // Take 2-3 items for comparison
  const items = offers.slice(0, 3)

  lines.push(`*${getGroupHeader(groupType)}*`)
  lines.push("")
  lines.push("Comparando opcoes similares:")
  lines.push("")

  for (let i = 0; i < items.length; i++) {
    const offer = items[i]
    const label = i === 0 ? "Opcao A" : i === 1 ? "Opcao B" : "Opcao C"
    lines.push(`*${label}: ${offer.sourceName}*`)
    lines.push(formatOfferLine(offer, false))
    lines.push("")
  }

  // Conclusion
  const cheapest = items.reduce((c, o) => o.currentPrice < c.currentPrice ? o : c, items[0])
  lines.push(`Menor preco: ${cheapest.sourceName} por ${formatBRL(cheapest.currentPrice)}`)
  lines.push("")

  // CTA
  lines.push(getCta("click"))

  return lines.join("\n")
}

/**
 * Estrutura E — Resumo semanal
 * 1. abertura semanal
 * 2. top 3
 * 3. outras boas
 * 4. categoria quente
 * 5. CTA final
 */
function composeResumo(
  offers: SelectedOffer[],
  tonality: MessageTonality,
  timeWindow: TimeWindow,
  groupType: GroupType,
): string {
  const lines: string[] = []

  lines.push(`*Resumo da semana — ${getGroupHeader(groupType)}*`)
  lines.push("")
  lines.push("As melhores que passaram pelo radar esta semana:")
  lines.push("")

  // Top 3
  const top = offers.slice(0, 3)
  lines.push("*Top 3:*")
  for (const offer of top) {
    lines.push(formatOfferLine(offer, true))
    lines.push("")
  }

  // Others
  const others = offers.slice(3)
  if (others.length > 0) {
    lines.push("*Tambem merecem olhar:*")
    for (const offer of others) {
      lines.push(formatOfferLine(offer, true))
      lines.push("")
    }
  }

  // CTA
  lines.push(getCta("recurrence"))

  return lines.join("\n")
}

// ============================================
// Main compose function
// ============================================

export interface ComposeOptions {
  offers: SelectedOffer[]
  channel: BroadcastChannel
  campaign?: BroadcastCampaign | null
  structure?: MessageStructure
  tonality?: MessageTonality
  timeWindow?: TimeWindow
}

/**
 * Compose a complete broadcast message.
 * Auto-detects time window, tonality, and structure if not provided.
 */
export function composeMessage(options: ComposeOptions): ComposedMessage {
  const {
    offers,
    channel,
    campaign,
  } = options

  const timeWindow = options.timeWindow || detectTimeWindow()
  const tonality = options.tonality || channel.tonality || getRecommendedTonality(timeWindow)
  const structure = options.structure || campaign?.structureType || channel.templateMode || getRecommendedStructure(timeWindow)
  const groupType = channel.groupType || "geral"

  // Compose based on structure
  let text: string
  switch (structure) {
    case "shortlist":
      text = composeShortlist(offers, tonality, timeWindow, groupType)
      break
    case "radar":
      text = composeRadar(offers, tonality, timeWindow, groupType)
      break
    case "hero":
      text = composeHero(offers, tonality, timeWindow, groupType)
      break
    case "comparativo":
      text = composeComparativo(offers, tonality, timeWindow, groupType)
      break
    case "resumo":
      text = composeResumo(offers, tonality, timeWindow, groupType)
      break
    default:
      text = composeShortlist(offers, tonality, timeWindow, groupType)
  }

  // Add footer
  text += "\n\n-- PromoSnap"

  return {
    text,
    offers,
    structure,
    opening: getTimeWindowOpening(timeWindow),
    cta: getCta("click"),
    transition: offers.length > 3 ? getTransition() : null,
    channelId: channel.id,
    campaignId: campaign?.id || null,
    templateKey: `${structure}_${tonality}_${timeWindow}`,
  }
}

// ============================================
// Single product message (1 msg = 1 produto + imagem)
// ============================================

export interface SingleOfferMessage {
  text: string
  imageUrl: string | null
  offer: SelectedOffer
  channelId: string
  campaignId: string | null
}

/**
 * URL curta para o produto via PromoSnap (em vez de URL longa da loja).
 */
function shortProductUrl(offer: SelectedOffer): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://promosnap.com.br"
  return `${appUrl}/produto/${offer.productSlug}`
}

/**
 * Compõe mensagem individual para 1 produto.
 * Formato otimizado para WhatsApp: caption da imagem.
 * Visual, com emojis, preço destaque, link curto e minicopy IA.
 *
 * @param miniCopy — se fornecido, inclui hook + highlight gerados via IA.
 *                   Se não, a mensagem fica sem minicopy (ainda funcional).
 */
export function composeSingleOffer(
  offer: SelectedOffer,
  channel: BroadcastChannel,
  campaign?: BroadcastCampaign | null,
  tonality?: MessageTonality,
  miniCopy?: AiMiniCopy | null,
): SingleOfferMessage {
  const lines: string[] = []

  // ── Discount badge (headline) ──
  if (offer.discount >= 40) {
    lines.push(`🚨🔥 *${offer.discount}% OFF — BAIXOU MUITO*`)
  } else if (offer.discount >= 25) {
    lines.push(`🔥 *${offer.discount}% OFF*`)
  } else if (offer.discount >= 10) {
    lines.push(`⚡ *${offer.discount}% OFF*`)
  } else if (offer.discount > 0) {
    lines.push(`💰 *${offer.discount}% OFF*`)
  } else {
    lines.push(`💎 *Preço destaque*`)
  }

  // ── AI Hook (minicopy) ──
  if (miniCopy?.hook) {
    lines.push(`✨ _${miniCopy.hook}_`)
  }

  lines.push("")

  // ── Product name (bold, truncated for mobile) ──
  const name = offer.productName.length > 90
    ? offer.productName.slice(0, 87) + "..."
    : offer.productName
  lines.push(`*${name}*`)
  lines.push("")

  // ── Price block ──
  if (offer.originalPrice && offer.discount > 0) {
    const economia = formatBRL(offer.originalPrice - offer.currentPrice)
    lines.push(`~~${formatBRL(offer.originalPrice)}~~ ➜ *${formatBRL(offer.currentPrice)}*`)
    lines.push(`💸 Você economiza *${economia}*`)
  } else {
    lines.push(`💲 *${formatBRL(offer.currentPrice)}*`)
  }

  // ── AI Highlight (contextual) ──
  if (miniCopy?.highlight) {
    lines.push(`📌 ${miniCopy.highlight}`)
  }

  // ── Extras (frete, cupom, nota) ──
  const extras: string[] = []
  if (offer.isFreeShipping) extras.push("📦 Frete grátis")
  if (offer.couponText) extras.push(`🎟️ Cupom: *${offer.couponText}*`)
  if (offer.rating && offer.rating >= 4.0) extras.push(`⭐ ${offer.rating.toFixed(1)}/5`)
  if (extras.length > 0) {
    lines.push(extras.join("  "))
  }

  lines.push("")

  // ── Store ──
  lines.push(`🏪 ${offer.sourceName}`)
  lines.push("")

  // ── Links (curto do PromoSnap + direto da loja) ──
  lines.push(`👉 ${shortProductUrl(offer)}`)

  lines.push("")
  lines.push(`_PromoSnap — Comparação de preços inteligente_`)

  return {
    text: lines.join("\n"),
    imageUrl: offer.imageUrl,
    offer,
    channelId: channel.id,
    campaignId: campaign?.id || null,
  }
}
