"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Radio,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  BarChart3,
  List,
  Settings,
  RefreshCw,
  Trash2,
  Check,
  X,
  ExternalLink,
  Zap,
  AlertTriangle,
} from "lucide-react";

type Tab = "ingest" | "review" | "stats" | "config";

interface ReviewItem {
  id: string;
  title: string;
  price: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  affiliateUrl: string | null;
  externalId: string | null;
  status: string;
  score: number | null;
  marketplace: string | null;
  sourceChannel: string | null;
  discount: number | null;
  couponCode: string | null;
  isFreeShipping: boolean;
  productUrl: string | null;
  parseErrors: string[];
  rejectionNote: string | null;
  createdAt: string;
}

interface Stats {
  enabled: boolean;
  autoPublish: boolean;
  stats: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    imported: number;
    avgScore: number;
    scoreDistribution: { high: number; medium: number; low: number };
  };
  recentBatches: Array<{
    id: string;
    status: string;
    totalItems: number;
    imported: number;
    rejected: number;
    createdAt: string;
    processedAt: string | null;
  }>;
}

function formatPrice(val: number | null): string {
  if (!val) return "—";
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-text-muted text-xs">—</span>;
  const color =
    score >= 70
      ? "bg-accent-green/15 text-accent-green border-accent-green/20"
      : score >= 40
        ? "bg-accent-orange/15 text-accent-orange border-accent-orange/20"
        : "bg-red-500/15 text-red-400 border-red-500/20";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {score}
    </span>
  );
}

