// ============================================
// SEO GOVERNANCE TYPES
// ============================================

export type SEOIssueSeverity = 'critical' | 'warning' | 'info'

export type SEOIssueType =
  | 'missing_title'
  | 'missing_description'
  | 'weak_title'
  | 'missing_canonical'
  | 'orphan_page'
  | 'empty_page'
  | 'weak_content'
  | 'poor_internal_linking'

export interface SEOIssue {
  type: SEOIssueType
  severity: SEOIssueSeverity
  pageType: string
  pageSlug: string
  pageTitle: string
  message: string
  recommendation: string
}

export interface SEOPageStatus {
  slug: string
  title: string
  pageType: 'product' | 'category' | 'brand' | 'best' | 'offer' | 'comparison' | 'article'
  hasTitle: boolean
  hasDescription: boolean
  hasCanonical: boolean
  hasInternalLinks: boolean
  contentLength: number
  productCount: number
  internalLinksCount: number
  issues: SEOIssue[]
  score: number
}

export interface SEOScore {
  overall: number
  metadata: number
  content: number
  internalLinking: number
  coverage: number
  label: 'Excelente' | 'Bom' | 'Atencao' | 'Critico'
  color: string
}

export interface SEOAuditReport {
  score: SEOScore
  totalPages: number
  pagesWithIssues: number
  issuesByType: Record<SEOIssueType, number>
  issuesBySeverity: Record<SEOIssueSeverity, number>
  issues: SEOIssue[]
  pageStatuses: SEOPageStatus[]
  generatedAt: string
}

export interface SEOAction {
  type: 'create_page' | 'fix_metadata' | 'add_internal_links' | 'improve_content'
  target: string
  targetSlug: string
  reason: string
  priority: number
  estimatedImpact: 'high' | 'medium' | 'low'
  pageType: string
}
