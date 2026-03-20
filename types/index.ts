// PromoSnap Global Types

export type HealthStatus = "READY" | "PARTIAL" | "MOCK" | "BLOCKED"

export interface HealthCheckResult {
  status: HealthStatus
  latencyMs: number
  message?: string
}

export interface MarketplaceAdapter {
  name: string
  slug: string
  isEnabled: boolean
  searchProducts(query: string, options?: SearchOptions): Promise<RawListing[]>
  fetchProductById(externalId: string): Promise<RawListing | null>
  fetchByItemIds(ids: string[]): Promise<RawListing[]>
  fetchOffers(params?: FetchOffersParams): Promise<RawListing[]>
  buildAffiliateUrl(productUrl: string, metadata?: Record<string, string>): string
  validateListing(listing: RawListing): boolean
  healthCheck(): Promise<HealthCheckResult>
}

export interface SearchOptions {
  page?: number
  limit?: number
  category?: string
  minPrice?: number
  maxPrice?: number
  sortBy?: 'relevance' | 'price_asc' | 'price_desc' | 'popularity'
}

export interface FetchOffersParams {
  categorySlug?: string
  limit?: number
  offset?: number
}

export interface RawListing {
  externalId: string
  sourceSlug: string
  title: string
  description?: string
  brand?: string
  category?: string
  imageUrl?: string
  images?: string[]
  productUrl: string
  currentPrice: number
  originalPrice?: number
  currency?: string
  availability: 'in_stock' | 'out_of_stock' | 'pre_order' | 'unknown'
  rating?: number
  reviewsCount?: number
  salesCount?: number
  seller?: { name: string; rating?: number }
  coupon?: string
  shippingPrice?: number
  isFreeShipping?: boolean
  installment?: string
  specs?: Record<string, string>
  rawPayload?: Record<string, unknown>
}

export interface OfferScoreInput {
  currentPrice: number
  originalPrice?: number
  avgPrice30d?: number
  avgPrice90d?: number
  minPrice30d?: number
  minPrice90d?: number
  reviewsCount?: number
  rating?: number
  salesEstimate?: number
  sourceReliability?: number
  freshness?: number
  isFreeShipping?: boolean
  hasCoupon?: boolean
}

export interface OfferScoreResult {
  total: number
  breakdown: {
    discountScore: number
    popularityScore: number
    reliabilityScore: number
    freshnessScore: number
    bonusScore: number
  }
}

export interface ProductCard {
  id: string
  name: string
  slug: string
  imageUrl?: string
  brand?: string
  category?: string
  categorySlug?: string
  bestOffer: {
    offerId: string
    price: number
    originalPrice?: number
    discount?: number
    sourceSlug: string
    sourceName: string
    affiliateUrl: string
    isFreeShipping: boolean
    offerScore: number
  }
  offersCount: number
  storesCount: number
  minPrice30d?: number
  popularityScore: number
  originType?: string
  badges: Badge[]
}

export interface Badge {
  type: 'hot_deal' | 'lowest_price' | 'trending' | 'coupon' | 'free_shipping' | 'price_drop' | 'best_seller'
  label: string
  color: string
}

export interface SearchResult {
  products: ProductCard[]
  totalCount: number
  filters: SearchFilters
  query: string
  suggestions?: string[]
}

export interface SearchFilters {
  categories: FilterOption[]
  brands: FilterOption[]
  sources: FilterOption[]
  priceRange: { min: number; max: number }
  hasOptions: { freeShipping: boolean; coupon: boolean; lowestPrice: boolean }
}

export interface FilterOption {
  value: string
  label: string
  count: number
}

export interface PriceHistoryPoint {
  date: string
  price: number
  originalPrice?: number
}

export interface PriceStats {
  current: number
  min30d: number
  max30d: number
  avg30d: number
  min90d: number
  max90d: number
  avg90d: number
  allTimeMin: number
  trend: 'up' | 'down' | 'stable'
}

export interface SEOData {
  title: string
  description: string
  canonical?: string
  ogImage?: string
  schema?: Record<string, unknown>[]
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  meta?: { page?: number; limit?: number; total?: number }
}

export interface HomeData {
  hotDeals: ProductCard[]
  lowestPrices: ProductCard[]
  bestSellers: ProductCard[]
  categories: CategoryCard[]
  coupons: CouponCard[]
  editorialBlocks: EditorialBlockData[]
}

export interface CategoryCard {
  id: string
  name: string
  slug: string
  icon?: string
  productCount: number
}

export interface CouponCard {
  id: string
  code: string
  description?: string
  discount?: string
  sourceName: string
  sourceSlug: string
  endAt?: string
}

export interface EditorialBlockData {
  id: string
  type: string
  title: string
  subtitle?: string
  items: ProductCard[]
}
