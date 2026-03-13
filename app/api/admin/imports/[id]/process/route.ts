import { NextRequest, NextResponse } from "next/server";
import { validateAdmin } from "@/lib/auth/admin";
import { processImportBatch } from "@/lib/ingest/import";

// ─── POST /api/admin/imports/[id]/process — process a pending batch ──────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = validateAdmin(request);
  if (denied) return denied;

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "ID do batch obrigatorio" }, { status: 400 });
  }

  try {
    const result = await processImportBatch(id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: 'Erro ao processar batch' },
      { status: 500 },
    );
  }
}
