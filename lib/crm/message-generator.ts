/**
 * CRM Message Generator — creates contextual messages for alerts, digests,
 * and campaigns across email, WhatsApp, and on-site channels.
 *
 * Uses deterministic templates as primary, with optional LLM enhancement
 * when OPENAI_API_KEY is available.
 */

import { formatPrice } from '@/lib/utils'

// ============================================
// TYPES
// ============================================

export interface MessageContext {
  productName: string
  currentPrice: number
  previousPrice?: number
  targetPrice?: number
  discount?: number
  storeName: string
  categoryName?: string
  brandName?: string
  affiliateUrl: string
  subscriberName?: string
  reason: MessageReason
}

export type MessageReason =
  | 'alert_triggered'      // Price hit target
  | 'price_drop'           // Significant drop detected
  | 'lowest_ever'          // All-time low
  | 'near_target'          // Within 5% of target
  | 'alternative_better'   // Better option appeared
  | 'back_in_stock'        // Was out, now available
  | 'weekly_digest'        // Weekly summary
  | 'daily_radar'          // Daily hot picks
  | 'welcome'              // New subscriber
  | 'reengagement'         // Inactive user

export interface GeneratedMessage {
  subject?: string    // Email subject
  preheader?: string  // Email preheader
  headline: string    // Primary headline
  body: string        // Main message body
  cta: string         // CTA text
  ctaUrl: string      // CTA link
  reason: string      // Why user received this
  channel: 'email' | 'whatsapp' | 'onsite'
}

// ============================================
// GENERATORS
// ============================================

export function generateAlertMessage(ctx: MessageContext, channel: 'email' | 'whatsapp' | 'onsite'): GeneratedMessage {
  const drop = ctx.previousPrice && ctx.currentPrice < ctx.previousPrice
    ? Math.round(((ctx.previousPrice - ctx.currentPrice) / ctx.previousPrice) * 100)
    : ctx.discount

  const priceStr = formatPrice(ctx.currentPrice)
  const name = ctx.subscriberName ? `, ${ctx.subscriberName}` : ''

  const headlines: Record<MessageReason, string> = {
    alert_triggered: `${ctx.productName} chegou no seu preco-alvo!`,
    price_drop: `${ctx.productName} caiu ${drop}%`,
    lowest_ever: `Menor preco historico: ${ctx.productName}`,
    near_target: `${ctx.productName} quase no seu preco-alvo`,
    alternative_better: `Alternativa melhor para ${ctx.productName}`,
    back_in_stock: `${ctx.productName} voltou ao estoque`,
    weekly_digest: `Seu radar semanal esta pronto${name}`,
    daily_radar: `Top quedas de hoje para voce${name}`,
    welcome: `Bem-vindo ao PromoSnap${name}!`,
    reengagement: `Sentimos sua falta${name}`,
  }

  const bodies: Record<MessageReason, string> = {
    alert_triggered: `O produto ${ctx.productName} agora custa ${priceStr} na ${ctx.storeName}. Voce definiu um alerta para ${ctx.targetPrice ? formatPrice(ctx.targetPrice) : 'esse preco'} e ele chegou!`,
    price_drop: `${ctx.productName} caiu de ${ctx.previousPrice ? formatPrice(ctx.previousPrice) : '?'} para ${priceStr} na ${ctx.storeName}${drop ? ` (-${drop}%)` : ''}. Esse e um bom momento para comprar.`,
    lowest_ever: `${ctx.productName} esta a ${priceStr} na ${ctx.storeName} — o menor preco que ja registramos. Historicamente nao fica nesse patamar por muito tempo.`,
    near_target: `${ctx.productName} esta a ${priceStr} na ${ctx.storeName}, quase no preco que voce queria. Faltam apenas ${ctx.targetPrice ? formatPrice(ctx.currentPrice - ctx.targetPrice) : 'centavos'} para o alvo.`,
    alternative_better: `Encontramos uma opcao melhor que pode te interessar: ${ctx.productName} a ${priceStr} na ${ctx.storeName}.`,
    back_in_stock: `${ctx.productName} voltou a ficar disponivel na ${ctx.storeName} por ${priceStr}.`,
    weekly_digest: `Estas sao as melhores oportunidades da semana baseadas nos seus interesses.`,
    daily_radar: `Veja as maiores quedas de preco de hoje nos produtos que voce acompanha.`,
    welcome: `Agora voce recebera alertas inteligentes de preco e as melhores oportunidades de compra. Crie seus primeiros alertas para comecar a economizar.`,
    reengagement: `Ja faz um tempo que voce nao aparece. Muita coisa mudou de preco — talvez valha dar uma olhada.`,
  }

  const ctas: Record<MessageReason, string> = {
    alert_triggered: 'Ver oferta agora',
    price_drop: 'Aproveitar queda',
    lowest_ever: 'Garantir menor preco',
    near_target: 'Ver preco atual',
    alternative_better: 'Comparar alternativa',
    back_in_stock: 'Ver disponibilidade',
    weekly_digest: 'Ver seu radar',
    daily_radar: 'Ver quedas do dia',
    welcome: 'Criar primeiro alerta',
    reengagement: 'Ver o que mudou',
  }

  const reasons: Record<MessageReason, string> = {
    alert_triggered: 'Voce criou um alerta de preco para este produto.',
    price_drop: 'Este produto esta nos seus interesses e teve uma queda significativa.',
    lowest_ever: 'Monitoramos este produto e ele atingiu o menor preco historico.',
    near_target: 'O preco esta proximo do alvo que voce definiu.',
    alternative_better: 'Baseado no que voce pesquisou, encontramos uma alternativa.',
    back_in_stock: 'Voce demonstrou interesse neste produto que estava indisponivel.',
    weekly_digest: 'Voce assinou o radar semanal do PromoSnap.',
    daily_radar: 'Voce assinou o radar diario do PromoSnap.',
    welcome: 'Voce se cadastrou no PromoSnap.',
    reengagement: 'Voce se cadastrou no PromoSnap e gostariamos de te manter informado.',
  }

  const headline = headlines[ctx.reason] || ctx.productName
  const body = bodies[ctx.reason] || ''
  const cta = ctas[ctx.reason] || 'Ver no PromoSnap'
  const reason = reasons[ctx.reason] || 'Voce recebeu esta mensagem por ser assinante do PromoSnap.'

  // Channel-specific formatting
  if (channel === 'whatsapp') {
    return {
      headline,
      body: formatWhatsApp(headline, body, cta, ctx.affiliateUrl, reason),
      cta,
      ctaUrl: ctx.affiliateUrl,
      reason,
      channel: 'whatsapp',
    }
  }

  return {
    subject: headline,
    preheader: body.substring(0, 100),
    headline,
    body,
    cta,
    ctaUrl: ctx.affiliateUrl,
    reason,
    channel,
  }
}

