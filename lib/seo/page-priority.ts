/**
 * lib/seo/page-priority.ts
 *
 * Sistema de Prioridade de Páginas — classifica URLs por potencial comercial,
 * qualidade de conteúdo e readiness para indexação.
 *
 * Uso no admin dashboard, sitemap, e operação de Search Console.
 *
 * Classificações:
 *   priority_high       → empurrar forte: Submit to GSC, link da home, sitemap priority 0.8+
 *   priority_medium     → indexar normalmente, monitorar
 *   priority_low        → indexar, não priorizar crawl
 *   improve_before_index → indexável mas precisa de melhoria antes de insistir
 *   noindex_candidate   → não deveria competir por indexação
 *   draft_only          → ainda não está pronto para indexação
 */

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type IndexPriority =
  | 'priority_high'
  | 'priority_medium'
  | 'priority_low'
  | 'improve_before_index'
  | 'noindex_candidate'
  | 'draft_only'

export type PageType =
  | 'home'
  | 'product'
  | 'category'
  | 'brand'
  | 'melhores'
  | 'comparacao'
  | 'vale-a-pena'
  | 'faixa-preco'
  | 'ofertas-keyword'
  | 'guia-compra'
  | 'guias-article'
  | 'menor-preco'
  | 'mais-vendidos'
  | 'ofertas-main'
  | 'cupons'
  | 'preco-hoje'
  | 'preco-historico'
  | 'categorias-listing'
  | 'marcas-listing'
  | 'busca'
  | 'trending'
  | 'canais'
  | 'indicar'
  | 'radar'
  | 'sobre'
  | 'institucional'

export interface PageSignals {
  type: PageType
  /** Product count or item count for this page */
  itemCount?: number
  /** Whether the page has real product data (offers, prices) */
  hasOfferData?: boolean
  /** Whether page has a price/discount signal */
  hasPriceSignal?: boolean
  /** Whether page has an image */
  hasImage?: boolean
  /** Whether page has real description/content */
  hasDescription?: boolean
  /** Whether page has historical price data */
  hasPriceHistory?: boolean
  /** Popularity score from DB (0-100) */
  popularityScore?: number
  /** Whether page is backed by real catalog comparison data */
  hasComparisonData?: boolean
  /** Whether page has FAQ schema candidates */
  hasFAQ?: boolean
  /** Number of internal links pointing to this page */
  internalLinkCount?: number
}

