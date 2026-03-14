// Landing page types — foundation for dynamic landing pages.
// No implementation yet, just type definitions.

export interface LandingPageConfig {
  slug: string
  title: string
  description: string
  heroImage?: string
  filters: LandingFilter[]
  sortDefault: 'relevance' | 'price_asc' | 'price_desc' | 'popularity' | 'newest'
}

export interface LandingFilter {
  type: 'category' | 'brand' | 'price'
  value: string
  label: string
}
