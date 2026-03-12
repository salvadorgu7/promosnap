"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Upload,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  FileText,
  RefreshCw,
  Sparkles,
  Check,
  X,
  Send,
  Filter,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CandidateItem {
  id: string;
  title: string;
  brand: string | null;
  category: string | null;
  imageUrl: string | null;
  price: number | null;
  originalPrice: number | null;
  affiliateUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "IMPORTED";
  enrichedData: {
    trustScore?: number;
    subStatus?: string;
    detectedBrand?: string;
    inferredCategory?: string;
    shippingSignals?: {
      hasFreeShipping?: boolean;
      hasPrimeShipping?: boolean;
      isMarketplace?: boolean;
    };
    enrichmentNotes?: string[];
  } | null;
  rejectionNote: string | null;
  createdAt: string;
}

interface ImportBatchItem {
  id: string;
  fileName: string | null;
  format: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  totalItems: number;
  imported: number;
  rejected: number;
  errors: string[] | null;
  candidatesCount: number;
  processedAt: string | null;
  createdAt: string;
  candidates?: CandidateItem[];
}

interface UploadResult {
  batchId: string;
  totalParsed: number;
  validCount: number;
  invalidCount: number;
  validationErrors: string[];
}

interface ProcessResult {
  batchId: string;
  total: number;
  imported: number;
  rejected: number;
  errors: string[];
}

// ─── Pipeline Stage Config ───────────────────────────────────────────────────

const PIPELINE_STAGES = [
  { key: "PENDING", label: "Pendente", color: "bg-gray-100 text-gray-700", icon: Clock },
  { key: "ENRICHED", label: "Enriquecido", color: "bg-blue-100 text-blue-700", icon: Sparkles },
  { key: "NEEDS_REVIEW", label: "Revisao", color: "bg-amber-100 text-amber-700", icon: Eye },
  { key: "APPROVED", label: "Aprovado", color: "bg-green-100 text-green-700", icon: Check },
  { key: "PUBLISHED", label: "Publicado", color: "bg-indigo-100 text-indigo-700", icon: Send },
  { key: "REJECTED", label: "Rejeitado", color: "bg-red-100 text-red-700", icon: X },
];

function getSubStatus(c: CandidateItem): string {
  if (c.status === "IMPORTED") return "PUBLISHED";
  if (c.status === "REJECTED") return "REJECTED";
  const sub = c.enrichedData?.subStatus;
  if (sub) return sub;
  if (c.status === "APPROVED") return "APPROVED";
  return "PENDING";
}

function getStageConfig(subStatus: string) {
  return PIPELINE_STAGES.find((s) => s.key === subStatus) || PIPELINE_STAGES[0];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pendente", color: "text-amber-600 bg-amber-50", icon: Clock },
  PROCESSING: { label: "Processando", color: "text-blue-600 bg-blue-50", icon: Loader2 },
  COMPLETED: { label: "Concluido", color: "text-green-600 bg-green-50", icon: CheckCircle },
  FAILED: { label: "Falhou", color: "text-red-600 bg-red-50", icon: XCircle },
};

// ─── Pipeline Visual ─────────────────────────────────────────────────────────