export interface PriorityResult {
  priority: IndexPriority
  score: number          // 0-100
  reasons: string[]      // Human-readable reasons
  actions: string[]      // Recommended actions
  sitemapPriority: number // 0.1-1.0 for sitemap
  shouldSubmitToGSC: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC RULES PER PAGE TYPE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Base rules for each page type — the structural floor before signal scoring.
 */
const PAGE_TYPE_RULES: Record<PageType, { basePriority: IndexPriority; baseScore: number; sitemapBase: number }> = {
  home:              { basePriority: 'priority_high',   baseScore: 100, sitemapBase: 1.0 },
  product:           { basePriority: 'priority_high',   baseScore: 70,  sitemapBase: 0.8 },
  category:          { basePriority: 'priority_high',   baseScore: 65,  sitemapBase: 0.75 },
  brand:             { basePriority: 'priority_medium',  baseScore: 55,  sitemapBase: 0.65 },
  melhores:          { basePriority: 'priority_high',   baseScore: 72,  sitemapBase: 0.80 },
  comparacao:        { basePriority: 'priority_high',   baseScore: 68,  sitemapBase: 0.75 },
  'vale-a-pena':     { basePriority: 'priority_medium',  baseScore: 60,  sitemapBase: 0.70 },
  'faixa-preco':     { basePriority: 'priority_medium',  baseScore: 55,  sitemapBase: 0.65 },
  'ofertas-keyword': { basePriority: 'priority_medium',  baseScore: 60,  sitemapBase: 0.72 },
  'guia-compra':     { basePriority: 'priority_medium',  baseScore: 60,  sitemapBase: 0.70 },
  'guias-article':   { basePriority: 'priority_medium',  baseScore: 58,  sitemapBase: 0.68 },
  'menor-preco':     { basePriority: 'priority_high',   baseScore: 75,  sitemapBase: 0.90 },
  'mais-vendidos':   { basePriority: 'priority_high',   baseScore: 72,  sitemapBase: 0.85 },
  'ofertas-main':    { basePriority: 'priority_high',   baseScore: 80,  sitemapBase: 0.95 },
  cupons:            { basePriority: 'priority_high',   baseScore: 75,  sitemapBase: 0.85 },
  'preco-hoje':      { basePriority: 'priority_medium',  baseScore: 62,  sitemapBase: 0.80 },
  'preco-historico': { basePriority: 'priority_medium',  baseScore: 55,  sitemapBase: 0.60 },
  'categorias-listing': { basePriority: 'priority_medium', baseScore: 60, sitemapBase: 0.70 },
  'marcas-listing':  { basePriority: 'priority_medium',  baseScore: 55,  sitemapBase: 0.65 },
  busca:             { basePriority: 'priority_medium',  baseScore: 60,  sitemapBase: 0.70 },
  trending:          { basePriority: 'noindex_candidate', baseScore: 20, sitemapBase: 0.0 },
  canais:            { basePriority: 'noindex_candidate', baseScore: 15, sitemapBase: 0.0 },
  indicar:           { basePriority: 'noindex_candidate', baseScore: 10, sitemapBase: 0.0 },
  radar:             { basePriority: 'noindex_candidate', baseScore: 10, sitemapBase: 0.0 },
  sobre:             { basePriority: 'priority_low',    baseScore: 30,  sitemapBase: 0.30 },
  institucional:     { basePriority: 'priority_low',    baseScore: 25,  sitemapBase: 0.20 },
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE SIGNALS
// ─────────────────────────────────────────────────────────────────────────────

function computeSignalBonus(signals: PageSignals): { bonus: number; reasons: string[] } {
  let bonus = 0
  const reasons: string[] = []

  if (signals.hasOfferData) { bonus += 12; reasons.push('Tem dados de oferta reais') }
  if (signals.hasPriceSignal) { bonus += 8; reasons.push('Tem sinal de preço/desconto') }
  if (signals.hasImage) { bonus += 5; reasons.push('Tem imagem') }
  if (signals.hasDescription) { bonus += 5; reasons.push('Tem descrição') }
  if (signals.hasPriceHistory) { bonus += 10; reasons.push('Tem histórico de preço') }
  if (signals.hasComparisonData) { bonus += 8; reasons.push('Tem dados de comparação') }
  if (signals.hasFAQ) { bonus += 5; reasons.push('Tem FAQs') }

  if (signals.itemCount) {
    if (signals.itemCount >= 20) { bonus += 8; reasons.push(`${signals.itemCount} itens no catálogo`) }
    else if (signals.itemCount >= 5) { bonus += 4; reasons.push(`${signals.itemCount} itens no catálogo`) }
    else if (signals.itemCount < 2) { bonus -= 10; reasons.push('Muito poucos itens (<2)') }
  }

  if (signals.popularityScore) {
    if (signals.popularityScore >= 70) { bonus += 10; reasons.push('Alta popularidade') }
    else if (signals.popularityScore >= 40) { bonus += 4; reasons.push('Popularidade moderada') }
  }

  if (signals.internalLinkCount) {
    if (signals.internalLinkCount >= 5) { bonus += 5; reasons.push('Bem linkado internamente') }
    else if (signals.internalLinkCount === 0) { bonus -= 5; reasons.push('Sem links internos') }
  }

  return { bonus, reasons }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

export function getPagePriority(signals: PageSignals): PriorityResult {
  const rules = PAGE_TYPE_RULES[signals.type]
  if (!rules) {
    return {
      priority: 'draft_only',
      score: 0,
      reasons: ['Tipo de página desconhecido'],
      actions: ['Definir tipo de página corretamente'],
      sitemapPriority: 0,
      shouldSubmitToGSC: false,
    }
  }

  // Start from noindex_candidate — short-circuit before doing signal work
  if (rules.basePriority === 'noindex_candidate') {
    return {
      priority: 'noindex_candidate',
      score: rules.baseScore,
      reasons: ['Página sem potencial de tráfego orgânico comercial'],
      actions: ['Manter noindex', 'Remover do sitemap'],
      sitemapPriority: 0,
      shouldSubmitToGSC: false,
    }
  }

  const { bonus, reasons } = computeSignalBonus(signals)
  const rawScore = Math.min(100, Math.max(0, rules.baseScore + bonus))

  // Determine final priority tier
  let priority: IndexPriority
  let actions: string[]

  if (rawScore >= 70) {
    priority = 'priority_high'
    actions = [
      'Incluir no sitemap com prioridade alta',
      'Submeter ao Google Search Console',
      'Linkar da home ou categorias principais',
      'Monitorar impressões/cliques no GSC',
    ]
  } else if (rawScore >= 50) {
    priority = 'priority_medium'
    actions = [
      'Incluir no sitemap',
      'Verificar se title/description estão otimizados',
      'Adicionar links internos',
    ]
  } else if (rawScore >= 35) {
    priority = 'improve_before_index'
    actions = [
      'Melhorar conteúdo/dados antes de insistir em indexação',
      'Adicionar mais produtos/dados reais',
      'Verificar canonical',
    ]
  } else {
    priority = 'priority_low'
    actions = [
      'Indexar mas não priorizar crawl',
      'Não incluir em links internos prioritários',
    ]
  }

  const sitemapPriority = priority === 'priority_high'
    ? Math.min(0.95, rules.sitemapBase)
    : priority === 'priority_medium'
      ? Math.min(0.75, rules.sitemapBase)
      : priority === 'improve_before_index'
        ? Math.min(0.55, rules.sitemapBase)
        : Math.min(0.40, rules.sitemapBase)

  return {
    priority,
    score: rawScore,
    reasons,
    actions,
    sitemapPriority,
    shouldSubmitToGSC: priority === 'priority_high',
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHORTLIST — top URLs to submit to Google Search Console
// ─────────────────────────────────────────────────────────────────────────────

export interface ShortlistEntry {
  url: string
  type: PageType
  priority: IndexPriority
  score: number
  shouldSubmitToGSC: boolean
  reason: string
}

/**
 * Generate a prioritized shortlist of URLs for Search Console submission.
 * Pass your DB-fetched lists of pages with signals.
 */
export function buildGSCShortlist(
  pages: Array<{ url: string; signals: PageSignals }>,
  limit = 50
): ShortlistEntry[] {
  return pages
    .map(({ url, signals }) => {
      const result = getPagePriority(signals)
      return {
        url,
        type: signals.type,
        priority: result.priority,
        score: result.score,
        shouldSubmitToGSC: result.shouldSubmitToGSC,
        reason: result.reasons[0] ?? '',
      }
    })
    .filter((e) => e.priority !== 'noindex_candidate' && e.priority !== 'draft_only')
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

// ─────────────────────────────────────────────────────────────────────────────
// STATIC PAGE INVENTORY — known pages and their base classification
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Static inventory of all known public routes with their base priority.
 * Use this as reference for Search Console operations and sitemap decisions.
 */
export const STATIC_PAGE_INVENTORY = [
  // ── HIGH PRIORITY — should be in sitemap + GSC shortlist ─────────────────
  { url: '/',              type: 'home'           as PageType, sitemapGroup: 'static', defaultPriority: 'priority_high'   as IndexPriority },
  { url: '/ofertas',       type: 'ofertas-main'   as PageType, sitemapGroup: 'static', defaultPriority: 'priority_high'   as IndexPriority },
  { url: '/menor-preco',   type: 'menor-preco'    as PageType, sitemapGroup: 'static', defaultPriority: 'priority_high'   as IndexPriority },
  { url: '/mais-vendidos', type: 'mais-vendidos'  as PageType, sitemapGroup: 'static', defaultPriority: 'priority_high'   as IndexPriority },
  { url: '/cupons',        type: 'cupons'         as PageType, sitemapGroup: 'static', defaultPriority: 'priority_high'   as IndexPriority },
  { url: '/preco-hoje',    type: 'preco-hoje'     as PageType, sitemapGroup: 'static', defaultPriority: 'priority_medium' as IndexPriority },
  { url: '/busca',         type: 'busca'          as PageType, sitemapGroup: 'static', defaultPriority: 'priority_medium' as IndexPriority },
  { url: '/categorias',    type: 'categorias-listing' as PageType, sitemapGroup: 'static', defaultPriority: 'priority_medium' as IndexPriority },
  { url: '/marcas',        type: 'marcas-listing' as PageType, sitemapGroup: 'static', defaultPriority: 'priority_medium' as IndexPriority },
  { url: '/guias',         type: 'guias-article'  as PageType, sitemapGroup: 'editorial', defaultPriority: 'priority_medium' as IndexPriority },

  // ── LOW PRIORITY — indexar mas não priorizar ──────────────────────────────
  { url: '/lojas',         type: 'institucional'  as PageType, sitemapGroup: 'static', defaultPriority: 'priority_low'   as IndexPriority },
  { url: '/sobre',         type: 'sobre'          as PageType, sitemapGroup: 'static', defaultPriority: 'priority_low'   as IndexPriority },
  { url: '/termos',        type: 'institucional'  as PageType, sitemapGroup: 'static', defaultPriority: 'priority_low'   as IndexPriority },
  { url: '/politica-privacidade', type: 'institucional' as PageType, sitemapGroup: 'static', defaultPriority: 'priority_low' as IndexPriority },
  { url: '/transparencia', type: 'institucional'  as PageType, sitemapGroup: 'static', defaultPriority: 'priority_low'   as IndexPriority },

  // ── NOINDEX — excluídas de indexação ─────────────────────────────────────
  { url: '/trending',      type: 'trending'       as PageType, sitemapGroup: 'none', defaultPriority: 'noindex_candidate' as IndexPriority },
  { url: '/canais',        type: 'canais'         as PageType, sitemapGroup: 'none', defaultPriority: 'noindex_candidate' as IndexPriority },
  { url: '/indicar',       type: 'indicar'        as PageType, sitemapGroup: 'none', defaultPriority: 'noindex_candidate' as IndexPriority },
  { url: '/radar',         type: 'radar'          as PageType, sitemapGroup: 'none', defaultPriority: 'noindex_candidate' as IndexPriority },
  { url: '/favoritos',     type: 'indicar'        as PageType, sitemapGroup: 'none', defaultPriority: 'noindex_candidate' as IndexPriority },
  { url: '/minha-conta',   type: 'indicar'        as PageType, sitemapGroup: 'none', defaultPriority: 'noindex_candidate' as IndexPriority },
]

// ─────────────────────────────────────────────────────────────────────────────
// DYNAMIC PAGE TYPE MAP — for categorizing DB pages
// ─────────────────────────────────────────────────────────────────────────────

export const DYNAMIC_PAGE_TYPE_MAP: Record<string, PageType> = {
  '/produto/':     'product',
  '/categoria/':   'category',
  '/marca/':       'brand',
  '/melhores/':    'melhores',
  '/comparar/':    'comparacao',
  '/vale-a-pena/': 'vale-a-pena',
  '/faixa-preco/': 'faixa-preco',
  '/ofertas/':     'ofertas-keyword',
  '/guia-compra/': 'guia-compra',
  '/guias/':       'guias-article',
  '/preco/':       'preco-historico',
}

export function getPageTypeFromUrl(url: string): PageType | null {
  for (const [prefix, type] of Object.entries(DYNAMIC_PAGE_TYPE_MAP)) {
    if (url.includes(prefix)) return type
  }
  return null
}
