import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;

  try {
    const offer = await prisma.offer.findUnique({
      where: { id: offerId },
      select: { affiliateUrl: true, listing: { select: { productUrl: true, source: { select: { slug: true } } } } },
    });

    if (!offer) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Fire-and-forget: record clickout
    const referrer = request.headers.get("referer") || undefined;
    const userAgent = request.headers.get("user-agent") || undefined;
    const searchParams = request.nextUrl.searchParams;

    prisma.clickout.create({
      data: {
        offerId,
        sourceSlug: offer.listing.source.slug,
        referrer,
        userAgent,
        query: searchParams.get("q") || undefined,
        categorySlug: searchParams.get("cat") || undefined,
      },
    }).catch(() => {});

    const redirectUrl = offer.affiliateUrl || offer.listing.productUrl;
    return NextResponse.redirect(redirectUrl, 302);
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
