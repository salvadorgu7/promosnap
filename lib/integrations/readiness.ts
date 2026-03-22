// ============================================
// INTEGRATIONS — Readiness Checker
// ============================================
// Centralised readiness checks for every external integration.
// Never exposes secret values — only reports configured/missing/invalid.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IntegrationStatus =
  | 'NOT_CONFIGURED'
  | 'CONFIG_PARTIAL'
  | 'READY_TO_TEST'
  | 'READY_PRODUCTION'
  | 'BLOCKED_EXTERNAL'

export interface IntegrationReadiness {
  key: string
  name: string
  status: IntegrationStatus
  summary: string
  missingRequirements: string[]
  warnings: string[]
  nextSteps: string[]
  testable: boolean
  lastTest?: Date
  lastError?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envPresent(key: string): boolean {
  const v = process.env[key]
  return !!v && v.trim().length > 0
}

function urlLooksValid(key: string): boolean {
  const v = process.env[key]
  if (!v) return false
  try {
    const u = new URL(v)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

export function checkMlReadiness(): IntegrationReadiness {
  const missing: string[] = []
  const warnings: string[] = []
  const nextSteps: string[] = []

  // Accept both naming conventions
  const hasClientId = envPresent('ML_CLIENT_ID') || envPresent('MERCADOLIVRE_APP_ID')
  const hasClientSecret = envPresent('ML_CLIENT_SECRET') || envPresent('MERCADOLIVRE_SECRET')
  const hasRedirectUri = envPresent('ML_REDIRECT_URI') || envPresent('MERCADOLIVRE_REDIRECT_URI')

  if (!hasClientId) missing.push('ML_CLIENT_ID (ou MERCADOLIVRE_APP_ID)')
  if (!hasClientSecret) missing.push('ML_CLIENT_SECRET (ou MERCADOLIVRE_SECRET)')
  if (!hasRedirectUri) {
    warnings.push('ML_REDIRECT_URI nao definido — OAuth callback pode falhar')
    nextSteps.push('Definir ML_REDIRECT_URI apontando para /api/auth/ml/callback')
  }

  if (missing.length === 0 && warnings.length === 0) {
    return {
      key: 'mercadolivre',
      name: 'Mercado Livre',
      status: 'READY_PRODUCTION',
      summary: 'OAuth configurado e pronto',
      missingRequirements: [],
      warnings: [],
      nextSteps: [],
      testable: true,
    }
  }

  if (missing.length === 0) {
    return {
      key: 'mercadolivre',
      name: 'Mercado Livre',
      status: 'READY_TO_TEST',
      summary: 'Credenciais presentes, verificar redirect URI',
      missingRequirements: [],
      warnings,
      nextSteps,
      testable: true,
    }
  }

  const allMissing = missing.length >= 2
  return {
    key: 'mercadolivre',
    name: 'Mercado Livre',
    status: allMissing ? 'NOT_CONFIGURED' : 'CONFIG_PARTIAL',
    summary: allMissing
      ? 'OAuth nao configurado — crie um app em developers.mercadolivre.com.br'
      : 'Configuracao incompleta — faltam credenciais',
    missingRequirements: missing,
    warnings,
    nextSteps: [
      ...nextSteps,
      ...missing.map((m) => `Definir ${m} no .env`),
    ],
    testable: false,
  }
}

export function checkTelegramReadiness(): IntegrationReadiness {
  const missing: string[] = []
  const warnings: string[] = []

  if (!envPresent('TELEGRAM_BOT_TOKEN')) missing.push('TELEGRAM_BOT_TOKEN')
  if (!envPresent('TELEGRAM_CHAT_ID')) missing.push('TELEGRAM_CHAT_ID')

  if (missing.length === 0) {
    return {
      key: 'telegram',
      name: 'Telegram',
      status: 'READY_PRODUCTION',
      summary: 'Bot configurado e pronto para distribuicao',
      missingRequirements: [],
      warnings: [],
      nextSteps: [],
      testable: true,
    }
  }

  const allMissing = missing.length === 2
  return {
    key: 'telegram',
    name: 'Telegram',
    status: allMissing ? 'NOT_CONFIGURED' : 'CONFIG_PARTIAL',
    summary: allMissing
      ? 'Telegram nao configurado — crie um bot via @BotFather'
      : 'Configuracao parcial — falta variavel',
    missingRequirements: missing,
    warnings,
    nextSteps: [
      ...(missing.includes('TELEGRAM_BOT_TOKEN')
        ? ['Criar bot no @BotFather e copiar o token']
        : []),
      ...(missing.includes('TELEGRAM_CHAT_ID')
        ? ['Obter chat_id do canal/grupo de destino']
        : []),
    ],
    testable: false,
  }
}

export function checkEmailReadiness(): IntegrationReadiness {
  const missing: string[] = []
  const warnings: string[] = []

  if (!envPresent('RESEND_API_KEY')) missing.push('RESEND_API_KEY')
  if (!envPresent('EMAIL_FROM')) {
    warnings.push('EMAIL_FROM nao definido — emails usarao remetente padrao')
  }

  if (missing.length === 0 && warnings.length === 0) {
    return {
      key: 'email',
      name: 'Email / Resend',
      status: 'READY_PRODUCTION',
      summary: 'Resend configurado com remetente definido',
      missingRequirements: [],
      warnings: [],
      nextSteps: [],
      testable: true,
    }
  }

  if (missing.length === 0) {
    return {
      key: 'email',
      name: 'Email / Resend',
      status: 'READY_TO_TEST',
      summary: 'API key presente, remetente nao definido',
      missingRequirements: [],
      warnings,
      nextSteps: ['Definir EMAIL_FROM com endereco verificado no Resend'],
      testable: true,
    }
  }

  return {
    key: 'email',
    name: 'Email / Resend',
    status: 'NOT_CONFIGURED',
    summary: 'Email nao configurado — crie conta no resend.com',
    missingRequirements: missing,
    warnings,
    nextSteps: [
      'Criar conta em resend.com',
      'Gerar API key e definir RESEND_API_KEY',
      'Definir EMAIL_FROM com endereco de remetente verificado',
    ],
    testable: false,
  }
}

export function checkSlackReadiness(): IntegrationReadiness {
  if (!envPresent('SLACK_WEBHOOK_URL')) {
    return {
      key: 'slack',
      name: 'Slack',
      status: 'NOT_CONFIGURED',
      summary: 'Webhook nao configurado',
      missingRequirements: ['SLACK_WEBHOOK_URL'],
      warnings: [],
      nextSteps: [
        'Criar Incoming Webhook no Slack',
        'Definir SLACK_WEBHOOK_URL no .env',
      ],
      testable: false,
    }
  }

  if (!urlLooksValid('SLACK_WEBHOOK_URL')) {
    return {
      key: 'slack',
      name: 'Slack',
      status: 'CONFIG_PARTIAL',
      summary: 'URL do webhook parece invalida',
      missingRequirements: [],
      warnings: ['SLACK_WEBHOOK_URL nao e uma URL valida'],
      nextSteps: ['Verificar formato da SLACK_WEBHOOK_URL'],
      testable: true,
    }
  }

  return {
    key: 'slack',
    name: 'Slack',
    status: 'READY_PRODUCTION',
    summary: 'Webhook configurado e pronto',
    missingRequirements: [],
    warnings: [],
    nextSteps: [],
    testable: true,
  }
}

export function checkDiscordReadiness(): IntegrationReadiness {
  if (!envPresent('DISCORD_WEBHOOK_URL')) {
    return {
      key: 'discord',
      name: 'Discord',
      status: 'NOT_CONFIGURED',
      summary: 'Webhook nao configurado',
      missingRequirements: ['DISCORD_WEBHOOK_URL'],
      warnings: [],
      nextSteps: [
        'Criar Webhook no canal Discord desejado',
        'Definir DISCORD_WEBHOOK_URL no .env',
      ],
      testable: false,
    }
  }

  if (!urlLooksValid('DISCORD_WEBHOOK_URL')) {
    return {
      key: 'discord',
      name: 'Discord',
      status: 'CONFIG_PARTIAL',
      summary: 'URL do webhook parece invalida',
      missingRequirements: [],
      warnings: ['DISCORD_WEBHOOK_URL nao e uma URL valida'],
      nextSteps: ['Verificar formato da DISCORD_WEBHOOK_URL'],
      testable: true,
    }
  }

  return {
    key: 'discord',
    name: 'Discord',
    status: 'READY_PRODUCTION',
    summary: 'Webhook configurado e pronto',
    missingRequirements: [],
    warnings: [],
    nextSteps: [],
    testable: true,
  }
}

export function checkWhatsAppReadiness(): IntegrationReadiness {
  // Evolution API v2 (prioridade)
  const hasEvoUrl = envPresent('EVOLUTION_API_URL')
  const hasEvoKey = envPresent('EVOLUTION_API_KEY')

  if (hasEvoUrl && hasEvoKey) {
    return {
      key: 'whatsapp',
      name: 'WhatsApp (Evolution API)',
      status: 'READY_PRODUCTION',
      summary: 'Evolution API v2 configurada — conecte via QR code em Admin → WhatsApp',
      missingRequirements: [],
      warnings: [],
      nextSteps: ['Abrir Admin → WhatsApp para conectar via QR code'],
      testable: true,
    }
  }

  if (hasEvoUrl || hasEvoKey) {
    const missing = []
    if (!hasEvoUrl) missing.push('EVOLUTION_API_URL')
    if (!hasEvoKey) missing.push('EVOLUTION_API_KEY')
    return {
      key: 'whatsapp',
      name: 'WhatsApp (Evolution API)',
      status: 'CONFIG_PARTIAL',
      summary: 'Evolution API parcialmente configurada',
      missingRequirements: missing,
      warnings: [],
      nextSteps: missing.map(v => `Definir ${v} nas variáveis de ambiente`),
      testable: false,
    }
  }

  // WA Business API (fallback)
  const hasUrl = envPresent('WHATSAPP_API_URL')
  const hasToken = envPresent('WHATSAPP_API_TOKEN')

  if (hasUrl && hasToken) {
    return {
      key: 'whatsapp',
      name: 'WhatsApp',
      status: 'READY_PRODUCTION',
      summary: 'API configurada com URL e token',
      missingRequirements: [],
      warnings: ['Considere migrar para Evolution API v2 (QR code, sem provider externo)'],
      nextSteps: [],
      testable: true,
    }
  }

  if (hasToken) {
    return {
      key: 'whatsapp',
      name: 'WhatsApp',
      status: 'READY_TO_TEST',
      summary: 'Token presente, URL nao definida — usando provider generico',
      missingRequirements: [],
      warnings: ['WHATSAPP_API_URL nao definido — usando endpoint generico'],
      nextSteps: ['Definir WHATSAPP_API_URL para seu provider'],
      testable: true,
    }
  }

  // Não configurado
  return {
    key: 'whatsapp',
    name: 'WhatsApp',
    status: 'NOT_CONFIGURED',
    summary: 'Nenhum provider configurado — configure Evolution API ou WA Business API',
    missingRequirements: ['EVOLUTION_API_URL + EVOLUTION_API_KEY (recomendado)'],
    warnings: [],
    nextSteps: [
      'Configurar Evolution API v2 (EVOLUTION_API_URL + EVOLUTION_API_KEY)',
      'Ou configurar WA Business API (WHATSAPP_API_URL + WHATSAPP_API_TOKEN)',
    ],
    testable: false,
  }
}

export function checkCronReadiness(): IntegrationReadiness {
  if (!envPresent('CRON_SECRET')) {
    return {
      key: 'cron',
      name: 'Cron Jobs',
      status: 'NOT_CONFIGURED',
      summary: 'CRON_SECRET ausente — jobs automaticos nao estao protegidos',
      missingRequirements: ['CRON_SECRET'],
      warnings: ['Sem CRON_SECRET qualquer pessoa pode disparar cron jobs'],
      nextSteps: [
        'Gerar secret aleatorio e definir CRON_SECRET',
        'Configurar CRON_SECRET no Vercel Dashboard',
      ],
      testable: false,
    }
  }

  return {
    key: 'cron',
    name: 'Cron Jobs',
    status: 'READY_PRODUCTION',
    summary: 'Cron protegido e pronto',
    missingRequirements: [],
    warnings: [],
    nextSteps: [],
    testable: false,
  }
}

export function checkDomainReadiness(): IntegrationReadiness {
  const hasAppUrl = envPresent('APP_URL')
  const hasPublicUrl = envPresent('NEXT_PUBLIC_APP_URL')
  const missing: string[] = []
  const warnings: string[] = []

  if (!hasAppUrl) missing.push('APP_URL')
  if (!hasPublicUrl) warnings.push('NEXT_PUBLIC_APP_URL nao definido — usando fallback')

  // Check consistency
  if (hasAppUrl && hasPublicUrl) {
    const appUrl = process.env.APP_URL!.replace(/\/+$/, '')
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/+$/, '')
    if (appUrl !== publicUrl) {
      warnings.push('APP_URL e NEXT_PUBLIC_APP_URL divergem — pode causar problemas de SEO e links')
    }
  }

  if (missing.length === 0 && warnings.length === 0) {
    return {
      key: 'domain',
      name: 'Dominio',
      status: 'READY_PRODUCTION',
      summary: 'Dominio canonico configurado e consistente',
      missingRequirements: [],
      warnings: [],
      nextSteps: [],
      testable: false,
    }
  }

  if (missing.length > 0) {
    return {
      key: 'domain',
      name: 'Dominio',
      status: 'NOT_CONFIGURED',
      summary: 'URL base nao definida',
      missingRequirements: missing,
      warnings,
      nextSteps: ['Definir APP_URL com o dominio de producao (ex: https://www.promosnap.com.br)'],
      testable: false,
    }
  }

  return {
    key: 'domain',
    name: 'Dominio',
    status: 'READY_TO_TEST',
    summary: 'Dominio definido com avisos',
    missingRequirements: [],
    warnings,
    nextSteps: warnings.map(() => 'Alinhar APP_URL e NEXT_PUBLIC_APP_URL'),
    testable: false,
  }
}

// ---------------------------------------------------------------------------
// Aggregators
// ---------------------------------------------------------------------------

export function getAllIntegrationReadiness(): IntegrationReadiness[] {
  return [
    checkMlReadiness(),
    checkEmailReadiness(),
    checkTelegramReadiness(),
    checkSlackReadiness(),
    checkDiscordReadiness(),
    checkWhatsAppReadiness(),
    checkCronReadiness(),
    checkDomainReadiness(),
  ]
}

/**
 * Returns a 0-100 score based on how many integrations are production-ready.
 * Core (domain, cron, email, ML) are weighted more heavily.
 */
export function getActivationScore(): number {
  const checks = getAllIntegrationReadiness()

  // Weights: core integrations count more
  const weights: Record<string, number> = {
    domain: 20,
    cron: 10,
    email: 15,
    mercadolivre: 20,
    telegram: 10,
    slack: 5,
    discord: 5,
    whatsapp: 5,
  }

  // Extra 10 pts for ADMIN_SECRET
  const adminSecretPoints = envPresent('ADMIN_SECRET') ? 10 : 0

  let earned = adminSecretPoints
  let total = 10 // admin secret weight

  for (const check of checks) {
    const w = weights[check.key] ?? 5
    total += w

    if (check.status === 'READY_PRODUCTION') {
      earned += w
    } else if (check.status === 'READY_TO_TEST') {
      earned += Math.round(w * 0.6)
    } else if (check.status === 'CONFIG_PARTIAL') {
      earned += Math.round(w * 0.2)
    }
    // NOT_CONFIGURED / BLOCKED_EXTERNAL = 0
  }

  return Math.round((earned / total) * 100)
}
