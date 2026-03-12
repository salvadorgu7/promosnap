// ============================================
// DISTRIBUTION ENGINE — core logic
// ============================================

import prisma from "@/lib/db/prisma";
import type {
  ChannelConfig,
  DistributableOffer,
  DistributionChannel,
  DistributionPost,
  DistributionSegment,
} from "./types";
import { isTelegramConfigured } from "./telegram";
import { isWhatsAppConfigured } from "./whatsapp";

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

export function getDistributionHistory(limit = 20): DistributionPost[] {
  return distributionHistory.slice(0, limit);
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
// Ready offers — top offers for distribution
// ============================================

export async function getReadyOffers(
  limit = 10
): Promise<DistributableOffer[]> {
  const APP_URL =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.promosnap.com.br";

  const offers = await prisma.offer.findMany({
    where: {
      isActive: true,
      offerScore: { gte: 30 },
      listing: {
        status: "ACTIVE",
        product: {
          status: "ACTIVE",
          hidden: false,
        },
      },
    },
    orderBy: [{ offerScore: "desc" }, { currentPrice: "asc" }],
    take: limit,
    include: {
      listing: {
        include: {
          product: true,
          source: true,
        },
      },
    },
  });

  return offers
    .filter((o) => o.listing.product !== null && o.listing.source !== null)
    .map((o) => {
      const product = o.listing.product!;
      const source = o.listing.source;
      const originalPrice = o.originalPrice ?? null;
      const discount =
        originalPrice && originalPrice > o.currentPrice
          ? Math.round(
              ((originalPrice - o.currentPrice) / originalPrice) * 100
            )
          : 0;

      return {
        offerId: o.id,
        productName: product.name,
        productSlug: product.slug,
        currentPrice: o.currentPrice,
        originalPrice,
        discount,
        offerScore: o.offerScore,
        sourceSlug: source.slug,
        sourceName: source.name,
        affiliateUrl: o.affiliateUrl,
        productUrl: `${APP_URL}/produto/${product.slug}`,
        imageUrl: product.imageUrl,
        isFreeShipping: o.isFreeShipping,
        rating: o.listing.rating,
        reviewsCount: o.listing.reviewsCount,
        couponText: o.couponText,
      };
    });
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
// Ready offers by segment
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

  // Build where clause
  const where: any = {
    isActive: true,
    offerScore: { gte: segment === "ofertas-quentes" ? 70 : 30 },
    listing: {
      status: "ACTIVE",
      product: {
        status: "ACTIVE",
        hidden: false,
        ...(categorySlugs.length > 0
          ? { category: { slug: { in: categorySlugs } } }
          : {}),
      },
    },
  };

  // Cupons segment: require coupon text
  if (segment === "cupons") {
    where.couponText = { not: null };
  }

  const offers = await prisma.offer.findMany({
    where,
    orderBy: [{ offerScore: "desc" }, { currentPrice: "asc" }],
    take: limit,
    include: {
      listing: {
        include: {
          product: { include: { category: true } },
          source: true,
        },
      },
    },
  });

  return offers
    .filter((o) => o.listing.product !== null && o.listing.source !== null)
    .map((o) => {
      const product = o.listing.product!;
      const source = o.listing.source;
      const originalPrice = o.originalPrice ?? null;
      const discount =
        originalPrice && originalPrice > o.currentPrice
          ? Math.round(
              ((originalPrice - o.currentPrice) / originalPrice) * 100
            )
          : 0;

      return {
        offerId: o.id,
        productName: product.name,
        productSlug: product.slug,
        currentPrice: o.currentPrice,
        originalPrice,
        discount,
        offerScore: o.offerScore,
        sourceSlug: source.slug,
        sourceName: source.name,
        affiliateUrl: o.affiliateUrl,
        productUrl: `${APP_URL}/produto/${product.slug}`,
        imageUrl: product.imageUrl,
        isFreeShipping: o.isFreeShipping,
        rating: o.listing.rating,
        reviewsCount: o.listing.reviewsCount,
        couponText: o.couponText,
      };
    });
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
