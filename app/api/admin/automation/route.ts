import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import {
  getActiveRules,
  simulateRules,
  applyAutomation,
  toggleRule,
  updateThresholds,
} from "@/lib/automation/rules";

// ─── GET /api/admin/automation — return rules and stats ─────────────────────

export async function GET(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  try {
    const rules = getActiveRules();

    return NextResponse.json({
      rules,
      stats: {
        totalRules: rules.length,
        activeRules: rules.filter((r) => r.isActive).length,
        inactiveRules: rules.filter((r) => !r.isActive).length,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Erro ao buscar regras",
        details: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}

// ─── POST /api/admin/automation — actions ───────────────────────────────────

export async function POST(request: NextRequest) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  let body: {
    action: string;
    ruleId?: string;
    isActive?: boolean;
    thresholds?: Record<string, number>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido" }, { status: 400 });
  }

  const { action } = body;

  try {
    switch (action) {
      case "simulate": {
        const simulation = await simulateRules(50);
        return NextResponse.json({ simulation });
      }

      case "apply": {
        const simulation = await simulateRules(50);
        const result = await applyAutomation(simulation.triggered);
        return NextResponse.json({
          applied: result.applied,
          errors: result.errors,
          triggered: simulation.triggered.length,
        });
      }

      case "toggle": {
        if (!body.ruleId) {
          return NextResponse.json(
            { error: "ruleId obrigatorio" },
            { status: 400 }
          );
        }
        const newState = body.isActive !== undefined ? body.isActive : true;
        toggleRule(body.ruleId, newState);
        return NextResponse.json({
          success: true,
          ruleId: body.ruleId,
          isActive: newState,
        });
      }

      case "update_thresholds": {
        if (!body.ruleId || !body.thresholds) {
          return NextResponse.json(
            { error: "ruleId e thresholds obrigatorios" },
            { status: 400 }
          );
        }
        updateThresholds(body.ruleId, body.thresholds);
        return NextResponse.json({
          success: true,
          ruleId: body.ruleId,
          thresholds: body.thresholds,
        });
      }

      default:
        return NextResponse.json(
          { error: `Acao desconhecida: ${action}` },
          { status: 400 }
        );
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "Erro interno",
        details: err instanceof Error ? err.message : "Erro desconhecido",
      },
      { status: 500 }
    );
  }
}
