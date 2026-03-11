import { NextResponse } from "next/server";
// import prisma from "@/lib/db/prisma";

export async function GET() {
  // TODO: Replace with real query
  // const trending = await prisma.product.findMany({
  //   where: { status: 'ACTIVE' },
  //   orderBy: { popularityScore: 'desc' },
  //   take: 20,
  //   include: {
  //     brand: true,
  //     category: true,
  //     listings: {
  //       include: {
  //         offers: { where: { isActive: true }, orderBy: { offerScore: 'desc' }, take: 1 },
  //       },
  //     },
  //   },
  // });

  return NextResponse.json({
    products: [],
    message: "Trending endpoint ready — connect to database to enable",
  });
}
