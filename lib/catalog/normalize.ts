// ============================================
// Catalog normalization utilities
// ============================================

export const BRAND_ALIASES: Record<string, string> = {
  'apple': 'Apple', 'samsung': 'Samsung', 'xiaomi': 'Xiaomi', 'motorola': 'Motorola',
  'lg': 'LG', 'sony': 'Sony', 'jbl': 'JBL', 'bose': 'Bose', 'dell': 'Dell',
  'lenovo': 'Lenovo', 'asus': 'ASUS', 'acer': 'Acer', 'hp': 'HP',
  'nintendo': 'Nintendo', 'playstation': 'PlayStation', 'xbox': 'Xbox',
  'nike': 'Nike', 'adidas': 'Adidas', 'philips': 'Philips', 'mondial': 'Mondial',
  'electrolux': 'Electrolux', 'brastemp': 'Brastemp', 'consul': 'Consul',
  'arno': 'Arno', 'oster': 'Oster', 'cadence': 'Cadence', 'britania': 'Britânia',
  'multilaser': 'Multilaser', 'positivo': 'Positivo', 'intelbras': 'Intelbras',
  'amazon': 'Amazon', 'google': 'Google', 'microsoft': 'Microsoft',
  'logitech': 'Logitech', 'hyperx': 'HyperX', 'razer': 'Razer', 'redragon': 'Redragon',
  'edifier': 'Edifier', 'qcy': 'QCY', 'baseus': 'Baseus', 'anker': 'Anker',
  // V18 additions — 60+ brands
  'huawei': 'Huawei', 'oppo': 'OPPO', 'realme': 'Realme', 'oneplus': 'OnePlus',
  'tecno': 'Tecno', 'infinix': 'Infinix', 'nokia': 'Nokia', 'nothing': 'Nothing',
  'corsair': 'Corsair', 'steelseries': 'SteelSeries', 'cooler master': 'Cooler Master',
  'coolermaster': 'Cooler Master', 'msi': 'MSI', 'gigabyte': 'Gigabyte', 'evga': 'EVGA',
  'kingston': 'Kingston', 'crucial': 'Crucial', 'wd': 'WD', 'western digital': 'WD',
  'seagate': 'Seagate', 'sandisk': 'SanDisk',
  'canon': 'Canon', 'nikon': 'Nikon', 'gopro': 'GoPro', 'dji': 'DJI',
  'garmin': 'Garmin', 'fitbit': 'Fitbit',
  'panasonic': 'Panasonic', 'tcl': 'TCL', 'aoc': 'AOC', 'hisense': 'Hisense',
  'epson': 'Epson', 'brother': 'Brother',
  'tramontina': 'Tramontina', 'fischer': 'Fischer', 'wap': 'WAP',
  'polishop': 'Polishop', 'walita': 'Walita', 'mallory': 'Mallory',
  'puma': 'Puma', 'new balance': 'New Balance', 'asics': 'Asics',
  'havaianas': 'Havaianas', 'olympikus': 'Olympikus',
  'mattel': 'Mattel', 'hasbro': 'Hasbro', 'lego': 'LEGO',
  'makita': 'Makita', 'bosch': 'Bosch', 'dewalt': 'DeWalt', 'black decker': 'Black+Decker',
  'black+decker': 'Black+Decker', 'blackdecker': 'Black+Decker',
}

const NOISE_WORDS = [
  'original', 'lacrado', 'nota fiscal', 'nf', 'nfe', 'garantia', 'frete grátis',
  'envio imediato', 'pronta entrega', 'promoção', 'oferta', 'mega oferta',
  'super oferta', 'black friday', 'liquidação', 'queima de estoque', 'lançamento',
  'novo', 'novíssimo', 'usado', 'seminovo', 'vitrine', 'mostruário',
  'p/ ', 'para ', 'c/ ', 'com ', '- ', '+ ', '/ ',
]

