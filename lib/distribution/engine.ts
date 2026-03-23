// ============================================
// DISTRIBUTION ENGINE — core logic
// DELEGATES quality gates + retrieval to Unified Commerce Engine.
// ============================================

import type {
  ChannelConfig,
  DistributableOffer,
  DistributionChannel,
  DistributionPost,
  DistributionSegment,
} from "./types";
import { isTelegramConfigured } from "./telegram";
import { isWhatsAppConfigured } from "./whatsapp";
import { retrieveOffers } from "@/lib/commerce/retrieval";

// ============================================
// In-memory distribution history
// ============================================

const distributionHistory: DistributionPost[] = [];
let postCounter = 0;

export function addDistributionPost(
  post: Omit<DistributionPost, "id">
): DistributionPost {
  const entry: DistributionPost = {
    ...post,
    id: `dist_${++postCounter}_${Date.now()}`,
  };
  distributionHistory.unshift(entry);
  // Keep last 100 entries
  if (distributionHistory.length > 100) {
    distributionHistory.length = 100;
  }
  return entry;
}

/**
 * Get recent distribution history.
 * Optionally filter by channel.
 */
export function getDistributionHistory(
  limit = 20,
  channel?: DistributionChannel
): DistributionPost[] {
  if (channel) {
    return distributionHistory
      .filter((p) => p.channel === channel)
      .slice(0, limit);
  }
  return distributionHistory.slice(0, limit);
}

/**
 * Get distribution history grouped by channel.
 * Returns last N distributions per channel.
 */
export function getDistributionHistoryByChannel(
  limitPerChannel = 10
): Record<DistributionChannel, DistributionPost[]> {
  const result: Record<DistributionChannel, DistributionPost[]> = {
    homepage: [],
    email: [],
    telegram: [],
    whatsapp: [],
  };

  for (const post of distributionHistory) {
    if (result[post.channel].length < limitPerChannel) {
      result[post.channel].push(post);
    }
  }

  return result;
}

// ============================================
// Channel status
// ============================================

const channelSentCounts: Record<DistributionChannel, number> = {
  homepage: 0,
  email: 0,
  telegram: 0,
  whatsapp: 0,
};

const channelLastSent: Record<DistributionChannel, Date | null> = {
  homepage: null,
  email: null,
  telegram: null,
  whatsapp: null,
};

export function recordChannelSend(channel: DistributionChannel): void {
  channelSentCounts[channel]++;
  channelLastSent[channel] = new Date();
}

export function getChannelStatus(): ChannelConfig[] {
  const hasResend = !!process.env.RESEND_API_KEY;
  const hasTelegram = isTelegramConfigured();
  const hasWhatsApp = isWhatsAppConfigured();

  return [
    {
      channel: "homepage",
      configured: true, // Always available
      lastSent: channelLastSent.homepage,
      totalSent: channelSentCounts.homepage,
      description: "Destaque na pagina inicial via carrossel e banners",
    },
    {
      channel: "email",
      configured: hasResend,
      lastSent: channelLastSent.email,
      totalSent: channelSentCounts.email,
      description: hasResend
        ? "Resend configurado — pronto para envio"
        : "Configure RESEND_API_KEY para ativar",
    },
    {
      channel: "telegram",
      configured: hasTelegram,
      lastSent: channelLastSent.telegram,
      totalSent: channelSentCounts.telegram,
      description: hasTelegram
        ? "Bot Telegram configurado — pronto para publicar"
        : "Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID para ativar",
    },
    {
      channel: "whatsapp",
      configured: hasWhatsApp,
      lastSent: channelLastSent.whatsapp,
      totalSent: channelSentCounts.whatsapp,
      description: hasWhatsApp
        ? "WhatsApp API configurado"
        : "Configure WHATSAPP_API_TOKEN para ativar (envio manual via mensagem copiavel)",
    },
  ];
}

// ============================================
// Ready offers — DELEGATES to Unified Commerce Engine
// ============================================

/**
 * Get top offers ready for distribution.
 * Quality gates, dedup, and affiliate URL building are handled by the
 * Unified Commerce Engine (lib/commerce/retrieval.ts).
 */
