"use client";

import { useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";

interface EmailCaptureProps {
  context?: string;
  compact?: boolean;
}

export default function EmailCapture({ context = "general", compact = false }: EmailCaptureProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;

    setStatus("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: context }),
      });
      if (res.ok) {
        setStatus("success");
        localStorage.setItem("ps_subscribed", "true");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  // Don't show if already subscribed
  if (typeof window !== "undefined" && localStorage.getItem("ps_subscribed") === "true") {
    return null;
  }

  if (status === "success") {
    return (
      <div className={`flex items-center gap-2 ${compact ? "p-2" : "p-4"} rounded-xl bg-green-50 border border-accent-green/20`}>
        <Check className="w-4 h-4 text-accent-green flex-shrink-0" />
        <p className="text-sm text-accent-green font-medium">Inscrito! Vamos avisar sobre as melhores ofertas.</p>
      </div>
    );
  }

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:border-brand-500"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50"
        >
          {status === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
        </button>
      </form>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-500/15">
      <div className="flex items-center gap-2 mb-2">
        <Bell className="w-4 h-4 text-brand-500" />
        <h3 className="text-sm font-bold font-display text-text-primary">Receba alertas de ofertas</h3>
      </div>
      <p className="text-xs text-text-muted mb-3">
        Cadastre seu email para receber notificacoes quando os precos cairem.
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="flex-1 px-3 py-2 rounded-lg border border-surface-200 text-sm focus:outline-none focus:border-brand-500"
          required
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {status === "loading" ? "..." : "Quero alertas"}
        </button>
      </form>
      {status === "error" && (
        <p className="text-xs text-accent-red mt-1">Erro ao cadastrar. Tente novamente.</p>
      )}
    </div>
  );
}
