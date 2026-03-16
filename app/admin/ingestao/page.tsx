"use client";

import { useState } from "react";
import { Upload, Search, Loader2, CheckCircle, XCircle, AlertTriangle, Trash2, Info } from "lucide-react";

interface IngestResult {
  mode?: string;
  query?: string;
  fetched: number;
  created: number;
  updated: number;
  skipped?: number;
  failed: number;
  durationMs?: number;
  fetchErrors?: string[];
  invalidIds?: string[];
  errors?: string[];
}

interface IngestError {
  error: string;
  hint?: string;
  errors?: string[];
  configured?: boolean;
}

function extractMlIds(input: string): string[] {
  const ids = new Set<string>();
  const lines = input.split(/[\n,\s]+/).filter(Boolean);

  for (const line of lines) {
    const trimmed = line.trim();

    // Direct ML ID pattern: MLB-123456789 or MLB123456789
    const idMatch = trimmed.match(/ML[A-Z]-?\d{6,15}/i);
    if (idMatch) {
      const raw = idMatch[0].replace("-", "");
      ids.add(raw);
      continue;
    }

    // Plain number (assume MLB prefix)
    const numMatch = trimmed.match(/^\d{6,15}$/);
    if (numMatch) {
      ids.add(`MLB${numMatch[0]}`);
    }
  }

  return Array.from(ids);
}

export default function AdminIngestaoPage() {
  const [mode, setMode] = useState<"ids" | "search">("search");

  // ID mode state
  const [rawInput, setRawInput] = useState("");
  const [parsedIds, setParsedIds] = useState<string[]>([]);
  const [invalidLines, setInvalidLines] = useState<string[]>([]);
  const [isParsed, setIsParsed] = useState(false);

  // Search mode state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLimit, setSearchLimit] = useState(20);

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

    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/admin/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: parsedIds }),
      });

      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  async function handleIngestSearch() {
    if (!searchQuery.trim()) return;

    setIsRunning(true);
    setResult(null);
    setError(null);

    try {
      const params = new URLSearchParams({ q: searchQuery.trim(), limit: String(searchLimit) });
      const res = await fetch(`/api/admin/ingest?${params}`);
      const data = await res.json();

      if (res.ok) {
        setResult(data);
      } else {
        setError(data);
      }
    } catch (err: any) {
      setError({ error: err.message || "Erro de rede" });
    } finally {
      setIsRunning(false);
    }
  }

  function handleClear() {
    setRawInput("");
    setSearchQuery("");
    setParsedIds([]);
    setInvalidLines([]);
    setIsParsed(false);
    setResult(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Ingestao Manual</h1>
        <p className="text-sm text-text-muted">Importe produtos do Mercado Livre por busca ou por IDs</p>
        <p className="text-xs text-text-muted mt-1">
          Requer <code className="bg-surface-100 px-1 rounded text-[11px]">ML_CLIENT_ID</code> e <code className="bg-surface-100 px-1 rounded text-[11px]">ML_CLIENT_SECRET</code> configurados no .env
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setMode("search"); setResult(null); setError(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === "search"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Search className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Busca
        </button>
        <button
          onClick={() => { setMode("ids"); setResult(null); setError(null); }}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
            mode === "ids"
              ? "bg-white text-text-primary shadow-sm"
              : "text-text-muted hover:text-text-secondary"
          }`}
        >
          <Upload className="inline h-4 w-4 mr-1.5 -mt-0.5" />
          Por IDs
        </button>
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
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando e importando...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Buscar e Importar
                </>
              )}
            </button>
            <button
              onClick={handleClear}
              className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 text-text-muted"
            >
              <Trash2 className="h-4 w-4" />
              Limpar
            </button>
          </div>
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
              onChange={(e) => {
                setRawInput(e.target.value);
                setIsParsed(false);
              }}
              placeholder={"MLB1234567890\nMLB9876543210\nhttps://www.mercadolivre.com.br/produto-exemplo/p/MLB1111111111\n1234567890"}
              className="w-full h-40 px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue font-mono resize-y"
            />
            <p className="text-xs text-text-muted mt-1">
              Aceita: IDs (MLB...), URLs do ML, ou numeros puros (um por linha ou separados por virgula)
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleParse}
              disabled={!rawInput.trim()}
              className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Search className="h-4 w-4" />
              Analisar IDs
            </button>
            <button
              onClick={handleClear}
              className="btn-secondary text-sm px-4 py-2 inline-flex items-center gap-1.5 text-text-muted"
            >
              <Trash2 className="h-4 w-4" />
              Limpar
            </button>
          </div>

          {/* Parse results */}
          {isParsed && (
            <div className="space-y-4 pt-2 border-t border-surface-100">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold font-display text-accent-green">{parsedIds.length}</p>
                  <p className="text-xs text-text-muted">IDs validos encontrados</p>
                </div>
                <div className="p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold font-display text-red-500">{invalidLines.length}</p>
                  <p className="text-xs text-text-muted">Linhas invalidas</p>
                </div>
              </div>

              {parsedIds.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted font-medium mb-1">IDs a ingerir:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {parsedIds.map((id) => (
                      <span key={id} className="inline-block px-2 py-0.5 rounded bg-surface-100 text-xs font-mono text-text-secondary">
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {invalidLines.length > 0 && (
                <div>
                  <p className="text-xs text-text-muted font-medium mb-1">Linhas ignoradas:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {invalidLines.map((line, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-xs text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        {line.length > 40 ? line.slice(0, 40) + "..." : line}
                      </span>
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
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Ingerindo {parsedIds.length} itens...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Ingerir {parsedIds.length} {parsedIds.length === 1 ? "item" : "itens"}
                  </>
                )}
              </button>
            </div>
          )}
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
          {error.configured === false && (
            <div className="flex items-start gap-2 p-3 bg-white/60 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-red-600">
                <p className="font-semibold">API ML nao configurada</p>
                <p className="mt-0.5">Configure as variaveis de ambiente <code className="bg-red-100 px-1 rounded">ML_CLIENT_ID</code> e <code className="bg-red-100 px-1 rounded">ML_CLIENT_SECRET</code> (ou <code className="bg-red-100 px-1 rounded">MERCADOLIVRE_APP_ID</code> / <code className="bg-red-100 px-1 rounded">MERCADOLIVRE_SECRET</code>) no .env</p>
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

          {result.fetchErrors && result.fetchErrors.length > 0 && (
            <div>
              <p className="text-xs text-text-muted font-medium mb-1">Erros de busca:</p>
              <div className="space-y-0.5">
                {result.fetchErrors.map((e, i) => (
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
