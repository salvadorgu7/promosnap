/**
 * Busca Ampliada — A/B Experiment Framework
 *
 * Lightweight experiment system for testing expanded search UX variations.
 * Uses deterministic hashing (no cookies needed, SSR-safe).
 *
 * Experiments are defined as configs with variants and weights.
 * A user's variant is determined by hashing their session identifier
 * (or query + timestamp day as fallback for anonymous users).
 *
 * Mega-prompt-03 Bloco 18: "Crie plano de experimentos."
 */

// ── Experiment Definitions ──────────────────────────────────────────────────

export interface ExperimentVariant {
  id: string
  label: string
  weight: number // 0-100, all weights in an experiment should sum to 100
}

export interface Experiment {
  id: string
  name: string
  description: string
  variants: ExperimentVariant[]
  /** Whether this experiment is currently active */
  active: boolean
}

// ── Active Experiments ──────────────────────────────────────────────────────

export const EXPERIMENTS: Record<string, Experiment> = {
  // Experiment 1: Feature naming — what do users click more?
  expanded_feature_name: {
    id: 'expanded_feature_name',
    name: 'Expanded Search Feature Name',
    description: 'Test which section label drives more engagement',
    active: true,
    variants: [
      { id: 'mais_opcoes', label: 'Mais opções em lojas parceiras', weight: 25 },
      { id: 'busca_ampliada', label: 'Busca ampliada', weight: 25 },
      { id: 'outras_alternativas', label: 'Outras alternativas', weight: 25 },
      { id: 'opcoes_extras', label: 'Encontramos mais opções para você', weight: 25 },
    ],
  },

  // Experiment 2: Layout on category pages
  category_expanded_layout: {
    id: 'category_expanded_layout',
    name: 'Category Page Expanded Layout',
    description: 'Test rail vs grid for category expanded results',
    active: true,
    variants: [
      { id: 'rail', label: 'Horizontal rail', weight: 50 },
      { id: 'grid', label: 'Standard grid', weight: 50 },
    ],
  },

  // Experiment 3: CTA button text
  expanded_cta_text: {
    id: 'expanded_cta_text',
    name: 'Expanded Result CTA Text',
    description: 'Test which CTA drives more clickouts',
    active: true,
    variants: [
      { id: 'ver_oferta', label: 'Ver oferta', weight: 34 },
      { id: 'ver_opcao', label: 'Ver opção', weight: 33 },
      { id: 'ir_para_loja', label: 'Ir para loja', weight: 33 },
    ],
  },

  // Experiment 4: Show count badge vs hide
  expanded_count_badge: {
    id: 'expanded_count_badge',
    name: 'Show Result Count Badge',
    description: 'Does showing "8 resultados" increase engagement?',
    active: true,
    variants: [
      { id: 'show', label: 'Show count badge', weight: 50 },
      { id: 'hide', label: 'Hide count badge', weight: 50 },
    ],
  },
}

// ── Variant Assignment ──────────────────────────────────────────────────────

/**
 * Simple deterministic hash (djb2) — fast, SSR-safe, no crypto needed.
 */
function simpleHash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get the assigned variant for a user in a given experiment.
 *
 * @param experimentId - Which experiment
 * @param userId - A stable identifier (session ID, cookie, or query + date)
 * @returns The variant ID, or null if experiment is inactive
 */
export function getVariant(experimentId: string, userId: string): string | null {
  const experiment = EXPERIMENTS[experimentId]
  if (!experiment || !experiment.active) return null

  const hash = simpleHash(`${experimentId}:${userId}`)
  const bucket = hash % 100

  let cumulative = 0
  for (const variant of experiment.variants) {
    cumulative += variant.weight
    if (bucket < cumulative) return variant.id
  }

  // Fallback to last variant
  return experiment.variants[experiment.variants.length - 1].id
}

/**
 * Get the display label for a variant (e.g., the framing text to show).
 */
export function getVariantLabel(experimentId: string, variantId: string): string | null {
  const experiment = EXPERIMENTS[experimentId]
  if (!experiment) return null
  return experiment.variants.find(v => v.id === variantId)?.label || null
}

/**
 * Get all active experiments and their variant for a user.
 * Useful for passing to analytics as event properties.
 */
export function getUserExperiments(userId: string): Record<string, string> {
  const assignments: Record<string, string> = {}
  for (const [id, exp] of Object.entries(EXPERIMENTS)) {
    if (exp.active) {
      const variant = getVariant(id, userId)
      if (variant) assignments[id] = variant
    }
  }
  return assignments
}
