import { runReadinessChecks } from '@/lib/release/readiness'
import { runSmokeChecks } from '@/lib/release/smoke'
import type { ReadinessStatus, SmokeStatus, ReadinessCategory } from '@/lib/release/types'
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Server,
  Database,
  Route,
  ShieldCheck,
  SkipForward,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

// ─── Status helpers ──────────────────────────────────────────

function readinessIcon(status: ReadinessStatus) {
  switch (status) {
    case 'ready':
      return <CheckCircle2 className="h-5 w-5 text-green-600" />
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    case 'blocked':
      return <XCircle className="h-5 w-5 text-red-500" />
  }
}

function smokeIcon(status: SmokeStatus) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-4 w-4 text-green-600" />
    case 'fail':
      return <XCircle className="h-4 w-4 text-red-500" />
    case 'skip':
      return <SkipForward className="h-4 w-4 text-gray-400" />
  }
}

function categoryIcon(category: ReadinessCategory) {
  switch (category) {
    case 'infra':
      return <Server className="h-4 w-4" />
    case 'data':
      return <Database className="h-4 w-4" />
    case 'routes':
      return <Route className="h-4 w-4" />
    case 'security':
      return <ShieldCheck className="h-4 w-4" />
  }
}

function categoryLabel(category: ReadinessCategory) {
  switch (category) {
    case 'infra':
      return 'Infrastructure'
    case 'data':
      return 'Data'
    case 'routes':
      return 'Routes'
    case 'security':
      return 'Security'
  }
}

const bannerStyles: Record<ReadinessStatus, string> = {
  ready: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  blocked: 'bg-red-50 border-red-200 text-red-800',
}

const bannerLabels: Record<ReadinessStatus, string> = {
  ready: 'Ready for Production',
  warning: 'Attention Needed',
  blocked: 'Blocked',
}

// ─── Page ────────────────────────────────────────────────────

export default async function ReleasePage() {
  let readiness
  try {
    readiness = await runReadinessChecks()
  } catch (error) {
    readiness = {
      checks: [],
      overallStatus: 'blocked' as const,
      readyCount: 0,
      warningCount: 0,
      blockedCount: 1,
    }
  }

  const smoke = runSmokeChecks()

  // Group readiness checks by category
  const categories: ReadinessCategory[] = ['infra', 'data', 'routes', 'security']
  const grouped = categories.map((cat) => ({
    category: cat,
    checks: readiness.checks.filter((c) => c.category === cat),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Release Readiness</h1>
        <p className="text-sm text-text-muted mt-1">Pre-launch checklist and smoke tests</p>
      </div>

      {/* Overall status banner */}
      <div className={`rounded-xl border-2 p-5 ${bannerStyles[readiness.overallStatus]}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {readinessIcon(readiness.overallStatus)}
            <div>
              <h2 className="text-lg font-bold">{bannerLabels[readiness.overallStatus]}</h2>
              <p className="text-sm opacity-80">
                {readiness.readyCount} ready, {readiness.warningCount} warnings, {readiness.blockedCount} blocked
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Readiness checks by category */}
      <div className="grid gap-4 md:grid-cols-2">
        {grouped.map(({ category, checks }) => (
          <div key={category} className="rounded-xl border border-surface-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              {categoryIcon(category)}
              <h3 className="text-sm font-semibold text-text-primary">{categoryLabel(category)}</h3>
              <span className="text-xs text-text-muted ml-auto">
                {checks.filter((c) => c.status === 'ready').length}/{checks.length}
              </span>
            </div>
            <ul className="space-y-2">
              {checks.map((check) => (
                <li key={check.name} className="flex items-start gap-2">
                  <div className="mt-0.5 flex-shrink-0">{readinessIcon(check.status)}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary">{check.name}</p>
                    <p className="text-xs text-text-muted truncate">{check.message}</p>
                  </div>
                </li>
              ))}
              {checks.length === 0 && (
                <li className="text-xs text-text-muted italic">No checks in this category</li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {/* Smoke tests */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-text-primary">Smoke Tests</h3>
          <div className="flex items-center gap-3 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-green-600" /> {smoke.passCount} pass
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-red-500" /> {smoke.failCount} fail
            </span>
            <span className="flex items-center gap-1">
              <SkipForward className="h-3 w-3 text-gray-400" /> {smoke.skipCount} skip
            </span>
          </div>
        </div>
        <div className="divide-y divide-surface-100">
          {smoke.checks.map((check) => (
            <div key={check.name} className="flex items-center gap-3 py-2.5">
              {smokeIcon(check.status)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{check.name}</p>
                <p className="text-xs text-text-muted truncate">{check.target}</p>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  check.status === 'pass'
                    ? 'bg-green-100 text-green-700'
                    : check.status === 'fail'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'
                }`}
              >
                {check.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
