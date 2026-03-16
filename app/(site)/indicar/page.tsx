"use client";

import { useState, useEffect, useMemo } from "react";
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
  Rocket,
  Trophy,
  Zap,
  Heart,
  Send,
  MessageCircle,
  Link2,
  Star,
  Award,
  Target,
  Clock,
} from "lucide-react";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

const REFERRAL_CODE_KEY = "promosnap_referral_code";
const REFERRAL_STATS_KEY = "promosnap_referral_stats";
const REFERRAL_HISTORY_KEY = "promosnap_referral_history";

interface ReferralActivity {
  type: "visit" | "clickout";
  timestamp: number;
  label: string;
}

// Gamification levels
const LEVELS = [
  { name: "Iniciante", minClickouts: 0, icon: Star, color: "text-surface-400", bg: "bg-surface-100" },
  { name: "Colaborador", minClickouts: 5, icon: Zap, color: "text-accent-blue", bg: "bg-accent-blue/10" },
  { name: "Influenciador", minClickouts: 20, icon: Trophy, color: "text-accent-orange", bg: "bg-accent-orange/10" },
  { name: "Embaixador", minClickouts: 50, icon: Award, color: "text-accent-purple", bg: "bg-accent-purple/10" },
] as const;

function getLevel(clickouts: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  let next: (typeof LEVELS)[number] | null = LEVELS[1] ?? null;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (clickouts >= LEVELS[i].minClickouts) {
      current = LEVELS[i];
      next = LEVELS[i + 1] ?? null;
      break;
    }
  }
  return { current, next };
}

const STEPS = [
  {
    num: 1,
    title: "Compartilhe",
    desc: "Envie seu link exclusivo para amigos via WhatsApp, Telegram ou redes sociais.",
    color: "from-accent-blue to-brand-500",
    iconColor: "text-accent-blue",
    icon: Share2,
  },
  {
    num: 2,
    title: "Amigos acessam",
    desc: "Quando acessam pelo seu link, a visita é registrada automaticamente no seu painel.",
    color: "from-accent-purple to-brand-500",
    iconColor: "text-accent-purple",
    icon: Eye,
  },
  {
    num: 3,
    title: "Todos economizam",
    desc: "Seus amigos encontram ofertas incríveis e você acompanha o impacto que causou.",
    color: "from-accent-green to-accent-blue",
    iconColor: "text-accent-green",
    icon: Trophy,
  },
];

const FAQ_ITEMS = [
  {
    q: "Como funciona o programa de indicação?",
    a: "Você recebe um código único de indicação. Ao compartilhar seu link, cada visita e clickout gerado pelos seus amigos é rastreado automaticamente.",
  },
  {
    q: "Preciso me cadastrar?",
    a: "Não! Seu código é gerado automaticamente e salvo no seu navegador. Não precisa de login ou cadastro.",
  },
  {
    q: "O que sao clickouts?",
    a: "Clickouts são cliques que seus indicados fazem nos links de compra das ofertas. Quanto mais clickouts, mais pessoas estão aproveitando as ofertas que você indicou!",
  },
  {
    q: "Existe algum beneficio por indicar?",
    a: "No momento, o programa de indicação ajuda a comunidade PromoSnap a crescer. Estamos planejando recompensas futuras para os maiores indicadores!",
  },
  {
    q: "Posso compartilhar em qualquer lugar?",
    a: "Sim! Compartilhe onde quiser: WhatsApp, Telegram, Twitter/X, Facebook, email, ou até colando o link em fóruns e grupos.",
  },
];

const MOTIVATION_ITEMS = [
  {
    icon: Zap,
    title: "Ajude amigos a economizar",
    desc: "Cada indicação ajuda alguém a encontrar o melhor preço.",
    color: "text-accent-orange",
    bgColor: "bg-accent-orange/10",
  },
  {
    icon: Rocket,
    title: "Faça a comunidade crescer",
    desc: "Mais usuários significam mais dados e melhores comparações.",
    color: "text-accent-purple",
    bgColor: "bg-accent-purple/10",
  },
  {
    icon: Heart,
    title: "Recompensas futuras",
    desc: "Estamos planejando benefícios exclusivos para indicadores ativos.",
    color: "text-accent-red",
    bgColor: "bg-accent-red/10",
  },
];

