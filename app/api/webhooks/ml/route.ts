import { NextRequest, NextResponse } from 'next/server'

// ML envia notificações via POST neste endpoint
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[webhook:ml] notification received:', JSON.stringify(body))

    // ML espera 200 para confirmar recebimento
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // sempre 200 para o ML não retentar
  }
}

// ML pode fazer GET para validar o endpoint
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'ml-webhook' })
}
