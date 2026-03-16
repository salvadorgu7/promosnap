import { NextRequest, NextResponse } from 'next/server'
import { validateAdmin } from '@/lib/auth/admin'
import { trackEmailExecution } from '@/lib/integrations/email-execution'

export const dynamic = 'force-dynamic'

type TemplateKey = 'welcome' | 'daily-deals' | 'campaign' | 'alert'

const VALID_TEMPLATES: TemplateKey[] = ['welcome', 'daily-deals', 'campaign', 'alert']

const TEMPLATE_SUBJECTS: Record<TemplateKey, string> = {
  welcome: 'Bem-vindo ao PromoSnap!',
  'daily-deals': 'Ofertas do dia — PromoSnap',
  campaign: 'Campanha especial — PromoSnap',
  alert: 'Alerta de preco — PromoSnap',
}

export async function POST(req: NextRequest) {
  const authError = validateAdmin(req)
  if (authError) return authError

  let body: { template?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ success: false, message: 'Body JSON invalido' }, { status: 400 })
  }

  const template = body.template as TemplateKey | undefined
  if (!template || !VALID_TEMPLATES.includes(template)) {
    return NextResponse.json(
      {
        success: false,
        message: `Template invalido. Use: ${VALID_TEMPLATES.join(', ')}`,
      },
      { status: 400 }
    )
  }

  // Check RESEND_API_KEY
  const hasApiKey = !!process.env.RESEND_API_KEY
  if (!hasApiKey) {
    trackEmailExecution(
      `test_${template}_${Date.now()}`,
      template === 'daily-deals' ? 'deal' : template === 'campaign' ? 'campaign' : template === 'alert' ? 'alert' : 'welcome',
      'test@promosnap.com.br',
      'failed',
      'RESEND_API_KEY nao configurada'
    )

    return NextResponse.json({
      success: false,
      message: 'RESEND_API_KEY nao configurada — envio real nao disponivel',
      template,
      subject: TEMPLATE_SUBJECTS[template],
    })
  }

  // Log test execution
  const emailType = template === 'daily-deals' ? 'deal' as const
    : template === 'campaign' ? 'campaign' as const
    : template === 'alert' ? 'alert' as const
    : 'welcome' as const

  trackEmailExecution(
    `test_${template}_${Date.now()}`,
    emailType,
    'test@promosnap.com.br',
    'sent'
  )

  return NextResponse.json({
    success: true,
    message: `Teste do template "${template}" registrado com sucesso`,
    template,
    subject: TEMPLATE_SUBJECTS[template],
    note: 'Intent logado no execution tracker. Envio real via Resend SDK.',
  })
}
