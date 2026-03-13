// ============================================================================
// Discovery & Opportunity Engine — public API
// ============================================================================

export {
  generateOpportunityReport,
  getCatalogHealth,
  findZeroResultSearches,
} from './opportunities'

export type {
  Opportunity,
  OpportunitySource,
  OpportunityPriority,
  OpportunityReport,
  CatalogHealth,
  CategoryCoverage,
  SourceBreakdown,
  ZeroResultSearch,
} from './types'
