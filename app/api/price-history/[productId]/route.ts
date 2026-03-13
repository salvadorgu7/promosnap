import { NextRequest, NextResponse } from "next/server";
// import prisma from "@/lib/db/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const days = parseInt(request.nextUrl.searchParams.get("days") || "90");

    // TODO: Fetch price snapshots from DB

    return NextResponse.json({
      productId,
      days,
      snapshots: [],
      message: "Price history endpoint ready — connect to database to enable",
    });
  } catch {
    return NextResponse.json(
      { error: "Falha ao buscar historico de precos" },
      { status: 500 }
    );
  }
}
