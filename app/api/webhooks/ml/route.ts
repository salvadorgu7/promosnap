import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { rateLimit, rateLimitResponse } from '@/lib/security/rate-limit'

const WEBHOOK_SECRET = process.env.ML_WEBHOOK_SECRET

// ML envia notificacoes via POST neste endpoint
export async function POST(req: NextRequest) {
  // Rate limit webhooks: 30 req/min (stricter than public)
  const rl = rateLimit(req, 'public')
  if (!rl.success) return rateLimitResponse(rl)

  // Validate webhook token if configured
  if (WEBHOOK_SECRET) {
    const token = req.headers.get('x-webhook-token')
    if (token !== WEBHOOK_SECRET) {
      console.warn('[webhook:ml] Unauthorized request — invalid or missing token')
      return NextResponse.json({ ok: false }, { status: 401 })
    }
  } else {
    console.warn('[webhook:ml] ML_WEBHOOK_SECRET not configured — accepting request without token validation')
  }

  try {
    const body = await req.json()

    // Log notification type without leaking full payload
    const topic = body?.topic || 'unknown'
    const resourceId = typeof body?.resource === 'string'
      ? body.resource.split('/').pop()
      : ''
    console.log(`[webhook:ml] topic=${topic} resource_id=${resourceId}`)

    // Store notification for async processing
    if (body?.topic) {
      try {
        await prisma.systemSetting.upsert({
          where: { key: `ml_webhook_last_${body.topic}` },
          create: {
            key: `ml_webhook_last_${body.topic}`,
            value: JSON.stringify({
              receivedAt: new Date().toISOString(),
              resource: body.resource,
              userId: body.user_id,
            }),
          },
          update: {
            value: JSON.stringify({
              receivedAt: new Date().toISOString(),
              resource: body.resource,
              userId: body.user_id,
            }),
          },
        })
      } catch {
        // Non-critical — don't fail the webhook response
      }
    }

    // ML espera 200 para confirmar recebimento
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // sempre 200 para o ML nao retentar
  }
}

// ML pode fazer GET para validar o endpoint
export async function GET() {
  return NextResponse.json({ ok: true, endpoint: 'ml-webhook', status: 'active' })
}
