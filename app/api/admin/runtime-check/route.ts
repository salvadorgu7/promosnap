import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import { runRuntimeQA } from "@/lib/runtime/qa";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req);
  if (authError) return authError;

  try {
    const report = await runRuntimeQA();
    return NextResponse.json(report);
  } catch (error) {
    return NextResponse.json(
      {
        overall: "fail",
        timestamp: new Date().toISOString(),
        error: "Falha no runtime check",
      },
      { status: 500 }
    );
  }
}
