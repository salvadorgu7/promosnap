// ============================================
// SMART CTA — deterministic urgency-based CTAs
// ============================================

export interface SmartCTAOpts {
  discount?: number;
  isLowestPrice?: boolean;
  isFreeShipping?: boolean;
  offerScore?: number;
  context?: "card" | "product" | "comparison";
}

export interface SmartCTAResult {
  text: string;
  subtext?: string;
  urgency: "high" | "medium" | "low";
  variant: string;
}

// Simple deterministic hash from two numbers
function pickIndex(a: number, b: number, len: number): number {
  const hash = ((a * 31 + b * 17) >>> 0) % len;
  return hash;
}

const HIGH_TEXTS = [
  "Menor preco! Compre agora",
  "Oferta imperdivel — garanta ja",
  "Preco historico! Aproveite",
  "Super desconto — corra!",
  "Melhor preco do momento",
];

const HIGH_SUBTEXTS_DISCOUNT = [
  (d: number) => `Desconto real de ${d}%! Aproveite`,
  (d: number) => `${d}% OFF — pode acabar a qualquer momento`,
  (d: number) => `Economize ${d}% agora`,
];

const HIGH_SUBTEXTS_LOWEST = [
  "Menor preco entre todas as lojas",
  "Ninguem vende mais barato",
  "Preco mais baixo encontrado",
];

const HIGH_SUBTEXTS_SHIPPING = [
  "Frete gratis incluso!",
  "Entrega gratis — aproveite",
];

const MEDIUM_TEXTS = [
  "Boa oferta — vale conferir",
  "Preco competitivo",
  "Oferta interessante",
  "Vale a pena conferir",
  "Bom momento para comprar",
];

const MEDIUM_SUBTEXTS = [
  (d: number) => d > 0 ? `${d}% de desconto` : undefined,
  () => "Compare precos antes de decidir",
  () => "Oferta verificada",
];

const LOW_TEXTS = [
  "Ver oferta",
  "Conferir preco",
  "Ir para a loja",
  "Ver detalhes",
  "Comparar preco",
];

export function getSmartCTA(opts: SmartCTAOpts): SmartCTAResult {
  const {
    discount = 0,
    isLowestPrice = false,
    isFreeShipping = false,
    offerScore = 0,
  } = opts;

  const idx = pickIndex(discount, Math.round(offerScore), 100);

  // HIGH urgency
  if (offerScore >= 80 || discount >= 40 || isLowestPrice) {
    const text = HIGH_TEXTS[idx % HIGH_TEXTS.length];

    let subtext: string | undefined;
    if (discount >= 40) {
      const fn = HIGH_SUBTEXTS_DISCOUNT[idx % HIGH_SUBTEXTS_DISCOUNT.length];
      subtext = fn(discount);
    } else if (isLowestPrice) {
      subtext = HIGH_SUBTEXTS_LOWEST[idx % HIGH_SUBTEXTS_LOWEST.length];
    } else if (isFreeShipping) {
      subtext = HIGH_SUBTEXTS_SHIPPING[idx % HIGH_SUBTEXTS_SHIPPING.length];
    }

    return { text, subtext, urgency: "high", variant: "high" };
  }

  // MEDIUM urgency
  if (offerScore >= 50 || discount >= 20) {
    const text = MEDIUM_TEXTS[idx % MEDIUM_TEXTS.length];
    const fn = MEDIUM_SUBTEXTS[idx % MEDIUM_SUBTEXTS.length];
    const subtext = fn(discount);

    return { text, subtext, urgency: "medium", variant: "medium" };
  }

  // LOW urgency
  const text = LOW_TEXTS[idx % LOW_TEXTS.length];
  return { text, urgency: "low", variant: "low" };
}
