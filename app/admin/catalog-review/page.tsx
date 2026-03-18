"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Check,
  X,
  ExternalLink,
  AlertTriangle,
  Filter,
  Layers,
} from "lucide-react";

interface ReviewItem {
  id: string;
  title: string;
  price: number | null;
  originalPrice: number | null;
  imageUrl: string | null;
  affiliateUrl: string | null;
  externalId: string | null;
  sourceSlug: string | null;
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

interface SourceCount {
  slug: string;
  count: number;
}

function formatPrice(val: number | null): string {
  if (!val) return "\u2014";
  return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-text-muted text-xs">\u2014</span>;
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

function SourceBadge({ source }: { source: string | null }) {
  const label = source || "unknown";
  const colors: Record<string, string> = {
    promosapp: "bg-purple-500/15 text-purple-400 border-purple-500/20",
    mercadolivre: "bg-yellow-500/15 text-yellow-600 border-yellow-500/20",
    "amazon-br": "bg-orange-500/15 text-orange-500 border-orange-500/20",
    shopee: "bg-red-500/15 text-red-400 border-red-500/20",
    unknown: "bg-surface-200 text-text-muted border-surface-300",
  };
  const colorClass = colors[label] || "bg-surface-200 text-text-muted border-surface-300";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${colorClass}`}>
      {label}
    </span>
  );
}

export default function CatalogReviewPage() {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<SourceCount[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (errorMsg) {
      const t = setTimeout(() => setErrorMsg(null), 5000);
      return () => clearTimeout(t);
    }
  }, [errorMsg]);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status,
        limit: "50",
      });
      if (sourceFilter) params.set("source", sourceFilter);

      const res = await fetch(`/api/admin/catalog/review?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || `Falha ao carregar (HTTP ${res.status})`);
        return;
      }
      const data = await res.json();
      setItems(data.items || []);
      setTotal(data.total || 0);
      setSources(data.sources || []);
      setSelectedIds(new Set());
    } catch (err) {
      setErrorMsg(`Falha ao carregar: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, [status, sourceFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleAction(action: "approve" | "reject") {
    if (selectedIds.size === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/catalog/review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || `Falha (HTTP ${res.status})`);
        return;
      }
      await fetchItems();
    } catch (err) {
      setErrorMsg(`Falha: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
          <Layers className="h-6 w-6 text-brand-500" />
          Revisao Unificada
        </h1>
        <p className="text-sm text-text-muted">
          Todos os candidatos de todas as fontes — ML, Amazon, PromosApp, etc.
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

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Status Filter */}
        <div className="flex gap-2">
          {["PENDING", "APPROVED", "REJECTED", "IMPORTED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === s
                  ? "bg-brand-500/15 text-brand-500 border border-brand-500/20"
                  : "bg-surface-100 text-text-muted hover:text-text-primary"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Source Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-text-muted" />
          <button
            onClick={() => setSourceFilter(null)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              !sourceFilter
                ? "bg-brand-500/15 text-brand-500 border border-brand-500/20"
                : "bg-surface-100 text-text-muted hover:text-text-primary"
            }`}
          >
            Todas ({sources.reduce((s, c) => s + c.count, 0)})
          </button>
          {sources.map((src) => (
            <button
              key={src.slug}
              onClick={() => setSourceFilter(src.slug)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                sourceFilter === src.slug
                  ? "bg-brand-500/15 text-brand-500 border border-brand-500/20"
                  : "bg-surface-100 text-text-muted hover:text-text-primary"
              }`}
            >
              {src.slug} ({src.count})
            </button>
          ))}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-text-muted">{total} total</span>
        <div className="flex items-center gap-2">
          {status === "PENDING" && selectedIds.size > 0 && (
            <>
              <button
                onClick={() => handleAction("approve")}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-green/15 text-accent-green hover:bg-accent-green/25"
              >
                <Check className="h-3 w-3" /> Aprovar ({selectedIds.size})
              </button>
              <button
                onClick={() => handleAction("reject")}
                disabled={loading}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/15 text-red-400 hover:bg-red-500/25"
              >
                <X className="h-3 w-3" /> Rejeitar ({selectedIds.size})
              </button>
            </>
          )}
          <button onClick={fetchItems} className="btn-ghost p-1.5">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-text-muted">
            Nenhum item {sourceFilter ? `de ${sourceFilter}` : ""} com status {status}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-200">
                {status === "PENDING" && (
                  <th className="py-2 px-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === items.length && items.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(items.map((r) => r.id)));
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
                <th className="text-center py-2 text-xs text-text-muted font-medium">Fonte</th>
                <th className="text-left py-2 text-xs text-text-muted font-medium">Loja</th>
                <th className="text-left py-2 text-xs text-text-muted font-medium">Canal</th>
                <th className="text-right py-2 text-xs text-text-muted font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-surface-100 hover:bg-surface-50">
                  {status === "PENDING" && (
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
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
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
                    {item.discount != null && item.discount > 0 && (
                      <p className="text-xs text-accent-green">-{item.discount}%</p>
                    )}
                  </td>
                  <td className="py-2 text-center">
                    <ScoreBadge score={item.score} />
                  </td>
                  <td className="py-2 text-center">
                    <SourceBadge source={item.sourceSlug} />
                  </td>
                  <td className="py-2 text-text-secondary text-xs">{item.marketplace || "\u2014"}</td>
                  <td className="py-2 text-text-muted text-xs truncate max-w-[120px]">
                    {item.sourceChannel || "\u2014"}
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
  );
}
