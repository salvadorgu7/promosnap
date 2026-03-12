import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import { getMonitoringReport } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  try {
    const report = getMonitoringReport();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get monitoring data" },
      { status: 500 }
    );
  }
}
