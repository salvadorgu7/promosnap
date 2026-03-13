import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Package,
  TrendingDown,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Loader2,
  BarChart3,
} from "lucide-react";
import { getFeedSyncStats, getBatches } from "@/lib/feed-sync/engine";
import { getJobHistory } from "@/lib/feed-sync/jobs";
import type { FeedSyncBatchRecord, StaleItemInfo, SyncJobStatus } from "@/lib/feed-sync/types";

export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const statusConfig: Record<SyncJobStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  idle: { label: "Idle", color: "text-gray-600", bg: "bg-gray-100", icon: Clock },
  running: { label: "Executando", color: "text-blue-600", bg: "bg-blue-100", icon: Loader2 },
  success: { label: "Sucesso", color: "text-emerald-600", bg: "bg-emerald-100", icon: CheckCircle },
  partial: { label: "Parcial", color: "text-amber-600", bg: "bg-amber-100", icon: AlertTriangle },
  failed: { label: "Falhou", color: "text-red-600", bg: "bg-red-100", icon: XCircle },
};

function StatusBadge({ status }: { status: SyncJobStatus }) {
  const cfg = statusConfig[status] || statusConfig.idle;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: typeof Package; color: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-text-muted font-medium uppercase tracking-wide">{label}</span>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batch detail section (expandable via details/summary)
// ---------------------------------------------------------------------------

function BatchDetailSection({ batch }: { batch: FeedSyncBatchRecord }) {
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs text-accent-blue hover:underline flex items-center gap-1">
        <ChevronRight className="h-3 w-3 group-open:hidden" />
        <ChevronDown className="h-3 w-3 hidden group-open:block" />
        Detalhes
      </summary>
      <div className="mt-2 space-y-3 pl-2 border-l-2 border-surface-200">
        {/* Valid items */}
        {batch.validItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-text-muted mb-1">
              Items validos ({batch.validItems.length})
            </p>
            <div className="space-y-1">
              {batch.validItems.slice(0, 5).map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-text-secondary">
                  <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                  <span className="truncate max-w-[300px]">{item.title}</span>
                  <span className="text-text-muted">R$ {item.price.toFixed(2)}</span>
                  {item.brand && <span className="text-accent-blue text-[10px]">{item.brand}</span>}
                </div>
              ))}
              {batch.validItems.length > 5 && (
                <p className="text-[10px] text-text-muted">+{batch.validItems.length - 5} mais</p>
              )}
            </div>
          </div>
        )}

        {/* Invalid items */}
        {batch.invalidItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-text-muted mb-1">
              Items invalidos ({batch.invalidItems.length})
            </p>
            <div className="space-y-1">
              {batch.invalidItems.slice(0, 5).map((inv, idx) => (
                <div key={idx} className="text-xs">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate max-w-[300px]">{inv.item.title || "(sem titulo)"}</span>
                  </div>
                  <p className="text-[10px] text-text-muted ml-5">{inv.errors.join(", ")}</p>
                </div>
              ))}
              {batch.invalidItems.length > 5 && (
                <p className="text-[10px] text-text-muted">+{batch.invalidItems.length - 5} mais</p>
              )}
            </div>
          </div>
        )}

        {/* Published items */}
        {batch.publishedItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-text-muted mb-1">
              Publicados ({batch.publishedItems.length})
            </p>
            <div className="space-y-1">
              {batch.publishedItems.slice(0, 5).map((pub, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-text-secondary">
                  <Package className="h-3 w-3 text-accent-blue flex-shrink-0" />
                  <span className="truncate max-w-[250px]">{pub.item.title}</span>
                  {pub.candidateId && (
                    <span className="text-[10px] text-text-muted">ID: {pub.candidateId.slice(0, 8)}...</span>
                  )}
                  {pub.productId && (
                    <span className="text-[10px] text-emerald-600">Matched</span>
                  )}
                </div>
              ))}
              {batch.publishedItems.length > 5 && (
                <p className="text-[10px] text-text-muted">+{batch.publishedItems.length - 5} mais</p>
              )}
            </div>
          </div>
        )}

        {/* Errors */}
        {batch.result.errors.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-red-500 mb-1">
              Erros ({batch.result.errors.length})
            </p>
            <div className="space-y-0.5">
              {batch.result.errors.slice(0, 5).map((err, idx) => (
                <p key={idx} className="text-[10px] text-red-500">{err}</p>
              ))}
              {batch.result.errors.length > 5 && (
                <p className="text-[10px] text-text-muted">+{batch.result.errors.length - 5} mais</p>
              )}
            </div>
          </div>
        )}

        {/* Logs */}
        {batch.result.logs.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase text-text-muted mb-1">
              Logs ({batch.result.logs.length})
            </p>
            <div className="bg-surface-50 rounded p-2 space-y-0.5 max-h-32 overflow-y-auto">
              {batch.result.logs.map((logLine, idx) => (
                <p key={idx} className="text-[10px] text-text-muted font-mono">{logLine}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </details>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AdminFeedSyncPage() {
  const stats = getFeedSyncStats();
  const batches = getBatches(30);
  const jobs = getJobHistory(20);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <RefreshCw className="h-6 w-6 text-accent-blue" />
            Feed Sync Engine
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Pipeline de sincronizacao: validacao, normalizacao, enriquecimento e publicacao de feeds
          </p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Total Batches" value={stats.totalBatches} icon={BarChart3} color="text-accent-blue" />
        <StatCard label="Items Processados" value={stats.totalItemsProcessed} icon={Package} color="text-text-secondary" />
        <StatCard label="Validos" value={stats.totalValid} icon={CheckCircle} color="text-emerald-600" />
        <StatCard label="Invalidos" value={stats.totalInvalid} icon={XCircle} color="text-red-500" />
        <StatCard label="Publicados" value={stats.totalPublished} icon={ArrowRight} color="text-accent-blue" />
        <StatCard label="Stale" value={stats.totalStale} icon={TrendingDown} color="text-amber-600" />
      </div>

      {/* Recent Batches */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold font-display text-text-primary">Batches Recentes</h2>
          <span className="text-xs text-text-muted">{batches.length} batches</span>
        </div>

        {batches.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Nenhum batch executado ainda.</p>
            <p className="text-xs mt-1">Use a API POST /api/admin/feed-sync com action=&quot;run-sync&quot; para iniciar.</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {batches.map((batch) => (
              <div key={batch.id} className="p-4 hover:bg-surface-50/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={batch.status} />
                    <span className="text-sm font-medium text-text-primary">{batch.id}</span>
                    <span className="text-xs text-text-muted">source: {batch.sourceId}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <Clock className="h-3 w-3" />
                    {batch.createdAt.toLocaleString("pt-BR")}
                  </div>
                </div>

                {/* Counts row */}
                <div className="flex items-center gap-4 text-xs mb-2">
                  <span className="text-text-secondary">
                    Total: <strong>{batch.result.total}</strong>
                  </span>
                  <span className="text-emerald-600">
                    Validos: <strong>{batch.result.valid}</strong>
                  </span>
                  <span className="text-red-500">
                    Invalidos: <strong>{batch.result.invalid}</strong>
                  </span>
                  <span className="text-accent-blue">
                    Enriquecidos: <strong>{batch.result.enriched}</strong>
                  </span>
                  <span className="text-purple-600">
                    Publicados: <strong>{batch.result.published}</strong>
                  </span>
                  {batch.result.errors.length > 0 && (
                    <span className="text-red-500">
                      Erros: <strong>{batch.result.errors.length}</strong>
                    </span>
                  )}
                </div>

                {/* Expandable detail */}
                <BatchDetailSection batch={batch} />

                {/* Retry button for failed/partial */}
                {(batch.status === "failed" || batch.status === "partial") && (
                  <div className="mt-2">
                    <span className="text-[10px] text-text-muted">
                      Use POST /api/admin/feed-sync com action=&quot;retry-batch&quot; e batchId=&quot;{batch.id}&quot; para re-executar
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job History */}
      {jobs.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-surface-200">
            <h2 className="text-lg font-semibold font-display text-text-primary">Historico de Jobs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50">
                  <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Job ID</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Source</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Status</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Total</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Publicados</th>
                  <th className="text-right py-3 px-4 text-xs text-text-muted font-medium">Stale</th>
                  <th className="text-left py-3 px-4 text-xs text-text-muted font-medium">Erro</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id} className="border-b border-surface-100 hover:bg-surface-50/50">
                    <td className="py-2 px-4 font-mono text-xs text-text-secondary">{job.id}</td>
                    <td className="py-2 px-4 text-text-primary">{job.sourceId}</td>
                    <td className="py-2 px-4">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-2 px-4 text-right text-text-secondary">
                      {job.result?.total ?? "—"}
                    </td>
                    <td className="py-2 px-4 text-right text-text-secondary">
                      {job.result?.published ?? "—"}
                    </td>
                    <td className="py-2 px-4 text-right text-text-secondary">
                      {job.result?.stale ?? "—"}
                    </td>
                    <td className="py-2 px-4 text-xs">
                      {job.error ? (
                        <span className="text-red-500 max-w-[200px] truncate block" title={job.error}>
                          {job.error.length > 60 ? job.error.slice(0, 60) + "..." : job.error}
                        </span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stale Items Section */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold font-display text-text-primary mb-2 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-amber-600" />
          Items Stale
        </h2>
        <p className="text-xs text-text-muted mb-3">
          Ofertas que nao foram atualizadas recentemente. Use POST /api/admin/feed-sync com action=&quot;mark-stale&quot; para marcar ofertas antigas como inativas.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-surface-50 rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">Total Stale Marcados</p>
            <p className="text-xl font-bold text-amber-600">{stats.totalStale}</p>
          </div>
          <div className="bg-surface-50 rounded-lg p-3">
            <p className="text-xs text-text-muted mb-1">Acoes Disponiveis</p>
            <ul className="text-xs text-text-secondary space-y-1 mt-1">
              <li className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                mark-stale: Marcar stale por source
              </li>
              <li className="flex items-center gap-1">
                <ArrowRight className="h-3 w-3" />
                mark-stale (sem sourceId): Cleanup global
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