export async function getReadyOffers(
  limit = 10
): Promise<DistributableOffer[]> {
  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br";

  // Delegate to unified retrieval — uses commerce quality gates
  const retrieved = await retrieveOffers({
    channel: "site", // distribution is multi-channel; "site" = default gates
    limit,
    minScore: 20,
    requireImage: true,
    maxPerMarketplace: 0, // no marketplace limit for general distribution
  });

  return retrieved.map((o) => ({
    offerId: o.offerId,
    productName: o.productName,
    productSlug: o.productSlug,
    currentPrice: o.currentPrice,
    originalPrice: o.originalPrice,
    discount: o.discount,
    offerScore: o.offerScore,
    sourceSlug: o.sourceSlug,
    sourceName: o.sourceName,
    affiliateUrl: o.affiliateUrl,
    productUrl: `${APP_URL}/produto/${o.productSlug}`,
    imageUrl: o.imageUrl,
    isFreeShipping: o.isFreeShipping,
    rating: o.rating,
    reviewsCount: o.reviewsCount,
    couponText: o.couponText,
  }));
}

// ============================================
// Format for channel
// ============================================

export function formatForChannel(
  offer: DistributableOffer,
  channel: DistributionChannel
): string {
  switch (channel) {
    case "telegram":
      return formatTelegramPreview(offer);
    case "whatsapp":
      return formatWhatsAppPreview(offer);
    case "email":
      return formatEmailPreview(offer);
    case "homepage":
      return formatHomepagePreview(offer);
    default:
      return `${offer.productName} — R$ ${offer.currentPrice.toFixed(2)}`;
  }
}

function formatTelegramPreview(offer: DistributableOffer): string {
  const { formatTelegramMessage } = require("./telegram");
  return formatTelegramMessage(offer);
}

function formatWhatsAppPreview(offer: DistributableOffer): string {
  const { formatWhatsAppMessage } = require("./whatsapp");
  return formatWhatsAppMessage(offer);
}

function formatEmailPreview(offer: DistributableOffer): string {
  const price = offer.currentPrice.toFixed(2).replace(".", ",");
  const parts = [`${offer.productName} por R$ ${price}`];
  if (offer.discount > 0) parts.push(`(-${offer.discount}%)`);
  parts.push(`na ${offer.sourceName}`);
  return parts.join(" ");
}

function formatHomepagePreview(offer: DistributableOffer): string {
  const price = offer.currentPrice.toFixed(2).replace(".", ",");
  return `[Destaque] ${offer.productName} — R$ ${price} (score: ${offer.offerScore})`;
}

// ============================================
// Segment → category slug mapping
// ============================================

const SEGMENT_CATEGORY_MAP: Record<DistributionSegment, string[]> = {
  geral: [], // all categories
  eletronicos: ["eletronicos", "smartphones", "notebooks", "fones", "tvs", "acessorios", "informatica", "tablets"],
  moda: ["moda", "roupas", "calcados", "acessorios-moda", "relogios", "joias"],
  casa: ["casa", "decoracao", "eletrodomesticos", "moveis", "cozinha", "jardim"],
  games: ["games", "consoles", "jogos", "perifericos", "gamer"],
  cupons: [], // filter by coupon presence
  "ofertas-quentes": [], // filter by high score
};

const SEGMENT_LABELS: Record<DistributionSegment, string> = {
  geral: "Geral",
  eletronicos: "Eletronicos",
  moda: "Moda",
  casa: "Casa & Decoracao",
  games: "Games",
  cupons: "Cupons",
  "ofertas-quentes": "Ofertas Quentes",
};

export { SEGMENT_LABELS };

// ============================================
// Ready offers by segment — DELEGATES to commerce engine
// ============================================

export async function getReadyOffersBySegment(
  segment: DistributionSegment,
  limit = 10
): Promise<DistributableOffer[]> {
  // For "geral", return all top offers
  if (segment === "geral") {
    return getReadyOffers(limit);
  }

  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br";

  const categorySlugs = SEGMENT_CATEGORY_MAP[segment];

  // Delegate to unified retrieval with segment-specific filters
  const retrieved = await retrieveOffers({
    channel: "site",
    limit,
    minScore: segment === "ofertas-quentes" ? 50 : 20,
    categories: categorySlugs.length > 0 ? categorySlugs : undefined,
    requireImage: true,
    maxPerMarketplace: 0,
  });

  // NOTE: "cupons" segment filtering is not handled by retrieveOffers
  // because it needs couponText filter which is a special case.
  // For now, we filter post-retrieval for cupons.
  let results = retrieved;
  if (segment === "cupons") {
    results = retrieved.filter(o => !!o.couponText);
  }

  return results.map((o) => ({
    offerId: o.offerId,
    productName: o.productName,
    productSlug: o.productSlug,
    currentPrice: o.currentPrice,
    originalPrice: o.originalPrice,
    discount: o.discount,
    offerScore: o.offerScore,
    sourceSlug: o.sourceSlug,
    sourceName: o.sourceName,
    affiliateUrl: o.affiliateUrl,
    productUrl: `${APP_URL}/produto/${o.productSlug}`,
    imageUrl: o.imageUrl,
    isFreeShipping: o.isFreeShipping,
    rating: o.rating,
    reviewsCount: o.reviewsCount,
    couponText: o.couponText,
  }));
}

