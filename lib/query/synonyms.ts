// ============================================================================
// Query Synonyms & Aliases — Brazilian Portuguese commerce terms
// ============================================================================

/** Synonym map: key is canonical, values are aliases */
export const SYNONYMS: Record<string, string[]> = {
  // Electronics
  celular:      ['smartphone', 'telefone', 'phone', 'mobile', 'iphone', 'galaxy'],
  notebook:     ['laptop', 'portatil', 'computador portatil', 'macbook'],
  tablet:       ['ipad', 'tab'],
  fone:         ['headphone', 'headset', 'earphone', 'earbuds', 'fone de ouvido', 'auricular'],
  smartwatch:   ['relogio inteligente', 'apple watch', 'watch'],
  tv:           ['televisao', 'televisor', 'smart tv', 'television'],
  monitor:      ['tela', 'display'],
  camera:       ['filmadora', 'webcam', 'cam'],
  console:      ['videogame', 'video game', 'playstation', 'xbox', 'nintendo'],
  ssd:          ['disco solido', 'armazenamento', 'hd ssd'],
  teclado:      ['keyboard'],
  mouse:        ['rato'],
  impressora:   ['printer'],
  gpu:          ['placa de video', 'placa grafica', 'video card'],

  // Home
  'ar condicionado': ['ar', 'split', 'climatizador', 'ac'],
  geladeira:    ['refrigerador', 'freezer', 'frigobar'],
  microondas:   ['micro ondas', 'micro-ondas'],
  aspirador:    ['aspirador de po', 'robo aspirador', 'aspirador robo'],
  cafeteira:    ['maquina de cafe', 'nespresso', 'dolce gusto', 'expresso'],
  'air fryer':  ['airfryer', 'fritadeira', 'fritadeira eletrica', 'fritadeira sem oleo'],

  // Fashion & Beauty
  perfume:      ['fragancia', 'colonia', 'eau de toilette', 'eau de parfum'],
  tenis:        ['sapato', 'calcado', 'sneaker', 'running'],
  mochila:      ['bolsa', 'bag', 'backpack'],

  // Deal-related terms
  promocao:     ['promo', 'oferta', 'desconto', 'deal', 'liquidacao', 'queima'],
  barato:       ['economico', 'em conta', 'bom preco', 'menor preco', 'mais barato'],
  'custo beneficio': ['custo-beneficio', 'melhor custo', 'vale a pena'],
  frete:        ['frete gratis', 'entrega gratis', 'envio gratis', 'free shipping'],
}

/** Common Portuguese typo corrections */
export const TYPO_CORRECTIONS: Record<string, string> = {
  celulares:    'celular',
  notebok:      'notebook',
  notbook:      'notebook',
  notebbok:     'notebook',
  noteebook:    'notebook',
  samsumg:      'samsung',
  sansung:      'samsung',
  aifone:       'iphone',
  aifon:        'iphone',
  ifone:        'iphone',
  smartfone:    'smartphone',
  smartfon:     'smartphone',
  tabletr:      'tablet',
  tblet:        'tablet',
  televisao:    'tv',
  geladeria:    'geladeira',
  microondas:   'micro-ondas',
  bluethooth:   'bluetooth',
  bluetoth:     'bluetooth',
  frete:        'frete',
  celullar:     'celular',
  smarthwatch:  'smartwatch',
  smartwach:    'smartwatch',
  headfone:     'headphone',
}

/** Common abbreviation expansions */
export const ABBREVIATION_EXPANSIONS: Record<string, string[]> = {
  tv:     ['televisao', 'smart tv'],
  cel:    ['celular'],
  note:   ['notebook'],
  fone:   ['fone de ouvido'],
  pc:     ['computador', 'desktop'],
  ar:     ['ar condicionado'],
  micro:  ['microondas'],
  cam:    ['camera'],
  sw:     ['smartwatch'],
  kb:     ['teclado'],
}

