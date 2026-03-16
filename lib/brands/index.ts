// ============================================================================
// Shared Brand Constants — single source of truth for brand detection
// ============================================================================

/**
 * Canonical brand names with proper casing.
 * Key = lowercase, Value = display name.
 * Used everywhere: import pipeline, enrichment, query engine, catalog normalization.
 */
export const BRAND_CANONICAL: Record<string, string> = {
  // Smartphones & Mobile
  apple: 'Apple', samsung: 'Samsung', xiaomi: 'Xiaomi', motorola: 'Motorola',
  lg: 'LG', sony: 'Sony', huawei: 'Huawei', oppo: 'OPPO', realme: 'Realme',
  oneplus: 'OnePlus', tecno: 'Tecno', infinix: 'Infinix', nokia: 'Nokia',
  nothing: 'Nothing', google: 'Google', poco: 'POCO', redmi: 'Redmi',

  // Audio
  jbl: 'JBL', bose: 'Bose', sennheiser: 'Sennheiser', akg: 'AKG',
  edifier: 'Edifier', marshall: 'Marshall', qcy: 'QCY', baseus: 'Baseus',

  // Computing
  dell: 'Dell', lenovo: 'Lenovo', asus: 'ASUS', hp: 'HP', acer: 'Acer',
  msi: 'MSI', gigabyte: 'Gigabyte',

  // Peripherals & Gaming
  logitech: 'Logitech', corsair: 'Corsair', razer: 'Razer', hyperx: 'HyperX',
  steelseries: 'SteelSeries', redragon: 'Redragon', microsoft: 'Microsoft',
  nintendo: 'Nintendo', playstation: 'PlayStation', xbox: 'Xbox',
  'cooler master': 'Cooler Master',

  // Storage
  kingston: 'Kingston', crucial: 'Crucial', wd: 'WD', seagate: 'Seagate',
  sandisk: 'SanDisk',

  // Cameras & Drones
  canon: 'Canon', nikon: 'Nikon', gopro: 'GoPro', dji: 'DJI',
  garmin: 'Garmin', fitbit: 'Fitbit',

  // TV & Display
  philips: 'Philips', panasonic: 'Panasonic', tcl: 'TCL', aoc: 'AOC',
  hisense: 'Hisense', roku: 'Roku',

  // Printers
  epson: 'Epson', brother: 'Brother',

  // Smart Home
  amazon: 'Amazon', anker: 'Anker', 'tp-link': 'TP-Link',

  // Brazilian Home Appliances
  electrolux: 'Electrolux', brastemp: 'Brastemp', consul: 'Consul',
  mondial: 'Mondial', britania: 'Britania', cadence: 'Cadence',
  philco: 'Philco', arno: 'Arno', oster: 'Oster', walita: 'Walita',
  mallory: 'Mallory', tramontina: 'Tramontina', fischer: 'Fischer',
  wap: 'WAP', intelbras: 'Intelbras', positivo: 'Positivo',
  multilaser: 'Multilaser', polishop: 'Polishop',

  // Kitchen
  kitchenaid: 'KitchenAid', nespresso: 'Nespresso', 'dolce gusto': 'Dolce Gusto',

  // Tools
  makita: 'Makita', bosch: 'Bosch', dewalt: 'DeWalt',
  'black+decker': 'Black+Decker',

  // Sports & Fashion
  nike: 'Nike', adidas: 'Adidas', puma: 'Puma', asics: 'Asics',
  'new balance': 'New Balance', fila: 'Fila', havaianas: 'Havaianas',
  olympikus: 'Olympikus',

  // Beauty
  natura: 'Natura', boticario: "O Boticario", avon: 'Avon',

  // Toys
  mattel: 'Mattel', hasbro: 'Hasbro', lego: 'LEGO',

  // Other
  kindle: 'Kindle', echo: 'Echo', wacom: 'Wacom', evga: 'EVGA',
}

/** Flat lowercase list for fast lookups */
export const KNOWN_BRANDS: string[] = Object.keys(BRAND_CANONICAL)

/**
 * Typo corrections & product-line aliases → canonical brand.
 * Key = misspelling/alias (lowercase), Value = canonical brand name.
 */
