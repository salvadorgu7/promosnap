// ============================================
// COMMERCE AUTOMATION — Types
// ============================================

export interface CommerceDecision {
  entityId: string;
  entityType: "product" | "category" | "brand" | "campaign";
  score: number;
  reasons: string[];
  metadata?: Record<string, unknown>;
}

export interface HomeBlock {
  id: string;
  type:
    | "hero_banner"
    | "deal_of_day"
    | "trending_category"
    | "top_offers"
    | "coupon_wall"
    | "editorial"
    | "best_sellers"
    | "price_drops";
  title: string;
  subtitle?: string;
  position: number;
  score: number;
  payload: Record<string, unknown>;
}

export interface CampaignPriority {
  campaignId: string;
  title: string;
  score: number;
  reasons: string[];
  recommendedPlacement: "hero" | "rail" | "newsletter" | "sidebar";
}

export interface OfertaDoDia {
  productId: string;
  productName: string;
  offerId: string;
  currentPrice: number;
  originalPrice?: number;
  discount: number;
  offerScore: number;
  sourceSlug: string;
  affiliateUrl?: string;
  imageUrl?: string;
  reasons: string[];
}

export interface TrendingCategoryResult {
  categoryId: string;
  categoryName: string;
  slug: string;
  score: number;
  reasons: string[];
}

// ============================================
// Decision Value (V15)
// ============================================

export interface DecisionBreakdown {
  /** 0-30: how competitive the price is vs category average */
  priceCompetitiveness: number;
  /** 0-25: quality of reviews (rating + volume) */
  reviewQuality: number;
  /** 0-20: source reliability + offer score */
  trustScore: number;
  /** 0-15: shipping cost/speed advantage */
  shippingQuality: number;
  /** 0-10: CPC/commission revenue potential */
  revenueOpportunity: number;
}

export interface DecisionValue {
  productId: string;
  productName: string;
  /** Composite score 0-100 */
  score: number;
  breakdown: DecisionBreakdown;
}

// ============================================
// UNIFIED COMMERCE ENGINE — Types
// Nucleo unico para site, assistente, busca,
// distribuicao e WhatsApp broadcast
// ============================================

import type {
  IntentType,
  IntentMode,
  IntentUrgency,
} from '@/lib/ai/intent-classifier'

// ── Intent unificado (envelopa ClassifiedIntent) ──────────────────────────

/**
 * Intent comercial unificado.
 * Reutiliza IntentType/IntentMode/IntentUrgency do classificador existente,
 * adicionando campos extras para o motor de comercio.
 */
export interface CommerceIntent {
  type: IntentType
  mode: IntentMode
  urgency: IntentUrgency
  budget?: { min?: number; max?: number }
  useCase?: string
  brands?: string[]
  categories?: string[]
  productMentions?: string[]
  priceKeywords: boolean
  comparisonKeywords: boolean
  /** Confianca da classificacao (0-1) */
  confidence: number
}

// ── Canal de origem ───────────────────────────────────────────────────────

/** Canal que esta requisitando o motor */
export type CommerceChannel = 'site' | 'whatsapp' | 'telegram' | 'email' | 'api'

// ── Requisicao ao motor ───────────────────────────────────────────────────

export interface CommerceRequest {
  query: string
  channel: CommerceChannel
  /** Intent pre-classificado ou auto-detectado pelo motor */
  intent?: CommerceIntent
  sessionId?: string
  userId?: string
  limit?: number
  /** Configuracao especifica do canal */
  channelConfig?: {
    maxItems?: number
    includeRationale?: boolean
    includeAlternatives?: boolean
    includeComparison?: boolean
  }
}

// ── Oferta pontuada ───────────────────────────────────────────────────────

/** Oferta com pontuacao completa do motor unificado */
export interface ScoredOffer {
  offerId: string
  productId: string
  productName: string
  productSlug: string
  currentPrice: number
  originalPrice: number | null
  discount: number
  sourceSlug: string
  sourceName: string
  imageUrl: string | null
  /** URL de afiliado ja processada pelo affiliate manager */
  affiliateUrl: string
  /** URL de clickout do PromoSnap para rastreamento */
  clickoutUrl: string
  isFreeShipping: boolean
  rating: number | null
  reviewsCount: number | null
  couponText: string | null
  // Pontuacao
  /** Score comercial unificado (0-100) */
  commercialScore: number
  scoreBreakdown: {
    relevance: number
    dealQuality: number
    demand: number
    trust: number
    commercial: number
  }
  boosts: string[]
  // Sinal de compra
  buySignal?: { level: string; headline: string }
  // Posicao no resultado
  position: number
  /** Justificativa da selecao (por que essa oferta foi escolhida) */
  rationale?: string
}

// ── Comparacao ────────────────────────────────────────────────────────────

export interface ComparisonResult {
  products: ScoredOffer[]
  dimensions: ComparisonDimension[]
  /** Veredito textual da comparacao */
  verdict: string
  /** Slug do produto com melhor custo-beneficio */
  bestValue: string
  /** Slug do produto mais barato */
  cheapest: string
}

export interface ComparisonDimension {
  /** Nome da dimensao: "Preco", "Camera", "Armazenamento", etc. */
  name: string
  /** Mapa productSlug -> valor exibido */
  values: Record<string, string>
  /** Slug do produto vencedor na dimensao */
  winner?: string
}

// ── Resposta completa do motor ─────────────────────────────────────────────

export interface CommerceResponse {
  intent: CommerceIntent
  offers: ScoredOffer[]
  comparison?: ComparisonResult
  // Metadados
  totalFound: number
  internalCount: number
  externalCount: number
  channel: CommerceChannel
  // Sugestoes
  suggestAlert: boolean
  suggestExternalSearch: boolean
  refinementSuggestions?: string[]
  /** Texto de resposta pre-composto (ex: para WhatsApp/assistente) */
  responseText?: string
  // Observabilidade
  timing: {
    intentMs: number
    retrievalMs: number
    scoringMs: number
    totalMs: number
  }
  retrievalSources: string[]
}

// ── Quality Gates ─────────────────────────────────────────────────────────

/** Configuracao de quality gates (portoes de qualidade) */
export interface QualityGatesConfig {
  /** Preco minimo em R$ (filtra erros de parse) */
  minPrice: number
  /** Desconto maximo em % (filtra erros de dados) */
  maxDiscount: number
  /** Nota minima (listings sem nota sao mantidos) */
  minRating: number
  /** Exigir imagem para aprovar oferta */
  requireImage: boolean
  /** Exigir URL de afiliado */
  requireAffiliate: boolean
  /** Maximo de ofertas por marketplace (0 = ilimitado) */
  maxPerMarketplace: number
}

// ── Memoria de conversa ───────────────────────────────────────────────────

/** Entrada de memoria de curto prazo para sessoes conversacionais */
export interface ConversationMemory {
  sessionId: string
  channel: CommerceChannel
  entries: MemoryEntry[]
  createdAt: Date
  lastActiveAt: Date
}

export interface MemoryEntry {
  query: string
  intent: CommerceIntent
  /** Slugs dos produtos selecionados/clicados */
  selectedProducts: string[]
  budget?: { min?: number; max?: number }
  brands?: string[]
  categories?: string[]
  /** Slugs dos produtos rejeitados pelo usuario */
  rejectedProducts?: string[]
  timestamp: Date
}
