/**
 * Price Drop Email Template — beautiful, mobile-friendly HTML email.
 *
 * Sent when a tracked product drops in price significantly.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.promosnap.com.br'

export interface PriceDropEmailData {
  productName: string
  slug: string
  imageUrl?: string
  oldPrice: number
  newPrice: number
  discount: number
  source: string
  affiliateUrl: string
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

export function renderPriceDropEmail(data: PriceDropEmailData): string {
  const savings = formatBRL(data.oldPrice - data.newPrice)
  const productUrl = `${APP_URL}/produto/${data.slug}`

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Preço caiu! ${data.productName}</title>
</head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f5f3ff;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#a855f7;color:white;padding:6px 16px;border-radius:20px;font-size:13px;font-weight:700;letter-spacing:0.5px;">
        🔔 ALERTA DE PREÇO
      </div>
    </div>

    <!-- Main Card -->
    <div style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">

      <!-- Product Image -->
      ${data.imageUrl ? `
      <div style="background:#faf5ff;padding:20px;text-align:center;">
        <img src="${data.imageUrl}" alt="${data.productName}" style="max-width:200px;max-height:180px;object-fit:contain;" />
      </div>` : ''}

      <!-- Content -->
      <div style="padding:24px;">
        <h2 style="margin:0 0 8px;font-size:16px;color:#1a1a2e;line-height:1.4;">
          ${data.productName}
        </h2>

        <p style="margin:0 0 16px;font-size:12px;color:#6b7280;">
          ${data.source}
        </p>

        <!-- Price Block -->
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;margin-bottom:20px;">
          <div style="font-size:13px;color:#6b7280;text-decoration:line-through;margin-bottom:4px;">
            ${formatBRL(data.oldPrice)}
          </div>
          <div style="font-size:28px;font-weight:800;color:#059669;margin-bottom:4px;">
            ${formatBRL(data.newPrice)}
          </div>
          <div style="display:inline-block;background:#dc2626;color:white;padding:3px 10px;border-radius:12px;font-size:12px;font-weight:700;">
            -${data.discount}% OFF
          </div>
          <div style="margin-top:8px;font-size:12px;color:#059669;font-weight:600;">
            Você economiza ${savings}
          </div>
        </div>

        <!-- CTA -->
        <a href="${data.affiliateUrl}" style="display:block;background:#a855f7;color:white;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-size:15px;font-weight:700;margin-bottom:12px;">
          Ver oferta →
        </a>

        <a href="${productUrl}" style="display:block;text-align:center;font-size:12px;color:#a855f7;text-decoration:none;">
          Ver histórico de preço no PromoSnap
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:24px;font-size:11px;color:#9ca3af;line-height:1.5;">
      <p>Você recebeu este email porque criou um alerta de preço no PromoSnap.</p>
      <p>
        <a href="{{unsubscribe_url}}" style="color:#a855f7;text-decoration:underline;">Cancelar alertas</a>
        &nbsp;·&nbsp;
        <a href="${APP_URL}/alertas" style="color:#a855f7;text-decoration:underline;">Gerenciar alertas</a>
      </p>
      <p style="margin-top:8px;">PromoSnap — Comparação de preços inteligente</p>
    </div>

  </div>
</body>
</html>`
}

export function renderPriceDropSubject(data: PriceDropEmailData): string {
  return `⬇️ ${data.productName.slice(0, 40)} caiu ${data.discount}% — agora ${formatBRL(data.newPrice)}`
}