export default function IndicarPage() {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);
  const [stats, setStats] = useState({ visits: 0, clickouts: 0 });
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [recentActivity, setRecentActivity] = useState<ReferralActivity[]>([]);

  useEffect(() => {
    let stored = localStorage.getItem(REFERRAL_CODE_KEY);
    if (!stored) {
      // Migrate from old key if exists
      stored = localStorage.getItem("ps_referral_code");
      if (stored) {
        localStorage.setItem(REFERRAL_CODE_KEY, stored);
      } else {
        stored = generateCode();
        localStorage.setItem(REFERRAL_CODE_KEY, stored);
      }
    }
    setCode(stored);

    try {
      const raw = localStorage.getItem(REFERRAL_STATS_KEY) || localStorage.getItem("ps_referral_stats");
      if (raw) setStats(JSON.parse(raw));
    } catch {}

    try {
      const rawHistory = localStorage.getItem(REFERRAL_HISTORY_KEY);
      if (rawHistory) {
        const history: ReferralActivity[] = JSON.parse(rawHistory);
        setRecentActivity(history.slice(0, 10));
      }
    } catch {}
  }, []);

  const referralUrl = `${typeof window !== "undefined" ? window.location.origin : "https://www.promosnap.com.br"}/?ref=${code}`;

  const level = useMemo(() => getLevel(stats.clickouts), [stats.clickouts]);

  const progressToNext = useMemo(() => {
    if (!level.next) return 100;
    const range = level.next.minClickouts - level.current.minClickouts;
    const progress = stats.clickouts - level.current.minClickouts;
    return Math.min(Math.round((progress / range) * 100), 100);
  }, [level, stats.clickouts]);

  function handleCopy(source: string) {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setCopiedFeedback(source);
      setTimeout(() => {
        setCopied(false);
        setCopiedFeedback(null);
      }, 2000);
    });
  }

  function shareWhatsApp() {
    const text = `Encontrei um comparador de preços incrível! Ofertas com até 60% OFF e histórico de preço real. Confira: ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareTelegram() {
    const text = `Ofertas com até 60% de desconto e histórico de preço! Compare antes de comprar:`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  function shareTwitter() {
    const text = `Descobri o @PromoSnap - comparador de preços com histórico real e ofertas com até 60% OFF!`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralUrl)}`,
      "_blank"
    );
  }

  const conversionRate = stats.visits > 0
    ? Math.round((stats.clickouts / stats.visits) * 100)
    : 0;

  return (
    <div className="min-h-screen">
      {/* Hero gradient section */}
      <div className="hero-gradient py-16 md:py-24 px-4">
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-xs font-semibold mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Programa de Indicação
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold font-display text-white mb-4 leading-tight">
            Indique amigos.{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-300">
              Ajude a economizar.
            </span>
          </h1>
          <p className="text-white/60 text-lg max-w-lg mx-auto leading-relaxed">
            Compartilhe o PromoSnap e ajude mais pessoas a encontrar ofertas reais com preços verificados.
          </p>

          {/* Quick CTA in hero */}
          <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 max-w-md mx-auto">
            <button
              onClick={() => handleCopy("hero")}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all ${
                copied && copiedFeedback === "hero"
                  ? "bg-accent-green text-white"
                  : "bg-white text-surface-900 hover:bg-white/90 shadow-lg hover:shadow-xl"
              }`}
            >
              {copied && copiedFeedback === "hero" ? (
                <>
                  <Check className="h-4 w-4" /> Link Copiado!
                </>
              ) : (
                <>
                  <Link2 className="h-4 w-4" /> Copiar Meu Link
                </>
              )}
            </button>
            <button
              onClick={shareWhatsApp}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#25D366] text-white text-sm font-bold hover:bg-[#22c55e] transition-all shadow-lg"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Enviar no WhatsApp
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-8 relative z-10 pb-12">
        {/* Gamification level card */}
        <div className="card-premium p-6 md:p-8 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold font-display text-text-primary flex items-center gap-2">
              <Target className="h-5 w-5 text-accent-purple" />
              Seu Nível
            </h2>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${level.current.bg} flex items-center justify-center`}>
                <level.current.icon className={`h-4 w-4 ${level.current.color}`} />
              </div>
              <span className={`font-display font-bold text-sm ${level.current.color}`}>
                {level.current.name}
              </span>
            </div>
          </div>

          {/* Progress bar */}
          {level.next && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-text-muted">
                  {stats.clickouts} / {level.next.minClickouts} clickouts
                </span>
                <span className="text-xs text-text-muted flex items-center gap-1">
                  Próximo: <span className={`font-semibold ${level.next.color}`}>{level.next.name}</span>
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent-blue to-accent-purple transition-all duration-500"
                  style={{ width: `${progressToNext}%` }}
                />
              </div>
            </div>
          )}
          {!level.next && (
            <p className="text-sm text-accent-purple font-medium flex items-center gap-1.5">
              <Award className="h-4 w-4" />
              Nível máximo alcançado! Você é um Embaixador PromoSnap.
            </p>
          )}
        </div>

        {/* How it works */}
        <div className="card-premium p-6 md:p-8 mb-6">
          <h2 className="heading-section text-lg mb-6 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent-purple" />
            Como funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.num}
                  className="relative p-5 rounded-xl bg-surface-50 border border-surface-200/60 hover:border-surface-300 transition-all group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-sm`}
                    >
                      <StepIcon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                      Passo {step.num}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-text-primary mb-1.5 text-base">
                    {step.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {step.desc}
                  </p>
                  {step.num < 3 && (
                    <ArrowRight className="hidden md:block absolute -right-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-surface-300 z-10" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Referral code card */}
        <div className="card p-6 md:p-8 mb-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-5 flex items-center gap-2">
            <Share2 className="h-5 w-5 text-accent-blue" />
            Seu Código de Indicação
          </h2>

          {/* Code display */}
          <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-xl bg-gradient-to-r from-accent-blue/5 via-accent-purple/5 to-brand-500/5 border border-surface-200 mb-6">
            <div className="flex-1 text-center sm:text-left">
              <p className="text-xs text-text-muted mb-1 uppercase tracking-wider font-semibold">Seu código exclusivo</p>
              <p className="text-3xl md:text-4xl font-extrabold font-display text-accent-blue tracking-[0.15em]">
                {code}
              </p>
            </div>
            <button
              onClick={() => handleCopy("code")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-sm ${
                copied && copiedFeedback === "code"
                  ? "bg-accent-green text-white shadow-accent-green/20"
                  : "btn-primary shadow-accent-blue/20"
              }`}
            >
              {copied && copiedFeedback === "code" ? (
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
            <p className="text-xs text-text-muted mb-1">Link de indicação</p>
            <p className="text-sm text-text-secondary break-all font-mono">
              {referralUrl}
            </p>
          </div>

          {/* Share buttons — with copy feedback */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Compartilhar via
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <button
                onClick={shareWhatsApp}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#25D366]/10 text-[#25D366] font-bold text-sm hover:bg-[#25D366]/20 hover:shadow-sm transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </button>
              <button
                onClick={shareTelegram}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-[#0088cc]/10 text-[#0088cc] font-bold text-sm hover:bg-[#0088cc]/20 hover:shadow-sm transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
                Telegram
              </button>
              <button
                onClick={shareTwitter}
                className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-surface-900/5 text-surface-800 font-bold text-sm hover:bg-surface-900/10 hover:shadow-sm transition-all"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                Twitter/X
              </button>
              <button
                onClick={() => handleCopy("share")}
                className={`flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-bold text-sm transition-all ${
                  copied && copiedFeedback === "share"
                    ? "bg-accent-green/10 text-accent-green"
                    : "bg-surface-100 text-text-secondary hover:bg-surface-200 hover:shadow-sm"
                }`}
              >
                {copied && copiedFeedback === "share" ? (
                  <>
                    <Check className="h-5 w-5" /> Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" /> Copiar Link
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Stats — enhanced with level */}
        <div className="card p-6 md:p-8 mb-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-5 flex items-center gap-2">
            <Users className="h-5 w-5 text-accent-purple" />
            Suas Estatísticas
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card stat-card-blue text-center">
              <Eye className="h-5 w-5 text-accent-blue mx-auto mb-2" />
              <p className="text-2xl font-extrabold font-display text-text-primary">
                {stats.visits}
              </p>
              <p className="text-xs text-text-muted mt-0.5">Visitas geradas</p>
            </div>
            <div className="stat-card stat-card-green text-center">
              <MousePointerClick className="h-5 w-5 text-accent-green mx-auto mb-2" />
              <p className="text-2xl font-extrabold font-display text-text-primary">
                {stats.clickouts}
              </p>
              <p className="text-xs text-text-muted mt-0.5">Clickouts</p>
            </div>
            <div className="stat-card stat-card-purple text-center">
              <Zap className="h-5 w-5 text-accent-purple mx-auto mb-2" />
              <p className="text-2xl font-extrabold font-display text-text-primary">
                {conversionRate}%
              </p>
              <p className="text-xs text-text-muted mt-0.5">Conversão</p>
            </div>
          </div>
          {stats.visits === 0 && stats.clickouts === 0 && (
            <div className="text-center mt-5 p-4 rounded-xl bg-surface-50 border border-surface-200/60">
              <p className="text-sm text-text-muted">
                Compartilhe seu link para começar a rastrear suas indicações.
              </p>
              <button
                onClick={() => handleCopy("stats-empty")}
                className="btn-primary mt-3 px-5 py-2 text-sm"
              >
                <Copy className="h-4 w-4" /> Copiar Link Agora
              </button>
            </div>
          )}
        </div>

        {/* Recent referral activity */}
        {recentActivity.length > 0 && (
          <div className="card p-6 md:p-8 mb-6">
            <h2 className="text-base font-bold font-display text-text-primary mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent-blue" />
              Atividade Recente
            </h2>
            <div className="space-y-2">
              {recentActivity.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-100"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    activity.type === "clickout" ? "bg-accent-green/10" : "bg-accent-blue/10"
                  }`}>
                    {activity.type === "clickout" ? (
                      <MousePointerClick className="h-4 w-4 text-accent-green" />
                    ) : (
                      <Eye className="h-4 w-4 text-accent-blue" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary">{activity.label}</p>
                    <p className="text-[10px] text-text-muted">
                      {new Date(activity.timestamp).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Community channels connection */}
        <div className="card-premium p-6 md:p-8 mb-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-2 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-accent-green" />
            Compartilhe nos nossos canais
          </h2>
          <p className="text-sm text-text-muted mb-5">
            Alcance mais pessoas compartilhando nos canais oficiais da comunidade PromoSnap.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <a
              href="/canais"
              className="flex items-center gap-4 p-4 rounded-xl bg-[#0088cc]/5 border border-[#0088cc]/10 hover:bg-[#0088cc]/10 transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#0088cc]/10 flex items-center justify-center flex-shrink-0">
                <Send className="w-5 h-5 text-[#0088cc]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-text-primary">Canal do Telegram</h3>
                <p className="text-xs text-text-muted">Ofertas em tempo real</p>
              </div>
              <ArrowRight className="h-4 w-4 text-surface-300 group-hover:text-[#0088cc] flex-shrink-0 transition-colors" />
            </a>
            <a
              href="/canais"
              className="flex items-center gap-4 p-4 rounded-xl bg-[#25D366]/5 border border-[#25D366]/10 hover:bg-[#25D366]/10 transition-all group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#25D366]/10 flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-[#25D366]" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display font-bold text-sm text-text-primary">Grupo WhatsApp</h3>
                <p className="text-xs text-text-muted">Resumo diário de ofertas</p>
              </div>
              <ArrowRight className="h-4 w-4 text-surface-300 group-hover:text-[#25D366] flex-shrink-0 transition-colors" />
            </a>
          </div>
        </div>

        {/* Motivation section */}
        <div className="card p-6 md:p-8 mb-6">
          <h2 className="text-base font-bold font-display text-text-primary mb-5 flex items-center gap-2">
            <Rocket className="h-5 w-5 text-accent-orange" />
            Por que indicar?
          </h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {MOTIVATION_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="p-4 rounded-xl bg-surface-50 border border-surface-200/60 text-center">
                  <div className={`w-10 h-10 rounded-xl ${item.bgColor} flex items-center justify-center mx-auto mb-3`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <h3 className="font-display font-semibold text-sm text-text-primary mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ */}
        <div className="card p-6 md:p-8">
          <h2 className="heading-section text-lg mb-5">Perguntas Frequentes</h2>
          <div className="space-y-2">
            {FAQ_ITEMS.map((item, i) => (
              <div
                key={i}
                className="border border-surface-200/60 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left text-sm font-medium text-text-primary hover:bg-surface-50 transition-colors"
                >
                  <span>{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="h-4 w-4 flex-shrink-0 text-text-muted" />
                  ) : (
                    <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-muted" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-text-secondary leading-relaxed animate-fade-in">
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
