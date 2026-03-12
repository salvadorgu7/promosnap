// ============================================
// DISTRIBUTION — WhatsApp channel
// ============================================

import type { DistributableOffer } from "./types";

// ============================================
// Configuration
// ============================================

export function isWhatsAppConfigured(): boolean {
  return !!process.env.WHATSAPP_API_TOKEN;
}

// ============================================
// Message formatting (pt-BR, clean, no markdown)
// WhatsApp doesn't support rich markdown — keep it simple and readable.
// ============================================

export function formatWhatsAppMessage(offer: DistributableOffer): string {
  const price = formatBRL(offer.currentPrice);
  const link = offer.affiliateUrl || offer.productUrl;

  const lines: string[] = [];

  // Header
  if (offer.discount >= 30) {
    lines.push(`OFERTACO -${offer.discount}% OFF`);
  } else if (offer.discount > 0) {
    lines.push(`OFERTA -${offer.discount}% OFF`);
  } else {
    lines.push("OFERTA");
  }

  lines.push("");

  // Product
  lines.push(offer.productName);
  lines.push("");

  // Price
  if (offer.originalPrice && offer.originalPrice > offer.currentPrice) {
    lines.push(`De: ${formatBRL(offer.originalPrice)}`);
    lines.push(`Por: *${price}*`);
    const economia = formatBRL(offer.originalPrice - offer.currentPrice);
    lines.push(`Economia: ${economia}`);
  } else {
    lines.push(`Preco: *${price}*`);
  }

  lines.push("");

  // Extras
  const extras: string[] = [];
  if (offer.isFreeShipping) extras.push("Frete gratis");
  if (offer.couponText) extras.push(`Cupom: ${offer.couponText}`);
  if (offer.rating && offer.rating >= 4.0) {
    extras.push(`Nota: ${offer.rating.toFixed(1)}/5`);
  }

  if (extras.length > 0) {
    lines.push(extras.join(" | "));
    lines.push("");
  }

  // Source
  lines.push(`Loja: ${offer.sourceName}`);
  lines.push("");

  // Link
  lines.push(`Comprar: ${link}`);
  lines.push("");
  lines.push("-- PromoSnap");

  return lines.join("\n");
}

// ============================================
// Preview
// ============================================

export function previewWhatsAppMessage(offer: DistributableOffer): string {
  return formatWhatsAppMessage(offer);
}

// ============================================
// Helpers
// ============================================

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}
