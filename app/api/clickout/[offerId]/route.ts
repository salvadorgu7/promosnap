import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { captureError, logWarn } from "@/lib/monitoring";
import { enrichClickoutAttribution } from "@/lib/attribution/engine";
import type { PageType, ChannelOrigin } from "@/lib/attribution/engine";

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

    if (!offer || !offer.affiliateUrl) {
      logWarn("clickout", `Offer not found or missing URL: ${offerId}`);
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

    return NextResponse.redirect(offer.affiliateUrl, 302);
  } catch (error) {
    await captureError(error, { route: "/api/clickout", offerId });
    return NextResponse.redirect(homeUrl, 302);
  }
}
