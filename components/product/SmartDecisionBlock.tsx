import { Brain, TrendingDown, Scale, ThumbsUp, AlertTriangle } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface SmartDecisionBlockProps {
  productName: string;
  currentPrice: number;
  originalPrice?: number;
  avg30d?: number;
  allTimeMin?: number;
  offersCount: number;
  isFreeShipping: boolean;
  offerScore: number;
  trend?: "up" | "down" | "stable";
}

export default function SmartDecisionBlock({
  productName,
  currentPrice,
  originalPrice,
  avg30d,
  allTimeMin,
  offersCount,
  isFreeShipping,
  offerScore,
  trend,
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

  // Multiple sources
  if (offersCount > 1) {
    signals.push({
      icon: Scale,
      label: `${offersCount} lojas comparadas`,
      detail: "Você está vendo o melhor preço entre todas as fontes",
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

  if (signals.length === 0) return null;

  const positiveCount = signals.filter(s => s.positive).length;
  const totalSignals = signals.length;
  const verdict = positiveCount === totalSignals ? "Compra inteligente" : positiveCount >= totalSignals * 0.7 ? "Boa oportunidade" : "Avalie com cuidado";
  const verdictColor = positiveCount === totalSignals ? "text-accent-green" : positiveCount >= totalSignals * 0.7 ? "text-accent-blue" : "text-accent-orange";

  return (
    <div className="card p-4 border-l-4 border-l-brand-500">
      <div className="flex items-center gap-2 mb-3">
        <Brain className="h-4 w-4 text-brand-500" />
        <h3 className="text-sm font-bold font-display text-text-primary">Análise Inteligente</h3>
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
  );
}
