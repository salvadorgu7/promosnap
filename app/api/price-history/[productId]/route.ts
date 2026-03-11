import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const days = parseInt(request.nextUrl.searchParams.get("days") || "90");

  // TODO: Fetch from DB
  // const since = new Date();
  // since.setDate(since.getDate() - days);
  //
  // const snapshots = await prisma.priceSnapshot.findMany({
  //   where: {
  //     offer: { listing: { productId } },
  //     capturedAt: { gte: since },
  //   },
  //   orderBy: { capturedAt: 'asc' },
  //   select: { price: true, capturedAt: true },
  // });

  return NextResponse.json({
    productId,
    days,
    snapshots: [],
    message: "Price history endpoint ready — connect to database to enable",
  });
}
