/**
 * Health status used by the /api/health endpoint.
 * Maps to a different domain than CheckStatus ('pass'|'warn'|'fail') in lib/production/types.ts.
 * healthy = pass, degraded = warn, critical = fail
 */
export type HealthStatus = 'healthy' | 'degraded' | 'critical'
export type Severity = 'low' | 'medium' | 'high'

export interface HealthCheckResult {
  name: string
  status: HealthStatus
  message: string
  severity: Severity
  details?: Record<string, unknown>
}

export interface HealthReport {
  status: HealthStatus
  timestamp: string
  checks: HealthCheckResult[]
  summary: {
    total: number
    healthy: number
    degraded: number
    critical: number
  }
}
