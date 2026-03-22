"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, ShoppingBag, Loader2 } from "lucide-react";
import SmartProductCard from "@/components/assistant/SmartProductCard";
import FollowUpChips from "@/components/assistant/FollowUpChips";
import AlertSuggestion from "@/components/assistant/AlertSuggestion";

// ── Types ──────────────────────────────────────────────────────────────────

interface StructuredBlock {
  type: string;
  [key: string]: any;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  products?: any[];
  blocks?: StructuredBlock[];
}

// ── Suggestions ────────────────────────────────────────────────────────────

const SUGGESTIONS = [
  { text: "Melhor celular até R$ 2.000", icon: "📱" },
  { text: "Notebook para trabalho até R$ 4.000", icon: "💻" },
  { text: "Fone com cancelamento de ruído bom e barato", icon: "🎧" },
  { text: "Smart TV 55\" custo-benefício", icon: "📺" },
  { text: "Vale a pena comprar iPhone 15 agora?", icon: "🤔" },
  { text: "Air Fryer boa até R$ 500", icon: "🍳" },
];

// ── Page Component ─────────────────────────────────────────────────────────

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
        blocks: data.blocks,
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
          Me conta o que você procura
        </h1>
        <p className="text-sm text-text-muted mt-1.5 max-w-lg mx-auto leading-relaxed">
          Comparo preços em tempo real, analiso o histórico de 90 dias e te digo se é hora de comprar ou esperar.
        </p>
      </div>

      {/* Suggestions (only when no messages) */}
      {messages.length === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6 max-w-2xl mx-auto w-full">
          {SUGGESTIONS.map((s) => (
            <button
              key={s.text}
              onClick={() => sendMessage(s.text)}
              className="text-left px-4 py-3 rounded-xl border border-surface-200 bg-white hover:border-brand-500/30 hover:bg-brand-50/50 transition-all hover:shadow-sm text-sm text-text-secondary hover:text-brand-600 group"
            >
              <span className="mr-2 text-base">{s.icon}</span>
              <span className="group-hover:font-medium transition-all">{s.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] md:max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-brand-500 text-white"
                  : "bg-white border border-surface-200 text-text-primary"
              }`}
            >
              {msg.role === "assistant" && msg.blocks ? (
                <AssistantBlocks blocks={msg.blocks} onFollowUp={sendMessage} />
              ) : (
                <>
                  {/* Text content */}
                  <div className="text-sm leading-relaxed">
                    {msg.role === "assistant" ? (
                      <div className="space-y-1">{renderMarkdown(msg.content)}</div>
                    ) : (
                      msg.content
                    )}
                  </div>

                  {/* Legacy product cards (fallback if no blocks) */}
                  {msg.role === "assistant" && msg.products && msg.products.length > 0 && !msg.blocks && (
                    <div className="mt-3 space-y-2">
                      {msg.products.slice(0, 6).map((p: any, j: number) => (
                        <SmartProductCard key={j} product={p} rank={j + 1} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-surface-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin text-brand-500" />
                <span>Buscando, comparando preços e analisando ofertas...</span>
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
            placeholder="Ex: melhor celular até R$ 2.000, notebook para trabalho..."
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
          Busca com IA · Preços verificados · Histórico de 90 dias · Links seguros
        </p>
      </div>
    </div>
  );
}

// ── Block Renderer ─────────────────────────────────────────────────────────

/** Simple markdown renderer — handles **bold**, bullet points, and line breaks */
function renderMarkdown(text: string) {
  if (!text) return null;

  return text.split('\n').map((line, lineIdx) => {
    // Empty line = paragraph break
    if (!line.trim()) return <div key={lineIdx} className="h-2" />;

    // Bullet point lines
    const isBullet = /^[\s]*[•\-\*]\s/.test(line);
    const cleanLine = isBullet ? line.replace(/^[\s]*[•\-\*]\s/, '') : line;

    // Parse inline **bold** and *italic*
    const parts = cleanLine.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/).map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={partIdx} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={partIdx}>{part.slice(1, -1)}</em>;
      }
      return <span key={partIdx}>{part}</span>;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex gap-2 pl-1">
          <span className="text-brand-400 flex-shrink-0">•</span>
          <span>{parts}</span>
        </div>
      );
    }

    return <div key={lineIdx}>{parts}</div>;
  });
}

function AssistantBlocks({
  blocks,
  onFollowUp,
}: {
  blocks: StructuredBlock[];
  onFollowUp: (query: string) => void;
}) {
  return (
    <div className="space-y-3">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "text":
            return (
              <div key={i} className="text-sm leading-relaxed space-y-1">
                {renderMarkdown(block.content)}
              </div>
            );

          case "product_cards":
            return (
              <div key={i} className="space-y-2 mt-2">
                {(block.products || []).slice(0, 8).map((p: any, j: number) => (
                  <SmartProductCard key={j} product={p} rank={j + 1} />
                ))}
              </div>
            );

          case "alert_suggestion":
            return (
              <AlertSuggestion
                key={i}
                productName={block.productName}
                currentPrice={block.currentPrice}
                suggestedTargetPrice={block.suggestedTargetPrice}
                slug={block.slug}
              />
            );

          case "follow_up_buttons":
            return (
              <FollowUpChips
                key={i}
                suggestions={block.suggestions || []}
                onSelect={onFollowUp}
              />
            );

          case "deal_verdict":
            return (
              <div key={i} className={`p-3 rounded-xl border mt-2 ${
                block.verdict === "comprar" ? "bg-emerald-50 border-emerald-200" :
                block.verdict === "esperar" ? "bg-amber-50 border-amber-200" :
                "bg-gray-50 border-gray-200"
              }`}>
                <p className="text-sm font-semibold">
                  {block.verdict === "comprar" ? "✅ Bom momento para comprar" :
                   block.verdict === "esperar" ? "⏳ Vale esperar um pouco" :
                   "➡️ Preço dentro da média"}
                </p>
                {block.reasons && (
                  <ul className="text-xs text-text-muted mt-1 space-y-0.5">
                    {block.reasons.map((r: string, j: number) => (
                      <li key={j}>• {r}</li>
                    ))}
                  </ul>
                )}
              </div>
            );

          default:
            return null;
        }
      })}
    </div>
  );
}
