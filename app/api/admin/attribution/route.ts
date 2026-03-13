import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import {
  getAttributionSummary,
  getAttributionFunnel,
} from "@/lib/attribution/engine";
import {
  getRevenueByAttribution,
  getTopPerformingPages,
  getChannelROI,
} from "@/lib/attribution/revenue-attribution";

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  try {
    const daysParam = req.nextUrl.searchParams.get("days");
    const days = daysParam ? parseInt(daysParam, 10) : 7;

    const [summary, funnel, revenue, topPages, channelROI] = await Promise.all([
      getAttributionSummary(days),
      getAttributionFunnel(),
      getRevenueByAttribution(days),
      getTopPerformingPages(10),
      getChannelROI(),
    ]);

    return NextResponse.json({
      summary,
      funnel,
      revenue,
      topPages,
      channelROI,
    });
  } catch (error) {
    console.error("[api/admin/attribution] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch attribution data" },
      { status: 500 }
    );
  }
}
