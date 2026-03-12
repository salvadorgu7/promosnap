"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  RefreshCw,
  Users,
  Zap,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

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
      setError(err instanceof Error ? err.message : "Falha ao carregar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 10_000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const typeLabels: Record<string, string> = {
    public: "API Publica",
    search: "Busca",
    clickout: "Clickout",
    alerts: "Alertas",
    newsletter: "Newsletter",
  };

  const typeColors: Record<string, string> = {
    public: "border-l-blue-500",
    search: "border-l-violet-500",
    clickout: "border-l-emerald-500",
    alerts: "border-l-amber-500",
    newsletter: "border-l-rose-500",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-display text-text-primary">Rate Limits</h1>
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

      {/* Timestamp and auto-refresh indicator */}
      {data && (
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Atualizado: {new Date(data.timestamp).toLocaleString("pt-BR")} — auto-refresh a cada 10s</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Erro ao carregar dados</p>
            <p className="text-xs text-red-700 mt-0.5">{error}</p>
            <p className="text-xs text-red-600 mt-1 opacity-70">
              Verifique se o secret esta correto na URL e se a API esta acessivel.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {data && (
        <>
          {data.stats.length === 0 && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Nenhum rate limiter ativo</p>
                <p className="text-xs text-blue-700 mt-0.5">
                  Nenhuma requisicao recebida nos endpoints protegidos. Isso e normal se o site acabou de iniciar.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.stats.map((stat) => {
              const utilization = stat.config.maxRequests > 0
                ? (stat.totalRequestsInWindow / stat.config.maxRequests) * 100
                : 0;
              const isHigh = utilization > 80;
              const isMedium = utilization > 50;

              return (
                <div
                  key={stat.type}
                  className={`rounded-xl border border-surface-200 bg-white p-5 space-y-4 border-l-4 ${typeColors[stat.type] || "border-l-surface-300"}`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold font-display text-text-primary">
                      {typeLabels[stat.type] || stat.type}
                    </h3>
                    <span className="text-xs font-mono text-text-muted bg-surface-50 px-2 py-0.5 rounded border border-surface-200">
                      {stat.config.maxRequests} / {stat.config.windowMs / 1000}s
                    </span>
                  </div>

                  {/* Metrics Row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-text-muted" />
                      <div>
                        <p className="text-lg font-bold font-display text-text-primary">{stat.activeKeys}</p>
                        <p className="text-[10px] text-text-muted uppercase">IPs ativos</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Zap className={`h-3.5 w-3.5 ${isHigh ? "text-red-500" : isMedium ? "text-amber-500" : "text-text-muted"}`} />
                      <div>
                        <p className={`text-lg font-bold font-display ${isHigh ? "text-red-600" : isMedium ? "text-amber-600" : "text-text-primary"}`}>
                          {stat.totalRequestsInWindow}
                        </p>
                        <p className="text-[10px] text-text-muted uppercase">Req/janela</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-text-muted" />
                      <div>
                        <p className="text-lg font-bold font-display text-text-primary">
                          {stat.config.windowMs / 1000}s
                        </p>
                        <p className="text-[10px] text-text-muted uppercase">Janela</p>
                      </div>
                    </div>
                  </div>

                  {/* Top Clients */}
                  {stat.topClients.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                        Top clientes
                      </p>
                      <div className="space-y-1">
                        {stat.topClients.slice(0, 5).map((client) => {
                          const pct = Math.min(
                            (client.requests / stat.config.maxRequests) * 100,
                            100
                          );
                          const barColor =
                            pct > 80
                              ? "bg-red-500"
                              : pct > 50
                                ? "bg-amber-500"
                                : "bg-emerald-500";
                          return (
                            <div key={client.ip} className="flex items-center gap-2 text-xs">
                              <span className="font-mono text-text-secondary w-28 truncate">
                                {client.ip}
                              </span>
                              <div className="flex-1 h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${barColor} transition-all`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className={`w-8 text-right font-mono ${pct > 80 ? "text-red-600 font-semibold" : "text-text-muted"}`}>
                                {client.requests}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {stat.topClients.length === 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      <span>Sem atividade na janela atual</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
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
