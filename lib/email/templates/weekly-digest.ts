/**
 * Weekly Digest Email Template — personalized weekly summary.
 *
 * Shows: price drops on tracked products, top deals of the week,
 * new products in user's categories, and trending items.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'

export interface DigestProduct {
  name: string
  slug: string
  price: number
  originalPrice?: number
  discount?: number
  source: string
  imageUrl?: string
  affiliateUrl: string
}

export interface WeeklyDigestData {
  userName?: string
  priceDrops: DigestProduct[]
  topDeals: DigestProduct[]
  newProducts: DigestProduct[]
  totalSavings?: number
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function productRow(p: DigestProduct): string {
  const discount = p.discount && p.discount > 0 ? ` <span style="color:#dc2626;font-weight:700;">-${p.discount}%</span>` : ''

  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            ${p.imageUrl ? `<td width="60" style="vertical-align:top;padding-right:12px;">
              <img src="${p.imageUrl}" alt="" width="56" height="56" style="border-radius:8px;object-fit:contain;background:#f9fafb;" />
            </td>` : ''}
            <td style="vertical-align:top;">
              <a href="${p.affiliateUrl}" style="color:#1a1a2e;text-decoration:none;font-size:13px;font-weight:600;line-height:1.3;">
                ${p.name.slice(0, 60)}
              </a>
              <div style="margin-top:4px;">
                <span style="font-size:15px;font-weight:800;color:#059669;">${formatBRL(p.price)}</span>
                ${discount}
                <span style="font-size:11px;color:#9ca3af;margin-left:6px;">${p.source}</span>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`
}

export function renderWeeklyDigest(data: WeeklyDigestData): string {
  const greeting = data.userName ? `Olá, ${data.userName}!` : 'Olá!'
  const hasPriceDrops = data.priceDrops.length > 0
  const hasTopDeals = data.topDeals.length > 0
  const hasNewProducts = data.newProducts.length > 0

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Resumo Semanal — PromoSnap</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f5f3ff;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:22px;font-weight:800;color:#a855f7;">PromoSnap</div>
      <div style="font-size:12px;color:#9ca3af;margin-top:4px;">Resumo Semanal</div>
    </div>

    <!-- Greeting -->
    <div style="background:white;border-radius:16px;padding:24px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
      <h2 style="margin:0 0 8px;font-size:18px;color:#1a1a2e;">${greeting}</h2>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.5;">
        Aqui está o resumo da semana com as melhores oportunidades para você.
        ${data.totalSavings ? `Economia potencial: <strong style="color:#059669;">${formatBRL(data.totalSavings)}</strong>` : ''}
      </p>
    </div>

    ${hasPriceDrops ? `
    <!-- Price Drops -->
    <div style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
      <h3 style="margin:0 0 12px;font-size:14px;color:#1a1a2e;">
        ⬇️ Preços que caíram
      </h3>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${data.priceDrops.slice(0, 3).map(productRow).join('')}
      </table>
    </div>` : ''}

    ${hasTopDeals ? `
    <!-- Top Deals -->
    <div style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
      <h3 style="margin:0 0 12px;font-size:14px;color:#1a1a2e;">
        🔥 Melhores ofertas da semana
      </h3>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${data.topDeals.slice(0, 5).map(productRow).join('')}
      </table>
    </div>` : ''}

    ${hasNewProducts ? `
    <!-- New Products -->
    <div style="background:white;border-radius:16px;padding:20px;margin-bottom:16px;box-shadow:0 1px 4px rgba(0,0,0,0.04);">
      <h3 style="margin:0 0 12px;font-size:14px;color:#1a1a2e;">
        ✨ Novidades no catálogo
      </h3>
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${data.newProducts.slice(0, 3).map(productRow).join('')}
      </table>
    </div>` : ''}

    <!-- CTA -->
    <div style="text-align:center;margin:24px 0;">
      <a href="${APP_URL}/ofertas" style="display:inline-block;background:#a855f7;color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700;">
        Ver todas as ofertas →
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;font-size:11px;color:#9ca3af;line-height:1.5;">
      <p>
        <a href="{{unsubscribe_url}}" style="color:#a855f7;text-decoration:underline;">Cancelar emails</a>
        &nbsp;·&nbsp;
        <a href="${APP_URL}/alertas" style="color:#a855f7;text-decoration:underline;">Gerenciar alertas</a>
      </p>
      <p>PromoSnap — Comparação de preços inteligente 🇧🇷</p>
    </div>

  </div>
</body>
</html>`
}

export function renderWeeklyDigestSubject(data: WeeklyDigestData): string {
  if (data.priceDrops.length > 0) {
    return `⬇️ ${data.priceDrops.length} produtos caíram de preço — Resumo Semanal PromoSnap`
  }
  if (data.topDeals.length > 0) {
    return `🔥 ${data.topDeals.length} ofertas imperdíveis — Resumo Semanal PromoSnap`
  }
  return `📊 Seu resumo semanal — PromoSnap`
}
