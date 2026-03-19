"use client";

import { useState, useEffect } from "react";
import {
  Rss,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ImageOff,
  DollarSign,
  Link2,
  Package,
  RefreshCw,
} from "lucide-react";

interface FeedHealthData {
  totalProducts: number;
  eligibleProducts: number;
  reasons: {
    noImage: number;
    noActiveOffer: number;
    noAffiliate: number;
    priceOutOfRange: number;
    inactive: number;
  };
  topCategories: { name: string; count: number }[];
  topBrands: { name: string; count: number }[];
  sampleProducts: { name: string; price: number; brand: string | null }[];
  feedUrl: string;
  lastChecked: string;
}

export default function FeedHealthPage() {
  const [data, setData] = useState<FeedHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/feed-health", {
        headers: { "x-admin-secret": document.cookie.match(/admin_token=([^;]+)/)?.[1] || "" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Rss className="h-5 w-5 text-brand-purple" />
          <h1 className="text-xl font-bold">Feed Health</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-surface-50 rounded-lg h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          <p className="font-medium">Erro ao carregar feed health</p>
          <p className="text-sm mt-1">{error}</p>
          <button onClick={fetchData} className="mt-2 text-sm underline">Tentar novamente</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const eligibilityRate = data.totalProducts > 0
    ? Math.round((data.eligibleProducts / data.totalProducts) * 100)
    : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Rss className="h-5 w-5 text-brand-purple" />
          <h1 className="text-xl font-bold">Google Merchant Feed Health</h1>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-surface-100 hover:bg-surface-200 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Atualizar
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Package className="h-4 w-4 text-blue-500" />}
          label="Total Produtos"
          value={data.totalProducts}
        />
        <StatCard
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
          label="Elegíveis Feed"
          value={data.eligibleProducts}
          sub={`${eligibilityRate}%`}
        />
        <StatCard
          icon={eligibilityRate >= 50
            ? <CheckCircle className="h-4 w-4 text-green-500" />
            : <AlertTriangle className="h-4 w-4 text-amber-500" />
          }
          label="Taxa Elegibilidade"
          value={`${eligibilityRate}%`}
        />
        <StatCard
          icon={<Rss className="h-4 w-4 text-purple-500" />}
          label="Feed URL"
          value="Ativo"
          sub="/api/feed/google-merchant"
        />
      </div>

      {/* Exclusion reasons */}
      <div className="bg-white rounded-lg border border-surface-200 p-4">
        <h2 className="text-sm font-semibold mb-3">Motivos de Exclusão do Feed</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <ReasonCard icon={<ImageOff className="h-4 w-4" />} label="Sem imagem" count={data.reasons.noImage} />
          <ReasonCard icon={<XCircle className="h-4 w-4" />} label="Sem oferta ativa" count={data.reasons.noActiveOffer} />
          <ReasonCard icon={<Link2 className="h-4 w-4" />} label="Sem afiliado" count={data.reasons.noAffiliate} />
          <ReasonCard icon={<DollarSign className="h-4 w-4" />} label="Preço inválido" count={data.reasons.priceOutOfRange} />
          <ReasonCard icon={<AlertTriangle className="h-4 w-4" />} label="Inativo" count={data.reasons.inactive} />
        </div>
      </div>

      {/* Top categories + brands */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-surface-200 p-4">
          <h2 className="text-sm font-semibold mb-3">Top Categorias no Feed</h2>
          {data.topCategories.length > 0 ? (
            <div className="space-y-2">
              {data.topCategories.map((c) => (
                <div key={c.name} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{c.name}</span>
                  <span className="font-medium">{c.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Sem dados de categoria</p>
          )}
        </div>
        <div className="bg-white rounded-lg border border-surface-200 p-4">
          <h2 className="text-sm font-semibold mb-3">Top Marcas no Feed</h2>
          {data.topBrands.length > 0 ? (
            <div className="space-y-2">
              {data.topBrands.map((b) => (
                <div key={b.name} className="flex justify-between text-sm">
                  <span className="text-text-secondary">{b.name}</span>
                  <span className="font-medium">{b.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-muted">Sem dados de marca</p>
          )}
        </div>
      </div>

      <p className="text-xs text-text-muted">
        Última verificação: {data.lastChecked}
      </p>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-surface-200 p-3">
      <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
        {icon}
        {label}
      </div>
      <p className="text-lg font-bold">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</p>
      {sub && <p className="text-xs text-text-muted">{sub}</p>}
    </div>
  );
}

function ReasonCard({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div className={`rounded-lg p-3 text-center ${count > 0 ? 'bg-red-50 border border-red-100' : 'bg-green-50 border border-green-100'}`}>
      <div className="flex justify-center mb-1 text-text-muted">{icon}</div>
      <p className="text-lg font-bold">{count}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
