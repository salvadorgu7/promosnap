"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error"

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setState("error");
      setErrorMsg("Por favor, insira um e-mail valido.");
      return;
    }

    setState("submitting");
    setErrorMsg("");

    try {
      // Store locally for now (no backend yet)
      const subs = JSON.parse(localStorage.getItem("ps_newsletter") || "[]");
      if (subs.includes(email)) {
        setState("error");
        setErrorMsg("Este e-mail ja esta cadastrado.");
        return;
      }
      subs.push(email);
      localStorage.setItem("ps_newsletter", JSON.stringify(subs));
      setState("success");
    } catch {
      setState("error");
      setErrorMsg("Nao foi possivel salvar. Tente novamente.");
    }
  };

  return (
    <section className="py-10">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-accent-blue to-accent-purple p-8 md:p-12 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

          <div className="relative max-w-xl mx-auto text-center">
            <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-4">
              <Mail className="h-6 w-6 opacity-90" />
            </div>
            <h2 className="font-display font-bold text-2xl mb-2">
              Receba as melhores ofertas
            </h2>
            <p className="text-white/80 text-sm mb-6 leading-relaxed">
              Cadastre seu e-mail e receba alertas de ofertas imperdíveis direto na sua caixa.
            </p>

            {state === "success" ? (
              <div className="flex items-center justify-center gap-2.5 py-3 px-5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 max-w-sm mx-auto">
                <CheckCircle className="h-5 w-5 text-emerald-300 flex-shrink-0" />
                <span className="font-medium text-sm">Cadastrado com sucesso! Fique de olho no seu e-mail.</span>
              </div>
            ) : (
              <>
                <form onSubmit={handleSubmit} className="flex gap-2 max-w-md mx-auto">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state === "error") {
                        setState("idle");
                        setErrorMsg("");
                      }
                    }}
                    placeholder="seu@email.com"
                    required
                    disabled={state === "submitting"}
                    className="flex-1 px-4 py-3 rounded-lg bg-white/15 border border-white/20 text-white placeholder-white/50 text-sm focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm disabled:opacity-60 transition-all"
                  />
                  <button
                    type="submit"
                    disabled={state === "submitting"}
                    className="flex items-center gap-2 px-5 py-3 bg-white text-brand-500 rounded-lg font-semibold text-sm hover:bg-white/90 transition-all disabled:opacity-70 shadow-sm hover:shadow-md"
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
                  <div className="flex items-center justify-center gap-2 mt-3 text-sm text-red-200">
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
