// ─── Future Readiness Assessment ───────────────────────────────
// Evaluates readiness for planned features that haven't been
// implemented yet. Gives actionable next-steps for each area.

export type EffortEstimate = 'small' | 'medium' | 'large'

export interface FutureReadinessItem {
  feature: string
  ready: boolean
  blockers: string[]
  nextSteps: string[]
  estimatedEffort: EffortEstimate
}

export interface FutureReadinessReport {
  items: FutureReadinessItem[]
  readyCount: number
  blockedCount: number
  generatedAt: string
}

// ─── Individual feature checks ─────────────────────────────────

function checkAuth(): FutureReadinessItem {
  const hasAuthProvider = !!(
    process.env.NEXTAUTH_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.AUTH_SECRET
  )

  return {
    feature: 'auth',
    ready: hasAuthProvider,
    blockers: hasAuthProvider ? [] : ['No auth provider configured'],
    nextSteps: hasAuthProvider
      ? ['Verify auth middleware covers admin routes']
      : [
          'Choose provider (NextAuth, Clerk, etc.)',
          'Create user model',
          'Add middleware',
        ],
    estimatedEffort: 'large',
  }
}

function checkPushNotifications(): FutureReadinessItem {
  const hasVapidKeys = !!(
    process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY
  )

  return {
    feature: 'pushNotifications',
    ready: hasVapidKeys,
    blockers: hasVapidKeys
      ? []
      : ['No service worker registered for push'],
    nextSteps: hasVapidKeys
      ? ['Test push delivery end-to-end']
      : [
          'Configure web-push',
          'Add VAPID keys',
          'Create subscription endpoint',
        ],
    estimatedEffort: 'medium',
  }
}

function checkCdn(): FutureReadinessItem {
  const hasCdn = !!process.env.IMAGE_CDN_URL

  return {
    feature: 'cdn',
    ready: hasCdn,
    blockers: hasCdn ? [] : ['No CDN configured'],
    nextSteps: hasCdn
      ? ['Verify CDN cache headers']
      : [
          'Set IMAGE_CDN_URL env',
          'Configure Cloudflare/Imgix',
          'Update SafeImage component',
        ],
    estimatedEffort: 'small',
  }
}

function checkE2e(): FutureReadinessItem {
  // We can't reliably check for Playwright at runtime in edge/serverless,
  // so we check for the env hint or assume not ready.
  const hasPlaywright = !!process.env.PLAYWRIGHT_INSTALLED

  return {
    feature: 'e2e',
    ready: hasPlaywright,
    blockers: hasPlaywright ? [] : ['No Playwright installed'],
    nextSteps: hasPlaywright
      ? ['Add critical-path test coverage']
      : [
          'npm install -D @playwright/test',
          'Create e2e/ directory',
          'Write critical path tests',
        ],
    estimatedEffort: 'medium',
  }
}

function checkRbac(): FutureReadinessItem {
  const hasRoleSystem = !!process.env.RBAC_ENABLED

  return {
    feature: 'rbac',
    ready: hasRoleSystem,
    blockers: hasRoleSystem ? [] : ['No role system'],
    nextSteps: hasRoleSystem
      ? ['Audit existing permission checks']
      : [
          'Add roles to user model',
          'Create permission middleware',
          'Update admin routes',
        ],
    estimatedEffort: 'large',
  }
}

// ─── Public API ────────────────────────────────────────────────

export function getFutureReadiness(): FutureReadinessReport {
  const items: FutureReadinessItem[] = [
    checkAuth(),
    checkPushNotifications(),
    checkCdn(),
    checkE2e(),
    checkRbac(),
  ]

  return {
    items,
    readyCount: items.filter((i) => i.ready).length,
    blockedCount: items.filter((i) => !i.ready).length,
    generatedAt: new Date().toISOString(),
  }
}
