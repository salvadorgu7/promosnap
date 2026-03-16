"use client";

import { useState } from "react";
import { Upload, Search, Loader2, CheckCircle, XCircle, AlertTriangle, Trash2, Info, TrendingUp, PenLine, Plus, X, Sparkles, ClipboardPaste, MessageCircle } from "lucide-react";

interface IngestResult {
  mode?: string;
  query?: string;
  keywords?: string[];
  fetched: number;
  created: number;
  updated: number;
  skipped?: number;
  failed: number;
  durationMs?: number;
  fetchErrors?: string[];
  searchErrors?: string[];
  invalidIds?: string[];
  errors?: string[];
  categories?: string[];
}

interface IngestError {
  error: string;
  hint?: string;
  errors?: string[];
  trends?: string[];
  configured?: boolean;
}

interface ManualItem {
  title: string;
  price: string;
  url: string;
  imageUrl: string;
  originalPrice: string;
}

function extractMlIds(input: string): string[] {
  const ids = new Set<string>();
  const lines = input.split(/[\n,\s]+/).filter(Boolean);

  for (const line of lines) {
    const trimmed = line.trim();
    const idMatch = trimmed.match(/ML[A-Z]-?\d{6,15}/i);
    if (idMatch) {
      ids.add(idMatch[0].replace("-", ""));
      continue;
    }
    const numMatch = trimmed.match(/^\d{6,15}$/);
    if (numMatch) {
      ids.add(`MLB${numMatch[0]}`);
    }
  }

  return Array.from(ids);
}

interface ParsedWhatsAppProduct {
  title: string;
  price: number;
  originalPrice?: number;
  url: string;
  coupon?: string;
  category?: string;
  brand?: string;
  confidence: number; // 0-100
  originalText: string;
  warnings: string[];
}

// ─── Category detection from title ──────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  celulares: ['celular', 'smartphone', 'iphone', 'galaxy s', 'moto g', 'redmi', 'poco', 'pixel'],
  notebooks: ['notebook', 'laptop', 'macbook', 'chromebook', 'ideapad', 'inspiron'],
  'tv-audio': ['fone', 'headset', 'caixa de som', 'soundbar', 'smart tv', 'tv 4k', 'jbl', 'airpods', 'earbuds', 'speaker', 'echo dot'],
  eletronicos: ['smartwatch', 'watch', 'kindle', 'tablet', 'ipad', 'fire tv', 'camera', 'gopro', 'drone'],
  casa: ['air fryer', 'fritadeira', 'cafeteira', 'aspirador', 'liquidificador', 'panela', 'microondas', 'ventilador', 'purificador'],
  gamer: ['playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'controle', 'headset gamer', 'mouse gamer', 'teclado gamer'],
  esportes: ['tenis', 'nike', 'adidas', 'mochila', 'garrafa', 'bicicleta', 'esteira', 'haltere', 'whey'],
  informatica: ['ssd', 'hd externo', 'pendrive', 'monitor', 'mouse', 'teclado', 'webcam', 'roteador', 'impressora'],
  beleza: ['perfume', 'maquiagem', 'protetor solar', 'shampoo', 'hidratante', 'secador', 'chapinha'],
};

const BRAND_PATTERNS = [
  'apple', 'samsung', 'xiaomi', 'motorola', 'lg', 'sony', 'jbl', 'philips', 'dell', 'lenovo',
  'asus', 'hp', 'acer', 'logitech', 'razer', 'corsair', 'nike', 'adidas', 'oster', 'philco',
  'mondial', 'electrolux', 'brastemp', 'consul', 'tramontina', 'positivo', 'multilaser',
  'intelbras', 'britania', 'midea', 'cadence', 'walita', 'arno', 'google', 'amazon', 'anker',
  'bose', 'sennheiser', 'hyperx', 'nintendo', 'microsoft', 'realme', 'infinix', 'stanley',
  'garmin', 'fitbit', 'gopro', 'canon', 'nikon', 'epson', 'brother', 'under armour', 'new balance',
];

function detectCategory(title: string): string | undefined {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) return cat;
  }
  return undefined;
}

function detectBrandFromTitle(title: string): string | undefined {
  const lower = title.toLowerCase();
  return BRAND_PATTERNS.find(b => lower.includes(b));
}