// ============================================
// WHATSAPP FORMATTER
// ============================================

function formatWhatsApp(headline: string, body: string, cta: string, url: string, reason: string): string {
  const lines = [
    headline,
    '',
    body,
    '',
    `${cta}: ${url}`,
    '',
    `_${reason}_`,
    '',
    'Responda PARAR para nao receber mais.',
  ]
  return lines.join('\n')
}

// ============================================
// DIGEST GENERATORS
// ============================================

export interface DigestItem {
  productName: string
  currentPrice: number
  previousPrice?: number
  discount?: number
  storeName: string
  affiliateUrl: string
}

export function generateWeeklyDigest(
  items: DigestItem[],
  subscriberName?: string,
): GeneratedMessage {
  const name = subscriberName ? `, ${subscriberName}` : ''
  const topItems = items.slice(0, 5)

  const itemLines = topItems.map((item, i) => {
    const drop = item.discount ? ` (-${item.discount}%)` : ''
    return `${i + 1}. ${item.productName} — ${formatPrice(item.currentPrice)}${drop} na ${item.storeName}`
  })

  return {
    subject: `Seu radar semanal${name} — ${items.length} oportunidades`,
    preheader: topItems[0] ? `${topItems[0].productName} a ${formatPrice(topItems[0].currentPrice)}` : 'Veja as melhores ofertas da semana',
    headline: `Radar da Semana${name}`,
    body: [
      `Encontramos ${items.length} oportunidades nos seus interesses esta semana:`,
      '',
      ...itemLines,
      '',
      items.length > 5 ? `E mais ${items.length - 5} ofertas...` : '',
    ].filter(Boolean).join('\n'),
    cta: 'Ver todas as ofertas',
    ctaUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'}/ofertas`,
    reason: 'Voce assinou o radar semanal do PromoSnap.',
    channel: 'email',
  }
}