export const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'celulares': ['smartphone', 'celular', 'iphone', 'galaxy', 'motorola', 'xiaomi', 'redmi', 'poco'],
  'notebooks': ['notebook', 'laptop', 'macbook', 'chromebook', 'ultrabook'],
  'smart-tvs': ['smart tv', 'tv led', 'tv 4k', 'tv oled', 'tv qled', 'televisor', 'televisão'],
  'audio': ['fone', 'headphone', 'headset', 'earbuds', 'caixa de som', 'soundbar', 'speaker', 'earphone'],
  'games': ['playstation', 'xbox', 'nintendo', 'console', 'joystick', 'controle gamer', 'ps5', 'ps4'],
  'casa': ['air fryer', 'aspirador', 'cafeteira', 'liquidificador', 'microondas', 'geladeira', 'lavadora'],
  'esporte': ['tênis', 'bicicleta', 'esteira', 'haltere', 'suplemento', 'whey', 'creatina'],
  'beleza': ['perfume', 'maquiagem', 'shampoo', 'hidratante', 'protetor solar', 'secador'],
  'livros': ['livro', 'kindle', 'ebook', 'leitura', 'box livros'],
  // V18 additions — 18+ categories
  'tablets': ['tablet', 'ipad', 'galaxy tab', 'fire tablet', 'tab s'],
  'monitores': ['monitor', 'tela gamer', 'monitor gamer', 'monitor curvo', 'ultrawide'],
  'perifericos': ['teclado', 'mouse', 'mousepad', 'webcam', 'microfone', 'hub usb', 'dock'],
  'impressoras': ['impressora', 'multifuncional', 'scanner', 'toner', 'cartucho'],
  'cameras': ['câmera', 'camera', 'gopro', 'drone', 'filmadora', 'lente', 'tripé'],
  'relogios': ['relógio', 'relogio', 'smartwatch', 'smartband', 'pulseira inteligente', 'apple watch', 'galaxy watch'],
  'moveis': ['sofá', 'sofa', 'mesa', 'cadeira', 'estante', 'guarda-roupa', 'escrivaninha', 'rack'],
  'brinquedos': ['brinquedo', 'boneca', 'lego', 'carrinho', 'jogo de tabuleiro', 'quebra-cabeça', 'pelúcia'],
  'ferramentas': ['furadeira', 'parafusadeira', 'serra', 'martelo', 'chave', 'alicate', 'trena', 'nivel'],
}

// ============================================
// V18 — Color map (EN→BR and variations)
// ============================================

export const COLOR_MAP: Record<string, string> = {
  // English → canonical BR
  'black': 'Preto', 'white': 'Branco', 'blue': 'Azul', 'red': 'Vermelho',
  'green': 'Verde', 'yellow': 'Amarelo', 'purple': 'Roxo', 'pink': 'Rosa',
  'orange': 'Laranja', 'gray': 'Cinza', 'grey': 'Cinza', 'silver': 'Prata',
  'gold': 'Dourado', 'brown': 'Marrom', 'beige': 'Bege', 'navy': 'Azul Marinho',
  'cyan': 'Ciano', 'magenta': 'Magenta', 'coral': 'Coral', 'lavender': 'Lavanda',
  'midnight': 'Meia-Noite', 'starlight': 'Estelar', 'cream': 'Creme',
  'titanium': 'Titânio', 'graphite': 'Grafite', 'space gray': 'Cinza Espacial',
  'space grey': 'Cinza Espacial', 'rose gold': 'Ouro Rosa', 'rose': 'Rosa',
  // Portuguese variations → canonical BR
  'preto': 'Preto', 'branco': 'Branco', 'azul': 'Azul', 'vermelho': 'Vermelho',
  'verde': 'Verde', 'amarelo': 'Amarelo', 'roxo': 'Roxo', 'rosa': 'Rosa',
  'laranja': 'Laranja', 'cinza': 'Cinza', 'prata': 'Prata', 'dourado': 'Dourado',
  'marrom': 'Marrom', 'bege': 'Bege', 'azul marinho': 'Azul Marinho',
  'ciano': 'Ciano', 'lavanda': 'Lavanda',
  'grafite': 'Grafite', 'titânio': 'Titânio', 'titanio': 'Titânio',
  'ouro rosa': 'Ouro Rosa', 'meia-noite': 'Meia-Noite', 'meia noite': 'Meia-Noite',
  'creme': 'Creme', 'estelar': 'Estelar',
  // Brand-specific color names
  'midnight blue': 'Azul Meia-Noite', 'phantom black': 'Preto Fantasma',
  'cosmic gray': 'Cinza Cósmico', 'ice blue': 'Azul Gelo',
  'natural titanium': 'Titânio Natural', 'blue titanium': 'Titânio Azul',
  'desert titanium': 'Titânio Deserto', 'white titanium': 'Titânio Branco',
}

// ============================================
// V18 — Storage patterns
// ============================================

export const STORAGE_PATTERNS = [
  /\b(\d+)\s*TB\b/i,
  /\b(\d+)\s*GB\b/i,
  /\b(\d+)\s*MB\b/i,
]

// ============================================
// Original functions (preserved)
// ============================================

/**
 * Normalize a product title: remove noise, trim, normalize casing
 */
