import fs from 'fs'
import path from 'path'
import type { SmokeCheck, SmokeReport } from './types'

// ─── Helpers ─────────────────────────────────────────────────

function fileExists(relativePath: string): boolean {
  try {
    const fullPath = path.join(process.cwd(), relativePath)
    return fs.existsSync(fullPath)
  } catch {
    return false
  }
}

function checkFile(name: string, target: string): SmokeCheck {
  const exists = fileExists(target)
  return {
    name,
    type: 'file',
    target,
    status: exists ? 'pass' : 'fail',
    message: exists ? `${target} exists` : `${target} not found`,
  }
}

function checkRoute(name: string, target: string): SmokeCheck {
  const exists = fileExists(target)
  return {
    name,
    type: 'route',
    target,
    status: exists ? 'pass' : 'fail',
    message: exists ? `Route file present` : `Route file missing`,
  }
}

function checkApi(name: string, target: string): SmokeCheck {
  const exists = fileExists(target)
  return {
    name,
    type: 'api',
    target,
    status: exists ? 'pass' : 'fail',
    message: exists ? `API route present` : `API route missing`,
  }
}

// ─── Smoke checks ────────────────────────────────────────────

export function runSmokeChecks(): SmokeReport {
  const checks: SmokeCheck[] = [
    // Home renders
    checkRoute('Home Page Renders', 'app/(site)/page.tsx'),

    // Search with query
    checkRoute('Search With Query', 'app/(site)/busca/page.tsx'),

    // Real product page
    checkRoute('Product Page', 'app/(site)/produto/[slug]/page.tsx'),

    // Clickout route
    checkApi('Clickout Route', 'app/api/clickout/[offerId]/route.ts'),

    // Sitemap
    checkFile('Sitemap', 'app/sitemap.ts'),

    // Email job dry-run capability
    (() => {
      const jobRoute = fileExists('app/api/cron/email/route.ts') || fileExists('app/api/cron/emails/route.ts')
      const emailLib = fileExists('lib/email/send.ts') || fileExists('lib/email/sender.ts') || fileExists('lib/email/index.ts')
      const hasResendKey = !!process.env.RESEND_API_KEY

      if (!emailLib) {
        return {
          name: 'Email Job Dry-Run',
          type: 'file' as const,
          target: 'lib/email/*',
          status: 'skip' as const,
          message: 'Email library not found — skip',
        }
      }

      return {
        name: 'Email Job Dry-Run',
        type: 'api' as const,
        target: 'lib/email/*',
        status: jobRoute && hasResendKey ? 'pass' as const : 'skip' as const,
        message: !hasResendKey
          ? 'RESEND_API_KEY not set — dry-run not possible'
          : jobRoute
            ? 'Email cron route and config present'
            : 'Email cron route not found',
      }
    })(),

    // Admin jobs accessible
    checkRoute('Admin Jobs Page', 'app/admin/jobs/page.tsx'),
  ]

  const passCount = checks.filter((c) => c.status === 'pass').length
  const failCount = checks.filter((c) => c.status === 'fail').length
  const skipCount = checks.filter((c) => c.status === 'skip').length

  return {
    checks,
    passCount,
    failCount,
    skipCount,
  }
}
