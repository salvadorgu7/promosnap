import {
  Send,
  MessageCircle,
  Mail,
  Home,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Zap,
  TrendingUp,
  Filter,
} from "lucide-react";
import {
  getChannelStatus,
  getReadyOffers,
  getReadyOffersBySegment,
  getDistributionHistory,
  formatForChannel,
  formatForSegment,
  SEGMENT_LABELS,
} from "@/lib/distribution/engine";
import type { DistributionChannel, DistributionSegment } from "@/lib/distribution/types";

export const dynamic = "force-dynamic";

const CHANNEL_ICONS: Record<DistributionChannel, typeof Send> = {
  telegram: Send,
  whatsapp: MessageCircle,
  email: Mail,
  homepage: Home,
};

const CHANNEL_LABELS: Record<DistributionChannel, string> = {
  telegram: "Telegram",
  whatsapp: "WhatsApp",
  email: "E-mail",
  homepage: "Homepage",
};

const CHANNEL_COLORS: Record<DistributionChannel, string> = {
  telegram: "text-blue-500",
  whatsapp: "text-green-500",
  email: "text-purple-500",
  homepage: "text-orange-500",
};

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export default async function DistributionPage() {
  const channels = getChannelStatus();

  let offers: Awaited<ReturnType<typeof getReadyOffers>> = [];
  try {
    offers = await getReadyOffers(10);
  } catch {
    // DB may not be available — show empty state
  }

  const history = getDistributionHistory(10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">
          Distribuicao
        </h1>
        <p className="text-sm text-text-muted">
          Publique ofertas nos canais configurados — Telegram, WhatsApp, e-mail
          e homepage
        </p>
      </div>

      {/* Channel status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {channels.map((ch) => {
          const Icon = CHANNEL_ICONS[ch.channel];
          const color = CHANNEL_COLORS[ch.channel];
          return (
            <div
              key={ch.channel}
              className="rounded-xl border border-surface-200 bg-white p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <h3 className="text-sm font-semibold text-text-primary">
                    {CHANNEL_LABELS[ch.channel]}
                  </h3>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    ch.configured
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {ch.configured ? "Configurado" : "Pendente"}
                </span>
              </div>
              <p className="text-xs text-text-muted mb-3">{ch.description}</p>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Send className="w-3 h-3" />
                  {ch.totalSent} enviados
                </span>
                {ch.lastSent && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ch.lastSent.toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Segment selector */}
      <div className="rounded-xl border border-surface-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-text-muted" />
          <h2 className="text-sm font-semibold text-text-primary">
            Segmento de Distribuicao
          </h2>
        </div>
        <p className="text-xs text-text-muted mb-3">
          Filtre ofertas por segmento para enviar conteudo direcionado a cada
          canal de categoria.
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SEGMENT_LABELS) as DistributionSegment[]).map(
            (seg) => (
              <span
                key={seg}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-surface-200 bg-surface-50 text-xs font-medium text-text-secondary hover:bg-surface-100 hover:border-surface-300 cursor-default transition-colors"
              >
                {SEGMENT_LABELS[seg]}
              </span>
            )
          )}
        </div>
        <p className="text-[10px] text-text-muted mt-2">
          Selecao de segmento ativa via API — use
          getReadyOffersBySegment(segment, limit) para filtrar ofertas por
          segmento no codigo.
        </p>
      </div>

      {/* Ready offers */}
      <div className="rounded-xl border border-surface-200 bg-white">
        <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-blue" />
            Ofertas Prontas para Distribuicao
          </h2>
          <span className="text-xs text-text-muted">
            Top {offers.length} por score
          </span>
        </div>
        <div className="divide-y divide-surface-100">
          {offers.length === 0 && (
            <div className="px-5 py-12 text-center text-sm text-text-muted">
              <Zap className="w-8 h-8 mx-auto mb-3 text-surface-300" />
              <p>Nenhuma oferta elegivel para distribuicao.</p>
              <p className="text-xs mt-1">
                Ofertas precisam de score minimo de 30 e produto ativo.
              </p>
            </div>
          )}
          {offers.map((offer) => {
            const telegramPreview = formatForChannel(offer, "telegram");
            const whatsappPreview = formatForChannel(offer, "whatsapp");

            return (
              <div key={offer.offerId} className="px-5 py-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-text-primary truncate">
                      {offer.productName}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-lg font-bold text-brand-600">
                        {formatBRL(offer.currentPrice)}
                      </span>
                      {offer.originalPrice &&
                        offer.originalPrice > offer.currentPrice && (
                          <span className="text-xs text-text-muted line-through">
                            {formatBRL(offer.originalPrice)}
                          </span>
                        )}
                      {offer.discount > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700">
                          -{offer.discount}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                      <span>Score: {offer.offerScore}</span>
                      <span>{offer.sourceName}</span>
                      {offer.isFreeShipping && (
                        <span className="text-green-600">Frete gratis</span>
                      )}
                      {offer.couponText && (
                        <span className="text-purple-600">
                          Cupom: {offer.couponText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Channel previews */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                  {/* Telegram preview */}
                  <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-500 flex items-center gap-1">
                        <Send className="w-3 h-3" /> Telegram
                      </span>
                      <CopyButton text={telegramPreview} />
                    </div>
                    <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                      {telegramPreview}
                    </pre>
                  </div>

                  {/* WhatsApp preview */}
                  <div className="rounded-lg border border-surface-200 bg-surface-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-green-500 flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> WhatsApp
                      </span>
                      <CopyButton text={whatsappPreview} />
                    </div>
                    <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed max-h-32 overflow-y-auto">
                      {whatsappPreview}
                    </pre>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 mt-3">
                  <SendButton
                    offerId={offer.offerId}
                    channel="telegram"
                    label="Enviar Telegram"
                    icon="send"
                  />
                  <SendButton
                    offerId={offer.offerId}
                    channel="whatsapp"
                    label="Copiar WhatsApp"
                    icon="message"
                  />
                  <SendButton
                    offerId={offer.offerId}
                    channel="homepage"
                    label="Destacar Homepage"
                    icon="home"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Distribution history */}
      <div className="rounded-xl border border-surface-200 bg-white">
        <div className="px-5 py-4 border-b border-surface-100">
          <h2 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-text-muted" />
            Historico de Distribuicao
          </h2>
        </div>
        <div className="divide-y divide-surface-100">
          {history.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-text-muted">
              Nenhuma distribuicao realizada ainda.
            </div>
          )}
          {history.map((post) => {
            const Icon = CHANNEL_ICONS[post.channel];
            const color = CHANNEL_COLORS[post.channel];
            return (
              <div
                key={post.id}
                className="px-5 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${color}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {post.title}
                    </p>
                    <p className="text-xs text-text-muted">
                      {CHANNEL_LABELS[post.channel]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      post.status === "sent"
                        ? "bg-green-100 text-green-700"
                        : post.status === "failed"
                        ? "bg-red-100 text-red-700"
                        : post.status === "previewed"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {post.status === "sent" && (
                      <CheckCircle2 className="w-3 h-3" />
                    )}
                    {post.status === "failed" && (
                      <XCircle className="w-3 h-3" />
                    )}
                    {post.status === "sent"
                      ? "Enviado"
                      : post.status === "failed"
                      ? "Falhou"
                      : post.status === "previewed"
                      ? "Preview"
                      : "Pendente"}
                  </span>
                  {post.sentAt && (
                    <span className="text-xs text-text-muted">
                      {post.sentAt.toLocaleString("pt-BR")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Client-interactive sub-components
// These are rendered as static HTML with data attributes
// and powered by a small inline script for interactivity.
// ============================================

function CopyButton({ text }: { text: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-text-muted hover:text-text-primary hover:bg-surface-100 transition-colors"
      data-copy-text={text}
      onClick={undefined}
      title="Copiar mensagem"
    >
      <Copy className="w-3 h-3" />
      Copiar
    </button>
  );
}

function SendButton({
  offerId,
  channel,
  label,
  icon,
}: {
  offerId: string;
  channel: DistributionChannel;
  label: string;
  icon: "send" | "message" | "home";
}) {
  const IconComponent =
    icon === "send" ? Send : icon === "message" ? MessageCircle : Home;
  const colorClass =
    channel === "telegram"
      ? "border-blue-200 text-blue-600 hover:bg-blue-50"
      : channel === "whatsapp"
      ? "border-green-200 text-green-600 hover:bg-green-50"
      : "border-orange-200 text-orange-600 hover:bg-orange-50";

  return (
    <button
      type="button"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${colorClass}`}
      data-send-offer={offerId}
      data-send-channel={channel}
      title={label}
    >
      <IconComponent className="w-3.5 h-3.5" />
      {label}
    </button>
  );
}
