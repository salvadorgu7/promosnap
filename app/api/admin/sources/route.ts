import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/db/prisma";

export async function GET() {
  // TODO: Auth check + real query
  // const sources = await prisma.source.findMany({
  //   include: {
  //     _count: { select: { listings: true } },
  //   },
  // });

  return NextResponse.json({
    sources: [
      { slug: "amazon-br", name: "Amazon Brasil", status: "ACTIVE", listings: 0 },
      { slug: "mercadolivre", name: "Mercado Livre", status: "ACTIVE", listings: 0 },
      { slug: "shopee", name: "Shopee", status: "ACTIVE", listings: 0 },
      { slug: "shein", name: "Shein", status: "ACTIVE", listings: 0 },
    ],
  });
}
