import { NextRequest, NextResponse } from "next/server"
import { validateAdmin } from "@/lib/auth/admin"
import {
  createInstance,
  connectInstance,
  disconnectInstance,
  getDashboardStatus,
  isEvolutionConfigured,
} from "@/lib/whatsapp/evolution-api"

export async function GET(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  if (!isEvolutionConfigured()) {
    return NextResponse.json({
      configured: false,
      error: "EVOLUTION_API_URL e EVOLUTION_API_KEY não configurados",
    })
  }

  const status = await getDashboardStatus()
  return NextResponse.json(status)
}

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  if (!isEvolutionConfigured()) {
    return NextResponse.json(
      { error: "EVOLUTION_API_URL e EVOLUTION_API_KEY não configurados" },
      { status: 400 },
    )
  }

  const body = await req.json().catch(() => ({}))
  const action = body.action || "create"

  if (action === "disconnect") {
    const result = await disconnectInstance()
    return NextResponse.json(result)
  }

  if (action === "reconnect") {
    const result = await connectInstance()
    return NextResponse.json(result)
  }

  // Default: create instance (or connect if already exists)
  const result = await createInstance()
  return NextResponse.json(result)
}
