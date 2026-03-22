// ============================================
// EMAIL TEMPLATES — responsive HTML com design moderno
// Todas as copys em português do Brasil com acentuação correta
// ============================================

import type { PersonalizedDigestData } from "./personalized-digest"

const APP_NAME = "PromoSnap";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br";
const BRAND_COLOR = "#7c3aed"; // purple-600
const BRAND_LIGHT = "#ede9fe"; // purple-50
const GREEN = "#059669";
const GREEN_LIGHT = "#ecfdf5";
const RED = "#dc2626";
const GRAY = "#6b7280";
const GRAY_LIGHT = "#f9fafb";
const TEXT_PRIMARY = "#1a1a2e";

/** Formata preço em BRL */
function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

/** Append UTM parameters to a URL for email tracking */
function addUTM(url: string, template: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "email");
    u.searchParams.set("utm_medium", "digest");
    u.searchParams.set("utm_campaign", template);
    return u.toString();
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}utm_source=email&utm_medium=digest&utm_campaign=${template}`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/** Trunca nome do produto para caber no email */
function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

// ============================================
// BASE LAYOUT — moderno, card-based
// ============================================

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
</head>
<body style="margin:0;padding:0;background-color:#f5f3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  ${preheader ? `<div style="display:none;font-size:1px;color:#f5f3ff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">${preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f3ff;padding:24px 0;">
    <tr>
      <td align="center">
        <div style="max-width:560px;margin:0 auto;padding:0 16px;">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:24px;font-weight:800;color:${BRAND_COLOR};">${APP_NAME}</div>
            <div style="font-size:12px;color:${GRAY};margin-top:4px;">Comparação de preços inteligente 🇧🇷</div>
          </div>

          <!-- Content -->
          ${content}

          <!-- Footer -->
          <div style="text-align:center;margin-top:24px;font-size:11px;color:#9ca3af;line-height:1.6;">
            <p style="margin:0 0 8px;">Você recebeu este email porque se inscreveu no ${APP_NAME}.</p>
            <p style="margin:0 0 8px;">
              <a href="{{unsubscribe_url}}" style="color:${BRAND_COLOR};text-decoration:underline;">Cancelar inscrição</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}/alertas" style="color:${BRAND_COLOR};text-decoration:underline;">Gerenciar alertas</a>
              &nbsp;·&nbsp;
              <a href="${APP_URL}" style="color:${BRAND_COLOR};text-decoration:underline;">Visitar ${APP_NAME}</a>
            </p>
            <p style="margin:0;">&copy; ${new Date().getFullYear()} ${APP_NAME}. Todos os direitos reservados.</p>
          </div>

        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Card container com sombra sutil */
function card(content: string, marginBottom = "16px"): string {
  return `<div style="background:white;border-radius:16px;padding:24px;margin-bottom:${marginBottom};box-shadow:0 1px 4px rgba(0,0,0,0.04);">
    ${content}
  </div>`;
}

/** Section header com emoji */
function sectionHeader(emoji: string, title: string, color = TEXT_PRIMARY): string {
  return `<h3 style="margin:0 0 16px;font-size:15px;font-weight:700;color:${color};">${emoji} ${title}</h3>`;
}

