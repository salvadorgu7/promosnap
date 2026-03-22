import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import {
  getConnectionState,
  isEvolutionConfigured,
  sendTestMessage,
} from "@/lib/whatsapp/evolution-api"

/**
 * GET /api/admin/whatsapp/status
 * Retorna estado da conexão. Usado para polling no admin.
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  if (!isEvolutionConfigured()) {
    return NextResponse.json({
      configured: false,
      connected: false,
      state: "unknown",
    })
  }

  const result = await getConnectionState()
  return NextResponse.json({
    configured: true,
    connected: result.state === "open",
    state: result.state,
    instance: result.instance,
  })
}

/**
 * POST /api/admin/whatsapp/status
 * Envia mensagem de teste para um grupo.
 */
export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  const body = await req.json().catch(() => ({}))
  const groupId = body.groupId

  if (!groupId) {
    return NextResponse.json(
      { error: "groupId obrigatório" },
      { status: 400 },
    )
  }

  const result = await sendTestMessage(groupId, body.text)
  return NextResponse.json(result)
}
