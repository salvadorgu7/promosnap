import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import {
  execute,
  getExecutions,
  getExecutionSummary,
  retryExecution,
} from "@/lib/execution/engine";
import type { ExecutionType, ExecutionOrigin } from "@/lib/execution/types";

const VALID_TYPES: ExecutionType[] = [
  "create_banner",
  "publish_distribution",
  "feature_product",
  "create_campaign",
  "create_import_batch",
  "create_review_task",
  "trigger_job",
  "trigger_email",
  "trigger_webhook",
];

export async function GET(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") as ExecutionType | null;
    const status = url.searchParams.get("status") as string | null;
    const limitStr = url.searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const includeSummary = url.searchParams.get("summary") === "true";

    const executions = getExecutions({
      type: type && VALID_TYPES.includes(type) ? type : undefined,
      status: status as Parameters<typeof getExecutions>[0] extends undefined ? never : NonNullable<Parameters<typeof getExecutions>[0]>["status"],
      limit,
    });

    const response: Record<string, unknown> = { executions };

    if (includeSummary) {
      response.summary = getExecutionSummary();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[executions] GET error:", error);
    return NextResponse.json(
      { error: "Failed to load executions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const denied = validateAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { type, payload, origin, linkedOpportunityId, retryId } = body as {
      type?: ExecutionType;
      payload?: Record<string, unknown>;
      origin?: ExecutionOrigin;
      linkedOpportunityId?: string;
      retryId?: string;
    };

    // Handle retry
    if (retryId) {
      const result = await retryExecution(retryId);
      if (!result) {
        return NextResponse.json(
          { error: "Execution not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ execution: result });
    }

    // Validate type
    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type. Must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const record = await execute(
      type,
      payload || {},
      origin || "manual",
      linkedOpportunityId
    );

    return NextResponse.json({ execution: record });
  } catch (error) {
    console.error("[executions] POST error:", error);
    return NextResponse.json(
      { error: "Execution failed" },
      { status: 500 }
    );
  }
}
