"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Send, Sparkles, ShoppingBag, Loader2, ExternalLink, ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";
import { buildMetadata } from "@/lib/seo/metadata";

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: Product[];
}

interface Product {
  name: string;
  price?: number;
  originalPrice?: number;
  discount?: number;
  source: string;
  url: string;
  affiliateUrl: string;
  imageUrl?: string;
  isFromCatalog: boolean;
  confidence?: "verified" | "resolved" | "raw";
  monetization?: "verified" | "best_effort" | "none";
  slug?: string;
}

const SUGGESTIONS = [
  "Melhor celular para fotografia até R$ 3.000",
  "Notebook bom para trabalho e estudo",
  "Fone bluetooth com cancelamento de ruído",
  "Smart TV 55 polegadas custo-benefício",
  "Vale a pena comprar iPhone 15 agora?",
  "Air Fryer boa e barata",
];

export default function AssistentePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    const userMsg: Message = { role: "user", content: msg };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      const assistantMsg: Message = {
        role: "assistant",
        content: data.message || "Sem resposta.",
        products: data.products,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: "assistant", content: "Erro ao processar. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 min-h-[80vh] flex flex-col">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-50 border border-brand-500/20 text-brand-600 text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          Assistente de Compras IA
        </div>
        <h1 className="font-display font-bold text-2xl md:text-3xl text-text-primary">
          O que você quer comprar?
        </h1>
        <p className="text-sm text-text-muted mt-1 max-w-lg mx-auto">
          Pergunte sobre qualquer produto. Eu busco, comparo e te ajudo a decidir.
        </p>
      </div>

      {/* Suggestions (only when no messages) */}
      {messages.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 max-w-2xl mx-auto w-full">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="text-left px-4 py-3 rounded-xl border border-surface-200 bg-white hover:border-brand-500/30 hover:bg-brand-50/50 transition-colors text-sm text-text-secondary hover:text-brand-600"
            >
              <ShoppingBag className="w-3.5 h-3.5 inline mr-2 text-brand-400" />
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-white border border-surface-200 text-text-primary"
              }`}
            >
              {/* Text content */}
              <div className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </div>

              {/* Product cards */}
              {msg.products && msg.products.length > 0 && (
                <div className="mt-3 space-y-2">
                  {msg.products.slice(0, 5).map((p, j) => (
                    <a
                      key={j}
                      href={p.affiliateUrl || p.url}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      className="flex items-center gap-3 p-2 rounded-lg bg-surface-50 hover:bg-surface-100 transition-colors"
                    >
                      {p.imageUrl && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-white flex-shrink-0">
                          <ImageWithFallback
                            src={p.imageUrl}
                            alt={p.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-text-primary line-clamp-1">
                          {p.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {p.price && (
                            <span className="text-sm font-bold text-accent-green">
                              {formatPrice(p.price)}
                            </span>
                          )}
                          {p.discount && p.discount > 0 && (
                            <span className="text-[10px] font-semibold text-white bg-accent-red px-1.5 py-0.5 rounded">
                              -{p.discount}%
                            </span>
                          )}
                          <span className="text-[10px] text-text-muted">
                            {p.source}
                          </span>
                          {p.confidence === "verified" && (
                            <span className="text-[9px] px-1 py-0.5 rounded bg-accent-green/10 text-accent-green font-medium">
                              ✓ Verificado
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-surface-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando e comparando...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-16 md:bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-2">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
          className="flex items-center gap-2 bg-white border border-surface-200 rounded-xl shadow-lg px-4 py-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: melhor notebook para trabalho até R$ 4.000..."
            className="flex-1 text-sm bg-transparent outline-none text-text-primary placeholder:text-surface-400 min-h-[44px]"
            disabled={loading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-10 h-10 rounded-lg bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-text-muted text-center mt-2">
          Busca com IA · Preços verificados · Links seguros para lojas parceiras
        </p>
      </div>
    </div>
  );
}
