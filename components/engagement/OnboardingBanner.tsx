"use client";

import { useState, useEffect } from "react";
import { Search, BarChart3, ShoppingCart, X } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Busque produtos",
    description: "Encontre o que voce precisa entre milhares de ofertas",
    color: "text-accent-blue",
    bg: "bg-accent-blue/10",
  },
  {
    icon: BarChart3,
    title: "Compare precos",
    description: "Veja precos de diferentes lojas lado a lado",
    color: "text-accent-purple",
    bg: "bg-accent-purple/10",
  },
  {
    icon: ShoppingCart,
    title: "Compre no melhor preco",
    description: "Clique e va direto para a loja com o menor preco",
    color: "text-accent-green",
    bg: "bg-accent-green/10",
  },
];

export default function OnboardingBanner() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem("ps_onboarded");
    if (!onboarded) {
      setVisible(true);
      // Trigger animation after mount
      requestAnimationFrame(() => setMounted(true));
    }
  }, []);

  function dismiss() {
    setMounted(false);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem("ps_onboarded", "true");
    }, 300);
  }

  if (!visible) return null;

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-gradient-to-r from-accent-blue/5 via-brand-500/5 to-accent-purple/5 border border-surface-200 transition-all duration-300 ${
        mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      {/* Decorative gradient */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent-blue via-brand-500 to-accent-purple" />

      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold font-display text-text-primary">
              Bem-vindo ao PromoSnap!
            </h2>
            <p className="text-sm text-text-muted mt-0.5">
              Compare precos e encontre as melhores ofertas em 3 passos
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors flex-shrink-0"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-lg bg-white/70 border border-surface-200/50 transition-all duration-300 ${
                  mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
                }`}
                style={{ transitionDelay: `${(i + 1) * 100}ms` }}
              >
                <div className={`p-2 rounded-lg ${step.bg} flex-shrink-0`}>
                  <Icon className={`h-5 w-5 ${step.color}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                      Passo {i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary">
                    {step.title}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
