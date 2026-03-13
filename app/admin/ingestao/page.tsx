"use client";

import { useState } from "react";
import { Upload, Search, Loader2, CheckCircle, XCircle, AlertTriangle, Trash2 } from "lucide-react";

interface IngestResult {
  fetched: number;
  created: number;
  updated: number;
  failed: number;
  invalidIds: string[];
  errors?: string[];
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

    // URL pattern: mercadolivre.com.br/...MLB-123...
    const urlMatch = trimmed.match(/ML[A-Z]-?\d{6,15}/i);
    if (urlMatch) {
      const raw = urlMatch[0].replace("-", "");
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
  const [rawInput, setRawInput] = useState("");
  const [parsedIds, setParsedIds] = useState<string[]>([]);
  const [invalidLines, setInvalidLines] = useState<string[]>([]);
  const [isParsed, setIsParsed] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handleIngest() {
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
        setError(data.error || `Erro: ${res.status}`);
      }
    } catch (err: any) {
      setError(err.message || "Erro de rede");
    } finally {
      setIsRunning(false);
    }
  }

  function handleClear() {
    setRawInput("");
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
        <p className="text-sm text-text-muted">Cole IDs ou URLs do Mercado Livre para ingerir produtos</p>
      </div>

      {/* Input area */}
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
      </div>

      {/* Parse results */}
      {isParsed && (
        <div className="card p-5 space-y-4">
          <h2 className="text-lg font-semibold font-display text-text-primary">Preview</h2>

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
            onClick={handleIngest}
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

      {/* Error */}
      {error && (
        <div className="card p-5 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <p className="font-medium">Erro na ingestao</p>
          </div>
          <p className="text-sm text-red-500 mt-1">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-accent-green" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Resultado</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold font-display text-red-500">{result.failed}</p>
              <p className="text-xs text-text-muted">Falharam</p>
            </div>
          </div>

          {result.invalidIds && result.invalidIds.length > 0 && (
            <div>
              <p className="text-xs text-text-muted font-medium mb-1">IDs invalidos no servidor:</p>
              <div className="flex flex-wrap gap-1.5">
                {result.invalidIds.map((id) => (
                  <span key={id} className="inline-block px-2 py-0.5 rounded bg-red-50 text-xs font-mono text-red-600">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <div>
              <p className="text-xs text-text-muted font-medium mb-1">Erros:</p>
              <div className="space-y-1">
                {result.errors.map((e, i) => (
                  <p key={i} className="text-xs text-red-500">{e}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
