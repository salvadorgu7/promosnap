"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

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

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle }> = {
  PENDING: { label: "Pendente", color: "text-amber-600 bg-amber-50", icon: Clock },
  PROCESSING: { label: "Processando", color: "text-blue-600 bg-blue-50", icon: Loader2 },
  COMPLETED: { label: "Concluido", color: "text-green-600 bg-green-50", icon: CheckCircle },
  FAILED: { label: "Falhou", color: "text-red-600 bg-red-50", icon: XCircle },
};

export default function AdminImportsPage() {
  const [content, setContent] = useState("");
  const [format, setFormat] = useState<"json" | "csv">("json");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [batches, setBatches] = useState<ImportBatchItem[]>([]);
  const [isLoadingBatches, setIsLoadingBatches] = useState(true);
  const [processingBatchId, setProcessingBatchId] = useState<string | null>(null);
  const [processResult, setProcessResult] = useState<ProcessResult | null>(null);

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
        loadBatches(); // Refresh list
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
        loadBatches(); // Refresh list
      } else {
        setUploadError(data.error || `Erro ao processar: ${res.status}`);
      }
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Erro de rede");
    } finally {
      setProcessingBatchId(null);
    }
  }

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

              return (
                <div key={batch.id} className="flex items-center gap-4 p-3 bg-surface-50 rounded-lg">
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

                  {isPending && (
                    <button
                      onClick={() => handleProcess(batch.id)}
                      disabled={isProcessing}
                      className="btn-primary text-xs px-3 py-1.5 inline-flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Processando...
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5" />
                          Processar
                        </>
                      )}
                    </button>
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