/** Brand aliases and common misspellings */
export const BRAND_ALIASES: Record<string, string[]> = {
  samsung:    ['sansung', 'samsumg', 'samsnug', 'samsug', 'samsugg'],
  apple:      ['aple', 'appel', 'applle'],
  xiaomi:     ['xiomi', 'xaomi', 'xiaome', 'poco', 'redmi', 'xaiomi'],
  motorola:   ['moto', 'motorolla', 'motorolla'],
  sony:       ['soni'],
  philips:    ['phillips', 'philps'],
  lenovo:     ['lennovo', 'lenoo'],
  logitech:   ['logitec', 'logitek'],
  corsair:    ['corseir'],
  microsoft:  ['microsft', 'microsof'],
  nintendo:   ['nintedo', 'nientendo'],
  jbl:        ['jibiel'],
  bose:       ['boss'],
  huawei:     ['hauwei', 'huaway', 'hauway'],
  realme:     ['relme'],
  iphone:     ['aifone', 'aifon', 'ifone'],
}

/** Known brand list for entity extraction */
export const KNOWN_BRANDS = [
  'apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony', 'jbl', 'philips',
  'dell', 'lenovo', 'asus', 'hp', 'acer', 'huawei', 'realme', 'oppo',
  'bose', 'logitech', 'corsair', 'razer', 'microsoft', 'nintendo', 'google',
  'amazon', 'anker', 'edifier', 'hyperx', 'redragon', 'multilaser', 'intelbras',
  'mondial', 'britania', 'electrolux', 'brastemp', 'consul', 'midea',
  'nike', 'adidas', 'puma', 'asics', 'new balance', 'fila',
  'natura', 'boticario', 'avon', 'lancome', 'dior', 'chanel',
]

/** Deal/offer modifiers */
export const DEAL_MODIFIERS = [
  'promocao', 'promo', 'oferta', 'desconto', 'barato', 'em conta',
  'liquidacao', 'queima', 'black friday', 'cupom', 'cashback',
  'menor preco', 'melhor preco', 'mais barato', 'economico',
  'custo beneficio', 'bom preco',
]

/** Exploratory/inspiration modifiers */
export const EXPLORATORY_MODIFIERS = [
  'melhor', 'melhores', 'top', 'recomendacao', 'sugestao', 'ideia',
  'presente', 'presentes', 'gift', 'qual', 'quais', 'dica', 'dicas',
  'tendencia', 'trending', 'popular', 'mais vendido', 'mais vendidos',
]

// ── Commercial intent classification ────────────────────────────────────

export type CommercialIntent = 'price' | 'quality' | 'popularity' | null

/** Price intent terms — user wants cheapest / deals */
export const PRICE_INTENT_TERMS = [
  'barato', 'promocao', 'promo', 'oferta', 'desconto', 'custo beneficio',
  'em conta', 'economico', 'menor preco', 'mais barato', 'bom preco',
  'liquidacao', 'queima',
]

/** Quality intent terms — user wants the best */
export const QUALITY_INTENT_TERMS = [
  'melhor', 'melhores', 'top', 'premium', 'bom', 'profissional',
  'alto desempenho', 'alta qualidade', 'recomendado',
]

/** Popularity intent terms — user wants what others buy */
export const POPULARITY_INTENT_TERMS = [
  'mais vendido', 'mais vendidos', 'popular', 'populares', 'famoso',
  'famosos', 'tendencia', 'trending', 'hit', 'sucesso',
]

/**
 * Detect commercial intent from a normalized query.
 */
export function detectCommercialIntent(normalized: string): CommercialIntent {
  // Check price intent
  if (PRICE_INTENT_TERMS.some(t => normalized.includes(t))) return 'price'
  // Check quality intent
  if (QUALITY_INTENT_TERMS.some(t => normalized.includes(t))) return 'quality'
  // Check popularity intent
  if (POPULARITY_INTENT_TERMS.some(t => normalized.includes(t))) return 'popularity'
  return null
}

