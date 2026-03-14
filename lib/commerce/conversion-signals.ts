/**
 * Conversion Signals — generates trust and urgency signals from real product data.
 */

export interface ConversionSignal {
  type: "urgency" | "trust" | "social" | "price";
  icon: string;
  text: string;
  priority: number; // higher = show first
}

export function generateConversionSignals(opts: {
  currentPrice: number;
  originalPrice?: number;
  allTimeMin?: number;
  avg30d?: number;
  offerScore?: number;
  clickoutsToday?: number;
  freeShipping?: boolean;
  sourceCount?: number;
  priceDropPercent?: number;
  daysAtPrice?: number;
}): ConversionSignal[] {
  const signals: ConversionSignal[] = [];

  // Price signals
  if (opts.allTimeMin && opts.currentPrice <= opts.allTimeMin * 1.02) {
    signals.push({
      type: "price",
      icon: "trending-down",
      text: "Menor preco historico",
      priority: 100,
    });
  } else if (opts.avg30d && opts.currentPrice < opts.avg30d * 0.9) {
    signals.push({
      type: "price",
      icon: "trending-down",
      text: `${Math.round(((opts.avg30d - opts.currentPrice) / opts.avg30d) * 100)}% abaixo da media`,
      priority: 90,
    });
  }

  if (opts.priceDropPercent && opts.priceDropPercent >= 10) {
    signals.push({
      type: "urgency",
      icon: "arrow-down",
      text: `Caiu ${opts.priceDropPercent}% recentemente`,
      priority: 85,
    });
  }

  // Urgency signals
  if (opts.daysAtPrice && opts.daysAtPrice <= 2) {
    signals.push({
      type: "urgency",
      icon: "clock",
      text: "Preco novo — pode mudar",
      priority: 80,
    });
  }

  if (opts.offerScore && opts.offerScore >= 85) {
    signals.push({
      type: "trust",
      icon: "flame",
      text: "Oferta excepcional",
      priority: 75,
    });
  } else if (opts.offerScore && opts.offerScore >= 70) {
    signals.push({
      type: "trust",
      icon: "check",
      text: "Boa oportunidade",
      priority: 60,
    });
  }

  // Social signals
  if (opts.clickoutsToday && opts.clickoutsToday >= 5) {
    signals.push({
      type: "social",
      icon: "users",
      text: `${opts.clickoutsToday} pessoas viram hoje`,
      priority: 55,
    });
  } else if (opts.clickoutsToday && opts.clickoutsToday >= 2) {
    signals.push({
      type: "social",
      icon: "eye",
      text: "Sendo visto agora",
      priority: 45,
    });
  }

  // Trust signals
  if (opts.freeShipping) {
    signals.push({
      type: "trust",
      icon: "truck",
      text: "Frete gratis",
      priority: 50,
    });
  }

  if (opts.sourceCount && opts.sourceCount >= 3) {
    signals.push({
      type: "trust",
      icon: "store",
      text: `Disponivel em ${opts.sourceCount} lojas`,
      priority: 40,
    });
  }

  // Original price discount
  if (opts.originalPrice && opts.currentPrice < opts.originalPrice) {
    const discount = Math.round(((opts.originalPrice - opts.currentPrice) / opts.originalPrice) * 100);
    if (discount >= 20) {
      signals.push({
        type: "price",
        icon: "percent",
        text: `${discount}% de desconto`,
        priority: 70,
      });
    }
  }

  return signals.sort((a, b) => b.priority - a.priority);
}
