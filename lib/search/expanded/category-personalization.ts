/**
 * Busca Ampliada — Category-Based Personalization
 *
 * Customizes framing copy, connector priority, quality thresholds,
 * and UX behavior per product vertical.
 *
 * Mega-prompt-03 Bloco 20 #204: "personalização leve por contexto"
 */

// ── Category Profile ────────────────────────────────────────────────────────

export interface CategoryProfile {
  /** Short display name */
  label: string
  /** Preferred connector order (overrides orchestrator default) */
  connectorPriority: string[]
  /** Minimum quality score for expanded results (stricter for high-trust categories) */
  minQualityScore: number
  /** Framing copy variants tuned for category */
  framingVariants: {
    complement: string
    rescue: string
    weak: string
  }
  /** Whether to prefer images (electronics) or price-first (fashion) */
  displayPriority: 'image_first' | 'price_first' | 'balanced'
  /** Max discount to consider non-suspicious (lower for electronics, higher for fashion) */
  maxTrustDiscount: number
}

// ── Category Profiles ───────────────────────────────────────────────────────

const PROFILES: Record<string, CategoryProfile> = {
  // ── Electronics — high trust, image-heavy, tight discount validation
  celulares: {
    label: 'Celulares',
    connectorPriority: ['google-shopping', 'mercadolivre-search', 'shopee-search'],
    minQualityScore: 35,
    framingVariants: {
      complement: 'Mais celulares em lojas parceiras',
      rescue: 'Encontramos celulares em lojas confiáveis',
      weak: 'Ampliamos a busca com mais opções de celulares',
    },
    displayPriority: 'image_first',
    maxTrustDiscount: 50,
  },
  notebooks: {
    label: 'Notebooks',
    connectorPriority: ['google-shopping', 'mercadolivre-search', 'magalu-search'],
    minQualityScore: 35,
    framingVariants: {
      complement: 'Mais notebooks em lojas parceiras',
      rescue: 'Encontramos notebooks em lojas confiáveis',
      weak: 'Ampliamos a busca para encontrar notebooks com melhor custo-benefício',
    },
    displayPriority: 'image_first',
    maxTrustDiscount: 45,
  },
  fones: {
    label: 'Fones',
    connectorPriority: ['google-shopping', 'shopee-search', 'mercadolivre-search'],
    minQualityScore: 30,
    framingVariants: {
      complement: 'Mais fones em lojas parceiras',
      rescue: 'Encontramos fones de áudio em outras lojas',
      weak: 'Ampliamos a busca com mais opções de fones',
    },
    displayPriority: 'image_first',
    maxTrustDiscount: 60,
  },
  tvs: {
    label: 'Smart TVs',
    connectorPriority: ['google-shopping', 'mercadolivre-search', 'magalu-search'],
    minQualityScore: 35,
    framingVariants: {
      complement: 'Mais TVs em lojas parceiras',
      rescue: 'Encontramos Smart TVs em outras lojas',
      weak: 'Ampliamos a busca com mais opções de TVs',
    },
    displayPriority: 'image_first',
    maxTrustDiscount: 45,
  },
  games: {
    label: 'Games',
    connectorPriority: ['google-shopping', 'mercadolivre-search', 'shopee-search'],
    minQualityScore: 30,
    framingVariants: {
      complement: 'Mais games e acessórios em lojas parceiras',
      rescue: 'Encontramos opções gamer em outras lojas',
      weak: 'Ampliamos a busca para mais opções gamer',
    },
    displayPriority: 'image_first',
    maxTrustDiscount: 55,
  },

  // ── Fashion — price-driven, higher discount tolerance
  moda: {
    label: 'Moda',
    connectorPriority: ['shopee-search', 'google-shopping', 'mercadolivre-search'],
    minQualityScore: 25,
    framingVariants: {
      complement: 'Mais opções de moda em lojas parceiras',
      rescue: 'Encontramos peças parecidas em outras lojas',
      weak: 'Ampliamos a busca com mais opções de moda',
    },
    displayPriority: 'price_first',
    maxTrustDiscount: 80,
  },
  calcados: {
    label: 'Calçados',
    connectorPriority: ['shopee-search', 'google-shopping', 'mercadolivre-search'],
    minQualityScore: 25,
    framingVariants: {
      complement: 'Mais calçados em lojas parceiras',
      rescue: 'Encontramos calçados parecidos em outras lojas',
      weak: 'Ampliamos a busca com mais opções de calçados',
    },
    displayPriority: 'price_first',
    maxTrustDiscount: 75,
  },

  // ── Home & Appliances — balanced, Magalu strong
  eletrodomesticos: {
    label: 'Eletrodomésticos',
    connectorPriority: ['google-shopping', 'mercadolivre-search', 'magalu-search'],
    minQualityScore: 30,
    framingVariants: {
      complement: 'Mais eletrodomésticos em lojas parceiras',
      rescue: 'Encontramos eletrodomésticos em lojas confiáveis',
      weak: 'Ampliamos a busca com mais opções para sua casa',
    },
    displayPriority: 'balanced',
    maxTrustDiscount: 50,
  },
  casa: {
    label: 'Casa',
    connectorPriority: ['google-shopping', 'mercadolivre-search', 'magalu-search'],
    minQualityScore: 25,
    framingVariants: {
      complement: 'Mais itens para casa em lojas parceiras',
      rescue: 'Encontramos opções para casa em outras lojas',
      weak: 'Ampliamos a busca com mais produtos para casa',
    },
    displayPriority: 'balanced',
    maxTrustDiscount: 60,
  },

  // ── Beauty & Personal Care
  beleza: {
    label: 'Beleza',
    connectorPriority: ['shopee-search', 'google-shopping', 'mercadolivre-search'],
    minQualityScore: 25,
    framingVariants: {
      complement: 'Mais produtos de beleza em lojas parceiras',
      rescue: 'Encontramos produtos de beleza em outras lojas',
      weak: 'Ampliamos a busca com mais opções de beleza',
    },
    displayPriority: 'price_first',
    maxTrustDiscount: 70,
  },
}

// ── Default Profile ─────────────────────────────────────────────────────────

const DEFAULT_PROFILE: CategoryProfile = {
  label: 'Geral',
  connectorPriority: ['google-shopping', 'mercadolivre-search', 'shopee-search', 'magalu-search'],
  minQualityScore: 25,
  framingVariants: {
    complement: 'Mais opções em lojas parceiras',
    rescue: 'Encontramos opções em lojas confiáveis',
    weak: 'Ampliamos a busca com mais alternativas',
  },
  displayPriority: 'balanced',
  maxTrustDiscount: 65,
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Get the category profile for a given category slug.
 * Falls back to default if category not mapped.
 */
export function getCategoryProfile(categorySlug?: string): CategoryProfile {
  if (!categorySlug) return DEFAULT_PROFILE
  return PROFILES[categorySlug.toLowerCase()] || DEFAULT_PROFILE
}

/**
 * Get category-specific framing for expanded results.
 */
export function getCategoryFraming(
  categorySlug: string | undefined,
  mode: 'complement' | 'rescue' | 'weak',
): string {
  const profile = getCategoryProfile(categorySlug)
  return profile.framingVariants[mode]
}

/**
 * Get all known category profiles (for admin dashboard).
 */
export function getAllProfiles(): Record<string, CategoryProfile> {
  return { ...PROFILES }
}