export function normalizeTitle(title: string): string {
  let clean = title.trim()
  // Remove common noise patterns (case-insensitive)
  for (const noise of NOISE_WORDS) {
    clean = clean.replace(new RegExp(noise.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ')
  }
  // Remove excessive whitespace
  clean = clean.replace(/\s+/g, ' ').trim()
  // Remove trailing hyphens/pipes
  clean = clean.replace(/[\s\-|]+$/, '').trim()
  return clean
}

/**
 * Extract brand from title using known brand aliases
 */
export function extractBrand(title: string): string | null {
  const lower = title.toLowerCase()
  for (const [key, brand] of Object.entries(BRAND_ALIASES)) {
    // Match as whole word
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(lower)) return brand
  }
  return null
}

/**
 * Infer category from title keywords
 */
export function inferCategory(title: string): string | null {
  const lower = title.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return category
    }
  }
  return null
}

/**
 * Extract model identifier from title (e.g., "A15", "Galaxy S24", "RTX 4060")
 */
export function extractModel(title: string): string | null {
  // Common model patterns
  const patterns = [
    /\b(iPhone\s+\d+\s*(?:Pro\s*Max|Pro|Plus|Mini)?)/i,
    /\b(Galaxy\s+[A-Z]\d+\s*(?:Ultra|Plus|FE)?)/i,
    /\b(MacBook\s+(?:Air|Pro)\s*(?:M\d+)?)/i,
    /\b(Redmi\s+Note\s+\d+\s*(?:Pro)?)/i,
    /\b(Moto\s+[A-Z]\d+\s*(?:Play|Power)?)/i,
    /\b(PS[45]\s*(?:Slim|Pro|Digital)?)/i,
    /\b(Xbox\s+Series\s+[XS])/i,
    /\b(Switch\s*(?:OLED|Lite)?)/i,
    /\b(RTX\s+\d{4})/i,
    /\b(GTX\s+\d{4})/i,
    /\b(Ryzen\s+\d+\s+\d{4}\w?)/i,
    /\b(Core\s+i\d+[\-\s]+\d{4,5}\w?)/i,
  ]
  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) return match[1].trim()
  }
  return null
}

/**
 * Calculate listing confidence score (0-100) based on data completeness
 */
export function calculateListingConfidence(data: {
  title?: string
  imageUrl?: string
  price?: number
  originalPrice?: number
  category?: string
  brand?: string
  rating?: number
  reviewsCount?: number
}): number {
  let score = 0

  // Title quality (0-25)
  if (data.title) {
    score += 10
    if (data.title.length > 20) score += 5
    if (data.title.length < 200) score += 5 // not spammy
    if (extractBrand(data.title)) score += 5
  }

  // Image (0-15)
  if (data.imageUrl) {
    score += 10
    if (!data.imageUrl.includes('placeholder') && !data.imageUrl.includes('default')) score += 5
  }

  // Price (0-20)
  if (data.price && data.price > 0) {
    score += 10
    if (data.originalPrice && data.originalPrice > data.price) {
      const disc = (data.originalPrice - data.price) / data.originalPrice
      if (disc > 0 && disc < 0.8) score += 10 // realistic discount
    }
  }

  // Category + Brand (0-20)
  if (data.category) score += 10
  if (data.brand) score += 10

  // Social proof (0-20)
  if (data.rating && data.rating > 0) score += 10
  if (data.reviewsCount && data.reviewsCount > 0) score += 10

  return Math.min(100, score)
}

// ============================================
// V18 — New extraction functions
// ============================================

/**
 * Extract storage from title → "128GB", "256GB", "1TB" etc
 */
export function extractStorage(title: string): string | null {
  // Try TB first (larger unit takes priority)
  const tbMatch = title.match(/\b(\d+)\s*TB\b/i)
  if (tbMatch) return `${tbMatch[1]}TB`

  const gbMatch = title.match(/\b(\d+)\s*GB\b/i)
  if (gbMatch) {
    const val = parseInt(gbMatch[1], 10)
    // Filter out RAM-like values in non-storage context; keep typical storage: 32, 64, 128, 256, 512
    if ([8, 16, 32, 64, 128, 256, 512].includes(val) || val >= 32) {
      return `${val}GB`
    }
  }

  return null
}

/**
 * Extract color from title → canonical Brazilian Portuguese color name
 */
export function extractColor(title: string): string | null {
  const lower = title.toLowerCase()

  // Try multi-word colors first (longest match wins)
  const multiWordColors = Object.keys(COLOR_MAP)
    .filter(k => k.includes(' '))
    .sort((a, b) => b.length - a.length) // longest first

  for (const colorKey of multiWordColors) {
    if (lower.includes(colorKey)) {
      return COLOR_MAP[colorKey]
    }
  }

  // Then try single-word colors as whole words
  for (const [colorKey, canonical] of Object.entries(COLOR_MAP)) {
    if (colorKey.includes(' ')) continue // already checked
    const regex = new RegExp(`\\b${colorKey}\\b`, 'i')
    if (regex.test(lower)) return canonical
  }

  return null
}

