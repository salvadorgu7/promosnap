"use client"

import { Sparkles, ArrowRight, MessageCircle } from "lucide-react"

const QUICK_PROMPTS = [
  "Melhor celular ate R$ 2.000",
  "Notebook para trabalho",
  "Smart TV custo-beneficio",
]

export default function AIAssistantCTA() {
  function openChat(prompt?: string) {
    // Dispatch event for ChatBubble to open
    window.dispatchEvent(new CustomEvent("ps:open-chat", { detail: prompt }))
  }

  return (
    <section className="py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 via-brand-600 to-accent-purple p-6 md:p-8">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

          <div className="relative flex flex-col md:flex-row items-center gap-6">
            {/* Left: Icon + Text */}
            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-white/90 text-xs font-medium mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                Assistente IA
              </div>
              <h2 className="font-display text-xl md:text-2xl font-bold text-white mb-2">
                Nao sabe o que comprar?
              </h2>
              <p className="text-sm text-white/80 max-w-md">
                Nosso assistente IA busca, compara precos e te ajuda a decidir.
                Todos os links levam direto para as lojas parceiras.
              </p>
            </div>

            {/* Right: Quick prompts + CTA */}
            <div className="flex flex-col items-center md:items-end gap-3">
              {/* Quick prompts */}
              <div className="flex flex-wrap justify-center md:justify-end gap-1.5">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    onClick={() => openChat(q)}
                    className="text-[11px] px-3 py-1.5 rounded-full bg-white/15 text-white/90 hover:bg-white/25 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Main CTA */}
              <button
                onClick={() => openChat()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-brand-600 font-bold text-sm hover:bg-white/90 transition-colors shadow-lg"
              >
                <MessageCircle className="w-4 h-4" />
                Perguntar agora
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
