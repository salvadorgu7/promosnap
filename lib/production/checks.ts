import prisma from '@/lib/db/prisma'
import type { ProductionCheck, ProductionReport, CheckGroup } from './types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pass(name: string, group: CheckGroup, message: string, detail?: string): ProductionCheck {
  return { name, group, status: 'pass', message, detail }
}

function warn(name: string, group: CheckGroup, message: string, detail?: string): ProductionCheck {
  return { name, group, status: 'warn', message, detail }
}

function fail(name: string, group: CheckGroup, message: string, detail?: string): ProductionCheck {
  return { name, group, status: 'fail', message, detail }
}

// ---------------------------------------------------------------------------
// Required env vars
// ---------------------------------------------------------------------------

const REQUIRED_ENV_VARS = [
  { key: 'DATABASE_URL', group: 'infrastructure' as CheckGroup },
  { key: 'APP_URL', group: 'infrastructure' as CheckGroup },
  { key: 'ADMIN_SECRET', group: 'security' as CheckGroup },
  { key: 'CRON_SECRET', group: 'security' as CheckGroup },
]

const OPTIONAL_ENV_VARS = [
  { key: 'MERCADOLIVRE_APP_ID', label: 'Mercado Livre API', group: 'integrations' as CheckGroup },
  { key: 'MERCADOLIVRE_SECRET', label: 'Mercado Livre Secret', group: 'integrations' as CheckGroup },
  { key: 'RESEND_API_KEY', label: 'Resend (email)', group: 'integrations' as CheckGroup },
  { key: 'AMAZON_TAG', label: 'Amazon Associates', group: 'integrations' as CheckGroup },
  { key: 'GOOGLE_ANALYTICS_ID', label: 'Google Analytics', group: 'seo' as CheckGroup },
  { key: 'NEXT_PUBLIC_GA_ID', label: 'GA (public)', group: 'seo' as CheckGroup },
]

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

function checkRequiredEnvVars(): ProductionCheck[] {
  return REQUIRED_ENV_VARS.map(({ key, group }) => {
    const value = process.env[key]
    if (value && value.length > 0) {
      return pass(`Env: ${key}`, group, `${key} is configured`)
    }
    return fail(`Env: ${key}`, group, `${key} is missing or empty`)
  })
}

function checkOptionalEnvVars(): ProductionCheck[] {
  return OPTIONAL_ENV_VARS.map(({ key, label, group }) => {
    const value = process.env[key]
    if (value && value.length > 0) {
      return pass(`Env: ${label}`, group, `${label} configurado`)
    }
    return warn(`Env: ${label}`, group, `${label} nao configurado — funcionalidade limitada`)
  })
}

async function checkDatabaseConnectivity(): Promise<ProductionCheck> {
  const name = 'Database Connectivity'
  const group: CheckGroup = 'infrastructure'
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1`
    const ms = Date.now() - start
    if (ms > 2000) {
      return warn(name, group, `Conexao lenta (${ms}ms)`, `Latencia: ${ms}ms`)
    }
    return pass(name, group, `Conectado (${ms}ms)`, `Latencia: ${ms}ms`)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return fail(name, group, `Falha na conexao`, msg)
  }
}

async function checkTableData(): Promise<ProductionCheck[]> {
  const checks: ProductionCheck[] = []
  const group: CheckGroup = 'data'

  const tables = [
    { name: 'Sources', fn: () => prisma.source.count() },
    { name: 'Categories', fn: () => prisma.category.count() },
    { name: 'Products', fn: () => prisma.product.count() },
  ] as const

  for (const table of tables) {
    try {
      const count = await table.fn()
      if (count > 0) {
        checks.push(pass(`Data: ${table.name}`, group, `${count} registros`, `Count: ${count}`))
      } else {
        checks.push(warn(`Data: ${table.name}`, group, `Tabela vazia — sem dados`, `Count: 0`))
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error'
      checks.push(fail(`Data: ${table.name}`, group, `Erro ao consultar`, msg))
    }
  }

  return checks
}

async function checkSitemap(): Promise<ProductionCheck> {
  const name = 'Sitemap'
  const group: CheckGroup = 'seo'
  const appUrl = process.env.APP_URL

  if (!appUrl) {
    return warn(name, group, 'APP_URL nao definida — nao foi possivel verificar sitemap')
  }

  try {
    const url = `${appUrl.replace(/\/$/, '')}/sitemap.xml`
    const res = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      return pass(name, group, 'Sitemap acessivel', `Status: ${res.status}`)
    }
    return warn(name, group, `Sitemap retornou status ${res.status}`)
  } catch {
    return warn(name, group, 'Sitemap inacessivel — pode estar gerando sob demanda')
  }
}

async function checkCriticalRoutes(): Promise<ProductionCheck[]> {
  const group: CheckGroup = 'infrastructure'
  const appUrl = process.env.APP_URL
  const checks: ProductionCheck[] = []

  if (!appUrl) {
    checks.push(warn('Routes', group, 'APP_URL nao definida — nao foi possivel verificar rotas'))
    return checks
  }

  const baseUrl = appUrl.replace(/\/$/, '')

  const routes = [
    { path: '/', label: 'Homepage' },
    { path: '/ofertas', label: 'Ofertas' },
    { path: '/categorias', label: 'Categorias' },
    { path: '/busca', label: 'Busca' },
  ]

  for (const route of routes) {
    try {
      const res = await fetch(`${baseUrl}${route.path}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      })
      if (res.ok || res.status === 308 || res.status === 307) {
        checks.push(pass(`Route: ${route.label}`, group, `${route.path} OK (${res.status})`))
      } else {
        checks.push(warn(`Route: ${route.label}`, group, `${route.path} retornou ${res.status}`))
      }
    } catch {
      checks.push(warn(`Route: ${route.label}`, group, `${route.path} inacessivel`))
    }
  }

  return checks
}

// ---------------------------------------------------------------------------
// Main entry
// ---------------------------------------------------------------------------

export async function runProductionChecks(): Promise<ProductionReport> {
  const allChecks: ProductionCheck[] = []

  // Sync checks
  allChecks.push(...checkRequiredEnvVars())
  allChecks.push(...checkOptionalEnvVars())

  // Async checks
  allChecks.push(await checkDatabaseConnectivity())
  allChecks.push(...(await checkTableData()))
  allChecks.push(await checkSitemap())
  allChecks.push(...(await checkCriticalRoutes()))

  // Scoring: pass = 1, warn = 0.5, fail = 0
  const total = allChecks.length
  const score =
    total === 0
      ? 0
      : Math.round(
          (allChecks.reduce((acc, c) => {
            if (c.status === 'pass') return acc + 1
            if (c.status === 'warn') return acc + 0.5
            return acc
          }, 0) /
            total) *
            100
        )

  const hasFail = allChecks.some((c) => c.status === 'fail')

  return {
    ready: !hasFail && score >= 70,
    score,
    checks: allChecks,
    timestamp: new Date().toISOString(),
  }
}
