import type { ImportCandidate, EnrichmentData } from "./types";

// ─── Pipeline Sub-Status ─────────────────────────────────────────────────────

/**
 * Sub-status tracked in enrichedData.subStatus field.
 * The DB enum has PENDING/APPROVED/REJECTED/IMPORTED but we track
 * a richer pipeline within the enrichedData JSON:
 *   PENDING → ENRICHED → NEEDS_REVIEW → APPROVED → PUBLISHED
 *   (or REJECTED at any stage)
 */
export type CandidateSubStatus =
  | "PENDING"
  | "ENRICHED"
  | "NEEDS_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

/** Determine the sub-status based on enrichment results */
export function determineSubStatus(
  enrichment: EnrichmentData,
  currentDbStatus: string,
): CandidateSubStatus {
  if (currentDbStatus === "REJECTED") return "REJECTED";
  if (currentDbStatus === "IMPORTED") return "PUBLISHED";

  // Low trust score → needs manual review
  if (enrichment.trustScore < 50) return "NEEDS_REVIEW";

  // Missing critical data → needs review
  if (!enrichment.detectedBrand && !enrichment.inferredCategory) return "NEEDS_REVIEW";
  if (!enrichment.imageValid && !enrichment.affiliateValid) return "NEEDS_REVIEW";

  // Good enrichment → auto-enriched, ready for approval
  return "ENRICHED";
}

// ─── Brand Detection ─────────────────────────────────────────────────────────

/** Well-known brands for detection from title */
const KNOWN_BRANDS = [
  "Samsung", "Apple", "Xiaomi", "Motorola", "LG", "Sony", "Philips", "JBL",
  "Lenovo", "Dell", "HP", "Asus", "Acer", "MSI", "Razer", "Logitech",
  "Nike", "Adidas", "Havaianas", "Brastemp", "Electrolux", "Consul",
  "Philco", "Intelbras", "TP-Link", "Positivo", "Multilaser", "Mondial",
  "Britania", "Cadence", "Tramontina", "Arno", "Black+Decker", "Bosch",
  "Makita", "DeWalt", "Whirlpool", "Panasonic", "TCL", "AOC", "Epson",
  "Canon", "Nikon", "GoPro", "DJI", "Anker", "Baseus", "Redmi",
  "OnePlus", "Realme", "POCO", "Google", "Amazon", "Kindle", "Echo",
  "Nintendo", "PlayStation", "Xbox", "Corsair", "HyperX", "SteelSeries",
  "Redragon", "Edifier", "Marshall", "Bose", "Sennheiser", "AKG",
  "KitchenAid", "Oster", "Nespresso", "Dolce Gusto", "Wap", "Karcher",
];

/** Common brand abbreviations/variations → canonical name */
const BRAND_ALIASES: Record<string, string> = {
  "samung": "Samsung",
  "samsumg": "Samsung",
  "sansung": "Samsung",
  "lg electronics": "LG",
  "hewlett packard": "HP",
  "hewlett-packard": "HP",
  "black decker": "Black+Decker",
  "black & decker": "Black+Decker",
  "black&decker": "Black+Decker",
  "b+d": "Black+Decker",
  "tp link": "TP-Link",
  "tplink": "TP-Link",
  "dolce gusto": "Dolce Gusto",
  "dolcegusto": "Dolce Gusto",
  "jbl harman": "JBL",
  "motorola moto": "Motorola",
  "steelseries": "SteelSeries",
  "hyperx": "HyperX",
  "gopro": "GoPro",
  "kitchenaid": "KitchenAid",
  "playstation": "PlayStation",
  "ps5": "PlayStation",
  "ps4": "PlayStation",
  "iphone": "Apple",
  "ipad": "Apple",
  "macbook": "Apple",
  "airpods": "Apple",
  "imac": "Apple",
  "apple watch": "Apple",
  "galaxy": "Samsung",
  "echo dot": "Amazon",
  "fire tv": "Amazon",
  "alexa": "Amazon",
};

/**
 * Detect brand name from product title using known brand list.
 * Handles case variations and common abbreviations.
 */
function detectBrand(title: string): string | undefined {
  const titleLower = title.toLowerCase();

  // First check aliases (case-insensitive substring)
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    if (titleLower.includes(alias)) {
      return canonical;
    }
  }

  // Then check known brands with word boundary matching
  for (const brand of KNOWN_BRANDS) {
    const pattern = new RegExp(`\\b${escapeRegex(brand)}\\b`, "i");
    if (pattern.test(title)) {
      return brand;
    }
  }

  return undefined;
}

/**
 * Normalize a brand string to its canonical form.
 * Handles case variations, common misspellings, and abbreviations.
 */
