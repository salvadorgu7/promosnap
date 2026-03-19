/**
 * GET /api/unsubscribe?email=x&token=y
 *
 * One-click unsubscribe endpoint. Used in email footers.
 * Token = sha256(email + ADMIN_SECRET) to prevent abuse.
 * Redirects to a confirmation page.
 */

import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db/prisma'
import { createHash } from 'crypto'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'unsubscribe' })

function generateUnsubscribeToken(email: string): string {
  const secret = process.env.ADMIN_SECRET || 'promosnap-unsub'
  return createHash('sha256').update(`${email}:${secret}`).digest('hex').slice(0, 16)
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  const token = req.nextUrl.searchParams.get('token')

  if (!email || !token) {
    return new NextResponse(renderPage('Link inválido', 'O link de descadastro está incompleto.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 400,
    })
  }

  // Validate token
  const expectedToken = generateUnsubscribeToken(email)
  if (token !== expectedToken) {
    return new NextResponse(renderPage('Link inválido', 'Este link de descadastro não é válido.'), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
      status: 403,
    })
  }

  try {
    // Unsubscribe
    const result = await prisma.subscriber.updateMany({
      where: { email: email.toLowerCase().trim() },
      data: { status: 'UNSUBSCRIBED' },
    })

    // Also deactivate price alerts
    await prisma.priceAlert.updateMany({
      where: { email: email.toLowerCase().trim(), isActive: true },
      data: { isActive: false },
    })

    log.info('unsubscribe.success', { email: email.slice(0, 3) + '***', updated: result.count })

    return new NextResponse(
      renderPage(
        'Descadastro confirmado',
        'Você não receberá mais emails do PromoSnap. Se mudar de ideia, é só se inscrever novamente no site.'
      ),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    )
  } catch (err) {
    log.error('unsubscribe.failed', { error: err })
    return new NextResponse(
      renderPage('Erro', 'Não foi possível processar seu descadastro. Tente novamente.'),
      { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 500 }
    )
  }
}

function renderPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} | PromoSnap</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fb; color: #1a1a2e; }
    .card { max-width: 420px; padding: 40px; text-align: center; background: white; border-radius: 16px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    h1 { font-size: 22px; margin-bottom: 12px; }
    p { font-size: 15px; color: #666; line-height: 1.6; }
    a { color: #6366f1; text-decoration: none; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p style="margin-top: 24px;"><a href="https://www.promosnap.com.br">Voltar ao PromoSnap</a></p>
  </div>
</body>
</html>`
}
