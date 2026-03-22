/**
 * Smart Categorizer — multi-signal product categorization.
 *
 * Goes beyond simple keyword matching. Uses:
 * 1. Title keywords (primary signal)
 * 2. Brand context (Apple → celulares/notebooks, Brastemp → casa)
 * 3. Price range hints (R$ 50 → accessories, R$ 5000 → notebooks/TVs)
 * 4. Spec extraction (RAM → informática, mAh → celulares)
 * 5. Multi-label: primary + secondary categories
 *
 * Used by: catalog enrichment jobs, search relevance, assistant routing.
 */

// ============================================
// TYPES
// ============================================

export interface CategoryMatch {
  slug: string
  label: string
  confidence: number
}

export interface CategoryResult {
  /** Categoria principal com maior score */
  primary: CategoryMatch
  /** Até 3 categorias secundárias com score > 0.3 */
  secondary: CategoryMatch[]
  /** Tags descritivas extraídas do título */
  tags: string[]
  /** Segmento de preço relativo à categoria */
  priceSegment: 'budget' | 'mid_range' | 'premium' | 'luxury' | 'unknown'
  /** Público-alvo inferido */
  targetAudience: 'gamer' | 'profissional' | 'estudante' | 'familia' | 'geral'
}

export interface CategoryRule {
  slug: string
  /** Nome em português */
  label: string
  /** Palavras-chave no título */
  keywords: string[]
  /** Marcas que são primariamente dessa categoria */
  brands: string[]
  /** Faixa de preço típica em BRL */
  priceRange: { min: number; max: number }
  /** Chaves de specs que indicam essa categoria */
  specKeys: string[]
  /** Palavras-chave que EXCLUEM essa categoria */
  exclusionKeywords: string[]
}

// ============================================
// CATEGORY DATABASE
// ============================================

