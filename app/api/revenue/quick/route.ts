import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import { getRevenueQuickStats } from "@/lib/revenue/tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  const stats = await getRevenueQuickStats();
  return NextResponse.json(stats);
}
