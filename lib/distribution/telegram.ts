// ============================================
// DISTRIBUTION — Telegram channel
// ============================================

import type { DistributableOffer } from "./types";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br";

// ============================================
// Configuration
// ============================================

export function isTelegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

// ============================================
// Message formatting (pt-BR, emoji-rich)
// ============================================

export function formatTelegramMessage(offer: DistributableOffer): string {
  const price = formatBRL(offer.currentPrice);
  const link = offer.affiliateUrl || offer.productUrl;

  const lines: string[] = [];

  // Header with discount badge
  if (offer.discount >= 30) {
    lines.push(`\u{1F525}\u{1F525} OFERTACO -${offer.discount}% OFF`);
  } else if (offer.discount > 0) {
    lines.push(`\u{1F4B0} OFERTA -${offer.discount}% OFF`);
  } else {
    lines.push(`\u{1F4B0} OFERTA`);
  }

  lines.push("");

  // Product name (bold in Telegram markdown)
  lines.push(`*${escapeTelegramMarkdown(offer.productName)}*`);
  lines.push("");

  // Price block
  if (offer.originalPrice && offer.originalPrice > offer.currentPrice) {
    const original = formatBRL(offer.originalPrice);
    lines.push(`~De: ${original}~`);
    lines.push(`*Por: ${price}*`);
    const economia = formatBRL(offer.originalPrice - offer.currentPrice);
    lines.push(`\u{2705} Economia de ${economia}`);
  } else {
    lines.push(`*${price}*`);
  }

  lines.push("");

  // Extra info
  const extras: string[] = [];
  if (offer.isFreeShipping) extras.push("\u{1F69A} Frete gratis");
  if (offer.couponText) extras.push(`\u{1F3AB} Cupom: ${offer.couponText}`);
  if (offer.rating && offer.rating >= 4.0) {
    const stars = "\u2B50".repeat(Math.min(5, Math.round(offer.rating)));
    extras.push(`${stars} ${offer.rating.toFixed(1)}`);
  }

  if (extras.length > 0) {
    lines.push(extras.join("\n"));
    lines.push("");
  }

  // Source
  lines.push(`\u{1F3EA} ${offer.sourceName}`);
  lines.push("");

  // CTA
  lines.push(`\u{1F449} [Ver Oferta](${link})`);
  lines.push("");
  lines.push(`_via PromoSnap_`);

  return lines.join("\n");
}

// ============================================
// Preview (same as format, for admin panel)
// ============================================

export function previewTelegramMessage(offer: DistributableOffer): string {
  return formatTelegramMessage(offer);
}

// ============================================
// Send via Telegram Bot API
// ============================================

export interface TelegramSendResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export async function sendTelegramMessage(
  message: string
): Promise<TelegramSendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    const notConfigured: TelegramSendResult = {
      success: false,
      error:
        "Telegram nao configurado. Defina TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID.",
    };
    recordTelegramSend(notConfigured);
    return notConfigured;
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
        disable_web_page_preview: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[Telegram] Send failed:", res.status, body);
      const httpFail: TelegramSendResult = {
        success: false,
        error: `Telegram API ${res.status}: ${body.slice(0, 200)}`,
      };
      recordTelegramSend(httpFail);
      return httpFail;
    }

    const data = await res.json();
    const successResult: TelegramSendResult = {
      success: true,
      messageId: data.result?.message_id,
    };
    recordTelegramSend(successResult);
    return successResult;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    console.error("[Telegram] Send error:", msg);
    const failResult: TelegramSendResult = { success: false, error: msg };
    recordTelegramSend(failResult);
    return failResult;
  }
}

// ============================================
// Config Validation
// ============================================

export function configValidation(): {
  valid: boolean;
  missing: string[];
  message: string;
} {
  const missing: string[] = [];
  if (!process.env.TELEGRAM_BOT_TOKEN) missing.push("TELEGRAM_BOT_TOKEN");
  if (!process.env.TELEGRAM_CHAT_ID) missing.push("TELEGRAM_CHAT_ID");

  return {
    valid: missing.length === 0,
    missing,
    message:
      missing.length === 0
        ? "Telegram configurado e pronto"
        : `Variaveis ausentes: ${missing.join(", ")}`,
  };
}

// ============================================
// Test Message
// ============================================

export async function sendTestMessage(): Promise<TelegramSendResult> {
  return sendTelegramMessage(
    "PromoSnap test — integracao Telegram funcionando!"
  );
}

// ============================================
// Execution Log
// ============================================

interface TelegramLogEntry {
  id: string;
  status: "success" | "failed";
  messageId?: number;
  error?: string;
  sentAt: Date;
}

const telegramLog: TelegramLogEntry[] = [];
let telegramLogCounter = 0;

function recordTelegramSend(result: TelegramSendResult): void {
  telegramLog.unshift({
    id: `tg_${++telegramLogCounter}_${Date.now()}`,
    status: result.success ? "success" : "failed",
    messageId: result.messageId,
    error: result.error,
    sentAt: new Date(),
  });
  if (telegramLog.length > 50) {
    telegramLog.length = 50;
  }
}

export function getExecutionLog(limit = 50): TelegramLogEntry[] {
  return telegramLog.slice(0, limit);
}

// ============================================
// Helpers
// ============================================

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

function escapeTelegramMarkdown(text: string): string {
  // Escape characters that conflict with Telegram Markdown v1
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
}