const CATEGORY_RULES: CategoryRule[] = [
  {
    slug: 'celulares',
    label: 'Celulares e Smartphones',
    keywords: [
      'celular', 'smartphone', 'iphone', 'galaxy s', 'galaxy a',
      'xiaomi', 'redmi', 'poco', 'motorola moto', 'realme',
      'oppo', 'oneplus', 'pixel', 'zenfone', 'galaxy z',
    ],
    brands: [
      'apple', 'samsung', 'xiaomi', 'motorola', 'realme',
      'oppo', 'oneplus', 'google', 'asus', 'poco',
    ],
    priceRange: { min: 300, max: 10000 },
    specKeys: ['mah', 'mp', 'sim', 'nfc', 'tela amoled'],
    exclusionKeywords: ['capinha', 'capa', 'película', 'carregador', 'cabo'],
  },
  {
    slug: 'notebooks',
    label: 'Notebooks e Laptops',
    keywords: [
      'notebook', 'laptop', 'macbook', 'chromebook', 'ultrabook',
      'thinkpad', 'ideapad', 'vivobook', 'zenbook', 'inspiron',
      'pavilion', 'predator', 'nitro',
    ],
    brands: [
      'dell', 'lenovo', 'hp', 'asus', 'acer', 'apple',
      'samsung', 'vaio', 'positivo', 'avell',
    ],
    priceRange: { min: 1500, max: 15000 },
    specKeys: ['ghz', 'ssd', 'ram', 'polegadas tela', 'nvidia', 'intel', 'amd ryzen'],
    exclusionKeywords: ['capa notebook', 'suporte notebook', 'mesa notebook', 'mochila'],
  },
  {
    slug: 'audio',
    label: 'Áudio e Fones',
    keywords: [
      'fone', 'headphone', 'earphone', 'airpods', 'headset',
      'earbuds', 'caixa de som', 'speaker', 'soundbar',
      'microfone', 'fone bluetooth', 'fone sem fio',
      'amplificador', 'subwoofer', 'home theater',
    ],
    brands: [
      'jbl', 'bose', 'sony', 'apple', 'samsung',
      'edifier', 'qcy', 'haylou', 'philips', 'sennheiser',
      'audio-technica', 'beats', 'marshall',
    ],
    priceRange: { min: 30, max: 3000 },
    specKeys: ['db', 'driver', 'anc', 'bluetooth', 'impedância'],
    exclusionKeywords: ['cabo audio', 'adaptador audio'],
  },
  {
    slug: 'smart-tvs',
    label: 'Smart TVs e Televisores',
    keywords: [
      'tv', 'televisão', 'televisor', 'smart tv', 'led', 'oled',
      'qled', 'neo qled', 'nanocell', '4k', '8k', 'uhd',
      'android tv', 'google tv', 'roku tv',
    ],
    brands: [
      'lg', 'samsung', 'tcl', 'philco', 'aoc',
      'sony', 'philips', 'toshiba', 'hisense',
    ],
    priceRange: { min: 800, max: 20000 },
    specKeys: ['polegadas', 'hz', 'hdr', 'hdmi'],
    exclusionKeywords: ['suporte tv', 'cabo hdmi', 'controle remoto', 'antena'],
  },
  {
    slug: 'informatica',
    label: 'Informática e Periféricos',
    keywords: [
      'monitor', 'mouse', 'teclado', 'webcam', 'impressora',
      'roteador', 'hub usb', 'ssd', 'hd externo', 'pen drive',
      'placa de vídeo', 'gpu', 'processador', 'memória ram',
      'gabinete', 'fonte', 'cooler', 'placa mãe', 'modem',
      'repetidor', 'switch de rede', 'nobreak', 'estabilizador',
    ],
    brands: [
      'logitech', 'microsoft', 'tp-link', 'intelbras', 'multilaser',
      'kingston', 'sandisk', 'western digital', 'seagate', 'nvidia',
      'amd', 'intel', 'corsair', 'epson', 'brother',
    ],
    priceRange: { min: 50, max: 10000 },
    specKeys: ['usb', 'dpi', 'gbps', 'rpm', 'tb', 'pci'],
    exclusionKeywords: [],
  },
  {
    slug: 'gamer',
    label: 'Games e Acessórios Gamer',
    keywords: [
      'gamer', 'gaming', 'ps5', 'playstation', 'xbox', 'nintendo',
      'switch', 'console', 'joystick', 'controle', 'cadeira gamer',
      'mouse gamer', 'teclado mecânico', 'headset gamer',
      'monitor gamer', 'mousepad', 'stream deck', 'placa de captura',
    ],
    brands: [
      'razer', 'corsair', 'hyperx', 'redragon', 'logitech g',
      'steelseries', 'sony playstation', 'microsoft xbox',
      'nintendo', 'cougar', 'dxracer', 'thunderx3',
    ],
    priceRange: { min: 100, max: 8000 },
    specKeys: ['rgb', 'switch', 'polling rate', 'ms resposta'],
    exclusionKeywords: [],
  },
  {
    slug: 'wearables',
    label: 'Smartwatches e Wearables',
    keywords: [
      'smartwatch', 'relógio inteligente', 'apple watch', 'galaxy watch',
      'mi band', 'smart band', 'pulseira fitness', 'garmin',
      'amazfit', 'fitness tracker', 'anel inteligente',
    ],
    brands: [
      'apple', 'samsung', 'xiaomi', 'garmin', 'amazfit',
      'huawei', 'fitbit', 'polar',
    ],
    priceRange: { min: 100, max: 5000 },
    specKeys: ['atm', 'spo2', 'gps', 'bateria dias'],
    exclusionKeywords: ['pulseira', 'película watch'],
  },
  {
    slug: 'tablets',
    label: 'Tablets e E-readers',
    keywords: [
      'tablet', 'ipad', 'galaxy tab', 'kindle', 'e-reader',
      'fire tablet', 'lenovo tab', 'caneta stylus',
    ],
    brands: [
      'apple', 'samsung', 'amazon', 'lenovo', 'xiaomi',
      'huawei', 'multilaser',
    ],
    priceRange: { min: 500, max: 12000 },
    specKeys: ['polegadas', 'apple pencil', 'stylus'],
    exclusionKeywords: ['capa tablet', 'suporte tablet', 'teclado tablet'],
  },
  {
    slug: 'cameras',
    label: 'Câmeras e Fotografia',
    keywords: [
      'câmera', 'camera', 'dslr', 'mirrorless', 'gopro', 'action cam',
      'lente', 'tripé', 'drone', 'gimbal', 'ring light',
      'iluminação estúdio', 'câmera instantânea', 'instax',
    ],
    brands: [
      'canon', 'nikon', 'sony', 'fujifilm', 'gopro',
      'dji', 'panasonic', 'olympus',
    ],
    priceRange: { min: 200, max: 20000 },
    specKeys: ['megapixel', 'iso', 'zoom óptico', 'fps'],
    exclusionKeywords: ['câmera de segurança', 'câmera veicular'],
  },
  {
    slug: 'casa',
    label: 'Casa e Eletrodomésticos',
    keywords: [
      'air fryer', 'fritadeira', 'cafeteira', 'aspirador', 'geladeira',
      'fogão', 'micro-ondas', 'liquidificador', 'panela', 'ferro de passar',
      'purificador', 'ar condicionado', 'ventilador', 'umidificador',
      'máquina de lavar', 'lava-louças', 'forno elétrico', 'mixer',
      'batedeira', 'espremedor', 'sanduicheira', 'grill',
      'robô aspirador', 'torradeira', 'chaleira elétrica',
    ],
    brands: [
      'electrolux', 'brastemp', 'consul', 'mondial', 'britânia',
      'philco', 'arno', 'oster', 'cadence', 'wap',
      'midea', 'fischer', 'tramontina',
    ],
    priceRange: { min: 50, max: 10000 },
    specKeys: ['litros', 'watts', 'btus', 'voltagem'],
    exclusionKeywords: [],
  },
  {
    slug: 'moveis',
    label: 'Móveis e Decoração',
    keywords: [
      'sofá', 'mesa', 'cadeira escritório', 'escrivaninha', 'estante',
      'guarda-roupa', 'rack', 'painel', 'cômoda', 'colchão',
      'travesseiro', 'luminária', 'cortina', 'tapete', 'prateleira',
    ],
    brands: [
      'madesa', 'tok stok', 'mobly', 'castor', 'ortobom',
      'probel', 'kappesberg',
    ],
    priceRange: { min: 100, max: 8000 },
    specKeys: ['cm', 'mdf', 'molas'],
    exclusionKeywords: [],
  },
  {
    slug: 'beleza',
    label: 'Beleza e Cuidados Pessoais',
    keywords: [
      'perfume', 'maquiagem', 'base', 'batom', 'rímel', 'skincare',
      'creme', 'protetor solar', 'shampoo', 'condicionador', 'secador',
      'chapinha', 'prancha', 'máscara capilar', 'hidratante',
      'sérum', 'esfoliante', 'desodorante', 'barbeador', 'aparador',
    ],
    brands: [
      'natura', "o boticário", 'mac', 'maybelline', 'avon',
      'salon line', 'wella', 'taiff', 'gama', 'philips',
      'braun', 'gillette', "l'oréal",
    ],
    priceRange: { min: 20, max: 2000 },
    specKeys: ['ml', 'fps'],
    exclusionKeywords: [],
  },
  {
    slug: 'moda',
    label: 'Moda e Acessórios',
    keywords: [
      'tênis', 'sneaker', 'mochila', 'bolsa', 'relógio', 'óculos',
      'camiseta', 'vestido', 'jaqueta', 'calça jeans', 'bermuda',
      'chinelo', 'sandália', 'sapato', 'bota', 'carteira',
      'cinto', 'chapéu', 'boné',
    ],
    brands: [
      'nike', 'adidas', 'puma', 'new balance', 'vans',
      'converse', 'fila', 'olympikus', 'havaianas',
      'ray-ban', 'oakley', 'casio',
    ],
    priceRange: { min: 50, max: 3000 },
    specKeys: ['tamanho', 'numeração'],
    exclusionKeywords: [],
  },
  {
    slug: 'infantil',
    label: 'Bebês e Infantil',
    keywords: [
      'brinquedo', 'lego', 'boneca', 'carrinho', 'berço', 'mamadeira',
      'fralda', 'bicicleta infantil', 'patinete', 'pelúcia',
      'jogo de tabuleiro', 'quebra-cabeça', 'nerf', 'hot wheels',
      'barbie', 'carrinho de bebê', 'cadeirinha auto', 'andador',
    ],
    brands: [
      'lego', 'mattel', 'hasbro', 'fisher-price', 'bandeirante',
      'estrela', 'galzerano', 'chicco', 'graco',
    ],
    priceRange: { min: 20, max: 2000 },
    specKeys: ['idade', 'peças'],
    exclusionKeywords: [],
  },
  {
    slug: 'ferramentas',
    label: 'Ferramentas e Construção',
    keywords: [
      'furadeira', 'parafusadeira', 'serra', 'lixadeira', 'compressor',
      'solda', 'multímetro', 'chave', 'martelete', 'plaina',
      'esmerilhadeira', 'trena', 'nível', 'alicate', 'tupia',
    ],
    brands: [
      'bosch', 'makita', 'dewalt', 'black+decker', 'stanley',
      'tramontina', 'vonder', 'schulz', 'einhell',
    ],
    priceRange: { min: 50, max: 5000 },
    specKeys: ['rpm', 'nm', 'watts', 'volts'],
    exclusionKeywords: [],
  },
  {
    slug: 'pets',
    label: 'Pet Shop',
    keywords: [
      'ração', 'comedouro', 'casinha', 'coleira', 'brinquedo pet',
      'arranhador', 'aquário', 'cama pet', 'tapete higiênico',
      'bebedouro pet', 'gaiola', 'terrário', 'areia gato',
      'petisco', 'guia retrátil', 'transporte pet',
    ],
    brands: [
      'royal canin', 'premier', 'golden', 'pedigree', 'whiskas',
      'hills', 'purina',
    ],
    priceRange: { min: 10, max: 1000 },
    specKeys: ['kg', 'litros'],
    exclusionKeywords: [],
  },
  {
    slug: 'esportes',
    label: 'Esportes e Fitness',
    keywords: [
      'bicicleta', 'esteira', 'elíptico', 'haltere', 'whey',
      'suplemento', 'yoga', 'natação', 'luva boxe', 'corda',
      'colchonete', 'anilha', 'barra musculação', 'caneleira',
      'patins', 'skate', 'prancha surf', 'bola', 'raquete',
    ],
    brands: [
      'caloi', 'gtsm1', 'probiótica', 'max titanium', 'growth',
      'speedo', 'everlast', 'vollo', 'kikos',
    ],
    priceRange: { min: 30, max: 5000 },
    specKeys: ['kg', 'velocidades'],
    exclusionKeywords: [],
  },
  {
    slug: 'automotivo',
    label: 'Automotivo',
    keywords: [
      'gps', 'câmera veicular', 'dash cam', 'som automotivo', 'pneu',
      'bateria carro', 'acessório carro', 'aspirador veicular',
      'suporte celular carro', 'película automotiva',
      'compressor portátil', 'lavadora alta pressão',
    ],
    brands: [
      'pioneer', 'multilaser', 'bosch', 'philips', 'goodyear',
      'pirelli', 'continental', 'moura', 'heliar',
    ],
    priceRange: { min: 30, max: 3000 },
    specKeys: ['aro', 'amperes', 'psi'],
    exclusionKeywords: [],
  },
  {
    slug: 'escritorio',
    label: 'Papelaria e Escritório',
    keywords: [
      'caderno', 'caneta', 'mochila escolar', 'agenda', 'calculadora',
      'grampeador', 'papel', 'fichário', 'lápis', 'marca-texto',
      'organizador', 'quadro branco', 'plastificadora', 'guilhotina',
    ],
    brands: [
      'faber-castell', 'bic', 'tilibra', 'stabilo', 'pilot',
      'casio', '3m',
    ],
    priceRange: { min: 5, max: 500 },
    specKeys: ['folhas', 'mm ponta'],
    exclusionKeywords: [],
  },
  {
    slug: 'seguranca',
    label: 'Segurança e Vigilância',
    keywords: [
      'câmera de segurança', 'câmera ip', 'alarme', 'sensor de presença',
      'fechadura digital', 'fechadura eletrônica', 'cofre', 'dvr', 'nvr',
      'babá eletrônica', 'interfone', 'vídeo porteiro',
    ],
    brands: [
      'intelbras', 'hikvision', 'giga', 'yale', 'samsung',
    ],
    priceRange: { min: 80, max: 3000 },
    specKeys: ['megapixel', 'canais', 'infravermelho'],
    exclusionKeywords: [],
  },
  {
    slug: 'saude',
    label: 'Saúde e Bem-estar',
    keywords: [
      'oxímetro', 'termômetro', 'balança digital', 'medidor pressão',
      'nebulizador', 'inalador', 'massageador', 'tens', 'órtese',
      'cadeira de rodas', 'andador idoso', 'vitamina', 'suplemento saúde',
    ],
    brands: [
      'omron', 'g-tech', 'bioland', 'relaxmedic', 'multilaser',
    ],
    priceRange: { min: 20, max: 3000 },
    specKeys: ['mmhg', 'kg capacidade'],
    exclusionKeywords: [],
  },
  {
    slug: 'acessorios-celular',
    label: 'Acessórios de Celular',
    keywords: [
      'capinha', 'capa celular', 'película', 'carregador', 'cabo usb',
      'power bank', 'bateria portátil', 'suporte celular', 'pop socket',
      'carregador sem fio', 'carregador rápido', 'cabo tipo c',
      'adaptador', 'ring light celular',
    ],
    brands: [
      'anker', 'baseus', 'belkin', 'ugreen', 'spigen',
    ],
    priceRange: { min: 10, max: 500 },
    specKeys: ['mah', 'watts', 'amperes'],
    exclusionKeywords: [],
  },
]

