"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Check,
  X,
  Send,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Package,
  Layers,
  Zap,
  RotateCcw,
  Eye,
  Sparkles,
  AlertTriangle,
  Activity,
  Radio,
  History,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CandidateItem {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  status: string;
  enrichedData: {
    trustScore?: number;
    subStatus?: string;
    detectedBrand?: string;
    inferredCategory?: string;
  } | null;
  createdAt: string;
}

interface BatchItem {
  id: string;
  fileName: string | null;
  format: string;
  status: string;
  totalItems: number;
  imported: number;
  rejected: number;
  candidatesCount: number;
  processedAt: string | null;
  createdAt: string;
}

interface PipelineInfo {
  mode: string;
  label: string;
  description: string;
  isActive: boolean;
  itemsTotal: number;
  itemsPending: number;
  lastRunAt: string | null;
}

// V22: Sync pipeline types
interface SyncPipelineStatus {
  sourceId: string;
  name: string;
  status: "ready" | "blocked" | "partial";
  blockers: string[];
  capabilityTruth: {
    status: string;
    capabilities: string[];
    missing: string[];
    lastSync?: string;
  };
}

interface SyncHistoryEntry {
  sourceId: string;
  timestamp: string;
  synced: number;
  failed: number;
  stale: number;
  errors: string[];
}

interface SourcingData {
  strategy: { strategy: string; label: string; description: string };
  pipelines: PipelineInfo[];
  candidateCounts: Record<string, number>;
  recentBatches: BatchItem[];
  newCandidates: CandidateItem[];
  weakMatchCandidates: CandidateItem[];
  readyToPublish: CandidateItem[];
  syncPipelines?: SyncPipelineStatus[];
  syncHistory?: SyncHistoryEntry[];
}

// ─── Status Config ──────────────────────────────────────────────────────────

const BATCH_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pendente", color: "text-amber-600 bg-amber-50", icon: Clock },
  PROCESSING: { label: "Processando", color: "text-blue-600 bg-blue-50", icon: Loader2 },
  COMPLETED: { label: "Concluido", color: "text-green-600 bg-green-50", icon: CheckCircle },
  FAILED: { label: "Falhou", color: "text-red-600 bg-red-50", icon: XCircle },
};

// ─── V19: Pipeline health indicator colors ──────────────────────────────────

function getPipelineHealth(pipeline: PipelineInfo): { color: string; label: string } {
  if (!pipeline.isActive) return { color: "bg-gray-300", label: "Inativo" };

  // Check last run — if never ran or more than 7 days ago, yellow
  if (!pipeline.lastRunAt) return { color: "bg-amber-400", label: "Nunca executado" };

  const lastRun = new Date(pipeline.lastRunAt);
  const hoursSinceRun = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);

  if (hoursSinceRun > 168) return { color: "bg-red-500", label: "Desatualizado" }; // 7 days
  if (hoursSinceRun > 48) return { color: "bg-amber-400", label: "Atencao" }; // 2 days
  if (pipeline.itemsPending > 50) return { color: "bg-amber-400", label: "Fila grande" };

  return { color: "bg-green-500", label: "Saudavel" };
}

