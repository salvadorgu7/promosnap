export type ReadinessStatus = 'ready' | 'warning' | 'blocked'
export type ReadinessCategory = 'infra' | 'data' | 'routes' | 'security'

export interface ReadinessCheck {
  name: string
  status: ReadinessStatus
  message: string
  category: ReadinessCategory
}

export interface ReadinessReport {
  checks: ReadinessCheck[]
  overallStatus: ReadinessStatus
  readyCount: number
  warningCount: number
  blockedCount: number
}

export type SmokeStatus = 'pass' | 'fail' | 'skip'
export type SmokeType = 'route' | 'api' | 'file'

export interface SmokeCheck {
  name: string
  type: SmokeType
  target: string
  status: SmokeStatus
  message: string
}

export interface SmokeReport {
  checks: SmokeCheck[]
  passCount: number
  failCount: number
  skipCount: number
}
