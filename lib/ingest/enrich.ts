import type { ImportCandidate, EnrichmentData } from "./types";

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

/**
 * Detect brand name from product title using known brand list.
 * Returns the first match found (case-insensitive).
 */
function detectBrand(title: string): string | undefined {
  const titleLower = title.toLowerCase();

  for (const brand of KNOWN_BRANDS) {
    // Match whole word boundaries to avoid false positives
    const pattern = new RegExp(`\\b${escapeRegex(brand)}\\b`, "i");
    if (pattern.test(title)) {
      return brand;
    }
  }

  // Check if title starts with a capitalized word that could be a brand
  const firstWord = title.split(/\s+/)[0];
  if (firstWord && firstWord.length >= 3 && /^[A-Z]/.test(firstWord) && titleLower !== firstWord.toLowerCase()) {
    // Only suggest if it looks like a proper noun (starts uppercase)
    return undefined; // Don't guess — be honest
  }

  return undefined;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Category Inference ──────────────────────────────────────────────────────

/** Category keywords mapped to category slugs */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "smartphones": ["smartphone", "celular", "iphone", "galaxy", "redmi", "poco", "motorola moto"],
  "notebooks": ["notebook", "laptop", "macbook", "chromebook", "ultrabook"],
  "tablets": ["tablet", "ipad"],
  "fones-de-ouvido": ["fone", "headset", "headphone", "earbuds", "airpods", "earphone"],
  "tvs": ["tv", "televisor", "smart tv", "televisao", "monitor"],
  "eletrodomesticos": ["geladeira", "fogao", "microondas", "maquina de lavar", "lava-loucas", "aspirador", "refrigerador", "freezer"],
  "informatica": ["mouse", "teclado", "webcam", "ssd", "hd externo", "pen drive", "impressora", "roteador"],
  "games": ["playstation", "xbox", "nintendo", "console", "controle gamer", "joystick"],
  "caixas-de-som": ["caixa de som", "soundbar", "speaker", "alto-falante"],
  "cameras": ["camera", "filmadora", "gopro", "drone", "webcam"],
  "relogios": ["relogio", "smartwatch", "smartband", "pulseira inteligente"],
  "beleza": ["perfume", "maquiagem", "shampoo", "hidratante", "protetor solar"],
  "esporte": ["tenis", "bicicleta", "esteira", "haltere", "yoga"],
  "casa": ["sofa", "colchao", "travesseiro", "mesa", "cadeira", "luminaria"],
  "ferramentas": ["furadeira", "parafusadeira", "serra", "lixadeira", "compressor"],
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

// ─── Main Enrichment Function ────────────────────────────────────────────────

/**
 * Enrich a candidate with auto-detected data.
 * Uses heuristics only — no external API calls, no fake AI.
 */
export function enrichCandidate(candidate: ImportCandidate): EnrichmentData {
  const notes: string[] = [];

  // Brand detection
  const detectedBrand = candidate.brand || detectBrand(candidate.title);
  if (detectedBrand && !candidate.brand) {
    notes.push(`Marca detectada no titulo: ${detectedBrand}`);
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
  };
}
