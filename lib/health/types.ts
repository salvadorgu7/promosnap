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
