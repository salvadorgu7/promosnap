/**
 * Quality gate severity levels for data quality checks.
 * Different scale from CheckStatus ('pass'|'warn'|'fail') — gates measure issue severity, not pass/fail.
 */
export type GateSeverity = 'critical' | 'warning' | 'info'

export interface GateItem {
  id: string
  name: string
  issue: string
}

export interface QualityGateResult {
  gate: string
  severity: GateSeverity
  count: number
  items: GateItem[]
  suggestion: string
}

export interface QualityReport {
  timestamp: string
  gates: QualityGateResult[]
  summary: {
    total: number
    critical: number
    warning: number
    info: number
    totalIssues: number
  }
}
