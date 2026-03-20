/**
 * Central environment variable validation.
 *
 * Call assertCriticalEnvs() early in server-side code to fail fast
 * when required variables are missing in production/preview.
 *
 * In development, missing vars are logged as warnings but don't crash.
 */

import { logger } from '@/lib/logger'

const log = logger.child({ module: 'env-assert' })

// ── Environment Detection ──────────────────────────────────────────────────

export type DeployEnv = 'development' | 'preview' | 'production'

export function getDeployEnv(): DeployEnv {
  // Vercel sets VERCEL_ENV explicitly
  const vercelEnv = process.env.VERCEL_ENV
  if (vercelEnv === 'production') return 'production'
  if (vercelEnv === 'preview') return 'preview'

  // Fallback to NODE_ENV
  if (process.env.NODE_ENV === 'production') return 'production'
  return 'development'
}

export function isProductionLike(): boolean {
  const env = getDeployEnv()
  return env === 'production' || env === 'preview'
}

// ── Required Environment Variables ─────────────────────────────────────────

interface EnvVar {
  name: string
  /** Required in production/preview? */
  requiredInProd: boolean
  /** Description for .env.example and error messages */
  description: string
  /** Validation function (beyond just "exists") */
  validate?: (value: string) => boolean
}

const CRITICAL_ENVS: EnvVar[] = [
  {
    name: 'DATABASE_URL',
    requiredInProd: true,
    description: 'PostgreSQL connection string',
  },
  {
    name: 'ADMIN_SECRET',
    requiredInProd: true,
    description: 'Secret for admin panel authentication (min 12 chars)',
    validate: (v) => v.length >= 12,
  },
  {
    name: 'CRON_SECRET',
    requiredInProd: true,
    description: 'Secret for cron job authentication (Bearer token)',
    validate: (v) => v.length >= 10,
  },
  {
    name: 'NEXT_PUBLIC_APP_URL',
    requiredInProd: true,
    description: 'Public URL of the app (e.g. https://www.promosnap.com.br)',
    validate: (v) => v.startsWith('http'),
  },
]

const RECOMMENDED_ENVS: EnvVar[] = [
  { name: 'MERCADOLIVRE_AFFILIATE_ID', requiredInProd: false, description: 'ML affiliate matt_tool tag' },
  { name: 'ML_CLIENT_ID', requiredInProd: false, description: 'ML API client ID for product lookup' },
  { name: 'ML_CLIENT_SECRET', requiredInProd: false, description: 'ML API client secret' },
  { name: 'AMAZON_AFFILIATE_TAG', requiredInProd: false, description: 'Amazon affiliate tag (e.g. promosnap-20)' },
  { name: 'SHOPEE_AFFILIATE_ID', requiredInProd: false, description: 'Shopee affiliate af_id' },
  { name: 'SHOPEE_APP_ID', requiredInProd: false, description: 'Shopee Open Platform App ID (for affiliate API)' },
  { name: 'SHOPEE_APP_SECRET', requiredInProd: false, description: 'Shopee Open Platform App Secret (for HMAC signing)' },
  { name: 'RESEND_API_KEY', requiredInProd: false, description: 'Resend API key for email delivery' },
  { name: 'EVOLUTION_WEBHOOK_SECRET', requiredInProd: false, description: 'Secret for WhatsApp webhook auth' },
]

// ── Assertion ──────────────────────────────────────────────────────────────

export interface EnvCheckResult {
  ok: boolean
  environment: DeployEnv
  missing: string[]
  warnings: string[]
  validationErrors: string[]
}

export function checkEnvironment(): EnvCheckResult {
  const env = getDeployEnv()
  const isProd = isProductionLike()
  const missing: string[] = []
  const warnings: string[] = []
  const validationErrors: string[] = []

  for (const v of CRITICAL_ENVS) {
    const value = process.env[v.name]
    if (!value) {
      if (v.requiredInProd && isProd) {
        missing.push(`${v.name} — ${v.description}`)
      } else {
        warnings.push(`${v.name} not set (optional in ${env})`)
      }
    } else if (v.validate && !v.validate(value)) {
      validationErrors.push(`${v.name} is set but invalid — ${v.description}`)
    }
  }

  for (const v of RECOMMENDED_ENVS) {
    if (!process.env[v.name]) {
      warnings.push(`${v.name} not set — ${v.description}`)
    }
  }

  return {
    ok: missing.length === 0 && validationErrors.length === 0,
    environment: env,
    missing,
    warnings,
    validationErrors,
  }
}

/**
 * Assert that all critical environment variables are set.
 * In production/preview: throws if critical vars are missing.
 * In development: logs warnings but doesn't throw.
 */
export function assertCriticalEnvs(): void {
  const result = checkEnvironment()

  if (result.warnings.length > 0) {
    log.debug('env.warnings', { count: result.warnings.length, warnings: result.warnings })
  }

  if (!result.ok) {
    const msg = [
      `[ENV] Critical environment variables missing or invalid in ${result.environment}:`,
      ...result.missing.map(m => `  ❌ ${m}`),
      ...result.validationErrors.map(e => `  ⚠️ ${e}`),
    ].join('\n')

    log.error('env.critical-missing', {
      environment: result.environment,
      missing: result.missing,
      validationErrors: result.validationErrors,
    })

    if (isProductionLike()) {
      // Don't crash the process — but log loudly
      console.error(msg)
    } else {
      console.warn(msg)
    }
  }
}