export function normalizeBrand(brand: string): string {
  const lower = brand.toLowerCase().trim();

  // Check aliases
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    if (lower === alias || lower.includes(alias)) {
      return canonical;
    }
  }

  // Check known brands (case-insensitive exact match)
  for (const known of KNOWN_BRANDS) {
    if (lower === known.toLowerCase()) {
      return known;
    }
  }

  // Return with first letter capitalized
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Category Inference ──────────────────────────────────────────────────────

/** Category keywords mapped to category slugs (expanded for better coverage) */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "smartphones": [
    "smartphone", "celular", "iphone", "galaxy", "redmi", "poco", "motorola moto",
    "moto g", "moto e", "galaxy a", "galaxy s", "pixel", "oneplus", "realme",
  ],
  "notebooks": [
    "notebook", "laptop", "macbook", "chromebook", "ultrabook",
    "ideapad", "thinkpad", "inspiron", "vostro", "pavilion", "vivobook", "zenbook",
  ],
  "tablets": ["tablet", "ipad", "tab s", "galaxy tab", "fire hd"],
  "fones-de-ouvido": [
    "fone", "headset", "headphone", "earbuds", "airpods", "earphone",
    "intra-auricular", "over-ear", "bluetooth fone", "tws",
  ],
  "tvs": [
    "tv", "televisor", "smart tv", "televisao", "monitor",
    "oled", "qled", "led tv", "4k tv", "8k tv",
  ],
  "eletrodomesticos": [
    "geladeira", "fogao", "microondas", "maquina de lavar", "lava-loucas",
    "aspirador", "refrigerador", "freezer", "lava e seca", "secadora",
    "purificador", "climatizador", "ventilador", "ar condicionado", "split",
    "fritadeira", "air fryer", "airfryer", "cafeteira", "liquidificador",
    "batedeira", "torradeira", "forno eletrico", "panela eletrica",
    "ferro de passar", "robo aspirador",
  ],
  "informatica": [
    "mouse", "teclado", "webcam", "ssd", "hd externo", "pen drive",
    "impressora", "roteador", "placa de video", "processador", "memoria ram",
    "fonte pc", "gabinete", "cooler", "headset gamer", "mousepad",
    "hub usb", "adaptador", "cabo hdmi", "no-break",
  ],
  "games": [
    "playstation", "xbox", "nintendo", "console", "controle gamer", "joystick",
    "ps5", "ps4", "switch", "series x", "series s", "jogo ps", "jogo xbox",
    "jogo switch", "gamepad", "volante gamer",
  ],
  "caixas-de-som": [
    "caixa de som", "soundbar", "speaker", "alto-falante",
    "bluetooth speaker", "caixinha", "subwoofer", "home theater",
  ],
  "cameras": [
    "camera", "filmadora", "gopro", "drone", "webcam",
    "mirrorless", "dslr", "action cam", "camera de seguranca", "ring",
  ],
  "relogios": [
    "relogio", "smartwatch", "smartband", "pulseira inteligente",
    "apple watch", "galaxy watch", "amazfit", "garmin", "mi band",
  ],
  "beleza": [
    "perfume", "maquiagem", "shampoo", "hidratante", "protetor solar",
    "secador", "chapinha", "babyliss", "depilador", "barbeador",
    "creme", "serum", "mascara facial", "esmalte", "batom",
  ],
  "esporte": [
    "tenis", "bicicleta", "esteira", "haltere", "yoga",
    "eliptico", "ergometrica", "whey", "suplemento", "colchonete",
    "luva boxe", "corda pular", "mochila esportiva",
  ],
  "casa": [
    "sofa", "colchao", "travesseiro", "mesa", "cadeira", "luminaria",
    "estante", "rack", "painel tv", "tapete", "cortina", "persiana",
    "edredom", "jogo de cama", "toalha",
  ],
  "ferramentas": [
    "furadeira", "parafusadeira", "serra", "lixadeira", "compressor",
    "chave de impacto", "multimetro", "soprador", "roçadeira", "motosserra",
    "nivel laser", "trena", "alicate", "martelo",
  ],
  "livros": ["livro", "ebook", "kindle", "box livro", "coleção livro"],
  "brinquedos": ["brinquedo", "lego", "boneca", "carrinho", "jogo de tabuleiro", "puzzle"],
  "pet": ["racao", "pet", "gato", "cachorro", "aquario", "comedouro"],
};

/**
 * Infer category slug from product title using keyword matching.
 */
function inferCategory(title: string): string | undefined {
  const titleLower = title.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return category;
      }
    }
  }

  return undefined;
}

// ─── URL Validation ──────────────────────────────────────────────────────────

function isImageUrlValid(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return false;
    // Check for common image extensions or CDN patterns
    const path = parsed.pathname.toLowerCase();
    return (
      /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|$)/i.test(path) ||
      parsed.hostname.includes("cdn") ||
      parsed.hostname.includes("img") ||
      parsed.hostname.includes("image") ||
      parsed.hostname.includes("static") ||
      parsed.hostname.includes("media") ||
      // ML/Amazon image URLs don't always have extensions
      parsed.hostname.includes("mercadolivre") ||
      parsed.hostname.includes("mlstatic") ||
      parsed.hostname.includes("amazon") ||
      parsed.hostname.includes("cloudfront")
    );
  } catch {
    return false;
  }
}