/** Produto em linha (com imagem opcional) */
function productRow(p: {
  name: string;
  price: number;
  url: string;
  imageUrl?: string;
  source?: string;
  discount?: number;
  originalPrice?: number;
  badge?: string;
  template: string;
}): string {
  const discountBadge =
    p.discount && p.discount > 0
      ? `<span style="display:inline-block;background:${RED};color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px;">-${p.discount}%</span>`
      : "";

  const originalPriceStr =
    p.originalPrice && p.originalPrice > p.price
      ? `<span style="font-size:12px;color:#9ca3af;text-decoration:line-through;margin-right:6px;">${formatBRL(p.originalPrice)}</span>`
      : "";

  const sourceLabel = p.source
    ? `<span style="font-size:11px;color:#9ca3af;margin-left:6px;">${escapeHtml(p.source)}</span>`
    : "";

  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            ${
              p.imageUrl
                ? `<td width="64" style="vertical-align:top;padding-right:12px;">
                    <a href="${escapeHtml(addUTM(p.url, p.template))}" style="text-decoration:none;">
                      <img src="${escapeHtml(p.imageUrl)}" alt="" width="60" height="60" style="border-radius:10px;object-fit:contain;background:${GRAY_LIGHT};display:block;" />
                    </a>
                  </td>`
                : ""
            }
            <td style="vertical-align:top;">
              <a href="${escapeHtml(addUTM(p.url, p.template))}" style="color:${TEXT_PRIMARY};text-decoration:none;font-size:13px;font-weight:600;line-height:1.4;">
                ${escapeHtml(truncate(p.name, 65))}
              </a>
              <div style="margin-top:4px;">
                ${originalPriceStr}
                <span style="font-size:16px;font-weight:800;color:${GREEN};">${formatBRL(p.price)}</span>
                ${discountBadge}
                ${sourceLabel}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

/** Botão CTA principal */
function ctaButton(text: string, url: string, color = BRAND_COLOR): string {
  return `<div style="text-align:center;margin:24px 0;">
    <a href="${escapeHtml(url)}" style="display:inline-block;background:${color};color:white;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:14px;font-weight:700;">
      ${text}
    </a>
  </div>`;
}

// ============================================
// 1. WELCOME EMAIL
// ============================================

/**
 * Email de boas-vindas para novos inscritos.
 */
export function welcomeEmail(name?: string): string {
  const greeting = name ? `Olá, ${escapeHtml(name)}!` : "Olá!";

  const content = card(`
    <h2 style="margin:0 0 8px;font-size:20px;color:${TEXT_PRIMARY};">${greeting} Bem-vindo ao ${APP_NAME} 👋</h2>
    <p style="margin:0 0 20px;font-size:14px;color:${GRAY};line-height:1.6;">
      A partir de agora, você vai receber as melhores oportunidades para economizar de verdade — sem cair em falsos descontos.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:20px;margin-right:12px;">📉</span>
          <span style="font-size:14px;color:${TEXT_PRIMARY};"><strong>Alertas de queda</strong> — monitore o preço dos produtos que você quer</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:20px;margin-right:12px;">🔥</span>
          <span style="font-size:14px;color:${TEXT_PRIMARY};"><strong>Ofertas selecionadas</strong> — só as que passam no nosso filtro de qualidade</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <span style="font-size:20px;margin-right:12px;">📊</span>
          <span style="font-size:14px;color:${TEXT_PRIMARY};"><strong>Histórico de preços</strong> — saiba se o desconto é real ou maquiado</span>
        </td>
      </tr>
      <tr>
        <td style="padding:12px 0;">
          <span style="font-size:20px;margin-right:12px;">🏪</span>
          <span style="font-size:14px;color:${TEXT_PRIMARY};"><strong>5 lojas comparadas</strong> — Amazon, Mercado Livre, Shopee, Shein e mais</span>
        </td>
      </tr>
    </table>
  `) + ctaButton("Explorar ofertas →", `${APP_URL}/ofertas`) + card(`
    <p style="margin:0;font-size:12px;color:${GRAY};text-align:center;">
      💡 <strong>Dica:</strong> adicione <strong>noreply@promosnap.com.br</strong> aos seus contatos para garantir que nossos emails cheguem na caixa principal.
    </p>
  `);

  return baseLayout(content, `Bem-vindo ao ${APP_NAME}! Suas melhores ofertas estão a caminho.`);
}

// ============================================
// 2. DAILY DEALS
// ============================================

/**
 * Email diário com as melhores ofertas do dia.
 */
export function dailyDealsEmail(
  deals: Array<{ name: string; price: number; discount: number; url: string; imageUrl?: string; source?: string }>
): string {
  const today = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const dealRows = deals
    .slice(0, 10)
    .map((d) =>
      productRow({
        name: d.name,
        price: d.price,
        discount: d.discount,
        url: d.url,
        imageUrl: d.imageUrl,
        source: d.source,
        template: "daily-deals",
      })
    )
    .join("");

  const avgDiscount = deals.length > 0
    ? Math.round(deals.reduce((sum, d) => sum + d.discount, 0) / deals.length)
    : 0;

  const content = card(`
    <h2 style="margin:0 0 4px;font-size:18px;color:${TEXT_PRIMARY};">🛍️ Ofertas do dia</h2>
    <p style="margin:0 0 16px;font-size:12px;color:${GRAY};">${today}</p>
    <p style="margin:0 0 20px;font-size:14px;color:${GRAY};line-height:1.5;">
      ${deals.length} ofertas verificadas com desconto médio de <strong style="color:${GREEN};">${avgDiscount}%</strong>. Preços comparados em tempo real.
    </p>
    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${dealRows}
    </table>
  `) + ctaButton("Ver todas as ofertas →", `${APP_URL}/ofertas`);

  return baseLayout(content, `🛍️ ${deals.length} ofertas imperdíveis com até ${avgDiscount}% OFF!`);
}

// ============================================
// 3. PRICE ALERT TRIGGERED
// ============================================

/**
 * Email quando um alerta de preço é ativado.
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
  const referencePrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : product.targetPrice;
  const discountPct =
    referencePrice > 0
      ? Math.round(((referencePrice - product.price) / referencePrice) * 100)
      : 0;
  const savings = product.targetPrice - product.price;

  const imageBlock = product.imageUrl
    ? `<div style="text-align:center;padding:20px;background:${BRAND_LIGHT};border-radius:12px 12px 0 0;margin:-24px -24px 20px;">
        <img src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" style="max-width:180px;max-height:180px;object-fit:contain;" />
      </div>`
    : "";

  const content = card(`
    ${imageBlock}

    <div style="text-align:center;">
      <div style="display:inline-block;background:${GREEN_LIGHT};color:${GREEN};padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px;margin-bottom:16px;">
        ${discountPct > 0 ? `${discountPct}% OFF — ` : ""}ALERTA DE PREÇO ATIVADO!
      </div>

      <h2 style="margin:0 0 16px;font-size:16px;color:${TEXT_PRIMARY};line-height:1.4;">
        ${escapeHtml(product.name)}
      </h2>

      <!-- Comparação de preços -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;">
        <tr>
          <td style="text-align:center;padding:12px;background:${GRAY_LIGHT};border-radius:12px 0 0 12px;">
            <p style="color:${GRAY};font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Seu alerta</p>
            <p style="color:#9ca3af;font-size:18px;font-weight:600;text-decoration:line-through;margin:0;">${formatBRL(product.targetPrice)}</p>
          </td>
          <td style="text-align:center;padding:12px;background:${GREEN_LIGHT};border-radius:0 12px 12px 0;">
            <p style="color:${GREEN};font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Preço atual</p>
            <p style="color:${GREEN};font-size:24px;font-weight:800;margin:0;">${formatBRL(product.price)}</p>
          </td>
        </tr>
      </table>

      ${savings > 0 ? `<p style="color:${GREEN};font-weight:600;font-size:14px;margin:0 0 16px;">Você economiza ${formatBRL(savings)} em relação ao alerta!</p>` : ""}
    </div>

    <p style="font-size:13px;color:${GRAY};text-align:center;margin:0 0 20px;line-height:1.5;">
      O produto que você monitorava atingiu o preço desejado. Aproveite — preços promocionais costumam durar pouco!
    </p>
  `) + ctaButton("Aproveitar desconto →", addUTM(product.url, "alert"), GREEN)
    + (product.promoSnapUrl ? `<p style="text-align:center;margin:0 0 16px;"><a href="${escapeHtml(product.promoSnapUrl)}" style="color:${BRAND_COLOR};font-size:12px;text-decoration:underline;">Ver histórico de preço no ${APP_NAME}</a></p>` : "")
    + card(`
    <p style="margin:0;font-size:12px;color:${GRAY};text-align:center;">
      Este alerta foi criado por você no ${APP_NAME}. Para gerenciar seus alertas, acesse sua conta.
    </p>
  `);

  return baseLayout(
    content,
    `🔔 ${truncate(product.name, 40)}${discountPct > 0 ? ` (-${discountPct}%)` : ""} — agora ${formatBRL(product.price)}!`
  );
}

/**
 * Subject line para email de alerta ativado.
 */
export function alertEmailSubject(product: {
  name: string;
  price: number;
  originalPrice?: number;
  targetPrice: number;
}): string {
  const referencePrice =
    product.originalPrice && product.originalPrice > product.price
      ? product.originalPrice
      : product.targetPrice;
  const discountPct =
    referencePrice > 0
      ? Math.round(((referencePrice - product.price) / referencePrice) * 100)
      : 0;
  const discountStr = discountPct > 0 ? ` (-${discountPct}%)` : "";
  return `🔔 ${truncate(product.name, 45)}${discountStr} por ${formatBRL(product.price)}`;
}

// ============================================
// 4. DISTRIBUTION EMAIL
// ============================================

/**
 * Email de destaque — uma oferta selecionada pela distribuição automática.
 */
export function distributionEmail(offer: {
  name: string;
  price: number;
  originalPrice?: number;
  discount: number;
  sourceName: string;
  url: string;
  imageUrl?: string;
  isFreeShipping?: boolean;
  couponText?: string;
}): string {
  const economia =
    offer.originalPrice && offer.originalPrice > offer.price
      ? formatBRL(offer.originalPrice - offer.price)
      : null;

  const badges: string[] = [];
  if (offer.discount > 0) badges.push(`-${offer.discount}% OFF`);
  if (offer.isFreeShipping) badges.push("Frete grátis");
  if (offer.couponText) badges.push(`Cupom: ${offer.couponText}`);

  const badgeHtml = badges
    .map(
      (b) =>
        `<span style="display:inline-block;background:${GREEN_LIGHT};color:${GREEN};font-size:11px;font-weight:600;padding:4px 10px;border-radius:20px;margin-right:6px;margin-bottom:4px;">${escapeHtml(b)}</span>`
    )
    .join("");

  const imageBlock = offer.imageUrl
    ? `<div style="text-align:center;padding:20px;background:${BRAND_LIGHT};border-radius:12px;margin-bottom:16px;">
        <img src="${escapeHtml(offer.imageUrl)}" alt="${escapeHtml(offer.name)}" style="max-width:200px;max-height:180px;object-fit:contain;" />
      </div>`
    : "";

  const content = card(`
    <div style="text-align:center;margin-bottom:16px;">
      <span style="display:inline-block;background:${BRAND_LIGHT};color:${BRAND_COLOR};padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:0.5px;">
        ⭐ DESTAQUE DO PROMOSNAP
      </span>
    </div>

    ${imageBlock}

    <h2 style="margin:0 0 8px;font-size:17px;color:${TEXT_PRIMARY};text-align:center;line-height:1.4;">
      ${escapeHtml(offer.name)}
    </h2>

    <div style="text-align:center;margin-bottom:16px;">
      ${offer.originalPrice && offer.originalPrice > offer.price
        ? `<span style="font-size:13px;color:#9ca3af;text-decoration:line-through;">De: ${formatBRL(offer.originalPrice)}</span><br/>`
        : ""}
      <span style="font-size:28px;font-weight:800;color:${GREEN};">${formatBRL(offer.price)}</span>
      ${economia ? `<br/><span style="font-size:13px;color:${GREEN};font-weight:600;">Economia de ${economia}</span>` : ""}
    </div>

    ${badgeHtml ? `<div style="text-align:center;margin-bottom:16px;">${badgeHtml}</div>` : ""}

    <p style="font-size:13px;color:${GRAY};text-align:center;margin:0 0 4px;line-height:1.5;">
      Encontramos esta oferta na <strong>${escapeHtml(offer.sourceName)}</strong>.
      Ela passou nos nossos critérios de qualidade e preço justo.
    </p>
  `) + ctaButton("Ver oferta →", addUTM(offer.url, "distribution"), GREEN)
    + card(`
    <p style="margin:0;font-size:11px;color:${GRAY};text-align:center;">
      Oferta selecionada automaticamente pelo ${APP_NAME} com base em score de qualidade, desconto real e confiabilidade da loja.
    </p>
  `);

  return baseLayout(
    content,
    `⭐ ${truncate(offer.name, 40)} por ${formatBRL(offer.price)} — oferta selecionada!`
  );
}

// ============================================
// 5. WEEKLY DIGEST
// ============================================

/**
 * Resumo semanal com melhores ofertas e estatísticas.
 */
export function weeklyDigestEmail(
  deals: Array<{
    name: string;
    price: number;
    imageUrl?: string;
    url: string;
    discount?: number;
    source?: string;
  }>,
  summary: { totalDeals: number; avgDiscount: number }
): string {
  const weekDate = new Date().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dealRows = deals
    .slice(0, 10)
    .map((deal) =>
      productRow({
        name: deal.name,
        price: deal.price,
        discount: deal.discount,
        url: deal.url,
        imageUrl: deal.imageUrl,
        source: deal.source,
        template: "weekly-digest",
      })
    )
    .join("");

  const statsBlock = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      <tr>
        <td style="text-align:center;padding:16px;background:${BRAND_LIGHT};border-radius:12px 0 0 12px;width:50%;">
          <p style="color:${GRAY};font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Ofertas da semana</p>
          <p style="color:${TEXT_PRIMARY};font-size:26px;font-weight:800;margin:0;">${summary.totalDeals}</p>
        </td>
        <td style="text-align:center;padding:16px;background:${GREEN_LIGHT};border-radius:0 12px 12px 0;width:50%;">
          <p style="color:${GRAY};font-size:11px;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 4px;">Desconto médio</p>
          <p style="color:${GREEN};font-size:26px;font-weight:800;margin:0;">${summary.avgDiscount}%</p>
        </td>
      </tr>
    </table>`;

  const content = card(`
    <h2 style="margin:0 0 4px;font-size:18px;color:${TEXT_PRIMARY};">📊 Resumo semanal</h2>
    <p style="margin:0 0 20px;font-size:12px;color:${GRAY};">Semana encerrada em ${weekDate}</p>

    ${statsBlock}

    <p style="margin:0 0 16px;font-size:14px;color:${GRAY};line-height:1.5;">
      As melhores ofertas que encontramos nesta semana. Todos os preços verificados e comparados em tempo real.
    </p>

    <table cellpadding="0" cellspacing="0" border="0" width="100%">
      ${dealRows}
    </table>
  `) + ctaButton("Ver todas as ofertas →", `${APP_URL}/ofertas`);

  return baseLayout(
    content,
    `📊 ${summary.totalDeals} ofertas com até ${summary.avgDiscount}% OFF — Resumo semanal`
  );
}

// ============================================
// 6. PERSONALIZED DIGEST
// ============================================

/**
 * Digest personalizado com 3 secções distintas:
 * - Quedas de preço nos interesses do utilizador
 * - Novidades no catálogo
 * - Top deals da semana
 *
 * IMPORTANTE: cada secção mostra produtos diferentes (sem repetição).
 */
export function personalizedDigestEmail(digest: PersonalizedDigestData): string {
  const sections: string[] = [];

  // ── Secção 1: Quedas de preço ──
  if (digest.priceDrops.length > 0) {
    const rows = digest.priceDrops
      .slice(0, 5)
      .map((d) => {
        const savings = formatBRL(d.previousPrice - d.price);
        const discount = d.discount || Math.round(((d.previousPrice - d.price) / d.previousPrice) * 100);
        return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%">
              <tr>
                ${d.imageUrl
                  ? `<td width="64" style="vertical-align:top;padding-right:12px;">
                      <a href="${escapeHtml(addUTM(d.url, "personalized-digest"))}" style="text-decoration:none;">
                        <img src="${escapeHtml(d.imageUrl)}" alt="" width="60" height="60" style="border-radius:10px;object-fit:contain;background:${GRAY_LIGHT};display:block;" />
                      </a>
                    </td>`
                  : ""
                }
                <td style="vertical-align:top;">
                  <a href="${escapeHtml(addUTM(d.url, "personalized-digest"))}" style="color:${TEXT_PRIMARY};text-decoration:none;font-size:13px;font-weight:600;line-height:1.4;">
                    ${escapeHtml(truncate(d.name, 65))}
                  </a>
                  <div style="margin-top:4px;">
                    <span style="font-size:12px;color:#9ca3af;text-decoration:line-through;">${formatBRL(d.previousPrice)}</span>
                    <span style="font-size:16px;font-weight:800;color:${GREEN};margin-left:6px;">${formatBRL(d.price)}</span>
                    <span style="display:inline-block;background:${RED};color:white;font-size:11px;font-weight:700;padding:2px 8px;border-radius:10px;margin-left:6px;">-${discount}%</span>
                  </div>
                  <div style="margin-top:2px;font-size:11px;color:${GREEN};font-weight:600;">
                    Economia de ${savings}${d.source ? ` · ${escapeHtml(d.source)}` : ""}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
      })
      .join("");

    sections.push(card(`
      ${sectionHeader("📉", "Preços que caíram", "#ea580c")}
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${rows}
      </table>
    `));
  }

  // ── Secção 2: Novidades no catálogo ──
  if (digest.newInCategories.length > 0) {
    const rows = digest.newInCategories
      .slice(0, 5)
      .map((n) =>
        productRow({
          name: n.name,
          price: n.price,
          url: n.url,
          imageUrl: n.imageUrl,
          source: n.source || n.category,
          template: "personalized-digest",
        })
      )
      .join("");

    sections.push(card(`
      ${sectionHeader("✨", "Novidades para você", BRAND_COLOR)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${rows}
      </table>
    `));
  }

  // ── Secção 3: Top deals ──
  if (digest.topDeals.length > 0) {
    const rows = digest.topDeals
      .slice(0, 5)
      .map((d) =>
        productRow({
          name: d.name,
          price: d.price,
          discount: d.discount,
          originalPrice: d.originalPrice,
          url: d.url,
          imageUrl: d.imageUrl,
          source: d.source,
          template: "personalized-digest",
        })
      )
      .join("");

    sections.push(card(`
      ${sectionHeader("🔥", "Melhores ofertas da semana", GREEN)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${rows}
      </table>
    `));
  }

  // ── Economia total ──
  const savingsBlock = digest.totalSavings > 0
    ? card(`
      <div style="text-align:center;">
        <p style="margin:0 0 4px;font-size:12px;color:${GRAY};text-transform:uppercase;letter-spacing:0.5px;">Economia potencial nesta edição</p>
        <p style="margin:0;font-size:28px;font-weight:800;color:${GREEN};">${formatBRL(digest.totalSavings)}</p>
      </div>
    `)
    : "";

  const greeting = card(`
    <h2 style="margin:0 0 8px;font-size:18px;color:${TEXT_PRIMARY};">Suas ofertas da semana 👋</h2>
    <p style="margin:0;font-size:14px;color:${GRAY};line-height:1.5;">
      Separamos oportunidades personalizadas com base nos seus interesses. Produtos diferentes em cada secção — sem repetição.
    </p>
  `);

  const content = greeting
    + savingsBlock
    + sections.join("")
    + ctaButton("Ver todas as ofertas →", `${APP_URL}/ofertas`)
    + card(`
    <p style="margin:0;font-size:12px;color:${GRAY};text-align:center;">
      💡 <strong>Quer alertas mais precisos?</strong> Crie alertas de preço para os produtos que você quer — avisamos na hora que baixar.
    </p>
    <div style="text-align:center;margin-top:12px;">
      <a href="${APP_URL}/alertas" style="color:${BRAND_COLOR};font-size:12px;font-weight:600;text-decoration:underline;">Gerenciar meus alertas</a>
    </div>
  `);

  const dropCount = digest.priceDrops.length;
  const dealCount = digest.topDeals.length;
  const preheader = dropCount > 0
    ? `📉 ${dropCount} produtos caíram de preço + ${dealCount} ofertas selecionadas`
    : `🔥 ${dealCount} ofertas selecionadas para você`;

  return baseLayout(content, preheader);
}

// ============================================
// 7. PRICE DROP EMAIL
// ============================================

/**
 * Notificação de queda de preço significativa.
 */
export function priceDropEmail(drop: {
  productName: string;
  currentPrice: number;
  previousPrice: number;
  discountPct: number;
  productUrl: string;
  imageUrl?: string | null;
}): string {
  const savings = formatBRL(drop.previousPrice - drop.currentPrice);

  const imageBlock = drop.imageUrl
    ? `<div style="text-align:center;padding:20px;background:${BRAND_LIGHT};border-radius:12px;margin-bottom:16px;">
        <img src="${escapeHtml(drop.imageUrl)}" alt="${escapeHtml(drop.productName)}" style="max-width:180px;max-height:160px;object-fit:contain;" />
      </div>`
    : "";

  const content = card(`
    <div style="text-align:center;margin-bottom:16px;">
      <span style="display:inline-block;background:${GREEN_LIGHT};color:${GREEN};padding:6px 16px;border-radius:20px;font-size:12px;font-weight:700;letter-spacing:0.5px;">
        📉 QUEDA DE PREÇO DETECTADA
      </span>
    </div>

    ${imageBlock}

    <h2 style="margin:0 0 16px;font-size:17px;color:${TEXT_PRIMARY};text-align:center;line-height:1.4;">
      ${escapeHtml(drop.productName)}
    </h2>

    <div style="background:${GREEN_LIGHT};border:1px solid #bbf7d0;border-radius:12px;padding:16px;text-align:center;margin-bottom:16px;">
      <div style="font-size:13px;color:#9ca3af;text-decoration:line-through;margin-bottom:4px;">
        ${formatBRL(drop.previousPrice)}
      </div>
      <div style="font-size:28px;font-weight:800;color:${GREEN};margin-bottom:6px;">
        ${formatBRL(drop.currentPrice)}
      </div>
      <span style="display:inline-block;background:${RED};color:white;padding:4px 12px;border-radius:12px;font-size:12px;font-weight:700;">
        -${drop.discountPct}% OFF
      </span>
      <div style="margin-top:8px;font-size:13px;color:${GREEN};font-weight:600;">
        Você economiza ${savings}
      </div>
    </div>
  `) + ctaButton("Ver produto →", addUTM(drop.productUrl, "price-drop"), GREEN)
    + card(`
    <p style="margin:0;font-size:12px;color:${GRAY};text-align:center;">
      Detectamos esta queda nas últimas 24h. Os preços são monitorados em tempo real pelo ${APP_NAME}.
    </p>
    <div style="text-align:center;margin-top:8px;">
      <a href="${APP_URL}/alertas" style="color:${BRAND_COLOR};font-size:12px;text-decoration:underline;">Gerenciar meus alertas</a>
    </div>
  `);

  return baseLayout(
    content,
    `📉 ${truncate(drop.productName, 40)} caiu ${drop.discountPct}% — agora ${formatBRL(drop.currentPrice)}!`
  );
}

// ============================================
// 8. WIN-BACK EMAIL
// ============================================

/**
 * Email de reengajamento para inscritos inativos.
 */
export function winBackEmail(data: {
  priceDrops: Array<{ name: string; price: number; previousPrice: number; url: string; imageUrl?: string; source?: string }>;
  topDeals: Array<{ name: string; price: number; discount: number; url: string; imageUrl?: string; source?: string }>;
}): string {
  const sections: string[] = [];

  if (data.priceDrops.length > 0) {
    const rows = data.priceDrops
      .map((d) =>
        productRow({
          name: d.name,
          price: d.price,
          originalPrice: d.previousPrice,
          discount: Math.round(((d.previousPrice - d.price) / d.previousPrice) * 100),
          url: d.url,
          imageUrl: d.imageUrl,
          source: d.source,
          template: "win-back",
        })
      )
      .join("");

    sections.push(card(`
      ${sectionHeader("📉", "Preços que caíram enquanto você estava fora", "#ea580c")}
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${rows}
      </table>
    `));
  }

  if (data.topDeals.length > 0) {
    const rows = data.topDeals
      .map((d) =>
        productRow({
          name: d.name,
          price: d.price,
          discount: d.discount,
          url: d.url,
          imageUrl: d.imageUrl,
          source: d.source,
          template: "win-back",
        })
      )
      .join("");

    sections.push(card(`
      ${sectionHeader("🔥", "Ofertas que estão bombando agora", GREEN)}
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        ${rows}
      </table>
    `));
  }

  const content = card(`
    <h2 style="margin:0 0 8px;font-size:18px;color:${TEXT_PRIMARY};">Sentimos sua falta! 👀</h2>
    <p style="margin:0;font-size:14px;color:${GRAY};line-height:1.6;">
      Faz tempo que você não aparece por aqui. Muita coisa mudou — temos novas ofertas, preços mais baixos e mais lojas comparadas. Dá uma olhada no que separamos para você:
    </p>
  `)
    + sections.join("")
    + ctaButton("Voltar ao PromoSnap →", APP_URL)
    + card(`
    <p style="margin:0;font-size:12px;color:${GRAY};text-align:center;">
      Estamos sempre monitorando preços para você. Volte quando quiser — estaremos aqui. 💜
    </p>
  `);

  return baseLayout(content, "Sentimos sua falta! Veja as quedas de preço que encontramos para você.");
}
