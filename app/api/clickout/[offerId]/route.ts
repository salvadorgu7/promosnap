import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit, rateLimitResponse } from "@/lib/security/rate-limit";
import { captureError, logWarn } from "@/lib/monitoring";

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
        },
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
