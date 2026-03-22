/**
 * Expansion Orchestrator — Decide e executa a expansão externa.
 *
 * Decide:
 * - Quais conectores chamar (baseado em categoria, intent, disponibilidade)
 * - Em que ordem de prioridade
 * - Com quais parâmetros
 * - Com qual timeout
 *
 * Executa conectores em paralelo com circuit-breaker e fallback gracioso.
 * Nunca bloqueia a resposta inteira por falha de um conector.
 */

import type { QueryUnderstanding } from '@/lib/query/types'
import type { CoverageEvaluation, ExpansionDecision } from './types'
import type { ExternalCandidate } from '@/lib/ai/candidate-resolver'
import { connectorRegistry } from '@/lib/ai/candidate-resolver'
import { logger } from '@/lib/logger'

const log = logger.child({ module: 'expansion-orchestrator' })

// ── Connector Priority by Category ───────────────────────────────────────────

/** Which connectors to prefer per category/intent */
const CONNECTOR_PRIORITY: Record<string, string[]> = {
  // Electronics: SerpAPI covers all, then ML (strong), Shopee (deals)
  celulares: ['google-shopping', 'mercadolivre-search', 'shopee-search'],
  notebooks: ['google-shopping', 'mercadolivre-search', 'magalu-search'],
  fones: ['google-shopping', 'shopee-search', 'mercadolivre-search'],
  tvs: ['google-shopping', 'mercadolivre-search', 'magalu-search'],
  games: ['google-shopping', 'mercadolivre-search', 'shopee-search'],
  // Fashion: Shopee/Shein strong, SerpAPI for broad
  moda: ['shopee-search', 'google-shopping', 'mercadolivre-search'],
  calcados: ['shopee-search', 'google-shopping', 'mercadolivre-search'],
  // Home: ML and Magalu strong
  eletrodomesticos: ['google-shopping', 'mercadolivre-search', 'magalu-search'],
  casa: ['google-shopping', 'mercadolivre-search', 'magalu-search'],
  // Default: SerpAPI first (broadest), then ML, Shopee
  default: ['google-shopping', 'mercadolivre-search', 'shopee-search', 'magalu-search'],
}

// ── Limits by Expansion Level ────────────────────────────────────────────────

const EXPANSION_LIMITS: Record<string, { perConnector: number; timeout: number; maxConnectors: number }> = {
  light: { perConnector: 4, timeout: 5000, maxConnectors: 1 },
  moderate: { perConnector: 6, timeout: 8000, maxConnectors: 2 },
  aggressive: { perConnector: 8, timeout: 10000, maxConnectors: 3 },
}

// ── Decision ─────────────────────────────────────────────────────────────────

export function decideExpansion(
  coverage: CoverageEvaluation,
  understanding: QueryUnderstanding,
  params: { maxPrice?: number; forceExpand?: boolean }
): ExpansionDecision {
  // Feature flag: force-expand overrides coverage decision
  if (params.forceExpand) {
    return {
      expand: true,
      connectors: getConnectorPriority(understanding, 'aggressive'),
      limitPerConnector: 8,
      timeoutMs: 10000,
      maxPrice: params.maxPrice || extractBudget(understanding),
      reason: 'force_expand requested',
    }
  }

  if (!coverage.shouldExpand) {
    return {
      expand: false,
      connectors: [],
      limitPerConnector: 0,
      timeoutMs: 0,
      reason: `coverage sufficient (${coverage.coverageScore}/100)`,
    }
  }

  const level = coverage.expansionLevel
  const limits = EXPANSION_LIMITS[level] || EXPANSION_LIMITS.moderate

  const connectors = getConnectorPriority(understanding, level)
    .slice(0, limits.maxConnectors)

  return {
    expand: true,
    connectors,
    limitPerConnector: limits.perConnector,
    timeoutMs: limits.timeout,
    maxPrice: params.maxPrice || extractBudget(understanding),
    reason: `expansion_level=${level}, coverage=${coverage.coverageScore}`,
  }
}

/** Get connector priority based on category and expansion level */
function getConnectorPriority(understanding: QueryUnderstanding, level: string): string[] {
  // Detect category from entities
  const categoryEntity = understanding.entities.find(e => e.type === 'category')
  const categorySlug = categoryEntity?.value?.toLowerCase().replace(/\s+/g, '-')

  const priority = (categorySlug && CONNECTOR_PRIORITY[categorySlug])
    || CONNECTOR_PRIORITY.default

  // Filter to only ready connectors
  const ready = connectorRegistry.getReady().map(c => c.slug)
  return priority.filter(slug => ready.includes(slug))
}

/** Extract budget from query understanding */
function extractBudget(understanding: QueryUnderstanding): number | undefined {
  // Check for price entities or deal modifiers
  const priceEntity = understanding.entities.find(
    e => e.type === 'attribute' && /\d/.test(e.value)
  )
  if (priceEntity) {
    const match = priceEntity.value.match(/(\d[\d.,]*)/)?.[1]
    if (match) {
      const cleaned = match.replace(/\./g, '').replace(',', '.')
      const value = parseFloat(cleaned)
      if (!isNaN(value) && value > 50 && value < 100000) return value
    }
  }

  // Try to find "até X", "max X", etc in raw query
  const budgetMatch = understanding.raw.match(
    /(?:até|ate|max|menos de|no max|no máximo)\s*(?:r\$?\s*)?([\d.,]+)/i
  )
  if (budgetMatch) {
    const cleaned = budgetMatch[1].replace(/\./g, '').replace(',', '.')
    const value = parseFloat(cleaned)
    if (!isNaN(value) && value > 50 && value < 100000) return value
  }

  return undefined
}

// ── Execution ────────────────────────────────────────────────────────────────

export interface ConnectorResult {
  connector: string
  candidates: ExternalCandidate[]
  durationMs: number
  error?: string
}

/**
 * Execute expansion: call connectors in parallel with timeout.
 * Never throws — returns partial results on failure.
 */
export async function executeExpansion(
  decision: ExpansionDecision,
  query: string,
): Promise<ConnectorResult[]> {
  if (!decision.expand || decision.connectors.length === 0) {
    return []
  }

  const results: ConnectorResult[] = []

  // Execute all connectors in parallel with individual timeouts
  const promises = decision.connectors.map(async (slug): Promise<ConnectorResult> => {
    const start = Date.now()
    const connector = connectorRegistry.get(slug)

    if (!connector) {
      return { connector: slug, candidates: [], durationMs: 0, error: 'connector_not_found' }
    }

    try {
      // Race against timeout
      const candidates = await Promise.race([
        connector.search(query, {
          maxPrice: decision.maxPrice,
          limit: decision.limitPerConnector,
        }),
        new Promise<ExternalCandidate[]>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), decision.timeoutMs)
        ),
      ])

      const durationMs = Date.now() - start
      log.info('expansion.connector.ok', { connector: slug, results: candidates.length, durationMs })

      return { connector: slug, candidates, durationMs }
    } catch (err) {
      const durationMs = Date.now() - start
      const error = err instanceof Error ? err.message : String(err)
      log.warn('expansion.connector.failed', { connector: slug, error, durationMs })

      return { connector: slug, candidates: [], durationMs, error }
    }
  })

  // Wait for all connectors (with global timeout as safety net)
  const settled = await Promise.allSettled(promises)

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(result.value)
    }
  }

  return results
}
