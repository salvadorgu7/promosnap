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

interface SourcingData {
  strategy: { strategy: string; label: string; description: string };
  pipelines: PipelineInfo[];
  candidateCounts: Record<string, number>;
  recentBatches: BatchItem[];
  newCandidates: CandidateItem[];
  weakMatchCandidates: CandidateItem[];
  readyToPublish: CandidateItem[];
}

// ─── Status Config ──────────────────────────────────────────────────────────

const BATCH_STATUS: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pendente", color: "text-amber-600 bg-amber-50", icon: Clock },
  PROCESSING: { label: "Processando", color: "text-blue-600 bg-blue-50", icon: Loader2 },
  COMPLETED: { label: "Concluido", color: "text-green-600 bg-green-50", icon: CheckCircle },
  FAILED: { label: "Falhou", color: "text-red-600 bg-red-50", icon: XCircle },
};

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

  // Batch actions
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Selected candidates
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Candidate filter
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

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
    action: "approve" | "reject" | "publish" | "recalculate"
  ) {
    if (selectedIds.size === 0) return;
    setActionLoading(true);

    try {
      const endpoint =
        action === "approve" || action === "reject"
          ? "/api/admin/catalog/batch"
          : "/api/admin/sourcing";

      const body =
        action === "approve" || action === "reject"
          ? { action, candidateIds: Array.from(selectedIds) }
          : { action, candidateIds: Array.from(selectedIds) };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
          (c.brand && c.brand.toLowerCase().includes(q))
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
          <div className="flex items-center gap-2">
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
              onClick={() => handleCandidateAction("publish")}
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

          <div className="flex items-center gap-3">
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
              onClick={() => setShowImport(false)}
              className="btn-secondary text-sm px-4 py-2.5"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

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
                          <span>
                            {new Date(batch.createdAt).toLocaleDateString(
                              "pt-BR",
                              {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
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
            {/* Filters */}
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
                  placeholder="Buscar candidato..."
                  className="text-xs border border-surface-200 rounded px-2 py-1 bg-white text-text-primary w-48"
                />
              </div>
            </div>

            {/* Candidate list */}
            {filtered.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">
                Nenhum candidato encontrado
              </p>
            ) : (
              <div className="space-y-1">
                {filtered.slice(0, 50).map((c) => {
                  const trust = c.enrichedData?.trustScore;
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
                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          {c.brand && <span>{c.brand}</span>}
                          {c.category && <span>{c.category}</span>}
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

      {/* Pipeline overview */}
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
                {data.pipelines.map((pipeline) => (
                  <div
                    key={pipeline.mode}
                    className={`p-4 rounded-lg border ${
                      pipeline.isActive
                        ? "border-accent-blue bg-blue-50/50"
                        : "border-surface-200 bg-surface-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-text-primary">
                        {pipeline.label}
                      </h4>
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
                    {pipeline.lastRunAt && (
                      <p className="text-[10px] text-text-muted mt-1">
                        Ultima execucao:{" "}
                        {new Date(pipeline.lastRunAt).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          }
                        )}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
