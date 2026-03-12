// Catalog normalization utilities

const BRAND_ALIASES: Record<string, string> = {
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
}

const NOISE_WORDS = [
  'original', 'lacrado', 'nota fiscal', 'nf', 'nfe', 'garantia', 'frete grátis',
  'envio imediato', 'pronta entrega', 'promoção', 'oferta', 'mega oferta',
  'super oferta', 'black friday', 'liquidação', 'queima de estoque', 'lançamento',
  'novo', 'novíssimo', 'usado', 'seminovo', 'vitrine', 'mostruário',
  'p/ ', 'para ', 'c/ ', 'com ', '- ', '+ ', '/ ',
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'celulares': ['smartphone', 'celular', 'iphone', 'galaxy', 'motorola', 'xiaomi', 'redmi', 'poco'],
  'notebooks': ['notebook', 'laptop', 'macbook', 'chromebook', 'ultrabook'],
  'smart-tvs': ['smart tv', 'tv led', 'tv 4k', 'tv oled', 'tv qled', 'televisor', 'televisão'],
  'audio': ['fone', 'headphone', 'headset', 'earbuds', 'caixa de som', 'soundbar', 'speaker', 'earphone'],
  'games': ['playstation', 'xbox', 'nintendo', 'console', 'joystick', 'controle gamer', 'ps5', 'ps4'],
  'casa': ['air fryer', 'aspirador', 'cafeteira', 'liquidificador', 'microondas', 'geladeira', 'lavadora'],
  'esporte': ['tênis', 'bicicleta', 'esteira', 'haltere', 'suplemento', 'whey', 'creatina'],
  'beleza': ['perfume', 'maquiagem', 'shampoo', 'hidratante', 'protetor solar', 'secador'],
  'livros': ['livro', 'kindle', 'ebook', 'leitura', 'box livros'],
}

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
    const regex = new RegExp(`\\b${key}\\b`, 'i')
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
