"use client";

import { useState } from "react";
import { Bell, BellRing, X, Loader2 } from "lucide-react";

interface Props {
  listingId: string;
  currentPrice: number;
  productName: string;
}

export default function PriceAlertForm({ listingId, currentPrice, productName }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [targetPrice, setTargetPrice] = useState(
    Math.floor(currentPrice * 0.9) // suggest 10% below current
  );
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, email, targetPrice }),
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
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent-orange/10 text-accent-orange text-sm font-medium hover:bg-accent-orange/20 transition-colors"
      >
        <Bell className="w-4 h-4" />
        Alertar quando baixar
      </button>
    );
  }

  return (
    <div className="card p-4 border-accent-orange/30 border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-accent-orange font-semibold text-sm">
          <BellRing className="w-4 h-4" />
          Alerta de Preço
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
            Você receberá um aviso quando o preço atingir R$ {targetPrice.toFixed(2)}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-text-muted">
            Receba um aviso quando <strong className="text-text-secondary">{productName}</strong> atingir o preço desejado.
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
              Preço alvo (atual: R$ {currentPrice.toFixed(2)})
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
          </div>

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
