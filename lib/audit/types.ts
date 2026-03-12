// ============================================
// AUDIT AUTOMATION — types
// ============================================

export type AuditGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface AuditIssue {
  section: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  recommendation?: string
}

export interface AuditSection {
  name: string
  score: number        // 0-100
  grade: AuditGrade
  summary: string
  issueCount: number
  details: Record<string, unknown>
}

export interface AuditReport {
  timestamp: string
  overallScore: number // 0-100
  grade: AuditGrade
  sections: {
    catalog: AuditSection
    seo: AuditSection
    content: AuditSection
    sources: AuditSection
    quality: AuditSection
    design: AuditSection
  }
  criticalIssues: AuditIssue[]
  warnings: AuditIssue[]
  opportunities: AuditIssue[]
  summary: string
}
