"use client";

import { Clock, Eye, TrendingDown, Flame, ShieldCheck } from "lucide-react";

interface UrgencySignalsProps {
  priceDropPercent?: number;
  isAllTimeLow?: boolean;
  clickoutsToday?: number;
  daysAtCurrentPrice?: number;
  offerScore?: number;
}

export default function UrgencySignals({
  priceDropPercent,
  isAllTimeLow,
  clickoutsToday = 0,
  daysAtCurrentPrice,
  offerScore = 0,
}: UrgencySignalsProps) {
  const signals: { icon: React.ReactNode; text: string; color: string }[] = [];

  if (isAllTimeLow) {
    signals.push({
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      text: "Menor preco historico",
      color: "text-accent-green bg-green-50",
    });
  } else if (priceDropPercent && priceDropPercent >= 10) {
    signals.push({
      icon: <TrendingDown className="w-3.5 h-3.5" />,
      text: `Caiu ${priceDropPercent}% recentemente`,
      color: "text-accent-green bg-green-50",
    });
  }

  if (clickoutsToday >= 3) {
    signals.push({
      icon: <Eye className="w-3.5 h-3.5" />,
      text: `${clickoutsToday} pessoas viram hoje`,
      color: "text-accent-blue bg-blue-50",
    });
  }

  if (daysAtCurrentPrice && daysAtCurrentPrice <= 3) {
    signals.push({
      icon: <Clock className="w-3.5 h-3.5" />,
      text: "Preco novo — pode subir",
      color: "text-amber-600 bg-amber-50",
    });
  }

  if (offerScore >= 85) {
    signals.push({
      icon: <Flame className="w-3.5 h-3.5" />,
      text: "Oferta quente",
      color: "text-accent-red bg-red-50",
    });
  }

  if (offerScore >= 70) {
    signals.push({
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      text: "Boa oportunidade de compra",
      color: "text-accent-green bg-green-50",
    });
  }

  if (signals.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {signals.slice(0, 3).map((s, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${s.color}`}>
          {s.icon}
          {s.text}
        </span>
      ))}
    </div>
  );
}
