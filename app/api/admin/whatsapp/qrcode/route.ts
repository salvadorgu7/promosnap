import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import { connectInstance, isEvolutionConfigured } from "@/lib/whatsapp/evolution-api"

/**
 * GET /api/admin/whatsapp/qrcode
 * Retorna o QR code (base64) para conectar o WhatsApp.
 * Chamado em polling pelo admin panel.
 */
export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  if (!isEvolutionConfigured()) {
    return NextResponse.json(
      { error: "Evolution API não configurada" },
      { status: 400 },
    )
  }

  const result = await connectInstance()

  if (result.instance?.state === "open") {
    return NextResponse.json({
      connected: true,
      state: "open",
      message: "WhatsApp já está conectado!",
    })
  }

  if (result.qrcode) {
    return NextResponse.json({
      connected: false,
      state: result.instance?.state || "connecting",
      qrcode: result.qrcode,
    })
  }

  return NextResponse.json({
    connected: false,
    state: result.instance?.state || "unknown",
    error: result.error || "QR code não disponível. Tente novamente.",
  })
}
