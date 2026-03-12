"use client";

import { useEffect, useState, useCallback } from "react";
import { ShieldAlert, RefreshCw, Users, Zap, Clock } from "lucide-react";

interface TopClient {
  ip: string;
  requests: number;
}

interface RateLimitStat {
  type: string;
  config: { maxRequests: number; windowMs: number };
  activeKeys: number;
  totalRequestsInWindow: number;
  topClients: TopClient[];
}

interface StatsResponse {
  timestamp: string;
  stats: RateLimitStat[];
}

export default function RateLimitsPage() {
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const secret = new URLSearchParams(window.location.search).get("secret") || "";
      const res = await fetch(`/api/admin/rate-limits${secret ? `?secret=${secret}` : ""}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10_000); // auto-refresh every 10s
    return () => clearInterval(interval);
  }, [fetchStats]);

  const typeLabels: Record<string, string> = {
    public: "Public API",
    search: "Search",
    clickout: "Clickout",
    alerts: "Alerts",
    newsletter: "Newsletter",
  };

  const typeColors: Record<string, string> = {
    public: "border-blue-200 bg-blue-50",
    search: "border-violet-200 bg-violet-50",
    clickout: "border-emerald-200 bg-emerald-50",
    alerts: "border-amber-200 bg-amber-50",
    newsletter: "border-rose-200 bg-rose-50",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <ShieldAlert className="h-6 w-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">Rate Limits</h1>
            <p className="text-sm text-text-muted">
              Monitoramento em tempo real dos limites de requisicao
            </p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-surface-200 text-sm text-text-secondary hover:bg-surface-100 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </button>
      </div>

      {/* Timestamp */}
      {data && (
        <p className="text-xs text-text-muted">
          Ultima atualizacao: {new Date(data.timestamp).toLocaleString("pt-BR")}
          {" — "}auto-refresh a cada 10s
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Erro ao carregar dados: {error}
        </div>
      )}

      {/* Stats Grid */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.stats.map((stat) => (
            <div
              key={stat.type}
              className={`rounded-xl border p-5 space-y-4 ${typeColors[stat.type] || "border-surface-200 bg-white"}`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-text-primary">
                  {typeLabels[stat.type] || stat.type}
                </h3>
                <span className="text-xs font-mono text-text-muted bg-white/60 px-2 py-0.5 rounded">
                  {stat.config.maxRequests} / {stat.config.windowMs / 1000}s
                </span>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-text-muted" />
                  <div>
                    <p className="text-lg font-bold text-text-primary">{stat.activeKeys}</p>
                    <p className="text-[10px] text-text-muted uppercase">IPs ativos</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-text-muted" />
                  <div>
                    <p className="text-lg font-bold text-text-primary">
                      {stat.totalRequestsInWindow}
                    </p>
                    <p className="text-[10px] text-text-muted uppercase">Req/janela</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-text-muted" />
                  <div>
                    <p className="text-lg font-bold text-text-primary">
                      {stat.config.windowMs / 1000}s
                    </p>
                    <p className="text-[10px] text-text-muted uppercase">Janela</p>
                  </div>
                </div>
              </div>

              {/* Top Clients */}
              {stat.topClients.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                    Top clientes
                  </p>
                  <div className="space-y-0.5">
                    {stat.topClients.slice(0, 5).map((client) => {
                      const pct = Math.min(
                        (client.requests / stat.config.maxRequests) * 100,
                        100
                      );
                      const barColor =
                        pct > 80
                          ? "bg-red-400"
                          : pct > 50
                            ? "bg-amber-400"
                            : "bg-emerald-400";
                      return (
                        <div key={client.ip} className="flex items-center gap-2 text-xs">
                          <span className="font-mono text-text-secondary w-28 truncate">
                            {client.ip}
                          </span>
                          <div className="flex-1 h-1.5 bg-white/50 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${barColor}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-text-muted w-8 text-right">
                            {client.requests}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {stat.topClients.length === 0 && (
                <p className="text-xs text-text-muted italic">Sem atividade na janela atual</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-surface-200 bg-white p-5 space-y-4 animate-pulse"
            >
              <div className="h-5 w-24 bg-surface-200 rounded" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-10 bg-surface-100 rounded" />
                <div className="h-10 bg-surface-100 rounded" />
                <div className="h-10 bg-surface-100 rounded" />
              </div>
              <div className="space-y-1">
                <div className="h-2 w-16 bg-surface-200 rounded" />
                <div className="h-2 bg-surface-100 rounded" />
                <div className="h-2 bg-surface-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
