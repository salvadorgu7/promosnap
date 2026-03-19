"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Loader2,
  ExternalLink,
  Minimize2,
  ShoppingBag,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: Product[];
}

interface Product {
  name: string;
  price?: number;
  discount?: number;
  source: string;
  url: string;
  affiliateUrl: string;
  imageUrl?: string;
  isFromCatalog: boolean;
  confidence?: "verified" | "resolved" | "raw";
  slug?: string;
}

const QUICK_PROMPTS = [
  "Melhor celular até R$ 2.000",
  "Notebook para trabalho",
  "Fone bluetooth bom",
  "Smart TV custo-benefício",
];

interface ChatBubbleProps {
  productContext?: { name: string; price: number; slug: string }
}

export default function ChatBubble({ productContext }: ChatBubbleProps = {}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [messages, open]);

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-4).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.message || "Sem resposta.", products: data.products },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Erro ao processar. Tente novamente." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Floating button
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 md:bottom-6 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all flex items-center justify-center group"
        aria-label="Abrir assistente de compras"
      >
        <MessageCircle className="w-6 h-6 group-hover:hidden" />
        <Sparkles className="w-6 h-6 hidden group-hover:block" />
        {/* Notification dot */}
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent-green border-2 border-white" />
      </button>
    );
  }

  // Chat panel
  return (
    <div className="fixed bottom-0 right-0 md:bottom-6 md:right-4 z-50 w-full md:w-[400px] h-[85vh] md:h-[600px] md:max-h-[80vh] flex flex-col bg-white md:rounded-2xl shadow-2xl border border-surface-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-500 to-accent-purple text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          <div>
            <p className="text-sm font-semibold">Assistente de Compras</p>
            <p className="text-[10px] opacity-80">Busco, comparo e te ajudo a decidir</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/assistente"
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="Abrir em tela cheia"
          >
            <Minimize2 className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="text-center py-4">
            <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-6 h-6 text-brand-500" />
            </div>
            <p className="text-sm font-medium text-text-primary mb-1">
              O que você quer comprar?
            </p>
            <p className="text-xs text-text-muted mb-4">
              Pergunte sobre qualquer produto
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-left text-[11px] px-3 py-2 rounded-lg border border-surface-200 hover:border-brand-500/30 hover:bg-brand-50/50 transition-colors text-text-secondary"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message list */}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[88%] rounded-2xl px-3 py-2 ${
                msg.role === "user"
                  ? "bg-brand-500 text-white text-sm"
                  : "bg-surface-50 border border-surface-200 text-text-primary text-[13px]"
              }`}
            >
              <div className="leading-relaxed whitespace-pre-wrap">{msg.content}</div>

              {/* Inline product cards */}
              {msg.products && msg.products.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {msg.products.slice(0, 3).map((p, j) => (
                    <a
                      key={j}
                      href={p.slug ? `/produto/${p.slug}` : (p.affiliateUrl || p.url)}
                      target={p.slug ? "_self" : "_blank"}
                      rel={p.slug ? undefined : "noopener noreferrer nofollow sponsored"}
                      className="flex items-center gap-2 p-1.5 rounded-lg bg-white border border-surface-100 hover:border-brand-500/30 transition-colors"
                    >
                      {p.imageUrl && (
                        <div className="w-10 h-10 rounded overflow-hidden bg-white flex-shrink-0">
                          <ImageWithFallback
                            src={p.imageUrl}
                            alt={p.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-text-primary line-clamp-1">
                          {p.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {p.price && (
                            <span className="text-xs font-bold text-accent-green">
                              {formatPrice(p.price)}
                            </span>
                          )}
                          {p.confidence === "verified" && (
                            <span className="text-[8px] px-1 py-0.5 rounded bg-accent-green/10 text-accent-green font-medium">
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                      <ExternalLink className="w-3 h-3 text-surface-300 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-surface-50 border border-surface-200 rounded-2xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-text-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Buscando...
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-3 py-2 border-t border-surface-200 bg-white flex-shrink-0 safe-area-bottom">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex: melhor notebook até R$ 4.000..."
            className="flex-1 text-sm bg-surface-50 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-brand-500/20 border border-surface-200 text-text-primary placeholder:text-surface-400"
            disabled={loading}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="w-9 h-9 rounded-xl bg-brand-500 text-white flex items-center justify-center hover:bg-brand-600 disabled:opacity-40 transition-colors flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