export const BRAND_ALIASES: Record<string, string> = {
  // Samsung typos
  samung: 'Samsung', samsumg: 'Samsung', sansung: 'Samsung', samsnug: 'Samsung',
  samsug: 'Samsung', samsugg: 'Samsung',

  // Apple product lines → Apple
  iphone: 'Apple', ipad: 'Apple', macbook: 'Apple', airpods: 'Apple',
  imac: 'Apple', 'apple watch': 'Apple',
  aple: 'Apple', appel: 'Apple', applle: 'Apple',

  // Samsung product lines
  galaxy: 'Samsung',

  // Amazon product lines
  'echo dot': 'Amazon', 'fire tv': 'Amazon', alexa: 'Amazon',

  // Xiaomi sub-brands
  xiomi: 'Xiaomi', xaomi: 'Xiaomi', xiaome: 'Xiaomi', xaiomi: 'Xiaomi',

  // Motorola
  moto: 'Motorola', motorolla: 'Motorola', 'motorola moto': 'Motorola',

  // HP
  'hewlett packard': 'HP', 'hewlett-packard': 'HP',

  // LG
  'lg electronics': 'LG',

  // Black+Decker variations
  'black decker': 'Black+Decker', 'black & decker': 'Black+Decker',
  'black&decker': 'Black+Decker', blackdecker: 'Black+Decker', 'b+d': 'Black+Decker',

  // TP-Link
  'tp link': 'TP-Link', tplink: 'TP-Link',

  // Dolce Gusto
  dolcegusto: 'Dolce Gusto',

  // PlayStation
  ps5: 'PlayStation', ps4: 'PlayStation',

  // Misc typos
  soni: 'Sony', phillips: 'Philips', philps: 'Philips',
  lennovo: 'Lenovo', lenoo: 'Lenovo',
  logitec: 'Logitech', logitek: 'Logitech',
  corseir: 'Corsair', microsft: 'Microsoft', microsof: 'Microsoft',
  nintedo: 'Nintendo', nientendo: 'Nintendo',
  jibiel: 'JBL', boss: 'Bose',
  hauwei: 'Huawei', huaway: 'Huawei', hauway: 'Huawei',
  relme: 'Realme', aifone: 'Apple', aifon: 'Apple', ifone: 'Apple',
  'jbl harman': 'JBL', coolermaster: 'Cooler Master',
  'western digital': 'WD',
}

/**
 * Special casing for terms that should keep their original case in titles.
 * Used by title normalization only.
 */
export const BRAND_CASING: Record<string, string> = {
  iphone: 'iPhone', ipad: 'iPad', macbook: 'MacBook', airpods: 'AirPods',
  playstation: 'PlayStation', xbox: 'Xbox', jbl: 'JBL', lg: 'LG', hp: 'HP',
  ssd: 'SSD', led: 'LED', '4k': '4K', hd: 'HD', usb: 'USB', hdmi: 'HDMI',
  oled: 'OLED', qled: 'QLED', aoc: 'AOC', msi: 'MSI', dji: 'DJI',
  qcy: 'QCY', wap: 'WAP', evga: 'EVGA', oppo: 'OPPO', poco: 'POCO',
}

// ── Detection Functions ─────────────────────────────────────────────────

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Detect brand from a product title.
 * Returns the canonical brand name or null.
 *
 * Strategy:
 * 1. Check aliases first (catches typos & product lines like "iPhone" → Apple)
 * 2. Check known brands with word boundary matching
 */
export function detectBrand(title: string): string | null {
  const lower = title.toLowerCase()

  // 1. Alias check (substring match — handles multi-word aliases)
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    if (lower.includes(alias)) {
      return canonical
    }
  }

  // 2. Known brands with word boundary
  for (const brand of KNOWN_BRANDS) {
    const pattern = new RegExp(`\\b${escapeRegex(brand)}\\b`, 'i')
    if (pattern.test(title)) {
      return BRAND_CANONICAL[brand] || brand
    }
  }

  return null
}

/**
 * Normalize a brand string to its canonical form.
 * Handles typos, aliases, and casing.
 */
export function normalizeBrand(brand: string): string {
  const lower = brand.toLowerCase().trim()

  // Check aliases
  const aliasMatch = BRAND_ALIASES[lower]
  if (aliasMatch) return aliasMatch

  // Check canonical
  const canonical = BRAND_CANONICAL[lower]
  if (canonical) return canonical

  // Substring search in aliases
  for (const [alias, canonical] of Object.entries(BRAND_ALIASES)) {
    if (lower.includes(alias)) return canonical
  }

  // Return with first letter capitalized
  return brand.charAt(0).toUpperCase() + brand.slice(1)
}

/**
 * Get canonical display name for a brand.
 * Returns proper casing or original if unknown.
 */
export function brandDisplayName(brand: string): string {
  const lower = brand.toLowerCase().trim()
  return BRAND_CANONICAL[lower] || normalizeBrand(brand)
}