function parseWhatsAppText(text: string): ParsedWhatsAppProduct[] {
  const products: ParsedWhatsAppProduct[] = [];
  const seenUrls = new Set<string>();

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // Collect blocks with improved boundary detection
  const blocks: string[][] = [];
  let currentBlock: string[] = [];

  for (const line of lines) {
    // Skip noise lines
    if (/^\+55\s/.test(line)) continue;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(line)) continue; // date lines
    if (/^\d{1,2}:\d{2}$/.test(line)) {
      if (currentBlock.length > 0) { blocks.push(currentBlock); currentBlock = []; }
      continue;
    }
    if (/^(Adm|TEM |Hoje|Você|Encaminhada|Promos do dia|Mensagem apagada|Arquivo de midia|Figurinha omitida)/i.test(line)) {
      if (currentBlock.length > 0 && currentBlock.some(l => /https?:\/\//.test(l))) {
        blocks.push(currentBlock);
        currentBlock = [];
      }
      continue;
    }
    if (/^tempromo\.app\.br$/i.test(line)) continue;
    if (/^[-—=]{3,}$/.test(line)) continue; // separator lines
    if (/^(👆|👇|⬆|⬇|🔗|💰|🔥|⚡|🏷|📌|✅|❌)\s*$/.test(line)) continue; // emoji-only lines

    // New block if line contains URL and current block already has a URL
    if (/https?:\/\//.test(line) && currentBlock.some(l => /https?:\/\//.test(l))) {
      blocks.push(currentBlock);
      currentBlock = [];
    }

    currentBlock.push(line);
  }
  if (currentBlock.length > 0) blocks.push(currentBlock);

  for (const block of blocks) {
    const fullText = block.join('\n');
    const warnings: string[] = [];

    // Extract ALL URLs — prefer marketplace URLs over tracker/competitor links
    const allUrls = (fullText.match(/https?:\/\/[^\s\])<>]+/g) || []).map(u => u.replace(/[.,;:!?]+$/, ''));
    if (allUrls.length === 0) continue;

    // Blocked domains: competitor trackers that should never be used as product URLs
    const BLOCKED_DOMAINS = ['tempromo.app.br', 'tempromo.com.br', 'pelando.com.br', 'promobit.com.br', 'gatry.com', 'ctt.cx', 'bit.ly', 'cutt.ly', 'is.gd', 't.co'];
    // Marketplace domains: these are the real product URLs we want
    const MARKETPLACE_DOMAINS = ['mercadolivre.com.br', 'mercadolibre.com', 'amazon.com.br', 'shopee.com.br', 'magazineluiza.com.br', 'magalu.com', 'americanas.com.br', 'casasbahia.com.br', 'kabum.com.br', 'aliexpress.com'];

    const isBlockedUrl = (u: string) => { try { return BLOCKED_DOMAINS.some(d => new URL(u).hostname.includes(d)); } catch { return false; } };
    const isMarketplaceUrl = (u: string) => { try { return MARKETPLACE_DOMAINS.some(d => new URL(u).hostname.includes(d)); } catch { return false; } };
    const hasMLBId = (u: string) => /MLB-?\d+/.test(u);

    // Priority: 1) ML URL with MLB ID, 2) any marketplace URL, 3) URL with MLB ID anywhere, 4) first non-blocked URL
    const url =
      allUrls.find(u => isMarketplaceUrl(u) && hasMLBId(u)) ||
      allUrls.find(u => isMarketplaceUrl(u)) ||
      allUrls.find(u => hasMLBId(u)) ||
      allUrls.find(u => !isBlockedUrl(u)) ||
      allUrls[0];

    // Dedup by URL
    const urlKey = url.replace(/[?#].*$/, '').replace(/\/+$/, '');
    if (seenUrls.has(urlKey)) continue;
    seenUrls.add(urlKey);

    // Extract ALL prices — pick the lowest as current, highest as original
    const priceMatches = [...fullText.matchAll(/R\$\s*([\d.,]+)/g)];
    if (priceMatches.length === 0) { warnings.push('Sem preço detectado'); continue; }

    const prices = priceMatches
      .map(m => parseFloat(m[1].replace(/\./g, '').replace(',', '.')))
      .filter(p => !isNaN(p) && p > 0 && p < 500000)
      .sort((a, b) => a - b);

    if (prices.length === 0) continue;
    const price = prices[0];
    const originalPrice = prices.length > 1 ? prices[prices.length - 1] : undefined;

    // Title extraction with better heuristics
    let title = '';
    const titleCandidates = block.filter(l =>
      !l.startsWith('http') &&
      !/^R\$/.test(l) &&
      !/^(Use o? cupom|Compre aqui|Clique aqui|Link|Acesse|Aproveite|Garanta|Corra)/i.test(l) &&
      !/^(De R\$|Por R\$|Antes|Agora|Era|Preço)/i.test(l) &&
      !l.includes('tempromo.app.br') &&
      !/^[🔥⚡💰🏷📌✅🎯👆👇⬆⬇🔗]+\s*$/.test(l) &&
      l.length > 5
    );

    // Prefer " - Tem Promô" meta titles, then " | " separated titles
    const metaTitle = titleCandidates.find(l => /\s-\s(Tem Promô|Promoção|Oferta|Mercado Livre|Amazon|Shopee)/i.test(l));
    if (metaTitle) {
      title = metaTitle.replace(/\s[-|]\s(Tem Promô|Promoção|Oferta|Mercado Livre|Amazon|Shopee).*$/i, '').trim();
    } else if (titleCandidates.length > 0) {
      // Score candidates: prefer longer, with brand names, without excessive caps
      const scored = titleCandidates.map(l => {
        let s = l.length;
        if (BRAND_PATTERNS.some(b => l.toLowerCase().includes(b))) s += 20;
        if (/\d+(gb|tb|ml|kg|w|v|pol|")/i.test(l)) s += 15; // has specs
        if (l === l.toUpperCase() && l.length > 20) s -= 10; // all caps penalty
        return { line: l, score: s };
      }).sort((a, b) => b.score - a.score);
      title = scored[0].line;
    }

    if (!title || title.length < 3) { warnings.push('Título não detectado'); continue; }

    // Clean title
    title = title
      .replace(/\s*[-|]\s*(Tem Promô|Promoção).*$/i, '')
      .replace(/\s*\.\.\.$/, '')
      .replace(/^[🔥⚡💰🏷📌✅🎯]+\s*/, '') // leading emojis
      .replace(/\s{2,}/g, ' ')
      .trim();

    // Extract coupon — multiple patterns
    const couponPatterns = [
      /cupom[:\s]+([A-Z0-9_-]{3,30})/i,
      /c[oó]digo[:\s]+([A-Z0-9_-]{3,30})/i,
      /desconto[:\s]+([A-Z0-9_-]{3,30})/i,
      /use[:\s]+([A-Z0-9_-]{4,30})/i,
    ];
    let coupon: string | undefined;
    for (const pattern of couponPatterns) {
      const match = fullText.match(pattern);
      if (match) { coupon = match[1].toUpperCase(); break; }
    }

    // Detect category and brand
    const category = detectCategory(title);
    const brand = detectBrandFromTitle(title);

    // Compute confidence score (0-100)
    let confidence = 30; // base
    if (title.length > 15) confidence += 10;
    if (title.length > 30) confidence += 10;
    if (brand) confidence += 15;
    if (category) confidence += 10;
    if (url.includes('mercadolivre') || url.includes('amazon') || url.includes('shopee')) confidence += 10;
    if (originalPrice && originalPrice > price) confidence += 10;
    if (coupon) confidence += 5;
    confidence = Math.min(100, confidence);

    if (title.length < 10) warnings.push('Título curto');
    if (!brand) warnings.push('Marca não detectada');
    if (!category) warnings.push('Categoria não detectada');

    products.push({ title, price, originalPrice, url, coupon, category, brand, confidence, originalText: fullText.slice(0, 300), warnings });
  }

  return products;
}

const emptyManualItem = (): ManualItem => ({
  title: "", price: "", url: "", imageUrl: "", originalPrice: "",
});

export default function AdminIngestãoPage() {
  const [mode, setMode] = useState<"search" | "ids" | "trends" | "manual" | "seed" | "json" | "whatsapp">("seed");

  // ID mode state
  const [rawInput, setRawInput] = useState("");
  const [parsedIds, setParsedIds] = useState<string[]>([]);
  const [invalidLines, setInvalidLines] = useState<string[]>([]);
  const [isParsed, setIsParsed] = useState(false);

  // Search mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLimit, setSearchLimit] = useState(20);

  // Manual mode state
  const [manualItems, setManualItems] = useState<ManualItem[]>([emptyManualItem()]);

  // Trends mode state
  const [trendsLimit, setTrendsLimit] = useState(20);

  // JSON paste mode state
  const [jsonInput, setJsonInput] = useState("");
  const [jsonParsedCount, setJsonParsedCount] = useState<number | null>(null);
  const [jsonParseError, setJsonParseError] = useState<string | null>(null);

  // WhatsApp mode state
  const [whatsappInput, setWhatsappInput] = useState("");
  const [whatsappProducts, setWhatsappProducts] = useState<ParsedWhatsAppProduct[]>([]);
  const [whatsappSelected, setWhatsappSelected] = useState<Set<number>>(new Set());

  // Shared state
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<IngestError | null>(null);

  // Fix URLs state
  const [fixUrlsResult, setFixUrlsResult] = useState<{ badOffers: number; items?: Array<{ offerId: string; currentUrl: string; productName: string; issue?: string }> } | null>(null);
  const [fixUrlsRunning, setFixUrlsRunning] = useState(false);
  const [fixUrlsMessage, setFixUrlsMessage] = useState<string | null>(null);

  function handleParse() {
    const lines = rawInput.split(/[\n,]+/).map((l) => l.trim()).filter(Boolean);
    const ids: string[] = [];
    const invalid: string[] = [];

    for (const line of lines) {
      const extracted = extractMlIds(line);
      if (extracted.length > 0) {
        ids.push(...extracted);
      } else {
        invalid.push(line);
      }
    }

    setParsedIds([...new Set(ids)]);
    setInvalidLines(invalid);
    setIsParsed(true);
    setResult(null);
    setError(null);
  }

  async function handleIngestIds() {
    if (parsedIds.length === 0) return;
    setIsRunning(true); setResult(null); setError(null);

    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: parsedIds }),
      });
      const data = await res.json();
      res.ok ? setResult(data) : setError(data);
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleIngestSearch() {
    if (!searchQuery.trim()) return;
    setIsRunning(true); setResult(null); setError(null);

    try {
      const params = new URLSearchParams({ q: searchQuery.trim(), limit: String(searchLimit) });
      const res = await fetch(`/api/admin/ingest?${params}`);
      const data = await res.json();
      res.ok ? setResult(data) : setError(data);
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleIngestTrends() {
    setIsRunning(true); setResult(null); setError(null);

    try {
      const res = await fetch("/api/admin/ingest", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: trendsLimit }),
      });
      const data = await res.json();
      res.ok ? setResult(data) : setError(data);
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleIngestSeed() {
    setIsRunning(true); setResult(null); setError(null);

    try {
      const res = await fetch("/api/admin/ingest", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 20 }),
      });
      const data = await res.json();
      res.ok ? setResult(data) : setError(data);
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleIngestManual() {
    const validItems = manualItems.filter(
      (i) => i.title.trim() && i.price.trim() && i.url.trim()
    );
    if (validItems.length === 0) return;

    setIsRunning(true); setResult(null); setError(null);

    try {
      const res = await fetch("/api/admin/ingest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems.map((i) => ({
            title: i.title.trim(),
            price: parseFloat(i.price.replace(",", ".")),
            url: i.url.trim(),
            imageUrl: i.imageUrl.trim() || undefined,
            originalPrice: i.originalPrice ? parseFloat(i.originalPrice.replace(",", ".")) : undefined,
          })),
        }),
      });
      const data = await res.json();
      res.ok ? setResult(data) : setError(data);
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  function handleJsonValidate(input: string) {
    setJsonInput(input);
    setJsonParseError(null);
    setJsonParsedCount(null);
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const valid = arr.filter((i: any) => i.title && i.price && i.url);
      if (valid.length === 0) {
        setJsonParseError("Nenhum item valido encontrado. Cada item precisa de: title, price, url");
      } else {
        setJsonParsedCount(valid.length);
      }
    } catch {
      setJsonParseError("JSON invalido — verifique a formatacao");
    }
  }

  async function handleIngestJson() {
    if (!jsonInput.trim()) return;
    setIsRunning(true); setResult(null); setError(null);

    try {
      const parsed = JSON.parse(jsonInput);
      const arr = Array.isArray(parsed) ? parsed : [parsed];
      const validItems = arr.filter((i: any) => i.title && i.price && i.url);

      const res = await fetch("/api/admin/ingest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: validItems.map((i: any) => ({
            title: String(i.title).trim(),
            price: typeof i.price === "number" ? i.price : parseFloat(String(i.price).replace(",", ".")),
            url: String(i.url).trim(),
            imageUrl: i.imageUrl ? String(i.imageUrl).trim() : undefined,
            originalPrice: i.originalPrice ? (typeof i.originalPrice === "number" ? i.originalPrice : parseFloat(String(i.originalPrice).replace(",", "."))) : undefined,
          })),
        }),
      });
      const data = await res.json();
      res.ok ? setResult(data) : setError(data);
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  function handleWhatsappParse(input: string) {
    setWhatsappInput(input);
    if (!input.trim()) {
      setWhatsappProducts([]);
      setWhatsappSelected(new Set());
      return;
    }
    const parsed = parseWhatsAppText(input);
    setWhatsappProducts(parsed);
    // Select all by default
    setWhatsappSelected(new Set(parsed.map((_, i) => i)));
  }

  function toggleWhatsappItem(index: number) {
    setWhatsappSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }

  async function handleIngestWhatsapp() {
    const selected = whatsappProducts.filter((_, i) => whatsappSelected.has(i));
    if (selected.length === 0) return;

    setIsRunning(true); setResult(null); setError(null);
    try {
      const res = await fetch("/api/admin/ingest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map((p) => ({
            title: p.title,
            price: p.price,
            url: p.url,
            originalPrice: p.originalPrice || undefined,
            category: p.category || undefined,
          })),
        }),
      });
      const data = await res.json();
      res.ok ? setResult(data) : setError(data);
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  function handleClear() {
    setRawInput(""); setSearchQuery("");
    setParsedIds([]); setInvalidLines([]);
    setIsParsed(false); setResult(null); setError(null);
    setManualItems([emptyManualItem()]);
    setJsonInput(""); setJsonParsedCount(null); setJsonParseError(null);
    setWhatsappInput(""); setWhatsappProducts([]); setWhatsappSelected(new Set());
  }

  function updateManualItem(index: number, field: keyof ManualItem, value: string) {
    setManualItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addManualItem() {
    setManualItems((prev) => [...prev, emptyManualItem()]);
  }

  function removeManualItem(index: number) {
    setManualItems((prev) => prev.filter((_, i) => i !== index));
  }

  const validManualCount = manualItems.filter(
    (i) => i.title.trim() && i.price.trim() && i.url.trim()
  ).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Ingestão Manual</h1>
        <p className="text-sm text-text-muted">Importe produtos do Mercado Livre por busca, IDs, tendências ou entrada manual</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit flex-wrap">
        {([
          { key: "seed", icon: Sparkles, label: "Seed \u2728" },
          { key: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
          { key: "json", icon: ClipboardPaste, label: "Cola JSON" },
          { key: "manual", icon: PenLine, label: "Manual" },
          { key: "search", icon: Search, label: "Busca" },
          { key: "trends", icon: TrendingUp, label: "Tendências" },
          { key: "ids", icon: Upload, label: "Por IDs" },
        ] as const).map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => { setMode(key); setResult(null); setError(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === key
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            <Icon className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            {label}
          </button>
        ))}
      </div>

      {/* API warning banner — shown on modes that depend on ML API */}
      {(mode === "search" || mode === "trends" || mode === "ids") && (
        <div className="card p-4 border-amber-200 bg-amber-50 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">API do ML bloqueada</p>
              <p className="text-xs text-amber-700 mt-1">
                O Mercado Livre exige OAuth completo (login do usuario) para busca e consulta de produtos.
                Use a aba <strong>Seed</strong> para importar 20 produtos populares instantaneamente, ou a aba <strong>Manual</strong> para colar dados de produtos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH MODE */}
      {mode === "search" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              Buscar produtos no Mercado Livre
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleIngestSearch()}
                placeholder="Ex: iPhone 15, notebook gamer, tenis nike..."
                className="flex-1 px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
              />
              <select
                value={searchLimit}
                onChange={(e) => setSearchLimit(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary"
              >
                <option value={10}>10 itens</option>
                <option value={20}>20 itens</option>
                <option value={50}>50 itens</option>
              </select>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Busca na API do ML e importa os resultados automaticamente
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleIngestSearch}
              disabled={!searchQuery.trim() || isRunning}
              className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isRunning ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Buscando...</>
              ) : (
                <><Search className="h-4 w-4" /> Buscar e Importar</>
              )}
            </button>
            <button onClick={handleClear} className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 text-text-muted">
              <Trash2 className="h-4 w-4" /> Limpar
            </button>
          </div>
        </div>
      )}

      {/* TRENDS MODE */}
      {mode === "trends" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              <TrendingUp className="inline h-4 w-4 mr-1.5 -mt-0.5 text-accent-orange" />
              Importar Produtos em Tendencia
            </label>
            <p className="text-sm text-text-muted">
              Busca automaticamente os termos mais buscados no Mercado Livre e importa produtos populares.
            </p>
            <div className="flex gap-2 mt-3">
              <select
                value={trendsLimit}
                onChange={(e) => setTrendsLimit(Number(e.target.value))}
                className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary"
              >
                <option value={10}>10 produtos</option>
                <option value={20}>20 produtos</option>
                <option value={50}>50 produtos</option>
              </select>
            </div>
          </div>

          <div className="p-3 bg-amber-50 rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Usa a API <code className="bg-amber-100 px-1 rounded">/trends/MLB</code> (funciona sem OAuth) + scraping da página pública do ML para obter dados dos produtos.
            </p>
          </div>

          <button
            onClick={handleIngestTrends}
            disabled={isRunning}
            className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importando tendências...</>
            ) : (
              <><TrendingUp className="h-4 w-4" /> Importar Tendências</>
            )}
          </button>
        </div>
      )}

      {/* IDS MODE */}
      {mode === "ids" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-2">
              IDs ou URLs do Mercado Livre
            </label>
            <textarea
              value={rawInput}
              onChange={(e) => { setRawInput(e.target.value); setIsParsed(false); }}
              placeholder={"MLB1234567890\nhttps://produto.mercadolivre.com.br/MLB-1234567890\n1234567890"}
              className="w-full h-40 px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 font-mono resize-y"
            />
            <p className="text-xs text-text-muted mt-1">
              Aceita: IDs (MLB...), URLs do ML, ou numeros puros (um por linha ou separados por virgula)
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={handleParse} disabled={!rawInput.trim()} className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50">
              <Search className="h-4 w-4" /> Analisar IDs
            </button>
            <button onClick={handleClear} className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 text-text-muted">
              <Trash2 className="h-4 w-4" /> Limpar
            </button>
          </div>

          {isParsed && (
            <div className="space-y-4 pt-2 border-t border-surface-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold font-display text-accent-green">{parsedIds.length}</p>
                  <p className="text-xs text-text-muted">IDs validos</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold font-display text-red-500">{invalidLines.length}</p>
                  <p className="text-xs text-text-muted">Invalidos</p>
                </div>
              </div>

              {parsedIds.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted font-medium mb-1">IDs a ingerir:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedIds.map((id) => (
                      <span key={id} className="inline-block px-2 py-0.5 rounded bg-surface-100 text-xs font-mono text-text-secondary">{id}</span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleIngestIds}
                disabled={parsedIds.length === 0 || isRunning}
                className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {isRunning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Ingerindo...</>
                ) : (
                  <><Upload className="h-4 w-4" /> Ingerir {parsedIds.length} {parsedIds.length === 1 ? "item" : "itens"}</>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* SEED MODE */}
      {mode === "seed" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              <Sparkles className="inline h-4 w-4 mr-1.5 -mt-0.5 text-accent-orange" />
              Importar Produtos Populares (Seed)
            </label>
            <p className="text-sm text-text-muted">
              Importa 20 produtos reais e populares do Mercado Livre instantaneamente.
              Inclui smartphones, smartwatches, tablets, air fryers e PlayStation.
            </p>
          </div>

          <div className="p-3 bg-green-50 rounded-lg flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-accent-green mt-0.5 flex-shrink-0" />
            <p className="text-xs text-green-700">
              <strong>Funciona sempre!</strong> Usa dados pré-carregados — não depende da API do ML nem de scraping.
              Ideal para popular o site rapidamente.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["smartphone", "smartwatch", "tablet", "airfryer", "playstation"].map((cat) => (
              <span key={cat} className="inline-flex items-center justify-center px-3 py-1.5 rounded-full bg-accent-orange/10 text-xs font-medium text-accent-orange">
                {cat}
              </span>
            ))}
          </div>

          <button
            onClick={handleIngestSeed}
            disabled={isRunning}
            className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50 bg-accent-orange hover:bg-accent-orange/90"
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importando seed...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Importar 20 Produtos Populares</>
            )}
          </button>
        </div>
      )}

      {/* WHATSAPP MODE */}
      {mode === "whatsapp" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              <MessageCircle className="inline h-4 w-4 mr-1.5 -mt-0.5 text-green-500" />
              Importar do WhatsApp
            </label>
            <p className="text-xs text-text-muted">
              Cole o texto copiado de um grupo de promos do WhatsApp. O parser extrai título, preço e link automaticamente.
            </p>
          </div>

          <div className="p-3 bg-green-50 rounded-lg flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-green-700">
              <strong>Funciona com qualquer grupo de promos!</strong> Basta copiar as mensagens e colar aqui.
              Suporta formatos como &quot;Tem Promo&quot;, links do ML, Amazon, etc.
            </p>
          </div>

          <textarea
            value={whatsappInput}
            onChange={(e) => handleWhatsappParse(e.target.value)}
            placeholder={"Cole aqui o texto do WhatsApp...\n\nExemplo:\nCamiseta Nike Sportswear - Tem Promô\nR$ 69,34\nCompre aqui: https://tempromo.app.br/p/xxx"}
            className="w-full h-48 px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-green-500/30 font-mono resize-y"
          />

          {whatsappProducts.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-medium text-text-primary">
                    {whatsappProducts.length} {whatsappProducts.length === 1 ? "produto" : "produtos"}
                  </p>
                  <span className="text-xs text-text-muted">
                    Conf. media: {Math.round(whatsappProducts.reduce((s, p) => s + p.confidence, 0) / whatsappProducts.length)}%
                  </span>
                  {whatsappProducts.filter(p => p.category).length > 0 && (
                    <span className="text-xs text-text-muted">
                      {whatsappProducts.filter(p => p.category).length} c/ categoria
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWhatsappSelected(new Set(whatsappProducts.map((_, i) => i)))}
                    className="text-xs text-accent-blue hover:underline"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setWhatsappSelected(new Set(whatsappProducts.filter(p => p.confidence >= 50).map((_, i) => i)))}
                    className="text-xs text-accent-green hover:underline"
                  >
                    Conf. &gt;50%
                  </button>
                  <button
                    onClick={() => setWhatsappSelected(new Set())}
                    className="text-xs text-text-muted hover:underline"
                  >
                    Nenhum
                  </button>
                </div>
              </div>

              <div className="max-h-[28rem] overflow-y-auto space-y-2">
                {whatsappProducts.map((product, i) => (
                  <label
                    key={i}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      whatsappSelected.has(i)
                        ? "border-green-300 bg-green-50"
                        : "border-surface-200 bg-white hover:bg-surface-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={whatsappSelected.has(i)}
                      onChange={() => toggleWhatsappItem(i)}
                      className="mt-1 rounded border-surface-300 text-green-500 focus:ring-green-500/30"
                    />
                    <div className="flex-1 min-w-0">
                      {/* Title + confidence badge */}
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary truncate flex-1">{product.title}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                          product.confidence >= 70 ? "bg-green-100 text-green-700" :
                          product.confidence >= 45 ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-600"
                        }`}>
                          {product.confidence}%
                        </span>
                      </div>

                      {/* Price row */}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-bold text-accent-green">
                          R$ {product.price.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-xs text-text-muted line-through">
                            R$ {product.originalPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </span>
                        )}
                        {product.originalPrice && product.originalPrice > product.price && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                            -{Math.round(100 - (product.price / product.originalPrice) * 100)}%
                          </span>
                        )}
                        {product.coupon && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-accent-orange/10 text-accent-orange font-medium">
                            {product.coupon}
                          </span>
                        )}
                      </div>

                      {/* Tags: category, brand */}
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {product.category && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-brand-100 text-brand-700 font-medium">
                            {product.category}
                          </span>
                        )}
                        {product.brand && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium capitalize">
                            {product.brand}
                          </span>
                        )}
                        {product.warnings.length > 0 && product.warnings.map((w, wi) => (
                          <span key={wi} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">
                            {w}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-text-muted mt-1 truncate">{product.url}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {whatsappInput.trim() && whatsappProducts.length === 0 && (
            <div className="flex items-center gap-2 text-amber-500 text-xs">
              <AlertTriangle className="h-4 w-4" />
              Nenhum produto encontrado. Verifique se o texto contem título, preço (R$) e link.
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleIngestWhatsapp}
              disabled={whatsappSelected.size === 0 || isRunning}
              className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50 bg-green-600 hover:bg-green-700"
            >
              {isRunning ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="h-4 w-4" /> Importar {whatsappSelected.size} {whatsappSelected.size === 1 ? "produto" : "produtos"}</>
              )}
            </button>
            <button onClick={handleClear} className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 text-text-muted">
              <Trash2 className="h-4 w-4" /> Limpar
            </button>
          </div>
        </div>
      )}

      {/* JSON PASTE MODE */}
      {mode === "json" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              <ClipboardPaste className="inline h-4 w-4 mr-1.5 -mt-0.5 text-accent-blue" />
              Colar JSON de Produtos
            </label>
            <p className="text-xs text-text-muted">
              Cole o JSON gerado pelos scripts locais ou monte seu proprio array.
            </p>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg space-y-2">
            <p className="text-xs text-blue-700 font-medium">Como usar:</p>
            <div className="text-xs text-blue-600 space-y-1 font-mono">
              <p>1. Busca: <code className="bg-blue-100 px-1 rounded">node scripts/scrape-search.mjs &quot;iphone 15&quot; &quot;notebook&quot;</code></p>
              <p>2. Por IDs: <code className="bg-blue-100 px-1 rounded">node scripts/scrape-ids.mjs MLB123 MLB456</code></p>
              <p>3. Copie o JSON gerado e cole abaixo</p>
            </div>
          </div>

          <div className="p-3 bg-green-50 rounded-lg flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-accent-green mt-0.5 flex-shrink-0" />
            <p className="text-xs text-green-700">
              <strong>Funciona sempre!</strong> Os scripts rodam no seu PC (sem bloqueio do ML) e o JSON e importado direto no banco.
            </p>
          </div>

          <textarea
            value={jsonInput}
            onChange={(e) => handleJsonValidate(e.target.value)}
            placeholder={'[\n  { "title": "iPhone 15 128gb", "price": 4299, "url": "https://...", "imageUrl": "https://..." },\n  { "title": "Outro produto", "price": 199.90, "url": "https://..." }\n]'}
            className="w-full h-48 px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 font-mono resize-y"
          />

          {jsonParseError && (
            <div className="flex items-center gap-2 text-red-500 text-xs">
              <XCircle className="h-4 w-4" />
              {jsonParseError}
            </div>
          )}

          {jsonParsedCount !== null && (
            <div className="flex items-center gap-2 text-accent-green text-xs">
              <CheckCircle className="h-4 w-4" />
              {jsonParsedCount} {jsonParsedCount === 1 ? "produto valido" : "produtos validos"} encontrados
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleIngestJson}
              disabled={!jsonParsedCount || isRunning}
              className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isRunning ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="h-4 w-4" /> Importar {jsonParsedCount || 0} produtos</>
              )}
            </button>
            <button onClick={handleClear} className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 text-text-muted">
              <Trash2 className="h-4 w-4" /> Limpar
            </button>
          </div>
        </div>
      )}

      {/* MANUAL MODE */}
      {mode === "manual" && (
        <div className="card p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-primary mb-1">
              <PenLine className="inline h-4 w-4 mr-1.5 -mt-0.5 text-accent-purple" />
              Entrada Manual de Produtos
            </label>
            <p className="text-xs text-text-muted">
              Cole os dados do produto diretamente. Funciona sempre, sem depender da API do ML.
            </p>
          </div>

          <div className="p-3 bg-blue-50 rounded-lg flex items-start gap-2">
            <Info className="h-4 w-4 text-accent-blue mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-700">
              Abra o produto no Mercado Livre, copie o título, preço e URL, e cole nos campos abaixo.
            </p>
          </div>

          <div className="space-y-4">
            {manualItems.map((item, i) => (
              <div key={i} className="p-4 bg-surface-50 rounded-lg space-y-3 relative">
                {manualItems.length > 1 && (
                  <button
                    onClick={() => removeManualItem(i)}
                    className="absolute top-2 right-2 text-text-muted hover:text-red-500 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <p className="text-xs font-semibold text-text-muted">Produto {i + 1}</p>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateManualItem(i, "title", e.target.value)}
                  placeholder="Título do produto *"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={item.price}
                    onChange={(e) => updateManualItem(i, "price", e.target.value)}
                    placeholder="Preço atual (R$) *"
                    className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                  <input
                    type="text"
                    value={item.originalPrice}
                    onChange={(e) => updateManualItem(i, "originalPrice", e.target.value)}
                    placeholder="Preço original (opcional)"
                    className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                </div>
                <input
                  type="url"
                  value={item.url}
                  onChange={(e) => updateManualItem(i, "url", e.target.value)}
                  placeholder="URL do produto no ML *"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
                <input
                  type="url"
                  value={item.imageUrl}
                  onChange={(e) => updateManualItem(i, "imageUrl", e.target.value)}
                  placeholder="URL da imagem (opcional)"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={addManualItem}
              className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Adicionar produto
            </button>
            <button
              onClick={handleIngestManual}
              disabled={validManualCount === 0 || isRunning}
              className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isRunning ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importando...</>
              ) : (
                <><Upload className="h-4 w-4" /> Importar {validManualCount} {validManualCount === 1 ? "produto" : "produtos"}</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card p-5 border-red-200 bg-red-50 space-y-2">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <p className="font-medium">Erro na ingestão</p>
          </div>
          <p className="text-sm text-red-500">{error.error}</p>
          {error.hint && (
            <div className="flex items-start gap-2 p-3 bg-white/60 rounded-lg">
              <Info className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">{error.hint}</p>
            </div>
          )}
          {error.trends && error.trends.length > 0 && (
            <div className="p-3 bg-white/60 rounded-lg">
              <p className="text-xs text-text-muted font-medium mb-1">Tendências encontradas:</p>
              <div className="flex flex-wrap gap-1.5">
                {error.trends.map((t) => (
                  <span key={t} className="inline-block px-2 py-0.5 rounded bg-amber-100 text-xs text-amber-700">{t}</span>
                ))}
              </div>
            </div>
          )}
          {error.errors && error.errors.length > 0 && (
            <div>
              <p className="text-xs text-red-400 font-medium mb-1">Detalhes:</p>
              <div className="space-y-0.5">
                {error.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500 font-mono">{e}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Fix URLs tool */}
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Corrigir URLs de concorrentes</h3>
            <p className="text-xs text-text-muted">Detecta e corrige ofertas com links de tempromo, pelando, etc.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                setFixUrlsRunning(true);
                setFixUrlsMessage(null);
                try {
                  const res = await fetch("/api/admin/fix-urls");
                  const data = await res.json();
                  setFixUrlsResult(data);
                } catch { setFixUrlsMessage("Erro ao verificar URLs"); }
                setFixUrlsRunning(false);
              }}
              disabled={fixUrlsRunning}
              className="px-3 py-1.5 rounded-lg bg-surface-100 text-sm font-medium text-text-secondary hover:bg-surface-200 transition-colors disabled:opacity-50"
            >
              {fixUrlsRunning ? "Verificando..." : "Verificar"}
            </button>
            {fixUrlsResult && fixUrlsResult.badOffers > 0 && (
              <button
                onClick={async () => {
                  setFixUrlsRunning(true);
                  try {
                    const res = await fetch("/api/admin/fix-urls", { method: "POST" });
                    const data = await res.json();
                    setFixUrlsMessage(data.message || `${data.fixed} ofertas corrigidas`);
                    setFixUrlsResult(null);
                  } catch { setFixUrlsMessage("Erro ao corrigir URLs"); }
                  setFixUrlsRunning(false);
                }}
                disabled={fixUrlsRunning}
                className="px-3 py-1.5 rounded-lg bg-accent-red text-white text-sm font-medium hover:bg-accent-red/90 transition-colors disabled:opacity-50"
              >
                Corrigir {fixUrlsResult.badOffers} URLs
              </button>
            )}
          </div>
        </div>
        {fixUrlsResult && (
          <div className="text-xs">
            {fixUrlsResult.badOffers === 0 ? (
              <p className="text-accent-green font-medium">Nenhuma URL de concorrente encontrada!</p>
            ) : (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {fixUrlsResult.items?.slice(0, 20).map((item) => (
                  <div key={item.offerId} className="flex items-center gap-2 py-1 border-b border-surface-100">
                    <span className="text-text-primary font-medium truncate flex-1">{item.productName}</span>
                    {item.issue && (
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                        item.issue === 'blocked_domain' ? 'bg-red-100 text-red-600' :
                        item.issue === 'wrong_source' ? 'bg-amber-100 text-amber-600' :
                        'bg-surface-100 text-surface-500'
                      }`}>
                        {item.issue === 'blocked_domain' ? 'concorrente' : item.issue === 'wrong_source' ? 'source errado' : 'nao-marketplace'}
                      </span>
                    )}
                    <span className="text-red-500 font-mono text-[10px] truncate max-w-[180px]">{item.currentUrl}</span>
                  </div>
                ))}
                {(fixUrlsResult.items?.length || 0) > 20 && (
                  <p className="text-text-muted">... e mais {fixUrlsResult.badOffers - 20}</p>
                )}
              </div>
            )}
          </div>
        )}
        {fixUrlsMessage && (
          <p className="text-xs font-medium text-accent-green">{fixUrlsMessage}</p>
        )}
      </div>

      {/* Results */}
      {result && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-accent-green" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Resultado</h2>
            {result.durationMs && (
              <span className="text-xs text-text-muted">({(result.durationMs / 1000).toFixed(1)}s)</span>
            )}
          </div>

          {result.mode === "search" && result.query && (
            <p className="text-sm text-text-secondary">
              Busca: <span className="font-semibold">&quot;{result.query}&quot;</span>
            </p>
          )}

          {result.mode === "trends" && result.keywords && (
            <div>
              <p className="text-sm text-text-secondary mb-2">Keywords buscadas:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.keywords.map((k) => (
                  <span key={k} className="inline-block px-2 py-0.5 rounded bg-accent-orange/10 text-xs text-accent-orange font-medium">{k}</span>
                ))}
              </div>
            </div>
          )}

          {result.mode === "manual" && (
            <p className="text-sm text-text-secondary">Entrada manual</p>
          )}

          {result.mode === "seed" && (
            <div>
              <p className="text-sm text-text-secondary mb-2">
                Seed de produtos populares importado com sucesso!
              </p>
              {result.categories && result.categories.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {result.categories.map((c) => (
                    <span key={c} className="inline-block px-2 py-0.5 rounded bg-brand-100 text-xs text-brand-700 font-medium">{c}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="text-center p-3 bg-surface-50 rounded-lg">
              <p className="text-2xl font-bold font-display text-text-primary">{result.fetched}</p>
              <p className="text-xs text-text-muted">Buscados</p>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold font-display text-accent-green">{result.created}</p>
              <p className="text-xs text-text-muted">Criados</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold font-display text-accent-blue">{result.updated}</p>
              <p className="text-xs text-text-muted">Atualizados</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold font-display text-amber-500">{result.skipped ?? 0}</p>
              <p className="text-xs text-text-muted">Ignorados</p>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold font-display text-red-500">{result.failed}</p>
              <p className="text-xs text-text-muted">Falharam</p>
            </div>
          </div>

          {(result.fetchErrors || result.searchErrors) && (
            <div>
              <p className="text-xs text-text-muted font-medium mb-1">Erros:</p>
              <div className="space-y-0.5">
                {[...(result.fetchErrors || []), ...(result.searchErrors || [])].map((e, i) => (
                  <p key={i} className="text-xs text-red-500 font-mono">{e}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
