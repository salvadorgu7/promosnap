"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

interface NewsletterProps {
  variant?: "hero" | "compact";
}

async function subscribeEmail(email: string): Promise<void> {
  const res = await fetch("/api/newsletter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Erro ao cadastrar.");
  }
}

export default function Newsletter({ variant = "hero" }: NewsletterProps) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setState("error");
      setErrorMsg("Por favor, insira um e-mail válido.");
      return;
    }

    setState("submitting");
    setErrorMsg("");

    try {
      await subscribeEmail(email);
      setState("success");
    } catch (err: unknown) {
      setState("error");
      setErrorMsg(
        err instanceof Error ? err.message : "Não foi possível cadastrar. Tente novamente."
      );
    }
  };

  const clearError = () => {
    if (state === "error") {
      setState("idle");
      setErrorMsg("");
    }
  };

  if (variant === "compact") {
    return (
      <div className="relative max-w-7xl mx-auto px-4 pt-8 pb-2">
        <div className="card flex flex-col md:flex-row items-center justify-between gap-4 p-4 md:px-6">
          <div className="flex-shrink-0 text-center md:text-left">
            <p className="font-display font-semibold text-sm text-text-primary">
              Receba ofertas verificadas
            </p>
            <p className="text-xs text-text-muted mt-0.5">
              Alertas de desconto direto no seu e-mail, sem spam.
            </p>
          </div>

          {state === "success" ? (
            <div className="flex items-center gap-2 py-2 px-4 rounded-lg bg-accent-green/10 border border-accent-green/20">
              <CheckCircle className="h-4 w-4 text-accent-green flex-shrink-0" />
              <span className="text-sm font-medium text-accent-green">Inscrito com sucesso!</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full md:w-auto">
              <div className="flex items-center gap-2 flex-1 md:flex-initial">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  placeholder="seu@email.com"
                  required
                  disabled={state === "submitting"}
                  aria-label="Seu e-mail para newsletter"
                  className="w-full md:w-56 px-3 py-2 rounded-lg border border-surface-200 bg-white text-sm text-text-primary placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 disabled:opacity-60 transition-all"
                />
                <button
                  type="submit"
                  disabled={state === "submitting"}
                  aria-label="Inscrever na newsletter"
                  className="btn-primary flex items-center gap-1.5 px-4 py-2 text-sm whitespace-nowrap touch-target"
                >
                  {state === "submitting" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Inscrever
                </button>
              </div>
              {state === "error" && errorMsg && (
                <div className="flex items-center gap-1.5 text-xs text-red-500" role="alert">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  // Hero variant (default)
  return (
    <section className="py-5 md:py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-accent-blue to-accent-purple p-4 md:p-12 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative max-w-xl mx-auto text-center">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-2 md:mb-4">
              <Mail className="h-5 w-5 md:h-6 md:w-6 opacity-90" />
            </div>
            <h2 className="font-display font-bold text-xl md:text-2xl mb-1 md:mb-2">
              Receba as melhores ofertas
            </h2>
            <p className="text-white/80 text-xs md:text-sm mb-3 md:mb-6 leading-relaxed">
              Cadastre seu e-mail e receba alertas de ofertas imperdíveis direto na sua caixa.
            </p>

            {state === "success" ? (
              <div className="flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 max-w-sm mx-auto">
                <CheckCircle className="h-5 w-5 text-accent-green flex-shrink-0" />
                <span className="font-medium text-sm">Cadastrado com sucesso! Fique de olho no seu e-mail.</span>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    placeholder="seu@email.com"
                    required
                    disabled={state === "submitting"}
                    aria-label="Seu e-mail para newsletter"
                    className="flex-1 px-4 py-3 rounded-lg bg-white/15 border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm disabled:opacity-60 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={state === "submitting"}
                    aria-label="Cadastrar na newsletter"
                    className="flex items-center gap-2 px-5 py-3 bg-white text-brand-500 rounded-lg font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-70 shadow-sm hover:shadow-md touch-target"
                  >
                    {state === "submitting" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Cadastrar
                  </button>
                </form>
                {state === "error" && errorMsg && (
                  <div className="flex items-center justify-center gap-2 mt-3 text-sm text-red-200" role="alert">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