/** Comparison modifiers */
export const COMPARISON_MODIFIERS = [
  'vs', 'versus', 'ou', 'comparar', 'comparacao', 'diferenca',
  'melhor entre', 'qual melhor', 'x',
]

/** Attribute terms that indicate specific product filtering */
export const ATTRIBUTE_TERMS: Record<string, string[]> = {
  storage:    ['gb', 'tb', '64gb', '128gb', '256gb', '512gb', '1tb', '2tb'],
  ram:        ['ram', '4gb ram', '8gb ram', '16gb ram', '32gb ram'],
  screen:     ['polegadas', 'pol', '"', '55"', '65"', '75"', 'full hd', '4k', '8k', 'oled', 'qled', 'amoled', 'ips', 'led'],
  color:      ['preto', 'branco', 'azul', 'vermelho', 'rosa', 'verde', 'dourado', 'prata'],
  connectivity: ['bluetooth', 'wifi', 'wi-fi', '5g', '4g', 'nfc', 'usb-c', 'hdmi', 'thunderbolt', 'wireless'],
  condition:  ['novo', 'usado', 'recondicionado', 'seminovo', 'refurbished'],
  gamer:      ['gamer', 'gaming', 'rgb'],
  processor:  ['i3', 'i5', 'i7', 'i9', 'ryzen', 'snapdragon', 'dimensity', 'm1', 'm2', 'm3'],
  camera:     ['mp', '48mp', '64mp', '108mp', '200mp'],
}

/**
 * Apply typo corrections to a normalized query.
 * Returns the corrected query string.
 */
export function correctTypos(normalized: string): { corrected: string; corrections: string[] } {
  let corrected = normalized
  const corrections: string[] = []
  const words = normalized.split(/\s+/)

  for (const word of words) {
    if (TYPO_CORRECTIONS[word] && TYPO_CORRECTIONS[word] !== word) {
      corrected = corrected.replace(new RegExp(`\\b${word}\\b`, 'g'), TYPO_CORRECTIONS[word])
      corrections.push(`${word} → ${TYPO_CORRECTIONS[word]}`)
    }
  }

  return { corrected, corrections }
}

/**
 * Expand a normalized query with synonyms.
 * Returns additional terms that could match related products.
 */
export function expandWithSynonyms(normalized: string): string[] {
  const expansions: string[] = []
  const words = normalized.split(/\s+/)

  // Apply typo corrections first — add corrected terms as expansions
  for (const word of words) {
    if (TYPO_CORRECTIONS[word] && TYPO_CORRECTIONS[word] !== word) {
      expansions.push(TYPO_CORRECTIONS[word])
    }
  }

  // Abbreviation expansions
  for (const word of words) {
    if (ABBREVIATION_EXPANSIONS[word]) {
      expansions.push(...ABBREVIATION_EXPANSIONS[word])
    }
  }

  for (const [canonical, aliases] of Object.entries(SYNONYMS)) {
    // Check if query contains canonical
    if (normalized.includes(canonical)) {
      expansions.push(...aliases.slice(0, 3))
    }
    // Check if query contains any alias
    for (const alias of aliases) {
      if (normalized.includes(alias) && !expansions.includes(canonical)) {
        expansions.push(canonical)
        break
      }
    }
  }

  // Check brand aliases for typo correction
  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    for (const alias of aliases) {
      if (words.includes(alias)) {
        expansions.push(brand)
        break
      }
    }
  }

  return [...new Set(expansions)]
}

/**
 * Resolve a brand alias or typo to the canonical brand name.
 */
export function resolveBrand(term: string): string | null {
  const lower = term.toLowerCase()
  if (KNOWN_BRANDS.includes(lower)) return lower

  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    if (aliases.includes(lower)) return brand
  }
  return null
}