// ============================================
// TAG EXTRACTION RULES
// ============================================

interface TagRule {
  tag: string
  patterns: RegExp[]
}

const TAG_RULES: TagRule[] = [
  {
    tag: 'bluetooth',
    patterns: [/bluetooth/i, /wireless/i, /sem\s+fio/i],
  },
  {
    tag: 'waterproof',
    patterns: [/prova\s+d['']?[aá]gua/i, /ip6[78]/i, /ipx\d/i, /resistente\s+[aà]\s+[aá]gua/i],
  },
  {
    tag: 'portable',
    patterns: [/port[aá]til/i, /compacto/i, /\bmini\b/i, /dobr[aá]vel/i],
  },
  {
    tag: 'rgb',
    patterns: [/\brgb\b/i, /\bled\b/i, /iluminação/i],
  },
  {
    tag: 'rechargeable',
    patterns: [/recarreg[aá]vel/i, /bateria\s+integrada/i],
  },
  {
    tag: 'foldable',
    patterns: [/dobr[aá]vel/i, /foldable/i, /flip/i],
  },
  {
    tag: 'original',
    patterns: [/\boriginal\b/i, /\blacrado\b/i, /selo\s+de\s+garantia/i],
  },
  {
    tag: 'bivolt',
    patterns: [/bivolt/i, /110v/i, /220v/i, /dual\s+voltage/i],
  },
  {
    tag: '5g',
    patterns: [/\b5g\b/i],
  },
  {
    tag: 'wifi6',
    patterns: [/wi-?fi\s*6/i, /wifi\s*6/i, /802\.11ax/i],
  },
  {
    tag: 'noise-cancelling',
    patterns: [/noise\s*cancell?ing/i, /\banc\b/i, /cancelamento\s+de\s+ru[ií]do/i],
  },
  {
    tag: 'fast-charging',
    patterns: [/turbo\s*power/i, /carregamento\s+r[aá]pido/i, /fast\s*charg/i, /supercharge/i, /dart\s*charge/i],
  },
  {
    tag: 'smart',
    patterns: [/\bsmart\b/i, /inteligente/i, /wi-?fi/i, /alexa/i, /google\s+assistant/i],
  },
  {
    tag: 'solar',
    patterns: [/solar/i, /energia\s+solar/i],
  },
  {
    tag: 'usb-c',
    patterns: [/usb[\s-]?c/i, /tipo[\s-]?c/i, /type[\s-]?c/i],
  },
]