// ============================================
// Format for segment — adds segment context
// ============================================

export function formatForSegment(
  offer: DistributableOffer,
  channel: DistributionChannel,
  segment: DistributionSegment
): string {
  const base = formatForChannel(offer, channel);
  if (segment === "geral") return base;

  const segmentLabel = SEGMENT_LABELS[segment];
  const prefix =
    channel === "telegram"
      ? `[${segmentLabel}] `
      : channel === "whatsapp"
      ? `*[${segmentLabel}]* `
      : `[${segmentLabel}] `;

  return prefix + base;
}

// ============================================
// Distribute to segment — select + format + distribute offers
// ============================================

export interface DistributeToSegmentResult {
  segment: DistributionSegment;
  channel: DistributionChannel;
  offers: DistributableOffer[];
  formattedMessages: string[];
  post: DistributionPost;
}

/**
 * Selects offers for a specific segment and formats them for a channel.
 * Applies segment filtering (category, coupon, score threshold).
 * Records the distribution in history.
 */
export async function distributeToSegment(
  segment: DistributionSegment,
  channel: DistributionChannel,
  limit = 5
): Promise<DistributeToSegmentResult> {
  // Get segment-filtered offers
  const offers = await getReadyOffersBySegment(segment, limit);

  // Format each offer with segment-specific personalization
  const formattedMessages = offers.map((offer) =>
    formatForSegmentPersonalized(offer, channel, segment)
  );

  // Record in distribution history
  const post = addDistributionPost({
    channel,
    title: `${SEGMENT_LABELS[segment]} — ${offers.length} ofertas`,
    body: formattedMessages.join("\n\n---\n\n"),
    offerIds: offers.map((o) => o.offerId),
    status: "previewed",
    sentAt: null,
    error: null,
  });

  // Record channel send
  recordChannelSend(channel);

  return {
    segment,
    channel,
    offers,
    formattedMessages,
    post,
  };
}

// ============================================
// Enhanced personalization per segment
// ============================================

/**
 * Format offer with segment-specific personalization.
 * Adds contextual messaging based on the segment.
 */
function formatForSegmentPersonalized(
  offer: DistributableOffer,
  channel: DistributionChannel,
  segment: DistributionSegment
): string {
  const base = formatForChannel(offer, channel);
  if (segment === "geral") return base;

  const segmentLabel = SEGMENT_LABELS[segment];

  // Segment-specific prefixes and suffixes
  let prefix = "";
  let suffix = "";

  switch (segment) {
    case "ofertas-quentes":
      prefix = channel === "telegram"
        ? `🔥 [${segmentLabel}] `
        : channel === "whatsapp"
        ? `*🔥 [${segmentLabel}]* `
        : `[${segmentLabel}] `;
      if (offer.offerScore >= 80) {
        suffix = channel === "telegram"
          ? `\n⭐ Score: ${offer.offerScore}/100`
          : ` | Score: ${offer.offerScore}/100`;
      }
      break;

    case "cupons":
      prefix = channel === "telegram"
        ? `🎟️ [${segmentLabel}] `
        : channel === "whatsapp"
        ? `*🎟️ [${segmentLabel}]* `
        : `[${segmentLabel}] `;
      if (offer.couponText) {
        suffix = channel === "telegram"
          ? `\n🏷️ Cupom: ${offer.couponText}`
          : ` | Cupom: ${offer.couponText}`;
      }
      break;

    case "eletronicos":
    case "moda":
    case "casa":
    case "games":
      prefix = channel === "telegram"
        ? `[${segmentLabel}] `
        : channel === "whatsapp"
        ? `*[${segmentLabel}]* `
        : `[${segmentLabel}] `;
      if (offer.isFreeShipping) {
        suffix = channel === "telegram"
          ? "\n🚚 Frete gratis!"
          : " | Frete gratis!";
      }
      break;

    default:
      prefix = `[${segmentLabel}] `;
  }

  return prefix + base + suffix;
}