// ─── V19: Time ago helper ───────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "agora";
  if (diffMins < 60) return `${diffMins}min atras`;
  if (diffHours < 24) return `${diffHours}h atras`;
  if (diffDays < 7) return `${diffDays}d atras`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function SourcingActions() {
  const [data, setData] = useState<SourcingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Import form state
  const [showImport, setShowImport] = useState(false);
  const [importContent, setImportContent] = useState("");
  const [importFormat, setImportFormat] = useState<string>("json");
  const [importSource, setImportSource] = useState("manual");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  // V19: dry run
  const [isDryRunning, setIsDryRunning] = useState(false);
  const [dryRunResult, setDryRunResult] = useState<{
    total: number;
    valid: number;
    invalid: number;
    itemErrors: { line: number; field: string | null; reason: string }[];
  } | null>(null);

  // Batch actions
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Selected candidates
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Candidate filter
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // V22: Feed sync state
  const [syncingSource, setSyncingSource] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<{ sourceId: string; message: string; success: boolean } | null>(null);
  const [expandedSyncErrors, setExpandedSyncErrors] = useState<string | null>(null);

  // Sections expanded
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["batches", "new", "ready"])
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/sourcing");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("Erro ao carregar dados");
      }
    } catch {
      setError("Erro de rede");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function toggleSection(key: string) {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // ── Import Handler ──

  async function handleImport() {
    if (!importContent.trim()) return;
    setIsImporting(true);
    setImportResult(null);
    setDryRunResult(null);

    try {
      const res = await fetch("/api/admin/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          content: importContent,
          format: importFormat,
          sourceSlug: importSource,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setImportResult(
          `Batch criado: ${result.valid} validos, ${result.invalid} invalidos`
        );
        setImportContent("");
        loadData();
      } else {
        setError(result.error || "Erro ao importar");
      }
    } catch {
      setError("Erro de rede");
    } finally {
      setIsImporting(false);
    }
  }

  // V19: Dry run handler
  async function handleDryRun() {
    if (!importContent.trim()) return;
    setIsDryRunning(true);
    setDryRunResult(null);

    try {
      const res = await fetch("/api/admin/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dry-run",
          content: importContent,
          format: importFormat,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        setDryRunResult({
          total: result.total,
          valid: result.valid,
          invalid: result.invalid,
          itemErrors: result.itemErrors || [],
        });
      } else {
        setError(result.error || "Erro na validacao");
      }
    } catch {
      setError("Erro de rede");
    } finally {
      setIsDryRunning(false);
    }
  }

  // ── V22: Feed Sync Handler ──

  async function handleSyncSource(sourceId: string) {
    setSyncingSource(sourceId);
    setSyncResult(null);

    try {
      const res = await fetch("/api/admin/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync", sourceId }),
      });

      const result = await res.json();

      if (res.ok) {
        setSyncResult({
          sourceId,
          message: `Sync concluido: ${result.synced} sincronizados, ${result.failed} falhas, ${result.stale} stale`,
          success: true,
        });
        loadData();
      } else {
        setSyncResult({
          sourceId,
          message: result.error || "Erro ao sincronizar",
          success: false,
        });
      }
    } catch {
      setSyncResult({ sourceId, message: "Erro de rede", success: false });
    } finally {
      setSyncingSource(null);
    }
  }

  // ── Process Batch ──

  async function handleProcessBatch(batchId: string) {
    setProcessingBatchId(batchId);
    try {
      const res = await fetch("/api/admin/sourcing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process", batchId }),
      });

      if (res.ok) {
        loadData();
      } else {
        const result = await res.json();
        setError(result.error || "Erro ao processar batch");
      }
    } catch {
      setError("Erro de rede");
    } finally {
      setProcessingBatchId(null);
    }
  }

  // ── Batch Actions on Candidates ──

  async function handleCandidateAction(
    action: "approve" | "reject" | "publish" | "recalculate" | "enrich-batch" | "publish-batch"
  ) {
    if (selectedIds.size === 0) return;
    setActionLoading(true);

    try {
      const endpoint =
        action === "approve" || action === "reject"
          ? "/api/admin/catalog/batch"
          : "/api/admin/sourcing";

      const apiAction = action === "approve" || action === "reject" ? action : action;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: apiAction,
          candidateIds: Array.from(selectedIds),
        }),
      });

      if (res.ok) {
        setSelectedIds(new Set());
        loadData();
      } else {
        const result = await res.json();
        setError(result.error || `Erro na acao ${action}`);
      }
    } catch {
      setError("Erro de rede");
    } finally {
      setActionLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function filterCandidates(candidates: CandidateItem[]): CandidateItem[] {
    let filtered = candidates;
    if (statusFilter !== "ALL") {
      filtered = filtered.filter((c) => c.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          (c.brand && c.brand.toLowerCase().includes(q)) ||
          (c.category && c.category.toLowerCase().includes(q))
      );
    }
    return filtered;
  }

  // ── Render ──

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-12 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Carregando sourcing...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="card p-5 text-center text-text-muted">
        <XCircle className="h-6 w-6 mx-auto mb-2 text-red-400" />
        <p>Erro ao carregar dados de sourcing</p>
        <button onClick={loadData} className="btn-secondary text-xs mt-3 px-3 py-1.5">
          Tentar novamente
        </button>
      </div>
    );
  }

  const allCandidates = [
    ...(data.newCandidates || []),
    ...(data.weakMatchCandidates || []),
    ...(data.readyToPublish || []),
  ];

  // Deduplicate candidates
  const uniqueCandidates = Array.from(
    new Map(allCandidates.map((c) => [c.id, c])).values()
  );

  const filtered = filterCandidates(uniqueCandidates);

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(!showImport)}
            className="btn-primary text-sm px-4 py-2 inline-flex items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar
          </button>
          <button
            onClick={loadData}
            disabled={isLoading}
            className="btn-secondary text-sm px-3 py-2 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-text-muted">
              {selectedIds.size} selecionados
            </span>
            <button
              onClick={() => handleCandidateAction("approve")}
              disabled={actionLoading}
              className="text-xs px-2.5 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Check className="h-3 w-3" /> Aprovar
            </button>
            <button
              onClick={() => handleCandidateAction("reject")}
              disabled={actionLoading}
              className="text-xs px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1 disabled:opacity-50"
            >
              <X className="h-3 w-3" /> Rejeitar
            </button>
            <button
              onClick={() => handleCandidateAction("enrich-batch")}
              disabled={actionLoading}
              className="text-xs px-2.5 py-1 rounded bg-purple-100 text-purple-700 hover:bg-purple-200 inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Sparkles className="h-3 w-3" /> Enriquecer
            </button>
            <button
              onClick={() => handleCandidateAction("publish-batch")}
              disabled={actionLoading}
              className="text-xs px-2.5 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 inline-flex items-center gap-1 disabled:opacity-50"
            >
              <Send className="h-3 w-3" /> Publicar
            </button>
            <button
              onClick={() => handleCandidateAction("recalculate")}
              disabled={actionLoading}
              className="text-xs px-2.5 py-1 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 inline-flex items-center gap-1 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" /> Recalcular
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="card p-4 border-red-200 bg-red-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-4 w-4" />
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Import result */}
      {importResult && (
        <div className="card p-4 border-green-200 bg-green-50 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <p className="text-sm text-green-700">{importResult}</p>
          <button
            onClick={() => setImportResult(null)}
            className="ml-auto text-xs text-green-500 hover:text-green-700"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Import form */}
      {showImport && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Upload className="h-5 w-5 text-accent-blue" />
            <h3 className="text-lg font-semibold font-display text-text-primary">
              Nova Importacao
            </h3>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Formato:</span>
              {["json", "csv", "url-list", "title-list"].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setImportFormat(fmt)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    importFormat === fmt
                      ? "bg-accent-blue text-white"
                      : "bg-surface-100 text-text-secondary hover:bg-surface-200"
                  }`}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary">Fonte:</span>
              <input
                type="text"
                value={importSource}
                onChange={(e) => setImportSource(e.target.value)}
                className="px-2 py-1 text-sm border border-surface-200 rounded bg-white text-text-primary w-32"
                placeholder="manual"
              />
            </div>
          </div>

          <textarea
            value={importContent}
            onChange={(e) => setImportContent(e.target.value)}
            placeholder={
              importFormat === "json"
                ? '[{ "title": "Produto", "brand": "Marca", "price": 99.90 }]'
                : importFormat === "csv"
                  ? "title,brand,price\nProduto,Marca,99.90"
                  : importFormat === "url-list"
                    ? "https://marketplace.com/produto1\nhttps://marketplace.com/produto2"
                    : "Nome do Produto 1\nNome do Produto 2"
            }
            className="w-full h-40 px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue font-mono resize-y"
          />

          {/* V19: Dry run result */}
          {dryRunResult && (
            <div className="p-3 rounded-lg border border-surface-200 bg-surface-50 space-y-2">
              <div className="flex items-center gap-3 text-sm">
                <Eye className="h-4 w-4 text-accent-blue" />
                <span className="font-medium text-text-primary">Resultado da Validacao</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-text-muted">Total: {dryRunResult.total}</span>
                <span className="text-green-600">Validos: {dryRunResult.valid}</span>
                <span className="text-red-500">Invalidos: {dryRunResult.invalid}</span>
              </div>
              {dryRunResult.itemErrors.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {dryRunResult.itemErrors.slice(0, 10).map((err, idx) => (
                    <div key={idx} className="text-xs text-red-600 flex items-start gap-1.5">
                      <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                      <span>Linha {err.line}{err.field ? ` (${err.field})` : ""}: {err.reason}</span>
                    </div>
                  ))}
                  {dryRunResult.itemErrors.length > 10 && (
                    <p className="text-xs text-text-muted">
                      ...e mais {dryRunResult.itemErrors.length - 10} erros
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            {/* V19: Dry run button */}
            <button
              onClick={handleDryRun}
              disabled={!importContent.trim() || isDryRunning}
              className="btn-secondary text-sm px-4 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isDryRunning ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Validar (Dry Run)
                </>
              )}
            </button>
            <button
              onClick={handleImport}
              disabled={!importContent.trim() || isImporting}
              className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Criar Batch
                </>
              )}
            </button>
            <button
              onClick={() => { setShowImport(false); setDryRunResult(null); }}
              className="btn-secondary text-sm px-4 py-2.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* V22: Feed Sync section */}
      <div className="card overflow-hidden">
        <button
          onClick={() => toggleSection("feedsync")}
          className="w-full flex items-center justify-between p-5 hover:bg-surface-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Radio className="h-5 w-5 text-brand-500" />
            <h3 className="text-lg font-semibold font-display text-text-primary">
              Feed Sync
            </h3>
            {data.syncPipelines && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-text-muted">
                {data.syncPipelines.length} fontes
              </span>
            )}
          </div>
          {expandedSections.has("feedsync") ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {expandedSections.has("feedsync") && (
          <div className="border-t border-surface-200 p-5 space-y-4">
            {/* Sync result banner */}
            {syncResult && (
              <div className={`p-3 rounded-lg flex items-center justify-between ${syncResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {syncResult.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600" />
                  )}
                  <p className={`text-sm ${syncResult.success ? "text-green-700" : "text-red-700"}`}>
                    [{syncResult.sourceId}] {syncResult.message}
                  </p>
                </div>
                <button onClick={() => setSyncResult(null)} className="text-xs text-text-muted hover:text-text-primary">
                  Fechar
                </button>
              </div>
            )}

            {/* Sync pipeline status per source */}
            {data.syncPipelines && data.syncPipelines.length > 0 ? (
              <div className="space-y-3">
                {data.syncPipelines.map((pipe) => {
                  const statusColors: Record<string, string> = {
                    ready: "border-l-emerald-500",
                    blocked: "border-l-red-500",
                    partial: "border-l-amber-500",
                  };
                  const truthColors: Record<string, string> = {
                    mock: "bg-blue-100 text-blue-700",
                    partial: "bg-amber-100 text-amber-700",
                    "feed-ready": "bg-emerald-100 text-emerald-700",
                    "sync-ready": "bg-green-100 text-green-700",
                    blocked: "bg-red-100 text-red-700",
                    "provider-needed": "bg-purple-100 text-purple-700",
                  };
                  const borderColor = statusColors[pipe.status] || "border-l-gray-300";
                  const truthColor = truthColors[pipe.capabilityTruth.status] || "bg-gray-100 text-gray-700";
                  const isSyncing = syncingSource === pipe.sourceId;

                  // Find sync history for this source
                  const sourceHistory = (data.syncHistory || [])
                    .filter((h) => h.sourceId === pipe.sourceId)
                    .slice(0, 5);

                  return (
                    <div key={pipe.sourceId} className={`rounded-lg border border-surface-200 bg-white p-4 border-l-4 ${borderColor}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-text-muted" />
                          <span className="font-semibold text-sm text-text-primary">{pipe.name}</span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${truthColor}`}>
                            {pipe.capabilityTruth.status}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSyncSource(pipe.sourceId)}
                          disabled={isSyncing || pipe.status === "blocked"}
                          className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isSyncing ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              Sincronizando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3.5 w-3.5" />
                              Sync Now
                            </>
                          )}
                        </button>
                      </div>

                      {/* Capabilities */}
                      {pipe.capabilityTruth.capabilities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {pipe.capabilityTruth.capabilities.map((cap) => (
                            <span key={cap} className="text-[10px] px-1.5 py-0.5 rounded bg-surface-50 text-text-muted border border-surface-200">
                              {cap}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Blockers */}
                      {pipe.blockers.length > 0 && (
                        <div className="mb-2">
                          <button
                            onClick={() => setExpandedSyncErrors(expandedSyncErrors === pipe.sourceId ? null : pipe.sourceId)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            {pipe.blockers.length} bloqueio(s)
                            {expandedSyncErrors === pipe.sourceId ? (
                              <ChevronUp className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                          </button>
                          {expandedSyncErrors === pipe.sourceId && (
                            <div className="mt-1 space-y-1 pl-4">
                              {pipe.blockers.map((b, i) => (
                                <p key={i} className="text-[10px] text-red-600">{b}</p>
                              ))}
                              {pipe.capabilityTruth.missing.length > 0 && (
                                <div className="mt-1">
                                  <p className="text-[10px] text-text-muted font-medium">Requisitos faltantes:</p>
                                  {pipe.capabilityTruth.missing.map((m, i) => (
                                    <p key={i} className="text-[10px] text-amber-600 pl-2">- {m}</p>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Last sync */}
                      <p className="text-[10px] text-text-muted">
                        {pipe.capabilityTruth.lastSync
                          ? `Ultimo sync: ${timeAgo(pipe.capabilityTruth.lastSync)}`
                          : "Nunca sincronizado"}
                      </p>

                      {/* V22: Sync history (last 5) */}
                      {sourceHistory.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-surface-100">
                          <div className="flex items-center gap-1 mb-1">
                            <History className="h-3 w-3 text-text-muted" />
                            <p className="text-[10px] text-text-muted font-medium">Historico recente:</p>
                          </div>
                          <div className="space-y-1">
                            {sourceHistory.map((h, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[10px]">
                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${h.failed > 0 ? "bg-red-500" : "bg-green-500"}`} />
                                <span className="text-text-muted">{timeAgo(h.timestamp)}</span>
                                <span className="text-green-600">{h.synced} sync</span>
                                {h.failed > 0 && <span className="text-red-500">{h.failed} falhas</span>}
                                {h.errors.length > 0 && (
                                  <span className="text-amber-500 truncate max-w-[200px]" title={h.errors[0]}>
                                    {h.errors[0]}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-4">
                Nenhum pipeline de sync configurado. Configure credenciais dos adapters em /admin/fontes.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lotes Recentes */}
      <div className="card overflow-hidden">
        <button
          onClick={() => toggleSection("batches")}
          className="w-full flex items-center justify-between p-5 hover:bg-surface-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Layers className="h-5 w-5 text-accent-blue" />
            <h3 className="text-lg font-semibold font-display text-text-primary">
              Lotes Recentes
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-text-muted">
              {data.recentBatches.length}
            </span>
          </div>
          {expandedSections.has("batches") ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {expandedSections.has("batches") && (
          <div className="border-t border-surface-200 p-5">
            {data.recentBatches.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                Nenhum lote encontrado
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentBatches.map((batch) => {
                  const statusConf = BATCH_STATUS[batch.status] || BATCH_STATUS.PENDING;
                  const StatusIcon = statusConf.icon;
                  const isProcessing = processingBatchId === batch.id;

                  return (
                    <div
                      key={batch.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-surface-50"
                    >
                      <StatusIcon
                        className={`h-4 w-4 flex-shrink-0 ${statusConf.color.split(" ")[0]} ${
                          isProcessing ? "animate-spin" : ""
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary truncate">
                            {batch.fileName || `Batch ${batch.id.slice(0, 8)}`}
                          </p>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${statusConf.color}`}
                          >
                            {statusConf.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                          <span>{batch.totalItems} itens</span>
                          <span>{batch.format.toUpperCase()}</span>
                          {batch.imported > 0 && (
                            <span className="text-green-600">
                              {batch.imported} importados
                            </span>
                          )}
                          {batch.rejected > 0 && (
                            <span className="text-red-500">
                              {batch.rejected} rejeitados
                            </span>
                          )}
                          {/* V19: timestamp */}
                          <span title={new Date(batch.createdAt).toLocaleString("pt-BR")}>
                            {timeAgo(batch.createdAt)}
                          </span>
                        </div>
                      </div>

                      {batch.status === "PENDING" && (
                        <button
                          onClick={() => handleProcessBatch(batch.id)}
                          disabled={isProcessing}
                          className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Play className="h-3.5 w-3.5" />
                          )}
                          Processar
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Candidates section with filters */}
      <div className="card overflow-hidden">
        <button
          onClick={() => toggleSection("candidates")}
          className="w-full flex items-center justify-between p-5 hover:bg-surface-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-accent-orange" />
            <h3 className="text-lg font-semibold font-display text-text-primary">
              Candidatos
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surface-100 text-text-muted">
              {uniqueCandidates.length}
            </span>
          </div>
          {expandedSections.has("candidates") ? (
            <ChevronUp className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
        </button>

        {expandedSections.has("candidates") && (
          <div className="border-t border-surface-200 p-5 space-y-4">
            {/* Filters — V19: also search by category */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="h-3.5 w-3.5 text-text-muted" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs border border-surface-200 rounded px-2 py-1 bg-white text-text-primary"
                >
                  <option value="ALL">Todos</option>
                  <option value="PENDING">Pendentes</option>
                  <option value="APPROVED">Aprovados</option>
                  <option value="REJECTED">Rejeitados</option>
                  <option value="IMPORTED">Publicados</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 text-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por titulo, marca ou categoria..."
                  className="text-xs border border-surface-200 rounded px-2 py-1 bg-white text-text-primary w-64"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="text-xs text-text-muted hover:text-text-primary"
                >
                  Limpar
                </button>
              )}
            </div>

            {/* Candidate list — V19: enhanced cards with more info */}
            {filtered.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                Nenhum candidato encontrado
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.slice(0, 50).map((c) => {
                  const trust = c.enrichedData?.trustScore;
                  const detectedBrand = c.enrichedData?.detectedBrand;
                  const inferredCategory = c.enrichedData?.inferredCategory;
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 px-2 py-2 rounded hover:bg-surface-50 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleSelect(c.id)}
                        className="rounded border-surface-300 flex-shrink-0"
                      />

                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                          c.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : c.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : c.status === "IMPORTED"
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {c.status}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">
                          {c.title}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted flex-wrap">
                          {/* V19: Show detected brand/category from enrichment */}
                          {(detectedBrand || c.brand) && (
                            <span className="inline-flex items-center gap-0.5">
                              {detectedBrand && detectedBrand !== c.brand && (
                                <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                              )}
                              {detectedBrand || c.brand}
                            </span>
                          )}
                          {(inferredCategory || c.category) && (
                            <span>{inferredCategory || c.category}</span>
                          )}
                          {c.enrichedData?.subStatus && c.enrichedData.subStatus !== c.status && (
                            <span className="text-amber-500">{c.enrichedData.subStatus}</span>
                          )}
                        </div>
                      </div>

                      {trust != null && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                            trust >= 70
                              ? "bg-green-100 text-green-700"
                              : trust >= 40
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                          title={`Trust Score: ${trust}`}
                        >
                          {trust}
                        </span>
                      )}
                    </div>
                  );
                })}

                {filtered.length > 50 && (
                  <p className="text-xs text-text-muted text-center py-2">
                    Mostrando 50 de {filtered.length} candidatos
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pipeline overview — V19: health indicators */}
      {data.pipelines && data.pipelines.length > 0 && (
        <div className="card overflow-hidden">
          <button
            onClick={() => toggleSection("pipelines")}
            className="w-full flex items-center justify-between p-5 hover:bg-surface-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-brand-500" />
              <h3 className="text-lg font-semibold font-display text-text-primary">
                Pipelines de Sourcing
              </h3>
            </div>
            {expandedSections.has("pipelines") ? (
              <ChevronUp className="h-4 w-4 text-text-muted" />
            ) : (
              <ChevronDown className="h-4 w-4 text-text-muted" />
            )}
          </button>

          {expandedSections.has("pipelines") && (
            <div className="border-t border-surface-200 p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.pipelines.map((pipeline) => {
                  const health = getPipelineHealth(pipeline);
                  return (
                    <div
                      key={pipeline.mode}
                      className={`p-4 rounded-lg border ${
                        pipeline.isActive
                          ? "border-accent-blue bg-blue-50/50"
                          : "border-surface-200 bg-surface-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {/* V19: Health indicator dot */}
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${health.color}`}
                            title={health.label}
                          />
                          <h4 className="text-sm font-semibold text-text-primary">
                            {pipeline.label}
                          </h4>
                        </div>
                        {pipeline.isActive && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-accent-blue text-white">
                            Ativo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mb-2">
                        {pipeline.description}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-text-muted">
                        <span>{pipeline.itemsTotal} total</span>
                        <span>{pipeline.itemsPending} pendentes</span>
                      </div>
                      {/* V19: last run timestamp with relative time */}
                      {pipeline.lastRunAt ? (
                        <p
                          className="text-[10px] text-text-muted mt-1"
                          title={new Date(pipeline.lastRunAt).toLocaleString("pt-BR")}
                        >
                          Ultima execucao: {timeAgo(pipeline.lastRunAt)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-500 mt-1">
                          Nunca executado
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