/**
 * Extract screen size from title → "6.7\"", "55\"" etc
 */
export function extractScreenSize(title: string): string | null {
  // Match patterns like: 6.7", 55 polegadas, 6,7 pol, 32"
  const patterns = [
    /\b(\d{1,3}[.,]\d)\s*(?:"|''|pol(?:egadas)?|inch(?:es)?)\b/i,
    /\b(\d{1,3})\s*(?:"|''|pol(?:egadas)?|inch(?:es)?)\b/i,
  ]

  for (const pattern of patterns) {
    const match = title.match(pattern)
    if (match) {
      const size = match[1].replace(',', '.')
      return `${size}"`
    }
  }

  return null
}

/**
 * Extract capacity from title → for home appliances "10L", "4.5L"
 */
export function extractCapacity(title: string): string | null {
  // Match patterns like: 10L, 4.5L, 3,2 litros, 500ml
  const literMatch = title.match(/\b(\d+[.,]?\d*)\s*(?:L|litros?)\b/i)
  if (literMatch) {
    const val = literMatch[1].replace(',', '.')
    return `${val}L`
  }

  const mlMatch = title.match(/\b(\d+)\s*(?:ml|mililitros?)\b/i)
  if (mlMatch) {
    return `${mlMatch[1]}ml`
  }

  // Weight: kg for washing machines etc.
  const kgMatch = title.match(/\b(\d+[.,]?\d*)\s*kg\b/i)
  if (kgMatch) {
    const val = kgMatch[1].replace(',', '.')
    return `${val}kg`
  }

  return null
}

/**
 * Extract gender from title → "masculino", "feminino", "unissex"
 */
export function extractGender(title: string): string | null {
  const lower = title.toLowerCase()

  if (/\bunissex\b/.test(lower) || /\bunisex\b/.test(lower)) return 'unissex'
  if (/\bfeminin[oa]\b/.test(lower) || /\bwomen'?s?\b/.test(lower) || /\bladies\b/.test(lower)) return 'feminino'
  if (/\bmasculin[oa]\b/.test(lower) || /\bmen'?s?\b/.test(lower)) return 'masculino'
  if (/\binfantil\b/.test(lower) || /\bkids?\b/.test(lower) || /\bcriança\b/.test(lower)) return 'infantil'

  return null
}

/**
 * Extract all attributes from a title in a single pass
 */
export function extractAllAttributes(title: string): {
  brand: string | null
  model: string | null
  storage: string | null
  color: string | null
  screenSize: string | null
  capacity: string | null
  gender: string | null
  category: string | null
} {
  return {
    brand: extractBrand(title),
    model: extractModel(title),
    storage: extractStorage(title),
    color: extractColor(title),
    screenSize: extractScreenSize(title),
    capacity: extractCapacity(title),
    gender: extractGender(title),
    category: inferCategory(title),
  }
}

/**
 * Remove accents/diacritics from a string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

/**
 * Heavily normalize a title for matching purposes:
 * lowercase, no accents, no noise words, sorted tokens
 */
export function normalizeForMatch(title: string): string {
  let clean = title.toLowerCase()
  clean = removeAccents(clean)

  // Remove noise words
  for (const noise of NOISE_WORDS) {
    const noiseClean = removeAccents(noise.toLowerCase())
    clean = clean.replace(new RegExp(noiseClean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), ' ')
  }

  // Remove special characters, keep alphanumeric and spaces
  clean = clean.replace(/[^a-z0-9\s]/g, ' ')

  // Split into tokens, remove empties, sort
  const tokens = clean.split(/\s+/).filter(t => t.length > 0).sort()

  return tokens.join(' ')
}

/**
 * Jaccard similarity on normalized tokens (0-1)
 */
export function tokenSimilarity(a: string, b: string): number {
  const tokensA = new Set(normalizeForMatch(a).split(/\s+/).filter(t => t.length > 1))
  const tokensB = new Set(normalizeForMatch(b).split(/\s+/).filter(t => t.length > 1))

  if (tokensA.size === 0 && tokensB.size === 0) return 1
  if (tokensA.size === 0 || tokensB.size === 0) return 0

  let intersection = 0
  Array.from(tokensA).forEach(t => {
    if (tokensB.has(t)) intersection++
  })

  const union = tokensA.size + tokensB.size - intersection
  return union > 0 ? intersection / union : 0
}
