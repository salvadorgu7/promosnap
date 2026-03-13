import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { sendTestMessage } from '@/lib/distribution/telegram'
import { sendSlackNotification } from '@/lib/integrations/slack'
import { sendDiscordNotification } from '@/lib/integrations/discord'

export const dynamic = 'force-dynamic'

type IntegrationKey = 'telegram' | 'slack' | 'discord' | 'email' | 'cron' | 'ml'

const VALID_KEYS: IntegrationKey[] = ['telegram', 'slack', 'discord', 'email', 'cron', 'ml']

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  let body: { key?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Body JSON invalido' }, { status: 400 })
  }

  const key = body.key as IntegrationKey | undefined
  if (!key || !VALID_KEYS.includes(key)) {
    return NextResponse.json(
      { success: false, message: `key invalida. Use: ${VALID_KEYS.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    const result = await runTest(key)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ success: false, message: msg, details: null }, { status: 500 })
  }
}

async function runTest(
  key: IntegrationKey
): Promise<{ success: boolean; message: string; details: Record<string, unknown> | null }> {
  switch (key) {
    case 'telegram': {
      const result = await sendTestMessage()
      return {
        success: result.success,
        message: result.success
          ? 'Mensagem de teste enviada ao Telegram'
          : `Falha no Telegram: ${result.error}`,
        details: { messageId: result.messageId ?? null },
      }
    }

    case 'slack': {
      const result = await sendSlackNotification('PromoSnap test: Slack OK!')
      return {
        success: result.success,
        message: result.success
          ? 'Mensagem de teste enviada ao Slack'
          : `Falha no Slack: ${result.error}`,
        details: null,
      }
    }

    case 'discord': {
      const result = await sendDiscordNotification('PromoSnap test: Discord OK!')
      return {
        success: result.success,
        message: result.success
          ? 'Mensagem de teste enviada ao Discord'
          : `Falha no Discord: ${result.error}`,
        details: null,
      }
    }

    case 'email': {
      const hasApiKey = !!process.env.RESEND_API_KEY
      if (!hasApiKey) {
        return {
          success: false,
          message: 'RESEND_API_KEY nao configurada — envio real requer Resend',
          details: { configured: false },
        }
      }
      // Log intent — real send needs Resend SDK
      console.log('[integrations/test] Email test intent logged')
      return {
        success: true,
        message: 'RESEND_API_KEY presente — intent de teste logado',
        details: { configured: true, note: 'Envio real via endpoint dedicado de email' },
      }
    }

    case 'cron': {
      const hasCronSecret = !!process.env.CRON_SECRET
      return {
        success: hasCronSecret,
        message: hasCronSecret
          ? 'CRON_SECRET configurado — jobs protegidos'
          : 'CRON_SECRET ausente — jobs nao estao protegidos',
        details: { configured: hasCronSecret },
      }
    }

    case 'ml': {
      const hasClientId = !!(process.env.ML_CLIENT_ID || process.env.MERCADOLIVRE_APP_ID)
      const hasClientSecret = !!(process.env.ML_CLIENT_SECRET || process.env.MERCADOLIVRE_SECRET)
      const hasRedirectUri = !!process.env.ML_REDIRECT_URI

      const allPresent = hasClientId && hasClientSecret
      return {
        success: allPresent,
        message: allPresent
          ? 'Credenciais ML presentes — OAuth pronto'
          : 'Credenciais ML ausentes — configure no .env',
        details: {
          clientId: hasClientId,
          clientSecret: hasClientSecret,
          redirectUri: hasRedirectUri,
        },
      }
    }
  }
}
