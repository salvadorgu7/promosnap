import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { captureError, logWarn } from "@/lib/monitoring";
import { enrichClickoutAttribution } from "@/lib/attribution/engine";
import { logger } from "@/lib/logger";
import type { PageType, ChannelOrigin } from "@/lib/attribution/engine";

/**
 * Known Mercado Livre short-link / redirect domains.
 * These need ML affiliate param injection even though hostname ≠ mercadolivre.com
 */
const ML_SHORT_DOMAINS = [
  "meli.la",
  "mercadolivre.com",
  "mercadolibre.com",
];

function isMercadoLivreDomain(hostname: string): boolean {
  return ML_SHORT_DOMAINS.some((d) => hostname.includes(d));
}

/**
 * Append/replace affiliate tracking params on redirect URL.
 * ALWAYS replaces third-party affiliate params with PromoSnap's own IDs
 * to ensure correct attribution and monetisation.
 */
function appendAffiliateParams(url: string, sourceSlug: string): string {
  try {
    const parsed = new URL(url);

    // Mercado Livre / Mercado Libre (includes meli.la short links)
    if (
      sourceSlug === "mercadolivre" ||
      isMercadoLivreDomain(parsed.hostname)
    ) {
      const affiliateId = process.env.MERCADOLIVRE_AFFILIATE_ID;
      if (affiliateId) {
        // ALWAYS replace — third-party matt_tool from WhatsApp senders must be overwritten
        parsed.searchParams.set("matt_tool", affiliateId);
        const word = process.env.MERCADOLIVRE_AFFILIATE_WORD;
        if (word) parsed.searchParams.set("matt_word", word);
      }
      // Strip tracking params that leak from WhatsApp messages
      parsed.searchParams.delete("forceInApp");
      parsed.searchParams.delete("ref");
    }

    // Amazon BR (includes amzn.to, a.co short links)
    if (
      sourceSlug === "amazon" || sourceSlug === "amazon-br" ||
      parsed.hostname.includes("amazon.com.br") ||
      parsed.hostname === "amzn.to" ||
      parsed.hostname === "a.co"
    ) {
      const tag = process.env.AMAZON_AFFILIATE_TAG || process.env.AMAZON_PARTNER_TAG || "promosnap-20";
      if (tag) {
        parsed.searchParams.set("tag", tag); // Always replace
        parsed.searchParams.set("linkCode", "ll1");
      }
    }

    // Shopee (includes s.shopee.com.br and shope.ee short links)
    if (
      sourceSlug === "shopee" ||
      parsed.hostname.includes("shopee.com.br") ||
      parsed.hostname.includes("shope.ee")
    ) {
      const afId = process.env.SHOPEE_AFFILIATE_ID;
      if (afId) {
        parsed.searchParams.set("af_id", afId); // Always replace
      }
    }

    // Shein
    if (
      sourceSlug === "shein" ||
      parsed.hostname.includes("shein.com")
    ) {
      const affId = process.env.SHEIN_AFFILIATE_ID;
      if (affId) {
        parsed.searchParams.set("aff_id", affId); // Always replace
      }
    }

    // Magazine Luiza
    if (
      sourceSlug === "magalu" || sourceSlug === "magazine-luiza" ||
      parsed.hostname.includes("magazineluiza.com.br") ||
      parsed.hostname.includes("magalu.com.br")
    ) {
      const partnerId = process.env.MAGALU_PARTNER_ID;
      if (partnerId && !parsed.searchParams.has("partner_id")) {
        parsed.searchParams.set("partner_id", partnerId);
      }
    }

    // KaBuM
    if (
      sourceSlug === "kabum" ||
      parsed.hostname.includes("kabum.com.br")
    ) {
      const tag = process.env.KABUM_AFFILIATE_ID;
      if (tag && !parsed.searchParams.has("tag")) {
        parsed.searchParams.set("tag", tag);
      }
    }

    return parsed.toString();
  } catch (err) {
    logger.error("clickout.affiliate-params-failed", { error: err });
    return url; // If URL parsing fails, return as-is
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  // Rate limit: 120 req/min for clickouts
  const rl = rateLimit(request, "clickout");
  if (!rl.success) return rateLimitResponse(rl);

  const { offerId } = await params;
  const homeUrl = new URL("/", request.url);

  try {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        affiliateUrl: true,
        listing: {
          select: {
            source: { select: { slug: true } },
          },
        },
      },
    });

    if (!offer || !offer.affiliateUrl || offer.affiliateUrl === '#') {
      logWarn("clickout", `Offer not found or missing affiliate URL: ${offerId}`);
      return NextResponse.redirect(homeUrl, 302);
    }

    const sourceSlug = offer.listing.source.slug;
    const referrer = request.headers.get("referer") || null;
    const userAgent = request.headers.get("user-agent") || null;
    const sessionId = request.cookies.get("ps_session")?.value || null;
    const query = request.nextUrl.searchParams.get("q") || null;
    const categorySlug =
      request.nextUrl.searchParams.get("cat") || null;

    // Attribution query params (do not affect redirect)
    const pageParam = request.nextUrl.searchParams.get("page") || null;
    const campaignParam = request.nextUrl.searchParams.get("campaign") || null;
    const channelParam = request.nextUrl.searchParams.get("channel") || null;
    const refParam = request.nextUrl.searchParams.get("ref") || null;
    const bannerParam = request.nextUrl.searchParams.get("banner") || null;
    const productParam = request.nextUrl.searchParams.get("product") || null;

    // Monetization tracking params
    const originTypeParam = request.nextUrl.searchParams.get("origin") || null;
    const railSourceParam = request.nextUrl.searchParams.get("rail") || null;

    // Block-level tracking params (commercial decision intelligence)
    const blockParam = request.nextUrl.searchParams.get("block") || null;
    const posParam = request.nextUrl.searchParams.get("pos");
    const positionInBlock = posParam !== null ? parseInt(posParam, 10) : null;
    const recParam = request.nextUrl.searchParams.get("rec") || null;
    const labelParam = request.nextUrl.searchParams.get("label") || null;

    // Fire-and-forget: don't await so redirect is instant
    prisma.clickout
      .create({
        data: {
          offerId: offer.id,
          sourceSlug,
          referrer,
          userAgent,
          sessionId,
          query,
          categorySlug,
          originType: originTypeParam,
          railSource: railSourceParam,
          blockId: blockParam,
          positionInBlock: positionInBlock !== null && !isNaN(positionInBlock) ? positionInBlock : null,
          recommendationType: recParam,
          ctaLabel: labelParam,
        },
      })
      .then((clickout) => {
        // Enrich with attribution context after clickout is stored
        const hasAttribution =
          pageParam || campaignParam || channelParam || refParam || bannerParam || productParam || sourceSlug || categorySlug;
        if (hasAttribution) {
          const validPageTypes: PageType[] = [
            "home", "search", "product", "category", "brand", "offer", "guide", "comparison", "email", "channel",
          ];
          const validChannels: ChannelOrigin[] = [
            "direct", "telegram", "whatsapp", "email", "slack", "discord", "referral",
          ];

          enrichClickoutAttribution(clickout.id, {
            source: sourceSlug || undefined,
            category: categorySlug || undefined,
            productId: productParam || undefined,
            pageType: validPageTypes.includes(pageParam as PageType)
              ? (pageParam as PageType)
              : undefined,
            campaignId: campaignParam || undefined,
            channelOrigin: validChannels.includes(channelParam as ChannelOrigin)
              ? (channelParam as ChannelOrigin)
              : undefined,
            referralCode: refParam || undefined,
            bannerId: bannerParam || undefined,
          });
        }
      })
      .catch((err) => {
        captureError(err, { route: "/api/clickout", offerId: offer.id, sourceSlug });
      });

    // Ensure affiliate params are present on redirect URL
    const finalUrl = appendAffiliateParams(offer.affiliateUrl, sourceSlug);

    // Inject clickout ID as sub_id for postback conversion matching
    try {
      const redirectUrl = new URL(finalUrl);
      redirectUrl.searchParams.set("sub_id", offer.id);
      return NextResponse.redirect(redirectUrl.toString(), 302);
    } catch {
      return NextResponse.redirect(finalUrl, 302);
    }
  } catch (error) {
    await captureError(error, { route: "/api/clickout", offerId });
    return NextResponse.redirect(homeUrl, 302);
  }
}
