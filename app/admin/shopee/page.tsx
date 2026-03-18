"use client";

import { useState, useRef, useCallback } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Loader2,
  BarChart3,
  Tag,
  RefreshCw,
  Package,
  ShoppingBag,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ImportStats {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  durationMs: number;
  brandStats: { detected: number; unknown: number };
  categoryStats: { resolved: number; unresolved: number };
  priceStats: { min: number; max: number; avg: number };
}

interface ImportResult {
  ok: boolean;
  dryRun: boolean;
  fileName: string;
  csvRows: number;
  parsed: number;
  batchProcessed: number;
  truncated: boolean;
  parseSkipped: number;
  parseReasons: string[];
  import: ImportStats;
  categoryBreakdown: Record<string, number>;
  message: string;
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color = "text-text-primary",
  sub,
}: {
  label: string;
  value: string | number;
  color?: string;
  sub?: string;
}) {
  return (
    <div className="bg-surface-50 rounded-xl p-4 border border-surface-200">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminShopeePage() {
  const [file, setFile] = useState<File | null>(null);
  const [dryRun, setDryRun] = useState(false);
  const [limit, setLimit] = useState(500);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f && (f.name.endsWith(".csv") || f.type === "text/csv")) {
      setFile(f);
      setResult(null);
      setError(null);
    } else {
      setError("Apenas ficheiros CSV são aceites.");
    }
  }, []);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setResult(null);
    setError(null);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleImport() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("file", file);

      const adminSecret = process.env.NEXT_PUBLIC_ADMIN_SECRET;
      const headers: Record<string, string> = {};
      if (adminSecret) headers["X-Admin-Secret"] = adminSecret;

      const url = `/api/admin/import/shopee-csv?dryRun=${dryRun}&limit=${limit}`;
      const res = await fetch(url, { method: "POST", headers, body: form });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Erro ${res.status}`);
      } else {
        setResult(data as ImportResult);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const fmtPrice = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
          <ShoppingBag className="h-5 w-5 text-orange-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold font-display text-text-primary">
            Shopee — Import CSV
          </h1>
          <p className="text-sm text-text-muted">
            Importa produtos diretamente do CSV do programa de afiliados Shopee
          </p>
        </div>
      </div>

      {/* Upload card */}
      <div className="bg-white rounded-2xl border border-surface-200 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary-600" />
          Selecionar CSV
        </h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            dragging
              ? "border-primary-400 bg-primary-50"
              : file
              ? "border-green-400 bg-green-50"
              : "border-surface-300 hover:border-primary-300 hover:bg-surface-50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={onFileChange}
            className="sr-only"
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <FileText className="h-8 w-8 text-green-600" />
              <p className="text-sm font-semibold text-green-700">{file.name}</p>
              <p className="text-xs text-green-600">
                {(file.size / 1024).toFixed(0)} KB — clique para trocar
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-text-muted">
              <Upload className="h-8 w-8" />
              <p className="text-sm font-medium">
                Arrasta o CSV aqui ou clica para selecionar
              </p>
              <p className="text-xs">
                Formato: export CSV do painel de afiliados Shopee Brasil
              </p>
            </div>
          )}
        </div>

        {/* Options row */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Dry run toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div
              onClick={() => setDryRun((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                dryRun ? "bg-amber-400" : "bg-surface-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  dryRun ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </div>
            <span className="text-sm text-text-secondary">
              Dry run{" "}
              <span className="text-xs text-text-muted">(simula sem gravar)</span>
            </span>
          </label>

          {/* Limit */}
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            Limite:
            <input
              type="number"
              min={1}
              max={500}
              value={limit}
              onChange={(e) => setLimit(Math.min(500, Math.max(1, parseInt(e.target.value) || 500)))}
              className="w-20 px-2 py-1 rounded-lg border border-surface-300 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <span className="text-xs text-text-muted">máx. 500</span>
          </label>
        </div>

        {/* Submit */}
        <button
          onClick={handleImport}
          disabled={!file || loading}
          className="btn-primary w-full py-3 font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {dryRun ? "Simulando..." : "Importando..."}
            </>
          ) : (
            <>
              {dryRun ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              {dryRun ? "Simular importação" : "Importar produtos"}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Erro na importação</p>
            <p className="text-sm text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Status banner */}
          <div
            className={`rounded-xl p-4 flex items-start gap-3 ${
              result.dryRun
                ? "bg-amber-50 border border-amber-200"
                : result.import.failed > 0 && result.import.created === 0
                ? "bg-red-50 border border-red-200"
                : "bg-green-50 border border-green-200"
            }`}
          >
            {result.dryRun ? (
              <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p className={`text-sm font-semibold ${result.dryRun ? "text-amber-700" : "text-green-700"}`}>
                {result.dryRun ? "Dry run concluído — nenhum dado gravado" : "Importação concluída"}
              </p>
              <p className={`text-sm mt-0.5 ${result.dryRun ? "text-amber-600" : "text-green-600"}`}>
                {result.message}
              </p>
            </div>
          </div>

          {/* CSV stats */}
          <div className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <FileText className="h-4 w-4 text-text-muted" />
              CSV — {result.fileName}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard label="Linhas no CSV" value={fmt(result.csvRows)} />
              <StatCard
                label="Produtos válidos"
                value={fmt(result.parsed)}
                color="text-green-600"
              />
              <StatCard
                label="Ignorados (parse)"
                value={fmt(result.parseSkipped)}
                color={result.parseSkipped > 0 ? "text-amber-600" : "text-text-muted"}
              />
              <StatCard
                label="Processados"
                value={fmt(result.batchProcessed)}
                sub={result.truncated ? `(limite ${limit})` : undefined}
              />
            </div>

            {/* Parse skip reasons */}
            {result.parseReasons.length > 0 && (
              <details className="text-xs text-text-muted">
                <summary className="cursor-pointer hover:text-text-secondary">
                  Ver motivos de skip ({result.parseReasons.length})
                </summary>
                <ul className="mt-2 space-y-1 pl-3">
                  {result.parseReasons.map((r, i) => (
                    <li key={i} className="text-amber-600">• {r}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          {/* Pipeline stats */}
          {!result.dryRun && (
            <div className="bg-white rounded-2xl border border-surface-200 p-5 space-y-4">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Package className="h-4 w-4 text-text-muted" />
                Pipeline — resultados
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatCard
                  label="Criados"
                  value={fmt(result.import.created)}
                  color="text-green-600"
                />
                <StatCard
                  label="Atualizados"
                  value={fmt(result.import.updated)}
                  color="text-blue-600"
                />
                <StatCard
                  label="Ignorados"
                  value={fmt(result.import.skipped)}
                  color="text-text-muted"
                />
                <StatCard
                  label="Falhas"
                  value={fmt(result.import.failed)}
                  color={result.import.failed > 0 ? "text-red-600" : "text-text-muted"}
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <StatCard
                  label="Marcas detectadas"
                  value={fmt(result.import.brandStats.detected)}
                  sub={`${fmt(result.import.brandStats.unknown)} desconhecidas`}
                />
                <StatCard
                  label="Categorias resolvidas"
                  value={fmt(result.import.categoryStats.resolved)}
                  sub={`${fmt(result.import.categoryStats.unresolved)} sem categoria`}
                />
                <StatCard
                  label="Duração"
                  value={`${(result.import.durationMs / 1000).toFixed(1)}s`}
                />
              </div>
              {/* Price range */}
              {result.import.priceStats.min > 0 && (
                <div className="bg-surface-50 rounded-lg p-3 text-sm text-text-secondary">
                  <span className="font-medium">Preços: </span>
                  {fmtPrice(result.import.priceStats.min)} –{" "}
                  {fmtPrice(result.import.priceStats.max)}{" "}
                  <span className="text-text-muted">
                    (média {fmtPrice(result.import.priceStats.avg)})
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(result.categoryBreakdown).length > 0 && (
            <div className="bg-white rounded-2xl border border-surface-200 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Tag className="h-4 w-4 text-text-muted" />
                Distribuição por categoria
              </h3>
              <div className="space-y-2">
                {Object.entries(result.categoryBreakdown)
                  .sort((a, b) => b[1] - a[1])
                  .map(([slug, count]) => {
                    const total = result.batchProcessed || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={slug} className="flex items-center gap-3">
                        <span className="text-xs font-mono text-text-muted w-32 flex-shrink-0">
                          {slug}
                        </span>
                        <div className="flex-1 h-2 bg-surface-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-text-secondary w-16 text-right">
                          {fmt(count)} ({pct}%)
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div className="bg-surface-50 rounded-xl border border-surface-200 p-4">
        <h3 className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Como funciona
        </h3>
        <ul className="text-xs text-text-muted space-y-1">
          <li>• Exporta o CSV no painel de afiliados Shopee Brasil</li>
          <li>• Faz upload aqui — o import é <strong>idempotente</strong> (seguro re-rodar)</li>
          <li>• Produtos novos são criados; existentes têm preço actualizado</li>
          <li>• Para automação diária, define <code className="bg-surface-200 px-1 rounded">SHOPEE_CSV_URL</code> + <code className="bg-surface-200 px-1 rounded">SHOPEE_ENABLED=true</code></li>
          <li>• O cron <code className="bg-surface-200 px-1 rounded">/api/cron/sync-shopee</code> busca e processa o CSV automaticamente</li>
        </ul>
      </div>
    </div>
  );
}
