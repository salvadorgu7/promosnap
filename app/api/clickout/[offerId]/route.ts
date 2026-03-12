import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
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
        console.error("[clickout] Failed to record clickout:", err);
      });

    return NextResponse.redirect(offer.affiliateUrl, 302);
  } catch (error) {
    console.error("[clickout] Error processing clickout:", error);
    return NextResponse.redirect(homeUrl, 302);
  }
}