function isAffiliateUrlValid(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// ─── Trust Score ─────────────────────────────────────────────────────────────

/**
 * Calculate initial trust score (0-100) for a candidate based on data completeness.
 */
function calculateTrustScore(candidate: ImportCandidate, imageValid: boolean, affiliateValid: boolean): number {
  let score = 0;

  // Title quality (0-25)
  if (candidate.title.length >= 10) score += 15;
  else if (candidate.title.length >= 5) score += 8;
  if (candidate.title.length >= 30) score += 10;

  // Has brand (0-15)
  if (candidate.brand) score += 15;

  // Has category (0-10)
  if (candidate.category) score += 10;

  // Has valid image (0-15)
  if (imageValid) score += 15;

  // Has valid affiliate URL (0-10)
  if (affiliateValid) score += 10;

  // Has price (0-15)
  if (candidate.price && candidate.price > 0) score += 10;
  if (candidate.originalPrice && candidate.originalPrice > candidate.price!) score += 5;

  // Has external ID (0-5)
  if (candidate.externalId) score += 5;

  // Has source (0-5)
  if (candidate.sourceSlug) score += 5;

  return Math.min(100, score);
}

// ─── Shipping Signal Detection ───────────────────────────────────────────────

/** Shipping signal keywords */
const SHIPPING_SIGNALS = {
  free: ["frete gratis", "frete gratuito", "entrega gratis", "entrega gratuita", "free shipping", "sem frete"],
  prime: ["prime", "full", "entrega rapida", "entrega expressa", "next day", "dia seguinte"],
  seller: ["vendido por", "seller", "lojista", "marketplace"],
};

/**
 * Detect shipping signals from title or metadata.
 */
function detectShippingSignals(title: string, metadata?: string): {
  hasFreeShipping: boolean;
  hasPrimeShipping: boolean;
  isMarketplace: boolean;
} {
  const text = `${title} ${metadata || ""}`.toLowerCase();

  return {
    hasFreeShipping: SHIPPING_SIGNALS.free.some((kw) => text.includes(kw)),
    hasPrimeShipping: SHIPPING_SIGNALS.prime.some((kw) => text.includes(kw)),
    isMarketplace: SHIPPING_SIGNALS.seller.some((kw) => text.includes(kw)),
  };
}

// ─── Main Enrichment Function ────────────────────────────────────────────────

/**
 * Enrich a candidate with auto-detected data.
 * Uses heuristics only — no external API calls, no fake AI.
 */
export function enrichCandidate(candidate: ImportCandidate): EnrichmentData {
  const notes: string[] = [];

  // Brand detection with normalization
  let detectedBrand = candidate.brand
    ? normalizeBrand(candidate.brand)
    : detectBrand(candidate.title);

  if (detectedBrand && !candidate.brand) {
    notes.push(`Marca detectada no titulo: ${detectedBrand}`);
  } else if (detectedBrand && candidate.brand && detectedBrand !== candidate.brand) {
    notes.push(`Marca normalizada: ${candidate.brand} → ${detectedBrand}`);
  }

  // Category inference
  const inferredCategory = candidate.category || inferCategory(candidate.title);
  if (inferredCategory && !candidate.category) {
    notes.push(`Categoria inferida: ${inferredCategory}`);
  }

  // URL validations
  const imageValid = isImageUrlValid(candidate.imageUrl);
  if (candidate.imageUrl && !imageValid) {
    notes.push("URL de imagem nao parece valida");
  }

  const affiliateValid = isAffiliateUrlValid(candidate.affiliateUrl);
  if (candidate.affiliateUrl && !affiliateValid) {
    notes.push("URL de afiliado nao parece valida");
  }

  // Shipping signal detection
  const shipping = detectShippingSignals(candidate.title);
  if (shipping.hasFreeShipping) notes.push("Sinal de frete gratis detectado");
  if (shipping.hasPrimeShipping) notes.push("Sinal de entrega rapida detectado");
  if (shipping.isMarketplace) notes.push("Produto de marketplace detectado");

  // Trust score
  const trustScore = calculateTrustScore(
    { ...candidate, brand: detectedBrand, category: inferredCategory },
    imageValid,
    affiliateValid,
  );

  if (trustScore < 30) {
    notes.push("Score de confianca baixo — dados incompletos");
  }

  return {
    detectedBrand: detectedBrand || undefined,
    inferredCategory: inferredCategory || undefined,
    imageValid,
    affiliateValid,
    trustScore,
    enrichmentNotes: notes,
    shippingSignals: shipping,
    subStatus: "ENRICHED",
  };
}