function PipelineStages({ candidates }: { candidates: CandidateItem[] }) {
  const counts: Record<string, number> = {};
  for (const c of candidates) {
    const sub = getSubStatus(c);
    counts[sub] = (counts[sub] || 0) + 1;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PIPELINE_STAGES.map((stage, i) => {
        const count = counts[stage.key] || 0;
        const StageIcon = stage.icon;
        return (
          <div key={stage.key} className="flex items-center gap-1">
            {i > 0 && <span className="text-surface-300 text-xs mx-0.5">&rarr;</span>}
            <div
              className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium ${
                count > 0 ? stage.color : "bg-surface-100 text-text-muted"
              }`}
            >
              <StageIcon className="h-3 w-3" />
              {stage.label}
              {count > 0 && <span className="font-bold">({count})</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AdminImportsPage() {
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [batches, setBatches] = useState<ImportBatchItem[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [enrichingBatchId, setEnrichingBatchId] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);

  // Expanded batch detail view
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [expandedCandidates, setExpandedCandidates] = useState<CandidateItem[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Candidate filter
  const [candidateFilter, setCandidateFilter] = useState<string>("ALL");

  // Batch actions
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [batchActionLoading, setBatchActionLoading] = useState(false);

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  async function loadBatches() {
    setIsLoadingBatches(true);
    try {
      const res = await fetch("/api/admin/imports");
      if (res.ok) {
        const data = await res.json();
        setBatches(data.batches || []);
      }
    } catch {
      // Silently fail — batches will just be empty
    } finally {
      setIsLoadingBatches(false);
    }
  }

  async function handleUpload() {
    if (!content.trim()) return;

    setIsUploading(true);
    setUploadResult(null);
    setUploadError(null);

    try {
      const res = await fetch("/api/admin/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, format }),
      });

      const data = await res.json();

      if (res.ok) {
        setUploadResult(data);
        setContent("");
        loadBatches();
      } else {
        setUploadError(data.error || `Erro: ${res.status}`);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleProcess(batchId: string) {
    setProcessingBatchId(batchId);
    setProcessResult(null);

    try {
      const res = await fetch(`/api/admin/imports/${batchId}/process`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setProcessResult(data);
        loadBatches();
        if (expandedBatchId === batchId) {
          loadCandidates(batchId);
        }
      } else {
        setUploadError(data.error || `Erro ao processar: ${res.status}`);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setProcessingBatchId(null);
    }
  }

  async function handleEnrich(batchId: string) {
    setEnrichingBatchId(batchId);

    try {
      const res = await fetch(`/api/admin/imports/${batchId}/enrich`, {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        setProcessResult({
          batchId,
          total: data.total,
          imported: data.enriched,
          rejected: data.needsReview,
          errors: data.notes || [],
        });
        if (expandedBatchId === batchId) {
          loadCandidates(batchId);
        }
      } else {
        setUploadError(data.error || `Erro ao enriquecer: ${res.status}`);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setEnrichingBatchId(null);
    }
  }

  const loadCandidates = useCallback(async (batchId: string) => {
    setLoadingCandidates(true);
    try {
      const res = await fetch(`/api/admin/imports?candidates=true`);
      if (res.ok) {
        const data = await res.json();
        const batch = (data.batches || []).find((b: ImportBatchItem) => b.id === batchId);
        setExpandedCandidates(batch?.candidates || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  function toggleExpand(batchId: string) {
    if (expandedBatchId === batchId) {
      setExpandedBatchId(null);
      setExpandedCandidates([]);
      setSelectedCandidates(new Set());
    } else {
      setExpandedBatchId(batchId);
      setSelectedCandidates(new Set());
      setCandidateFilter("ALL");
      loadCandidates(batchId);
    }
  }

  function toggleCandidateSelection(id: string) {
    setSelectedCandidates((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllFiltered() {
    const filtered = filteredCandidates();
    if (selectedCandidates.size === filtered.length) {
      setSelectedCandidates(new Set());
    } else {
      setSelectedCandidates(new Set(filtered.map((c) => c.id)));
    }
  }

  function filteredCandidates() {
    if (candidateFilter === "ALL") return expandedCandidates;
    return expandedCandidates.filter((c) => getSubStatus(c) === candidateFilter);
  }

  async function handleBatchAction(action: "approve" | "reject" | "publish") {
    if (selectedCandidates.size === 0) return;
    setBatchActionLoading(true);

    try {
      const res = await fetch("/api/admin/catalog/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, candidateIds: Array.from(selectedCandidates) }),
      });

      const data = await res.json();

      if (res.ok) {
        setSelectedCandidates(new Set());
        if (expandedBatchId) loadCandidates(expandedBatchId);
        loadBatches();
      } else {
        setUploadError(data.error || `Erro na acao: ${res.status}`);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setBatchActionLoading(false);
    }
  }

  const filtered = filteredCandidates();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Importacao de Catalogo</h1>
        <p className="text-sm text-text-muted">
          Importe produtos via JSON ou CSV para o catalogo de candidatos
        </p>
      </div>

      {/* Upload area */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <Upload className="h-5 w-5 text-accent-blue" />
          <h2 className="text-lg font-semibold font-display text-text-primary">Nova Importacao</h2>
        </div>

        {/* Format toggle */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-secondary">Formato:</span>
          <button
            onClick={() => setFormat("json")}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              format === "json"
                ? "bg-accent-blue text-white"
                : "bg-surface-100 text-text-secondary hover:bg-surface-200"
            }`}
          >
            JSON
          </button>
          <button
            onClick={() => setFormat("csv")}
            className={`px-3 py-1 text-sm rounded-lg transition-colors ${
              format === "csv"
                ? "bg-accent-blue text-white"
                : "bg-surface-100 text-text-secondary hover:bg-surface-200"
            }`}
          >
            CSV
          </button>
        </div>

        {/* Content textarea */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            format === "json"
              ? '[\n  { "title": "Samsung Galaxy S24", "brand": "Samsung", "price": 3499.00, "affiliateUrl": "https://..." },\n  ...\n]'
              : "title,brand,price,originalPrice,affiliateUrl\nSamsung Galaxy S24,Samsung,3499.00,4299.00,https://..."
          }
          className="w-full h-48 px-3 py-2 text-sm border border-surface-200 rounded-lg bg-white text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue font-mono resize-y"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={!content.trim() || isUploading}
            className="btn-primary text-sm px-5 py-2.5 inline-flex items-center gap-2 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Criar Batch de Importacao
              </>
            )}
          </button>
          <span className="text-xs text-text-muted">
            {format === "json"
              ? 'Aceita: array de objetos ou { "items": [...] }'
              : "Aceita: CSV com cabecalho (title, brand, price, etc)"}
          </span>
        </div>
      </div>

      {/* Upload result */}
      {uploadResult && (
        <div className="card p-5 border-green-200 bg-green-50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-green-800">Batch criado com sucesso</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xl font-bold font-display text-text-primary">{uploadResult.totalParsed}</p>
              <p className="text-xs text-text-muted">Total parseado</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xl font-bold font-display text-green-600">{uploadResult.validCount}</p>
              <p className="text-xs text-text-muted">Validos</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xl font-bold font-display text-red-500">{uploadResult.invalidCount}</p>
              <p className="text-xs text-text-muted">Invalidos</p>
            </div>
          </div>
          {uploadResult.validationErrors.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-amber-700 font-medium mb-1">Erros de validacao:</p>
              {uploadResult.validationErrors.slice(0, 5).map((e, i) => (
                <p key={i} className="text-xs text-amber-600">{e}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="card p-5 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            <p className="font-medium">Erro</p>
          </div>
          <p className="text-sm text-red-500 mt-1">{uploadError}</p>
          <button
            onClick={() => setUploadError(null)}
            className="text-xs text-red-400 mt-2 hover:text-red-600"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Process result */}
      {processResult && (
        <div className="card p-5 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Batch processado</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xl font-bold font-display text-text-primary">{processResult.total}</p>
              <p className="text-xs text-text-muted">Total</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xl font-bold font-display text-green-600">{processResult.imported}</p>
              <p className="text-xs text-text-muted">Importados</p>
            </div>
            <div className="text-center p-2 bg-white rounded-lg">
              <p className="text-xl font-bold font-display text-red-500">{processResult.rejected}</p>
              <p className="text-xs text-text-muted">Rejeitados</p>
            </div>
          </div>
        </div>
      )}

      {/* Batches list */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-text-muted" />
            <h2 className="text-lg font-semibold font-display text-text-primary">Batches de Importacao</h2>
          </div>
          <button
            onClick={loadBatches}
            disabled={isLoadingBatches}
            className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingBatches ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {isLoadingBatches && batches.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Carregando batches...
          </div>
        ) : batches.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            <Upload className="h-8 w-8 mx-auto mb-2 text-surface-300" />
            <p className="text-sm">Nenhum batch de importacao ainda</p>
          </div>
        ) : (
          <div className="space-y-2">
            {batches.map((batch) => {
              const statusConf = STATUS_CONFIG[batch.status] || STATUS_CONFIG.PENDING;
              const StatusIcon = statusConf.icon;
              const isPending = batch.status === "PENDING";
              const isProcessing = processingBatchId === batch.id;
              const isEnriching = enrichingBatchId === batch.id;
              const isExpanded = expandedBatchId === batch.id;

              return (
                <div key={batch.id} className="bg-surface-50 rounded-lg overflow-hidden">
                  {/* Batch row */}
                  <div className="flex items-center gap-4 p-3">
                    <StatusIcon
                      className={`h-5 w-5 flex-shrink-0 ${statusConf.color.split(" ")[0]} ${
                        batch.status === "PROCESSING" || isProcessing ? "animate-spin" : ""
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {batch.fileName || `Batch ${batch.id.slice(0, 8)}`}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${statusConf.color}`}>
                          {statusConf.label}
                        </span>
                        <span className="text-[10px] text-text-muted uppercase">{batch.format}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-text-muted">
                        <span>{batch.totalItems} itens</span>
                        {batch.status === "COMPLETED" && (
                          <>
                            <span className="text-green-600">{batch.imported} importados</span>
                            {batch.rejected > 0 && (
                              <span className="text-red-500">{batch.rejected} rejeitados</span>
                            )}
                          </>
                        )}
                        <span>
                          {new Date(batch.createdAt).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isPending && (
                        <>
                          <button
                            onClick={() => handleEnrich(batch.id)}
                            disabled={isEnriching}
                            className="btn-secondary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isEnriching ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            Enriquecer
                          </button>
                          <button
                            onClick={() => handleProcess(batch.id)}
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
                        </>
                      )}

                      <button
                        onClick={() => toggleExpand(batch.id)}
                        className="btn-secondary text-xs px-2 py-1.5"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Expanded candidate detail */}
                  {isExpanded && (
                    <div className="border-t border-surface-200 bg-white p-4 space-y-4">
                      {/* Pipeline visualization */}
                      {expandedCandidates.length > 0 && (
                        <PipelineStages candidates={expandedCandidates} />
                      )}

                      {/* Filter + batch actions */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <Filter className="h-3.5 w-3.5 text-text-muted" />
                          <select
                            value={candidateFilter}
                            onChange={(e) => {
                              setCandidateFilter(e.target.value);
                              setSelectedCandidates(new Set());
                            }}
                            className="text-xs border border-surface-200 rounded px-2 py-1 bg-white text-text-primary"
                          >
                            <option value="ALL">Todos ({expandedCandidates.length})</option>
                            {PIPELINE_STAGES.map((s) => {
                              const count = expandedCandidates.filter(
                                (c) => getSubStatus(c) === s.key,
                              ).length;
                              return (
                                <option key={s.key} value={s.key}>
                                  {s.label} ({count})
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        {selectedCandidates.size > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-text-muted">
                              {selectedCandidates.size} selecionados
                            </span>
                            <button
                              onClick={() => handleBatchAction("approve")}
                              disabled={batchActionLoading}
                              className="text-xs px-2.5 py-1 rounded bg-green-100 text-green-700 hover:bg-green-200 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Check className="h-3 w-3" />
                              Aprovar
                            </button>
                            <button
                              onClick={() => handleBatchAction("reject")}
                              disabled={batchActionLoading}
                              className="text-xs px-2.5 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <X className="h-3 w-3" />
                              Rejeitar
                            </button>
                            <button
                              onClick={() => handleBatchAction("publish")}
                              disabled={batchActionLoading}
                              className="text-xs px-2.5 py-1 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 inline-flex items-center gap-1 disabled:opacity-50"
                            >
                              <Send className="h-3 w-3" />
                              Publicar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Candidate list */}
                      {loadingCandidates ? (
                        <div className="flex items-center justify-center py-4 text-text-muted">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Carregando candidatos...
                        </div>
                      ) : filtered.length === 0 ? (
                        <p className="text-xs text-text-muted text-center py-4">
                          Nenhum candidato neste filtro
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {/* Select all */}
                          <div className="flex items-center gap-2 px-2 py-1">
                            <input
                              type="checkbox"
                              checked={selectedCandidates.size === filtered.length && filtered.length > 0}
                              onChange={selectAllFiltered}
                              className="rounded border-surface-300"
                            />
                            <span className="text-[10px] text-text-muted uppercase tracking-wider">
                              Selecionar todos ({filtered.length})
                            </span>
                          </div>

                          {filtered.slice(0, 50).map((c) => {
                            const sub = getSubStatus(c);
                            const stage = getStageConfig(sub);
                            const StageIcon = stage.icon;
                            const trust = c.enrichedData?.trustScore;

                            return (
                              <div
                                key={c.id}
                                className="flex items-center gap-3 px-2 py-2 rounded hover:bg-surface-50 text-sm"
                              >
                                <input
                                  type="checkbox"
                                  checked={selectedCandidates.has(c.id)}
                                  onChange={() => toggleCandidateSelection(c.id)}
                                  className="rounded border-surface-300 flex-shrink-0"
                                />

                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${stage.color} flex-shrink-0`}>
                                  <StageIcon className="h-2.5 w-2.5" />
                                  {stage.label}
                                </span>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-text-primary truncate">{c.title}</p>
                                  <div className="flex items-center gap-2 text-[10px] text-text-muted">
                                    {c.brand && <span>{c.brand}</span>}
                                    {c.category && <span>{c.category}</span>}
                                    {c.price != null && (
                                      <span className="text-green-600 font-medium">
                                        R$ {c.price.toFixed(2)}
                                      </span>
                                    )}
                                    {c.enrichedData?.shippingSignals?.hasFreeShipping && (
                                      <span className="text-blue-600">Frete gratis</span>
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
                                  >
                                    {trust}
                                  </span>
                                )}

                                {c.rejectionNote && (
                                  <span className="text-[10px] text-red-500 truncate max-w-[150px]" title={c.rejectionNote}>
                                    {c.rejectionNote}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
