import { Brain, TrendingDown, Scale, ThumbsUp, AlertTriangle, Sparkles, Clock } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import type { BuySignal } from "@/lib/decision/buy-signal";

interface SmartDecisionBlockProps {
  productName: string;
  currentPrice: number;
  originalPrice?: number;
  avg30d?: number;
  allTimeMin?: number;
  offersCount: number;
  storesCount?: number;
  isFreeShipping: boolean;
  offerScore: number;
  trend?: "up" | "down" | "stable";
  /** Pre-computed buy signal (from server) */
  buySignal?: BuySignal | null;
}

export default function SmartDecisionBlock({
  productName,
  currentPrice,
  originalPrice,
  avg30d,
  allTimeMin,
  offersCount,
  storesCount,
  isFreeShipping,
  offerScore,
  trend,
  buySignal,
}: SmartDecisionBlockProps) {
  // Calculate decision signals
  const signals: { icon: typeof Brain; label: string; detail: string; color: string; positive: boolean }[] = [];

  // Price vs average
  if (avg30d && currentPrice < avg30d * 0.95) {
    const pctBelow = Math.round(((avg30d - currentPrice) / avg30d) * 100);
    signals.push({
      icon: TrendingDown,
      label: "Abaixo da média",
      detail: `${pctBelow}% mais barato que a média dos últimos 30 dias`,
      color: "text-accent-green",
      positive: true,
    });
  }

  // Near all-time low
  if (allTimeMin && currentPrice <= allTimeMin * 1.05) {
    signals.push({
      icon: TrendingDown,
      label: "Próximo ao mínimo histórico",
      detail: allTimeMin === currentPrice ? "Este é o menor preço já registrado" : `Apenas ${formatPrice(currentPrice - allTimeMin)} acima do mínimo`,
      color: "text-accent-blue",
      positive: true,
    });
  }

  // Good discount
  if (originalPrice && originalPrice > currentPrice) {
    const disc = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    if (disc >= 20) {
      signals.push({
        icon: ThumbsUp,
        label: `${disc}% de desconto real`,
        detail: `Economia de ${formatPrice(originalPrice - currentPrice)} no preço original`,
        color: "text-accent-green",
        positive: true,
      });
    }
  }

  // Multiple sources — use storesCount for "lojas", offersCount for "ofertas"
  const uniqueStores = storesCount ?? offersCount;
  if (uniqueStores > 1) {
    signals.push({
      icon: Scale,
      label: `${uniqueStores} lojas comparadas`,
      detail: "Você está vendo o melhor preço entre todas as fontes",
      color: "text-brand-500",
      positive: true,
    });
  } else if (offersCount > 1) {
    signals.push({
      icon: Scale,
      label: `${offersCount} ofertas comparadas`,
      detail: "Você está vendo o melhor preço entre todas as ofertas",
      color: "text-brand-500",
      positive: true,
    });
  }

  // Free shipping
  if (isFreeShipping) {
    signals.push({
      icon: ThumbsUp,
      label: "Frete grátis incluído",
      detail: "O preço final já inclui entrega sem custo",
      color: "text-accent-purple",
      positive: true,
    });
  }

  // Price trend warning
  if (trend === "up") {
    signals.push({
      icon: AlertTriangle,
      label: "Preço subindo",
      detail: "O preço está acima da média recente. Considere esperar",
      color: "text-accent-orange",
      positive: false,
    });
  }

  // High score
  if (offerScore >= 80) {
    signals.push({
      icon: Brain,
      label: "Oferta verificada de alta qualidade",
      detail: `Score ${offerScore}/100 — entre as melhores que monitoramos`,
      color: "text-accent-green",
      positive: true,
    });
  }

  if (signals.length === 0 && !buySignal) return null;

  const positiveCount = signals.filter(s => s.positive).length;
  const totalSignals = signals.length;
  const verdict = positiveCount === totalSignals ? "Compra inteligente" : positiveCount >= totalSignals * 0.7 ? "Boa oportunidade" : "Avalie com cuidado";
  const verdictColor = positiveCount === totalSignals ? "text-accent-green" : positiveCount >= totalSignals * 0.7 ? "text-accent-blue" : "text-accent-orange";

  // Buy signal color mapping
  const buySignalStyles: Record<string, { bg: string; border: string; text: string; icon: typeof Sparkles }> = {
    green: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", icon: Sparkles },
    blue: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", icon: ThumbsUp },
    orange: { bg: "bg-orange-50", border: "border-orange-200", text: "text-orange-700", icon: Clock },
    gray: { bg: "bg-surface-50", border: "border-surface-200", text: "text-text-secondary", icon: Brain },
  };

  return (
    <div className="space-y-3">
      {/* Buy Signal Banner */}
      {buySignal && buySignal.level !== 'neutro' && (
        <div className={`p-3.5 rounded-xl border ${buySignalStyles[buySignal.color]?.border || "border-surface-200"} ${buySignalStyles[buySignal.color]?.bg || "bg-surface-50"}`}>
          <div className="flex items-center gap-2">
            {(() => {
              const BuyIcon = buySignalStyles[buySignal.color]?.icon || Brain;
              return <BuyIcon className={`h-4 w-4 ${buySignalStyles[buySignal.color]?.text || "text-text-muted"}`} />;
            })()}
            <span className={`text-sm font-bold ${buySignalStyles[buySignal.color]?.text || "text-text-primary"}`}>
              {buySignal.headline}
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 ml-6">{buySignal.detail}</p>
        </div>
      )}

      {/* Smart Analysis Block */}
      {signals.length > 0 && (
    <div className="card p-4 border-l-4 border-l-brand-500">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-bold font-display text-text-primary">Analise Inteligente</h3>
        <span className={`ml-auto text-xs font-bold ${verdictColor} bg-current/10 px-2 py-0.5 rounded-full`} style={{ backgroundColor: 'transparent' }}>
          <span className={verdictColor}>{verdict}</span>
        </span>
      </div>
      <div className="space-y-2">
        {signals.slice(0, 5).map((signal, i) => {
          const Icon = signal.icon;
          return (
            <div key={i} className="flex items-start gap-2.5">
              <div className={`mt-0.5 ${signal.color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold ${signal.color}`}>{signal.label}</p>
                <p className="text-[11px] text-text-muted">{signal.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
      )}
    </div>
  );
}