// ============================================
// AUDIENCE KEYWORDS
// ============================================

const AUDIENCE_KEYWORDS: Record<string, RegExp[]> = {
  gamer: [/gamer/i, /gaming/i, /\brgb\b/i, /fps/i, /\bps[45]\b/i, /xbox/i, /e-?sports/i],
  profissional: [/profissional/i, /\bwork\b/i, /enterprise/i, /corporativo/i, /comercial/i],
  estudante: [/estudante/i, /escolar/i, /b[aá]sico/i, /custo[\s-]?benef[ií]cio/i, /essencial/i],
  familia: [/fam[ií]lia/i, /infantil/i, /kids/i, /crian[çc]a/i, /beb[eê]/i],
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Normaliza string para comparação: lowercase, remove acentos, trim.
 */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Calcula o score de match de keywords para uma categoria.
 * Keywords mais longas (mais específicas) recebem peso maior.
 */
function scoreKeywords(titleNorm: string, keywords: string[]): number {
  let score = 0
  let matchCount = 0

  for (const kw of keywords) {
    const kwNorm = normalize(kw)
    if (titleNorm.includes(kwNorm)) {
      // Peso baseado na especificidade (tamanho da keyword)
      const specificity = kwNorm.length >= 8 ? 0.3 : kwNorm.length >= 5 ? 0.2 : 0.15
      score += specificity
      matchCount++
    }
  }

  // Bonus por múltiplos matches (sugere alta relevância)
  if (matchCount >= 3) score += 0.15
  else if (matchCount >= 2) score += 0.05

  return score
}

/**
 * Verifica se a marca do produto corresponde a marcas conhecidas da categoria.
 */
function scoreBrand(brandNorm: string, categoryBrands: string[]): number {
  if (!brandNorm) return 0

  for (const cb of categoryBrands) {
    const cbNorm = normalize(cb)
    if (brandNorm.includes(cbNorm) || cbNorm.includes(brandNorm)) {
      return 0.3
    }
  }

  return 0
}

/**
 * Verifica se o preço cai dentro da faixa típica da categoria.
 */
function scorePrice(price: number, priceRange: { min: number; max: number }): number {
  if (price >= priceRange.min && price <= priceRange.max) {
    return 0.1
  }
  // Perto da faixa: pequeno boost
  const margin = (priceRange.max - priceRange.min) * 0.2
  if (price >= priceRange.min - margin && price <= priceRange.max + margin) {
    return 0.03
  }
  return 0
}

/**
 * Verifica se as specs do produto contêm chaves relevantes para a categoria.
 */
function scoreSpecs(specs: Record<string, unknown>, specKeys: string[]): number {
  if (!specs || Object.keys(specs).length === 0) return 0

  const specText = normalize(
    Object.keys(specs).join(' ') + ' ' + Object.values(specs).map(String).join(' ')
  )

  let matches = 0
  for (const sk of specKeys) {
    if (specText.includes(normalize(sk))) {
      matches++
    }
  }

  return matches > 0 ? Math.min(matches * 0.1, 0.2) : 0
}

/**
 * Verifica se o título contém keywords de exclusão da categoria.
 */
function scoreExclusion(titleNorm: string, exclusionKeywords: string[]): number {
  for (const ek of exclusionKeywords) {
    if (titleNorm.includes(normalize(ek))) {
      return -0.5
    }
  }
  return 0
}

// ============================================
// PUBLIC FUNCTIONS
// ============================================

/**
 * Categoriza um produto usando múltiplos sinais:
 * título, marca, preço e specs.
 *
 * Retorna a categoria primária, até 3 secundárias, tags e metadados.
 */
export function categorize(
  title: string,
  brand?: string,
  price?: number,
  specs?: Record<string, unknown>,
): CategoryResult {
  const titleNorm = normalize(title)
  const brandNorm = brand ? normalize(brand) : ''

  // Score cada categoria
  const scored: Array<{ rule: CategoryRule; score: number }> = []

  for (const rule of CATEGORY_RULES) {
    let score = 0

    // 1. Keyword match no título (sinal primário)
    score += scoreKeywords(titleNorm, rule.keywords)

    // 2. Brand match
    score += scoreBrand(brandNorm, rule.brands)

    // 3. Também verifica brand no título (ex: "iPhone 15" sem brand separado)
    if (!brandNorm) {
      score += scoreBrand(titleNorm, rule.brands) * 0.5
    }

    // 4. Price range match
    if (price && price > 0) {
      score += scorePrice(price, rule.priceRange)
    }

    // 5. Spec keys match
    if (specs) {
      score += scoreSpecs(specs, rule.specKeys)
    }

    // 6. Exclusion penalty
    score += scoreExclusion(titleNorm, rule.exclusionKeywords)

    if (score > 0) {
      scored.push({ rule, score })
    }
  }

  // Ordena por score decrescente
  scored.sort((a, b) => b.score - a.score)

  // Fallback se nenhuma categoria detectada
  if (scored.length === 0) {
    return {
      primary: { slug: 'outros', label: 'Outros', confidence: 0 },
      secondary: [],
      tags: extractProductTags(title),
      priceSegment: 'unknown',
      targetAudience: 'geral',
    }
  }

  const primary: CategoryMatch = {
    slug: scored[0].rule.slug,
    label: scored[0].rule.label,
    confidence: Math.min(scored[0].score, 1.0),
  }

  // Secundárias: próximas 1-3 com score > 0.3
  const secondary: CategoryMatch[] = scored
    .slice(1, 4)
    .filter((s) => s.score > 0.3)
    .map((s) => ({
      slug: s.rule.slug,
      label: s.rule.label,
      confidence: Math.min(s.score, 1.0),
    }))

  const tags = extractProductTags(title)

  const priceSegment = price && price > 0
    ? inferPriceSegment(price, primary.slug)
    : 'unknown' as const

  const targetAudience = inferTargetAudience(title, primary.slug, tags)

  return {
    primary,
    secondary,
    tags,
    priceSegment,
    targetAudience,
  }
}

/**
 * Infere o segmento de preço com base no preço e na faixa
 * típica da categoria.
 *
 * - < 25th percentile: budget
 * - 25-75th: mid_range
 * - 75-90th: premium
 * - > 90th: luxury
 */
export function inferPriceSegment(
  price: number,
  categorySlug: string,
): 'budget' | 'mid_range' | 'premium' | 'luxury' | 'unknown' {
  const rule = CATEGORY_RULES.find((r) => r.slug === categorySlug)
  if (!rule) return 'unknown'

  const { min, max } = rule.priceRange
  const range = max - min

  const p25 = min + range * 0.25
  const p75 = min + range * 0.75
  const p90 = min + range * 0.90

  if (price < p25) return 'budget'
  if (price <= p75) return 'mid_range'
  if (price <= p90) return 'premium'
  return 'luxury'
}

/**
 * Infere o público-alvo do produto com base no título,
 * categoria e tags extraídas.
 */
export function inferTargetAudience(
  title: string,
  category: string,
  tags: string[],
): 'gamer' | 'profissional' | 'estudante' | 'familia' | 'geral' {
  const combined = normalize(title + ' ' + category + ' ' + tags.join(' '))

  // Verifica cada audiência por ordem de especificidade
  const audiences: Array<'gamer' | 'profissional' | 'estudante' | 'familia'> = [
    'gamer',
    'profissional',
    'estudante',
    'familia',
  ]

  for (const audience of audiences) {
    const patterns = AUDIENCE_KEYWORDS[audience]
    for (const pattern of patterns) {
      if (pattern.test(combined)) {
        return audience
      }
    }
  }

  // Categoria gamer implica público gamer
  if (category === 'gamer') return 'gamer'

  return 'geral'
}

/**
 * Extrai tags descritivas do título do produto.
 *
 * Tags representam características relevantes como
 * bluetooth, waterproof, portable, etc.
 */
export function extractProductTags(title: string): string[] {
  const tags: string[] = []

  for (const rule of TAG_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(title)) {
        tags.push(rule.tag)
        break // uma match por tag é suficiente
      }
    }
  }

  return tags
}

/**
 * Categoriza múltiplos produtos de uma vez.
 *
 * Retorna um Map de id → CategoryResult.
 * Ideal para batch processing em jobs de enriquecimento.
 */
export function batchCategorize(
  products: Array<{
    id: string
    title: string
    brand?: string
    price?: number
    specs?: Record<string, unknown>
  }>,
): Map<string, CategoryResult> {
  const results = new Map<string, CategoryResult>()

  for (const product of products) {
    results.set(
      product.id,
      categorize(product.title, product.brand, product.price, product.specs),
    )
  }

  return results
}

/**
 * Retorna a lista completa de categorias disponíveis.
 * Útil para popular dropdowns e filtros no admin.
 */
export function getAllCategories(): Array<{ slug: string; label: string }> {
  return CATEGORY_RULES.map((r) => ({ slug: r.slug, label: r.label }))
}

/**
 * Busca uma regra de categoria pelo slug.
 * Retorna undefined se não encontrada.
 */
export function getCategoryRule(slug: string): CategoryRule | undefined {
  return CATEGORY_RULES.find((r) => r.slug === slug)
}
