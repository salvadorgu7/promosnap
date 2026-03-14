// ============================================
// EMAIL TEMPLATES — responsive HTML email strings
// ============================================

const APP_NAME = "PromoSnap";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br";
const BRAND_COLOR = "#6366f1";
const BRAND_GRADIENT = "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)";

function baseLayout(content: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
  <!--[if mso]>
  <style>table,td{border-collapse:collapse;}</style>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: ${BRAND_GRADIENT}; padding: 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; font-weight: 700; margin: 0; }
    .header p { color: rgba(255,255,255,0.85); font-size: 13px; margin: 4px 0 0; }
    .content { padding: 32px 24px; }
    .content h2 { color: #18181b; font-size: 20px; font-weight: 700; margin: 0 0 16px; }
    .content p { color: #3f3f46; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
    .btn { display: inline-block; background: ${BRAND_GRADIENT}; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .footer { background-color: #f4f4f5; padding: 20px 24px; text-align: center; }
    .footer p { color: #71717a; font-size: 12px; line-height: 1.5; margin: 0 0 8px; }
    .footer a { color: ${BRAND_COLOR}; text-decoration: underline; }
    .deal-card { border: 1px solid #e4e4e7; border-radius: 8px; padding: 16px; margin-bottom: 12px; }
    .deal-name { color: #18181b; font-size: 14px; font-weight: 600; margin: 0 0 4px; }
    .deal-price { color: ${BRAND_COLOR}; font-size: 20px; font-weight: 700; margin: 0 0 4px; }
    .deal-discount { color: #16a34a; font-size: 13px; font-weight: 600; }
    .deal-btn { display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff !important; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 13px; font-weight: 600; margin-top: 8px; }
    .alert-box { background-color: #f0fdf4; border: 2px solid #16a34a; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 20px; }
    .alert-box .price { color: #16a34a; font-size: 28px; font-weight: 700; }
    .divider { border: none; border-top: 1px solid #e4e4e7; margin: 24px 0; }
    @media (max-width: 600px) {
      .wrapper { width: 100% !important; }
      .content { padding: 24px 16px; }
    }
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:20px 0;">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <h1>${APP_NAME}</h1>
            <p>Compare precos. Economize de verdade.</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Voce esta recebendo este e-mail porque se inscreveu no ${APP_NAME}.</p>
            <p><a href="{{unsubscribe_url}}">Cancelar inscricao</a> &middot; <a href="${APP_URL}">Visitar ${APP_NAME}</a></p>
            <p>&copy; ${new Date().getFullYear()} ${APP_NAME}. Todos os direitos reservados.</p>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Welcome email for new newsletter subscribers
 */
export function welcomeEmail(name?: string): string {
  const greeting = name ? `Ola, ${name}!` : "Ola!";

  const content = `
    <h2>${greeting} Bem-vindo ao ${APP_NAME}!</h2>
    <p>Ficamos felizes em ter voce por aqui. A partir de agora, voce recebera:</p>
    <ul style="color:#3f3f46;font-size:15px;line-height:2;padding-left:20px;">
      <li><strong>Ofertas diarias</strong> com os melhores precos verificados</li>
      <li><strong>Alertas de queda</strong> de preco dos seus produtos favoritos</li>
      <li><strong>Cupons exclusivos</strong> das principais lojas do Brasil</li>
      <li><strong>Comparativos</strong> para ajudar nas suas decisoes de compra</li>
    </ul>
    <p>Nosso objetivo e simples: ajudar voce a economizar de verdade, sem cair em falsos descontos.</p>
    <hr class="divider">
    <p style="text-align:center;">
      <a href="${APP_URL}" class="btn">Explorar Ofertas</a>
    </p>
    <hr class="divider">
    <p style="font-size:13px;color:#71717a;">
      Dica: adicione <strong>noreply@promosnap.com.br</strong> aos seus contatos para garantir que nossos e-mails nao caiam no spam.
    </p>
  `;

  return baseLayout(content, `Bem-vindo ao ${APP_NAME}! Confira as melhores ofertas.`);
}

/**
 * Daily deals digest email
 */
export function dailyDealsEmail(
  deals: Array<{ name: string; price: number; discount: number; url: string }>
): string {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const dealCards = deals
    .slice(0, 10)
    .map(
      (deal) => `
      <div class="deal-card">
        <p class="deal-name">${escapeHtml(deal.name)}</p>
        <p class="deal-price">R$ ${deal.price.toFixed(2).replace(".", ",")}</p>
        ${deal.discount > 0 ? `<p class="deal-discount">-${deal.discount}% OFF</p>` : ""}
        <a href="${escapeHtml(deal.url)}" class="deal-btn">Ver Oferta &rarr;</a>
      </div>
    `
    )
    .join("");

  const content = `
    <h2>Ofertas do Dia</h2>
    <p style="color:#71717a;font-size:13px;margin-bottom:20px;">${today}</p>
    <p>Selecionamos as ${deals.length} melhores ofertas de hoje para voce. Precos verificados e comparados em tempo real.</p>
    <hr class="divider">
    ${dealCards}
    <hr class="divider">
    <p style="text-align:center;">
      <a href="${APP_URL}/ofertas" class="btn">Ver Todas as Ofertas</a>
    </p>
  `;

  return baseLayout(content, `${deals.length} ofertas imperdíveis para hoje!`);
}

/**
 * Price alert triggered email
 */
export function alertTriggeredEmail(product: {
  name: string;
  price: number;
  targetPrice: number;
  originalPrice?: number;
  url: string;
  imageUrl?: string;
  promoSnapUrl?: string;
}): string {
  const savings = product.targetPrice - product.price;
  const savingsStr =
    savings > 0
      ? `R$ ${savings.toFixed(2).replace(".", ",")}`
      : "";

  // Calculate discount percentage from original price if available, or from target price
  const referencePrice = product.originalPrice && product.originalPrice > product.price
    ? product.originalPrice
    : product.targetPrice;
  const discountPct = referencePrice > 0
    ? Math.round(((referencePrice - product.price) / referencePrice) * 100)
    : 0;

  const economia = product.originalPrice && product.originalPrice > product.price
    ? (product.originalPrice - product.price).toFixed(2).replace(".", ",")
    : savingsStr;

  const imageBlock = product.imageUrl
    ? `<div style="text-align:center;margin-bottom:16px;">
        <img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" style="max-width:200px;max-height:200px;border-radius:8px;border:1px solid #e4e4e7;" />
      </div>`
    : "";

  const promoSnapLink = product.promoSnapUrl
    ? `<p style="text-align:center;margin:8px 0 0;">
        <a href="${escapeHtml(product.promoSnapUrl)}" style="color:${BRAND_COLOR};font-size:13px;text-decoration:underline;">Ver no ${APP_NAME} &rarr;</a>
      </p>`
    : "";

  // Price context block: originalPrice → currentPrice = economia
  const priceContextBlock = product.originalPrice && product.originalPrice > product.price
    ? `<div style="text-align:center;margin:16px 0;padding:12px;background-color:#fafafa;border-radius:8px;">
        <span style="color:#71717a;font-size:14px;text-decoration:line-through;">R$ ${product.originalPrice.toFixed(2).replace(".", ",")}</span>
        <span style="color:#71717a;font-size:14px;margin:0 8px;">&rarr;</span>
        <span style="color:#16a34a;font-size:18px;font-weight:700;">R$ ${product.price.toFixed(2).replace(".", ",")}</span>
        <span style="color:#16a34a;font-size:13px;font-weight:600;margin-left:8px;">= economia de R$ ${economia}</span>
      </div>`
    : "";

  const content = `
    ${imageBlock}
    <div class="alert-box">
      <p style="font-size:13px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">
        ${discountPct > 0 ? `${discountPct}% OFF — ` : ""}Alerta de Preco Ativado!
      </p>
      <p style="color:#18181b;font-size:16px;font-weight:600;margin:0 0 16px;">
        ${escapeHtml(product.name)}
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;">
        <tr>
          <td style="text-align:center;padding:8px;">
            <p style="color:#71717a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Seu alerta</p>
            <p style="color:#71717a;font-size:18px;font-weight:600;text-decoration:line-through;margin:0;">R$ ${product.targetPrice.toFixed(2).replace(".", ",")}</p>
          </td>
          <td style="text-align:center;padding:8px;">
            <p style="color:#16a34a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Preco atual</p>
            <p class="price" style="margin:0;">R$ ${product.price.toFixed(2).replace(".", ",")}</p>
          </td>
        </tr>
      </table>
    </div>
    ${priceContextBlock}
    ${savingsStr ? `<p style="text-align:center;color:#16a34a;font-weight:600;">Voce economiza ${savingsStr} em relacao ao preco alvo!</p>` : ""}
    <p>O produto que voce estava monitorando atingiu o preco desejado. Corra, pois precos promocionais costumam durar pouco!</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${escapeHtml(product.url)}" class="btn" style="font-size:16px;padding:16px 36px;">Aproveitar Desconto &rarr;</a>
    </p>
    ${promoSnapLink}
    <hr class="divider">
    <p style="font-size:13px;color:#71717a;">
      Este alerta foi criado por voce no ${APP_NAME}. Caso nao reconheca, pode ignorar este e-mail.
    </p>
    <p style="font-size:11px;color:#a1a1aa;">
      Para deixar de receber alertas, acesse sua conta no ${APP_NAME} e desative seus alertas de preco.
    </p>
  `;

  // Better subject line with product name and discount percentage
  const subjectDiscount = discountPct > 0 ? ` (-${discountPct}%)` : "";

  return baseLayout(
    content,
    `${product.name}${subjectDiscount} — R$ ${product.price.toFixed(2).replace(".", ",")}!`
  );
}

/**
 * Generate alert email subject line with product name and discount.
 * Useful for email sending code that needs the subject separately.
 */
export function alertEmailSubject(product: {
  name: string;
  price: number;
  originalPrice?: number;
  targetPrice: number;
}): string {
  const referencePrice = product.originalPrice && product.originalPrice > product.price
    ? product.originalPrice
    : product.targetPrice;
  const discountPct = referencePrice > 0
    ? Math.round(((referencePrice - product.price) / referencePrice) * 100)
    : 0;
  const discountStr = discountPct > 0 ? ` (-${discountPct}%)` : "";
  const shortName = product.name.length > 50 ? product.name.slice(0, 47) + "..." : product.name;
  return `${shortName}${discountStr} por R$ ${product.price.toFixed(2).replace(".", ",")} — PromoSnap`;
}

/**
 * Distribution email — single offer highlight for channel distribution
 */
export function distributionEmail(offer: {
  name: string;
  price: number;
  originalPrice?: number;
  discount: number;
  sourceName: string;
  url: string;
  isFreeShipping?: boolean;
  couponText?: string;
}): string {
  const priceStr = offer.price.toFixed(2).replace(".", ",");
  const economia =
    offer.originalPrice && offer.originalPrice > offer.price
      ? (offer.originalPrice - offer.price).toFixed(2).replace(".", ",")
      : null;

  const badges: string[] = [];
  if (offer.discount > 0) badges.push(`-${offer.discount}% OFF`);
  if (offer.isFreeShipping) badges.push("Frete gratis");
  if (offer.couponText) badges.push(`Cupom: ${escapeHtml(offer.couponText)}`);

  const badgeHtml = badges
    .map(
      (b) =>
        `<span style="display:inline-block;background-color:#f0fdf4;color:#16a34a;font-size:12px;font-weight:600;padding:4px 10px;border-radius:20px;margin-right:6px;">${b}</span>`
    )
    .join("");

  const content = `
    <div class="alert-box">
      <p style="font-size:11px;color:#16a34a;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">
        Destaque do PromoSnap
      </p>
      <p style="color:#18181b;font-size:18px;font-weight:700;margin:0 0 12px;">
        ${escapeHtml(offer.name)}
      </p>
      ${
        offer.originalPrice && offer.originalPrice > offer.price
          ? `<p style="color:#71717a;font-size:13px;text-decoration:line-through;margin:0 0 4px;">De: R$ ${offer.originalPrice.toFixed(2).replace(".", ",")}</p>`
          : ""
      }
      <p class="price">R$ ${priceStr}</p>
      ${economia ? `<p style="color:#16a34a;font-size:14px;font-weight:600;margin:4px 0 0;">Voce economiza R$ ${economia}</p>` : ""}
    </div>
    ${badgeHtml ? `<p style="margin:16px 0;">${badgeHtml}</p>` : ""}
    <p>Encontramos esta oferta na <strong>${escapeHtml(offer.sourceName)}</strong> e ela passou pelos nossos criterios de qualidade e confiabilidade.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${escapeHtml(offer.url)}" class="btn">Ver Oferta &rarr;</a>
    </p>
    <hr class="divider">
    <p style="font-size:13px;color:#71717a;">
      Esta oferta foi selecionada automaticamente pelo sistema de distribuicao do ${APP_NAME} com base em score de qualidade, desconto e confiabilidade da fonte.
    </p>
  `;

  return baseLayout(
    content,
    `${offer.name} por R$ ${priceStr} — oferta selecionada!`
  );
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
