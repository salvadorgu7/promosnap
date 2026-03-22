// ============================================
// DISTRIBUTION — WhatsApp channel
// Supports: Evolution API v2 (primary) + WA Business API (fallback)
// ============================================

import type { DistributableOffer } from "./types";
import {
  isEvolutionConfigured,
  sendText as evolutionSendText,
} from "@/lib/whatsapp/evolution-api";

// ============================================
// Configuration
// ============================================

export function isWhatsAppConfigured(): boolean {
  return isEvolutionConfigured() || !!process.env.WHATSAPP_API_TOKEN;
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
// Provider-agnostic interface
// ============================================

export interface WhatsAppProvider {
  name: string
  send(message: string, recipient: string): Promise<{ success: boolean; error?: string }>
  isConfigured(): boolean
  getStatus(): { configured: boolean; provider: string; message: string }
}

// ============================================
// Readiness status
// ============================================

export interface WhatsAppReadinessStatus {
  mode: 'preview' | 'api'
  configured: boolean
  provider: string | null
}

export function getReadinessStatus(): WhatsAppReadinessStatus {
  // Evolution API v2 tem prioridade
  if (isEvolutionConfigured()) {
    return {
      mode: 'api',
      configured: true,
      provider: 'evolution-api',
    }
  }

  const hasApiUrl = !!process.env.WHATSAPP_API_URL
  const hasApiToken = !!process.env.WHATSAPP_API_TOKEN

  if (hasApiUrl && hasApiToken) {
    return {
      mode: 'api',
      configured: true,
      provider: extractProviderName(process.env.WHATSAPP_API_URL!),
    }
  }

  if (hasApiToken) {
    return {
      mode: 'api',
      configured: true,
      provider: 'generic',
    }
  }

  return {
    mode: 'preview',
    configured: false,
    provider: null,
  }
}

function extractProviderName(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    if (hostname.includes('twilio')) return 'twilio'
    if (hostname.includes('messagebird')) return 'messagebird'
    if (hostname.includes('vonage') || hostname.includes('nexmo')) return 'vonage'
    if (hostname.includes('infobip')) return 'infobip'
    if (hostname.includes('wati')) return 'wati'
    return 'custom'
  } catch {
    return 'unknown'
  }
}

// ============================================
// Preview provider (default fallback)
// ============================================

export const previewProvider: WhatsAppProvider = {
  name: 'preview',

  async send(_message: string, _recipient: string) {
    return {
      success: false,
      error: 'Modo preview — mensagem gerada para copiar manualmente. Configure WHATSAPP_API_URL + WHATSAPP_API_TOKEN para envio real.',
    }
  },

  isConfigured() {
    return false
  },

  getStatus() {
    return {
      configured: false,
      provider: 'preview',
      message: 'Modo preview — mensagens podem ser copiadas manualmente.',
    }
  },
}

// ============================================
// API provider (for future real provider)
// ============================================

export const apiProvider: WhatsAppProvider = {
  name: 'api',

  async send(message: string, recipient: string) {
    // Evolution API v2 tem prioridade
    if (isEvolutionConfigured()) {
      const result = await evolutionSendText(recipient, message)
      return {
        success: result.success,
        error: result.error,
      }
    }

    // Fallback: WA Business API genérica
    const apiUrl = process.env.WHATSAPP_API_URL
    const apiToken = process.env.WHATSAPP_API_TOKEN

    if (!apiUrl || !apiToken) {
      return { success: false, error: 'Nenhum provider WhatsApp configurado' }
    }

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({ to: recipient, message }),
      })

      if (!res.ok) {
        const body = await res.text()
        return { success: false, error: `WhatsApp API ${res.status}: ${body.slice(0, 200)}` }
      }

      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      return { success: false, error: msg }
    }
  },

  isConfigured() {
    return isEvolutionConfigured() || !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN)
  },

  getStatus() {
    if (isEvolutionConfigured()) {
      return {
        configured: true,
        provider: 'evolution-api',
        message: 'Evolution API v2 configurada — envio via QR code',
      }
    }
    const configured = !!(process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN)
    return {
      configured,
      provider: configured ? 'api' : 'preview',
      message: configured
        ? 'WhatsApp API configurado e pronto para envio'
        : 'Configure EVOLUTION_API_URL + EVOLUTION_API_KEY ou WHATSAPP_API_URL + WHATSAPP_API_TOKEN',
    }
  },
}

/**
 * Get the active WhatsApp provider based on configuration.
 */
export function getActiveProvider(): WhatsAppProvider {
  if (apiProvider.isConfigured()) return apiProvider
  return previewProvider
}

// ============================================
// Helpers
// ============================================

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}
