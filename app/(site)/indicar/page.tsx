"use client";

import { useState, useEffect } from "react";
import {
  Gift,
  Copy,
  Check,
  Share2,
  MousePointerClick,
  Eye,
  Users,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
} from "lucide-react";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const STEPS = [
  {
    num: 1,
    title: "Compartilhe",
    desc: "Envie seu link para amigos via WhatsApp, Telegram ou redes sociais.",
    color: "from-accent-blue to-brand-500",
    iconColor: "text-accent-blue",
  },
  {
    num: 2,
    title: "Amigos acessam",
    desc: "Quando acessam pelo seu link, a visita e registrada automaticamente.",
    color: "from-accent-purple to-brand-500",
    iconColor: "text-accent-purple",
  },
  {
    num: 3,
    title: "Todos economizam",
    desc: "Seus amigos encontram ofertas incriveis e voce acompanha o impacto.",
    color: "from-accent-green to-accent-blue",
    iconColor: "text-accent-green",
  },
];

const FAQ_ITEMS = [
  {
    q: "Como funciona o programa de indicacao?",
    a: "Voce recebe um codigo unico de indicacao. Ao compartilhar seu link, cada visita e clickout gerado pelos seus amigos e rastreado automaticamente.",
  },
  {
    q: "Preciso me cadastrar?",
    a: "Nao! Seu codigo e gerado automaticamente e salvo no seu navegador. Nao precisa de login ou cadastro.",
  },
  {
    q: "O que sao clickouts?",
    a: "Clickouts sao cliques que seus indicados fazem nos links de compra das ofertas. Quanto mais clickouts, mais pessoas estao aproveitando as ofertas que voce indicou!",
  },
  {
    q: "Existe algum beneficio por indicar?",
    a: "No momento, o programa de indicacao ajuda a comunidade PromoSnap a crescer. Estamos planejando recompensas futuras para os maiores indicadores!",
  },
  {
    q: "Posso compartilhar em qualquer lugar?",
    a: "Sim! Compartilhe onde quiser: WhatsApp, Telegram, Twitter/X, Facebook, email, ou ate colando o link em foruns e grupos.",
  },
];

export default function IndicarPage() {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ visits: 0, clickouts: 0 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    let stored = localStorage.getItem("ps_referral_code");
    if (!stored) {
      stored = generateCode();
      localStorage.setItem("ps_referral_code", stored);
    }
    setCode(stored);

    try {
      const raw = localStorage.getItem("ps_referral_stats");
      if (raw) setStats(JSON.parse(raw));
    } catch {}
  }, []);

  const referralUrl = `${typeof window !== "undefined" ? window.location.origin : "https://www.promosnap.com.br"}/?ref=${code}`;

  function copyLink() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const text = `Encontrei um comparador de precos incrivel! Ofertas com ate 60% OFF e historico de preco real. Confira: ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareTelegram() {
    const text = `Ofertas com ate 60% de desconto e historico de preco! Compare antes de comprar:`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  function shareTwitter() {
    const text = `Descobri o @PromoSnap - comparador de precos com historico real e ofertas com ate 60% OFF!`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralUrl)}`,
      "_blank"
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero gradient section */}
      <div className="hero-gradient py-16 md:py-20 px-4">
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mx-auto mb-6">
            <Gift className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-white mb-3">
            Indique o PromoSnap
          </h1>
          <p className="text-white/70 text-lg max-w-md mx-auto">
            Compartilhe com amigos e ajude mais pessoas a encontrar ofertas incriveis com precos reais.
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 -mt-8 relative z-10 pb-12">
        {/* How it works - steps */}
        <div className="card-premium p-6 mb-6">
          <h2 className="heading-section text-lg mb-5 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-purple" />
            Como funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {STEPS.map((step) => (
              <div
                key={step.num}
                className="relative p-4 rounded-xl bg-surface-50 border border-surface-200/60"
              >
                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-sm font-bold mb-3`}
                >
                  {step.num}
                </div>
                <h3 className="font-display font-semibold text-text-primary mb-1">
                  {step.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed">
                  {step.desc}
                </p>
                {step.num < 3 && (
                  <ArrowRight className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-300 z-10" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Referral code card */}
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Share2 className="h-4 w-4 text-accent-blue" />
            Seu Codigo de Indicacao
          </h2>

          {/* Code display */}
          <div className="flex items-center gap-3 p-4 rounded-lg bg-gradient-to-r from-accent-blue/5 to-accent-purple/5 border border-surface-200 mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted mb-1">Seu codigo</p>
              <p className="text-2xl font-bold font-display text-accent-blue tracking-wider">
                {code}
              </p>
            </div>
            <button
              onClick={copyLink}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                copied
                  ? "bg-accent-green text-white"
                  : "btn-primary"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" /> Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copiar Link
                </>
              )}
            </button>
          </div>

          {/* Referral URL */}
          <div className="p-3 rounded-lg bg-surface-50 border border-surface-200 mb-6">
            <p className="text-xs text-text-muted mb-1">Link de indicacao</p>
            <p className="text-sm text-text-secondary break-all font-mono">
              {referralUrl}
            </p>
          </div>

          {/* Share buttons */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button
              onClick={shareWhatsApp}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#25D366]/10 text-[#25D366] font-semibold text-sm hover:bg-[#25D366]/20 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
            <button
              onClick={shareTelegram}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0088cc]/10 text-[#0088cc] font-semibold text-sm hover:bg-[#0088cc]/20 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </button>
            <button
              onClick={shareTwitter}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface-900/5 text-surface-800 font-semibold text-sm hover:bg-surface-900/10 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              Twitter/X
            </button>
            <button
              onClick={copyLink}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface-100 text-text-secondary font-semibold text-sm hover:bg-surface-200 transition-colors"
            >
              <Copy className="h-5 w-5" />
              Copiar Link
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="card p-6 mb-6">
          <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent-purple" />
            Suas Estatisticas
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="stat-card stat-card-blue text-center">
              <Eye className="h-5 w-5 text-accent-blue mx-auto mb-2" />
              <p className="text-2xl font-bold font-display text-text-primary">
                {stats.visits}
              </p>
              <p className="text-xs text-text-muted">Visitas geradas</p>
            </div>
            <div className="stat-card stat-card-green text-center">
              <MousePointerClick className="h-5 w-5 text-accent-green mx-auto mb-2" />
              <p className="text-2xl font-bold font-display text-text-primary">
                {stats.clickouts}
              </p>
              <p className="text-xs text-text-muted">Clickouts gerados</p>
            </div>
          </div>
          {stats.visits === 0 && stats.clickouts === 0 && (
            <p className="text-xs text-text-muted text-center mt-4">
              Compartilhe seu link para comecar a rastrear indicacoes.
            </p>
          )}
        </div>

        {/* FAQ */}
        <div className="card p-6">
          <h2 className="heading-section text-lg mb-4">Perguntas Frequentes</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="border border-surface-200/60 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium text-text-primary hover:bg-surface-50 transition-colors"
                >
                  <span>{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-muted" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-sm text-text-secondary leading-relaxed animate-fade-in">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