export default function PromosAppPage() {
  const [tab, setTab] = useState<Tab>("ingest");
  const [loading, setLoading] = useState(false);

  // Ingest state
  const [rawInput, setRawInput] = useState("");
  const [ingestResult, setIngestResult] = useState<any>(null);

  // Review state
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [reviewTotal, setReviewTotal] = useState(0);
  const [reviewStatus, setReviewStatus] = useState("PENDING");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Error toast state
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  // Stats state
  const [stats, setStats] = useState<Stats | null>(null);

  const headers: HeadersInit = {};
  if (typeof window !== "undefined") {
    const secret = document.cookie
      .split(";")
      .find((c) => c.trim().startsWith("admin-auth="))
      ?.split("=")[1];
    // Admin API uses cookie auth (middleware handles it)
  }

  // ── Ingest ──

  async function handleIngest() {
    if (!rawInput.trim()) return;
    setLoading(true);
    setIngestResult(null);

    try {
      let events: any[];

      // Try JSON parse first
      try {
        const parsed = JSON.parse(rawInput);
        events = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        // Treat as line-separated text messages
        events = rawInput
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => ({
            rawText: line.trim(),
            capturedAt: new Date().toISOString(),
            sourceChannel: "manual-paste",
          }));
      }

      const res = await fetch("/api/admin/promosapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });

      const data = await res.json();
      if (!res.ok) {
        setIngestResult({ error: data.error || `HTTP ${res.status}` });
      } else {
        setIngestResult(data);
      }
    } catch (err) {
      setIngestResult({ error: `Falha na requisição: ${String(err)}` });
    } finally {
      setLoading(false);
    }
  }

  // ── Review ──

  const fetchReview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/promosapp/review?status=${reviewStatus}&limit=50`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || `Falha ao carregar revisão (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setReviewItems(data.items || []);
      setReviewTotal(data.total || 0);
      setSelectedIds(new Set());
    } catch (err) {
      setErrorMsg(`Falha ao carregar revisão: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [reviewStatus]);

  async function handleReviewAction(action: "approve" | "reject") {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promosapp/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || `Falha ao ${action === "approve" ? "aprovar" : "rejeitar"} (HTTP ${res.status})`);
        return;
      }
      await res.json();
      await fetchReview();
    } catch (err) {
      setErrorMsg(`Falha na ação: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  // ── Stats ──

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/promosapp");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || `Falha ao carregar stats (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setErrorMsg(`Falha ao carregar stats: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "review") fetchReview();
    if (tab === "stats") fetchStats();
  }, [tab, fetchReview, fetchStats]);

  const tabs = [
    { id: "ingest" as Tab, label: "Ingerir", icon: Upload },
    { id: "review" as Tab, label: "Revisao", icon: List },
    { id: "stats" as Tab, label: "Stats", icon: BarChart3 },
    { id: "config" as Tab, label: "Config", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Radio className="h-6 w-6 text-brand-500" />
          PromosApp
        </h1>
        <p className="text-sm text-text-muted">
          Radar de promocoes — ingestao, scoring e revisao de ofertas
        </p>
      </div>

      {/* Error Toast */}
      {errorMsg && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2 bg-red-500/95 text-white px-4 py-3 rounded-lg shadow-lg text-sm max-w-md animate-in slide-in-from-right">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <p className="flex-1">{errorMsg}</p>
          <button onClick={() => setErrorMsg(null)} className="text-white/70 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-surface-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-brand-500 text-brand-500"
                : "border-transparent text-text-muted hover:text-text-primary"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Ingest Tab ── */}
      {tab === "ingest" && (
        <div className="space-y-4">
          <div className="card p-5">
            <h2 className="text-lg font-semibold text-text-primary mb-3">
              Colar Promos
            </h2>
            <p className="text-sm text-text-muted mb-3">
              Cole JSON do PromosApp ou mensagens de texto (uma por linha).
              O sistema vai parsear, normalizar, deduplicar e pontuar.
            </p>
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              rows={10}
              className="w-full rounded-lg border border-surface-200 bg-surface-50 px-3 py-2 text-sm text-text-primary font-mono placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand-500/40"
              placeholder={`Cole aqui JSON ou mensagens de texto...\n\nExemplo JSON:\n[{"rawTitle": "iPhone 15 128GB", "rawUrl": "https://mercadolivre.com.br/...", "rawPrice": "R$ 3.999"}]\n\nOu texto livre:\n🔥 iPhone 15 128GB por R$ 3.999 https://mercadolivre.com.br/...`}
            />
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={handleIngest}
                disabled={loading || !rawInput.trim()}
                className="btn-primary flex items-center gap-2"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Processar
              </button>
              <button
                onClick={() => {
                  setRawInput("");
                  setIngestResult(null);
                }}
                className="btn-ghost text-sm"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Ingest Result */}
          {ingestResult && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Resultado
              </h3>
              {ingestResult.error ? (
                <p className="text-sm text-red-400">{ingestResult.error}</p>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Recebidos", value: ingestResult.received, color: "text-text-primary" },
                      { label: "Parseados", value: ingestResult.parsed, color: "text-accent-blue" },
                      { label: "Duplicados", value: ingestResult.duplicatesSkipped, color: "text-text-muted" },
                      { label: "Enriquecidos", value: ingestResult.enriched, color: "text-accent-purple" },
                      { label: "Auto-aprovados", value: ingestResult.autoApproved, color: "text-accent-green" },
                      { label: "Em revisao", value: ingestResult.pendingReview, color: "text-accent-orange" },
                      { label: "Rejeitados", value: ingestResult.rejected, color: "text-red-400" },
                      { label: "Importados", value: ingestResult.imported, color: "text-brand-500" },
                    ].map((s) => (
                      <div key={s.label} className="bg-surface-50 rounded-lg p-2.5">
                        <p className="text-xs text-text-muted">{s.label}</p>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value ?? 0}</p>
                      </div>
                    ))}
                  </div>
                  {ingestResult.errors?.length > 0 && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-red-400 mb-1">Erros:</p>
                      {ingestResult.errors.map((e: string, i: number) => (
                        <p key={i} className="text-xs text-red-300">{e}</p>
                      ))}
                    </div>
                  )}
                  {ingestResult.durationMs && (
                    <p className="text-xs text-text-muted">
                      Processado em {ingestResult.durationMs}ms
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Review Tab ── */}
      {tab === "review" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {["PENDING", "APPROVED", "REJECTED", "IMPORTED"].map((s) => (
                <button
                  key={s}
                  onClick={() => setReviewStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    reviewStatus === s
                      ? "bg-brand-500/15 text-brand-500 border border-brand-500/20"
                      : "bg-surface-100 text-text-muted hover:text-text-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-muted">{reviewTotal} total</span>
              {reviewStatus === "PENDING" && selectedIds.size > 0 && (
                <>
                  <button
                    onClick={() => handleReviewAction("approve")}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green/15 text-accent-green hover:bg-accent-green/25"
                  >
                    <Check className="h-3 w-3" /> Aprovar ({selectedIds.size})
                  </button>
                  <button
                    onClick={() => handleReviewAction("reject")}
                    disabled={loading}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25"
                  >
                    <X className="h-3 w-3" /> Rejeitar ({selectedIds.size})
                  </button>
                </>
              )}
              <button onClick={fetchReview} className="btn-ghost p-1.5">
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {reviewItems.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-text-muted">Nenhum item com status {reviewStatus}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-surface-200">
                    {reviewStatus === "PENDING" && (
                      <th className="py-2 px-2 w-8">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === reviewItems.length && reviewItems.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(new Set(reviewItems.map((r) => r.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                    )}
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Produto</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Preco</th>
                    <th className="text-center py-2 text-xs text-text-muted font-medium">Score</th>
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Loja</th>
                    <th className="text-left py-2 text-xs text-text-muted font-medium">Canal</th>
                    <th className="text-right py-2 text-xs text-text-muted font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {reviewItems.map((item) => (
                    <tr key={item.id} className="border-b border-surface-100 hover:bg-surface-50">
                      {reviewStatus === "PENDING" && (
                        <td className="py-2 px-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(item.id)}
                            onChange={(e) => {
                              const next = new Set(selectedIds);
                              if (e.target.checked) next.add(item.id);
                              else next.delete(item.id);
                              setSelectedIds(next);
                            }}
                            className="rounded"
                          />
                        </td>
                      )}
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          {item.imageUrl && (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-text-primary font-medium truncate max-w-[300px]">
                              {item.title}
                            </p>
                            {item.productUrl && (
                              <a
                                href={item.productUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-accent-blue hover:underline flex items-center gap-0.5"
                              >
                                <ExternalLink className="h-3 w-3" /> Link
                              </a>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        <p className="font-medium text-text-primary">{formatPrice(item.price)}</p>
                        {item.discount && item.discount > 0 && (
                          <p className="text-xs text-accent-green">-{item.discount}%</p>
                        )}
                      </td>
                      <td className="py-2 text-center">
                        <ScoreBadge score={item.score} />
                      </td>
                      <td className="py-2 text-text-secondary text-xs">{item.marketplace || "—"}</td>
                      <td className="py-2 text-text-muted text-xs truncate max-w-[120px]">
                        {item.sourceChannel || "—"}
                      </td>
                      <td className="py-2 text-right text-text-muted text-xs">
                        {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Stats Tab ── */}
      {tab === "stats" && (
        <div className="space-y-4">
          {!stats ? (
            <div className="card p-8 text-center">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto text-text-muted" />
            </div>
          ) : (
            <>
              {/* Status badges */}
              <div className="flex gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    stats.enabled
                      ? "bg-accent-green/15 text-accent-green"
                      : "bg-red-500/15 text-red-400"
                  }`}
                >
                  {stats.enabled ? "Enabled" : "Disabled"}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    stats.autoPublish
                      ? "bg-accent-orange/15 text-accent-orange"
                      : "bg-surface-200 text-text-muted"
                  }`}
                >
                  Auto-publish: {stats.autoPublish ? "ON" : "OFF (shadow)"}
                </span>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Total", value: stats.stats.total, icon: BarChart3, color: "text-text-primary" },
                  { label: "Pendentes", value: stats.stats.pending, icon: Clock, color: "text-accent-orange" },
                  { label: "Aprovados", value: stats.stats.approved, icon: CheckCircle2, color: "text-accent-green" },
                  { label: "Rejeitados", value: stats.stats.rejected, icon: XCircle, color: "text-red-400" },
                  { label: "Importados", value: stats.stats.imported, icon: Zap, color: "text-brand-500" },
                ].map((s) => (
                  <div key={s.label} className="card p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <s.icon className={`h-4 w-4 ${s.color}`} />
                      <span className="text-xs text-text-muted">{s.label}</span>
                    </div>
                    <p className={`text-2xl font-bold font-display ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Score Distribution */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-3">
                  Distribuicao de Score (7d)
                </h3>
                <div className="flex gap-4">
                  <div className="flex-1 bg-accent-green/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-accent-green">
                      {stats.stats.scoreDistribution.high}
                    </p>
                    <p className="text-xs text-text-muted">Alta (&ge;70)</p>
                  </div>
                  <div className="flex-1 bg-accent-orange/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-accent-orange">
                      {stats.stats.scoreDistribution.medium}
                    </p>
                    <p className="text-xs text-text-muted">Media (40-69)</p>
                  </div>
                  <div className="flex-1 bg-red-500/10 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-400">
                      {stats.stats.scoreDistribution.low}
                    </p>
                    <p className="text-xs text-text-muted">Baixa (&lt;40)</p>
                  </div>
                </div>
                {stats.stats.avgScore > 0 && (
                  <p className="text-xs text-text-muted mt-2">
                    Score medio: <strong>{stats.stats.avgScore}</strong>
                  </p>
                )}
              </div>

              {/* Recent Batches */}
              {stats.recentBatches.length > 0 && (
                <div className="card p-5">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">
                    Batches Recentes
                  </h3>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-surface-200">
                        <th className="text-left py-2 text-xs text-text-muted">Status</th>
                        <th className="text-right py-2 text-xs text-text-muted">Items</th>
                        <th className="text-right py-2 text-xs text-text-muted">Importados</th>
                        <th className="text-right py-2 text-xs text-text-muted">Rejeitados</th>
                        <th className="text-right py-2 text-xs text-text-muted">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentBatches.map((b) => (
                        <tr key={b.id} className="border-b border-surface-100">
                          <td className="py-2">
                            <span
                              className={`text-xs font-medium ${
                                b.status === "COMPLETED"
                                  ? "text-accent-green"
                                  : b.status === "FAILED"
                                    ? "text-red-400"
                                    : "text-accent-orange"
                              }`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2 text-right text-text-secondary">{b.totalItems}</td>
                          <td className="py-2 text-right text-accent-green">{b.imported}</td>
                          <td className="py-2 text-right text-red-400">{b.rejected}</td>
                          <td className="py-2 text-right text-text-muted text-xs">
                            {new Date(b.createdAt).toLocaleDateString("pt-BR")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Config Tab ── */}
      {tab === "config" && (
        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Feature Flags
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary font-medium">FF_PROMOSAPP_ENABLED</p>
                  <p className="text-xs text-text-muted">Ativa a integracao PromosApp</p>
                </div>
                <code className="text-xs bg-surface-100 px-2 py-1 rounded">
                  Definir via env var
                </code>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-primary font-medium">FF_PROMOSAPP_AUTO_PUBLISH</p>
                  <p className="text-xs text-text-muted">
                    Publicacao automatica de items com score alto (shadow mode = OFF)
                  </p>
                </div>
                <code className="text-xs bg-surface-100 px-2 py-1 rounded">
                  Definir via env var
                </code>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Thresholds de Score
            </h3>
            <div className="space-y-2 text-sm text-text-secondary">
              <p>
                <strong className="text-accent-green">Auto-approve:</strong> score &ge; 70
              </p>
              <p>
                <strong className="text-accent-orange">Review:</strong> score 40-69
              </p>
              <p>
                <strong className="text-red-400">Reject:</strong> score &lt; 40
              </p>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-text-primary mb-3">
              Webhook
            </h3>
            <div className="space-y-2 text-sm">
              <p className="text-text-secondary">
                Endpoint: <code className="bg-surface-100 px-1.5 py-0.5 rounded text-xs">/api/webhooks/promosapp</code>
              </p>
              <p className="text-text-muted text-xs">
                Configure PROMOSAPP_WEBHOOK_SECRET para ativar. Dois modos suportados:
              </p>
              <ul className="text-text-muted text-xs list-disc list-inside mt-1 space-y-0.5">
                <li><strong>HMAC (recomendado):</strong> x-promosapp-signature: sha256=HMAC_HEX_DO_BODY</li>
                <li><strong>Secret estático:</strong> x-webhook-secret: SEU_SECRET</li>
              </ul>
            </div>
          </div>

          <div className="card p-5 border-accent-orange/20 bg-accent-orange/5">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-accent-orange mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">Shadow Mode</h3>
                <p className="text-xs text-text-muted">
                  Com FF_PROMOSAPP_AUTO_PUBLISH=false, tudo e processado e pontuado
                  mas nada e publicado automaticamente no site. Items aprovados ficam
                  na fila para importacao manual ou via cron job.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
