import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ offerId: string }> }
) {
  const { offerId } = await params;

  // TODO: Fetch offer from DB and track clickout
  // const offer = await prisma.offer.findUnique({
  //   where: { id: offerId },
  //   include: { listing: { include: { source: true } } },
  // });
  //
  // if (!offer || !offer.affiliateUrl) {
  //   return NextResponse.redirect(new URL("/", request.url));
  // }
  //
  // // Log the clickout
  // await prisma.clickout.create({
  //   data: {
  //     offerId: offer.id,
  //     sourceSlug: offer.listing.source.slug,
  //     referrer: request.headers.get("referer") || null,
  //     sessionId: request.cookies.get("ps_session")?.value || null,
  //     query: request.nextUrl.searchParams.get("q") || null,
  //     userAgent: request.headers.get("user-agent") || null,
  //   },
  // });
  //
  // return NextResponse.redirect(offer.affiliateUrl);

  // For now, redirect to homepage
  return NextResponse.redirect(new URL("/", request.url));
}
