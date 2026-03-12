"use client";

import { useState } from "react";
import { Bell, BellRing, X, Loader2, TrendingDown } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface Props {
  listingId: string;
  currentPrice: number;
  productName: string;
}

function ProgressBar({ current, target }: { current: number; target: number }) {
  // Visual: how close is the current price to the target
  // 100% = target reached, 0% = at original/max price
  const maxDisplayPrice = current * 1.3; // use 130% of current as "top" reference
  const range = maxDisplayPrice - target;
  const progress = range > 0 ? Math.min(100, Math.max(0, ((maxDisplayPrice - current) / range) * 100)) : 0;

  const percentAway = current > target
    ? Math.round(((current - target) / current) * 100)
    : 0;

  return (
    <div className="mt-3 mb-1">
      <div className="flex items-center justify-between text-[10px] text-text-muted mb-1.5">
        <span>Preco atual: {formatPrice(current)}</span>
        <span>Alvo: {formatPrice(target)}</span>
      </div>
      <div className="relative h-2 bg-surface-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-accent-orange to-accent-green rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
        {/* Target marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-3.5 bg-accent-green rounded-full shadow-sm"
          style={{ left: "100%" }}
        />
      </div>
      {percentAway > 0 && (
        <p className="text-[10px] text-accent-orange mt-1.5 flex items-center gap-1">
          <TrendingDown className="w-3 h-3" />
          Faltam {percentAway}% para atingir seu alvo
        </p>
      )}
      {percentAway === 0 && current <= target && (
        <p className="text-[10px] text-accent-green mt-1.5 font-medium">
          O preco ja esta no alvo ou abaixo!
        </p>
      )}
    </div>
  );
}

export default function PriceAlertForm({ listingId, currentPrice, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    try {
      return localStorage.getItem("ps_email") || "";
    } catch {
      return "";
    }
  });
  const [targetPrice, setTargetPrice] = useState(
    Math.floor(currentPrice * 0.9) // suggest 10% below current
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const suggestedTargets = [
    { label: "-5%", value: Math.floor(currentPrice * 0.95) },
    { label: "-10%", value: Math.floor(currentPrice * 0.9) },
    { label: "-15%", value: Math.floor(currentPrice * 0.85) },
    { label: "-20%", value: Math.floor(currentPrice * 0.8) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Persist email for convenience
      try {
        localStorage.setItem("ps_email", email.trim());
      } catch {}

      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, email: email.trim(), targetPrice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao criar alerta");
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        id="alerta"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-orange/10 text-accent-orange text-sm font-medium hover:bg-accent-orange/20 transition-colors"
      >
        <Bell className="w-4 h-4" />
        Alertar quando baixar
      </button>
    );
  }

  return (
    <div id="alerta" className="card p-4 border-accent-orange/30 border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-accent-orange font-semibold text-sm">
          <BellRing className="w-4 h-4" />
          Alerta de Preco
        </div>
        <button onClick={() => setOpen(false)} className="text-text-muted hover:text-text-primary">
          <X className="w-4 h-4" />
        </button>
      </div>

      {success ? (
        <div className="text-center py-3">
          <BellRing className="w-8 h-8 text-accent-green mx-auto mb-2" />
          <p className="text-sm font-medium text-text-primary">Alerta criado!</p>
          <p className="text-xs text-text-muted mt-1">
            Voce recebera um aviso quando o preco atingir {formatPrice(targetPrice)}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-text-muted">
            Receba um aviso quando <strong className="text-text-secondary">{productName}</strong> atingir o preco desejado.
          </p>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">Seu email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent-orange/30 focus:border-accent-orange"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-text-secondary block mb-1">
              Preco alvo (atual: {formatPrice(currentPrice)})
            </label>
            <input
              type="number"
              required
              min={1}
              step={0.01}
              value={targetPrice}
              onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-orange/30 focus:border-accent-orange"
            />

            {/* Quick target buttons */}
            <div className="flex items-center gap-1.5 mt-2">
              {suggestedTargets.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => setTargetPrice(t.value)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                    targetPrice === t.value
                      ? "bg-accent-orange/20 text-accent-orange border border-accent-orange/30"
                      : "bg-surface-100 text-text-muted hover:bg-surface-200 border border-transparent"
                  }`}
                >
                  {t.label} ({formatPrice(t.value)})
                </button>
              ))}
            </div>
          </div>

          {/* Visual progress bar */}
          <ProgressBar current={currentPrice} target={targetPrice} />

          {error && <p className="text-xs text-accent-red">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent-orange text-white text-sm font-semibold hover:bg-accent-orange/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {loading ? "Criando..." : "Criar Alerta"}
          </button>
        </form>
      )}
    </div>
  );
}
