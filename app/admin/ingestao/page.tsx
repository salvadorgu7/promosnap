"use client";

import { useState } from "react";
import { Upload, Search, Loader2, CheckCircle, XCircle, AlertTriangle, Trash2, Info, TrendingUp, PenLine, Plus, X, Sparkles } from "lucide-react";

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

const emptyManualItem = (): ManualItem => ({
  title: "", price: "", url: "", imageUrl: "", originalPrice: "",
});

export default function AdminIngestaoPage() {
  const [mode, setMode] = useState<"search" | "ids" | "trends" | "manual" | "seed">("search");

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

  // Shared state
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<IngestError | null>(null);

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

  function handleClear() {
    setRawInput(""); setSearchQuery("");
    setParsedIds([]); setInvalidLines([]);
    setIsParsed(false); setResult(null); setError(null);
    setManualItems([emptyManualItem()]);
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
        <h1 className="text-2xl font-bold font-display text-text-primary">Ingestao Manual</h1>
        <p className="text-sm text-text-muted">Importe produtos do Mercado Livre por busca, IDs, tendencias ou entrada manual</p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit flex-wrap">
        {([
          { key: "search", icon: Search, label: "Busca" },
          { key: "trends", icon: TrendingUp, label: "Tendencias" },
          { key: "ids", icon: Upload, label: "Por IDs" },
          { key: "seed", icon: Sparkles, label: "Seed" },
          { key: "manual", icon: PenLine, label: "Manual" },
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
              Usa a API <code className="bg-amber-100 px-1 rounded">/trends/MLB</code> (funciona sem OAuth) + scraping da pagina publica do ML para obter dados dos produtos.
            </p>
          </div>

          <button
            onClick={handleIngestTrends}
            disabled={isRunning}
            className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isRunning ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Importando tendencias...</>
            ) : (
              <><TrendingUp className="h-4 w-4" /> Importar Tendencias</>
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
              <strong>Funciona sempre!</strong> Usa dados pre-carregados — nao depende da API do ML nem de scraping.
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
              Abra o produto no Mercado Livre, copie o titulo, preco e URL, e cole nos campos abaixo.
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
                  placeholder="Titulo do produto *"
                  className="w-full px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={item.price}
                    onChange={(e) => updateManualItem(i, "price", e.target.value)}
                    placeholder="Preco atual (R$) *"
                    className="px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30"
                  />
                  <input
                    type="text"
                    value={item.originalPrice}
                    onChange={(e) => updateManualItem(i, "originalPrice", e.target.value)}
                    placeholder="Preco original (opcional)"
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
            <p className="font-medium">Erro na ingestao</p>
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
              <p className="text-xs text-text-muted font-medium mb-1">Tendencias encontradas:</p>
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
            <p className="text-sm text-text-secondary">
              Seed de produtos populares importado com sucesso!
            </p>
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
