import { NextResponse } from "next/server";
import { getRevenueQuickStats } from "@/lib/revenue/tracker";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getRevenueQuickStats();
  return NextResponse.json(stats);
}
