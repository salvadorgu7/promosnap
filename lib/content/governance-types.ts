// ============================================
// CONTENT GOVERNANCE — types
// ============================================

export type ContentState = 'strong' | 'weak' | 'stale' | 'thin'

export type ContentGrade = 'A' | 'B' | 'C' | 'D' | 'F'

export interface ContentScore {
  total: number
  breakdown: {
    richness: number   // 0-30
    linking: number    // 0-25
    products: number   // 0-25
    coverage: number   // 0-20
  }
  grade: ContentGrade
}

export interface ArticleAudit {
  id: string
  slug: string
  title: string
  state: ContentState
  score: ContentScore
  issues: string[]
  updatedAt: Date
}

export interface ContentHealthReport {
  total: number
  strong: { count: number; articles: ArticleAudit[] }
  weak: { count: number; articles: ArticleAudit[] }
  stale: { count: number; articles: ArticleAudit[] }
  thin: { count: number; articles: ArticleAudit[] }
  averageScore: number
  generatedAt: Date
}

export interface ContentRecommendation {
  type: 'guide' | 'comparison' | 'price' | 'hot-topic'
  topic: string
  reason: string
  priority: number
  estimatedTraffic: 'high' | 'medium' | 'low'
}
