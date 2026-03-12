// ============================================
// CATALOG VALIDATION — ingest quality gates
// ============================================

// ============================================
// Title validation
// ============================================

const GARBAGE_PATTERNS = [
  /^[^a-zA-Z0-9]+$/,         // only symbols
  /^(.)\1{4,}$/,             // repeated single char
  /^(test|asdf|xxx|null|undefined|n\/a)$/i,
  /^\d+$/,                   // only digits
  /^[.\-_\s]+$/,             // only dots/dashes/underscores/spaces
];

export function validateTitle(title: unknown): {
  valid: boolean;
  issue?: string;
} {
  if (typeof title !== "string" || !title.trim()) {
    return { valid: false, issue: "Titulo vazio ou invalido" };
  }

  const trimmed = title.trim();

  if (trimmed.length < 5) {
    return { valid: false, issue: `Titulo muito curto (${trimmed.length} chars, minimo 5)` };
  }

  if (trimmed.length > 500) {
    return { valid: false, issue: "Titulo muito longo (max 500 chars)" };
  }

  for (const pattern of GARBAGE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, issue: "Titulo parece ser lixo/placeholder" };
    }
  }

  return { valid: true };
}

// ============================================
// Image URL validation
// ============================================

export function validateImage(url: unknown): {
  valid: boolean;
  issue?: string;
} {
  if (url === null || url === undefined || url === "") {
    return { valid: true }; // null/empty is acceptable (optional)
  }

  if (typeof url !== "string") {
    return { valid: false, issue: "URL da imagem deve ser string ou null" };
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, issue: "URL da imagem deve usar http ou https" };
    }
    return { valid: true };
  } catch {
    return { valid: false, issue: "URL da imagem invalida" };
  }
}

// ============================================
// Affiliate URL validation
// ============================================

export function validateAffiliateUrl(url: unknown): {
  valid: boolean;
  issue?: string;
} {
  if (typeof url !== "string" || !url.trim()) {
    return { valid: false, issue: "URL de afiliado vazia ou invalida" };
  }

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return { valid: false, issue: "URL de afiliado deve usar http ou https" };
    }
    return { valid: true };
  } catch {
    return { valid: false, issue: "URL de afiliado invalida" };
  }
}

// ============================================
// Price validation
// ============================================

export function validatePrice(
  current: unknown,
  original: unknown
): { valid: boolean; issue?: string } {
  if (typeof current !== "number" || isNaN(current)) {
    return { valid: false, issue: "Preco atual deve ser um numero" };
  }

  if (current <= 0) {
    return { valid: false, issue: "Preco atual deve ser maior que 0" };
  }

  if (current > 1_000_000) {
    return { valid: false, issue: "Preco atual parece excessivo (> 1M)" };
  }

  if (original !== null && original !== undefined) {
    if (typeof original !== "number" || isNaN(original)) {
      return { valid: false, issue: "Preco original deve ser numero ou null" };
    }
    if (original < current) {
      return {
        valid: false,
        issue: `Preco original (${original}) menor que atual (${current})`,
      };
    }
  }

  return { valid: true };
}

// ============================================
// Full product validation
// ============================================

interface ProductData {
  title: unknown;
  imageUrl: unknown;
  affiliateUrl: unknown;
  currentPrice: unknown;
  originalPrice: unknown;
}

export interface ProductValidationResult {
  valid: boolean;
  issues: string[];
  quality: "high" | "medium" | "low";
}

export function validateProduct(data: ProductData): ProductValidationResult {
  const issues: string[] = [];

  const titleResult = validateTitle(data.title);
  if (!titleResult.valid && titleResult.issue) {
    issues.push(titleResult.issue);
  }

  const imageResult = validateImage(data.imageUrl);
  if (!imageResult.valid && imageResult.issue) {
    issues.push(imageResult.issue);
  }

  const affiliateResult = validateAffiliateUrl(data.affiliateUrl);
  if (!affiliateResult.valid && affiliateResult.issue) {
    issues.push(affiliateResult.issue);
  }

  const priceResult = validatePrice(data.currentPrice, data.originalPrice);
  if (!priceResult.valid && priceResult.issue) {
    issues.push(priceResult.issue);
  }

  // Determine quality level
  const hasImage =
    data.imageUrl !== null &&
    data.imageUrl !== undefined &&
    data.imageUrl !== "";
  const hasValidTitle = titleResult.valid;
  const hasValidPrice = priceResult.valid;
  const hasValidAffiliate = affiliateResult.valid;

  let quality: "high" | "medium" | "low";

  if (hasValidTitle && hasValidPrice && hasValidAffiliate && hasImage) {
    quality = "high";
  } else if (hasValidTitle && hasValidPrice) {
    quality = "medium";
  } else {
    quality = "low";
  }

  return {
    valid: issues.length === 0,
    issues,
    quality,
  };
}
