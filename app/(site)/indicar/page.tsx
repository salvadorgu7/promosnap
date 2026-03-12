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
} from "lucide-react";

function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function IndicarPage() {
  const [code, setCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ visits: 0, clickouts: 0 });

  useEffect(() => {
    let stored = localStorage.getItem("ps_referral_code");
    if (!stored) {
      stored = generateCode();
      localStorage.setItem("ps_referral_code", stored);
    }
    setCode(stored);

    // Load stats
    try {
      const raw = localStorage.getItem("ps_referral_stats");
      if (raw) setStats(JSON.parse(raw));
    } catch {}
  }, []);

  const referralUrl = `${typeof window !== "undefined" ? window.location.origin : "https://promosnap.com.br"}/?ref=${code}`;

  function copyLink() {
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function shareWhatsApp() {
    const text = `Confira o PromoSnap - compare precos e encontre as melhores ofertas! ${referralUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  function shareTelegram() {
    const text = `Confira o PromoSnap - compare precos e encontre as melhores ofertas!`;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Hero */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-orange to-accent-red flex items-center justify-center mx-auto mb-4">
          <Gift className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold font-display text-text-primary">
          Indique o PromoSnap
        </h1>
        <p className="text-text-muted mt-2 max-w-md mx-auto">
          Compartilhe com amigos e ajude mais pessoas a encontrar as melhores ofertas
        </p>
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
          <p className="text-sm text-text-secondary break-all font-mono">{referralUrl}</p>
        </div>

        {/* Share buttons */}
        <div className="flex gap-3">
          <button
            onClick={shareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#25D366]/10 text-[#25D366] font-semibold text-sm hover:bg-[#25D366]/20 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp
          </button>
          <button
            onClick={shareTelegram}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[#0088cc]/10 text-[#0088cc] font-semibold text-sm hover:bg-[#0088cc]/20 transition-colors"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Telegram
          </button>
          <button
            onClick={copyLink}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-surface-100 text-text-secondary font-semibold text-sm hover:bg-surface-200 transition-colors"
          >
            <Copy className="h-5 w-5" />
            Copiar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold text-text-primary mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-accent-purple" />
          Suas Estatisticas
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-surface-50 text-center">
            <Eye className="h-5 w-5 text-accent-blue mx-auto mb-2" />
            <p className="text-2xl font-bold font-display text-text-primary">
              {stats.visits}
            </p>
            <p className="text-xs text-text-muted">Visitas</p>
          </div>
          <div className="p-4 rounded-lg bg-surface-50 text-center">
            <MousePointerClick className="h-5 w-5 text-accent-green mx-auto mb-2" />
            <p className="text-2xl font-bold font-display text-text-primary">
              {stats.clickouts}
            </p>
            <p className="text-xs text-text-muted">Clickouts</p>
          </div>
        </div>
        {stats.visits === 0 && stats.clickouts === 0 && (
          <p className="text-xs text-text-muted text-center mt-4">
            Compartilhe seu link para comecar a rastrear indicacoes.
          </p>
        )}
      </div>
    </div>
  );
}
