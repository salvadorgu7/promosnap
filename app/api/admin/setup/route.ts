import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import {
  getAllIntegrationReadiness,
  getActivationScore,
} from "@/lib/integrations/readiness";

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const integrations = getAllIntegrationReadiness();
    const score = getActivationScore();

    return NextResponse.json({ integrations, score });
  } catch (err) {
    console.error("[admin/setup] Error:", err);
    return NextResponse.json(
      { error: "Failed to fetch setup readiness" },
      { status: 500 },
    );
  }
}
