/**
 * Tri-state check status used by production checks and runtime QA.
 * Equivalent to RuntimeCheck.status in lib/runtime/qa.ts.
 * See also: HealthStatus ('healthy'|'degraded'|'critical') in lib/health/types.ts
 */
export type CheckStatus = 'pass' | 'warn' | 'fail'

export type CheckGroup =
  | 'infrastructure'
  | 'data'
  | 'security'
  | 'seo'
  | 'integrations'

export interface ProductionCheck {
  name: string
  group: CheckGroup
  status: CheckStatus
  message: string
  detail?: string
}

export interface ProductionReport {
  ready: boolean
  score: number
  checks: ProductionCheck[]
  timestamp: string
}
