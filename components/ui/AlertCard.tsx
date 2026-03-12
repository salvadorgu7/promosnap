"use client";

import { Bell, Target, Clock, TrendingDown, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";

export type AlertStatus = "watching" | "near-target" | "triggered";

export interface AlertItem {
  id: string;
  productName: string;
  productSlug: string;
  currentPrice: number;
  targetPrice: number;
  status: AlertStatus;
  createdAt: Date;
}

interface AlertCardProps {
  alert: AlertItem;
}

function getStatusConfig(status: AlertStatus) {
  switch (status) {
    case "triggered":
      return {
        label: "Preco atingido!",
        icon: CheckCircle2,
        color: "text-accent-green",
        bg: "bg-accent-green/10",
        border: "border-accent-green/20",
      };
    case "near-target":
      return {
        label: "Proximo do alvo",
        icon: TrendingDown,
        color: "text-accent-orange",
        bg: "bg-accent-orange/10",
        border: "border-accent-orange/20",
      };
    default:
      return {
        label: "Monitorando",
        icon: Bell,
        color: "text-accent-blue",
        bg: "bg-accent-blue/10",
        border: "border-accent-blue/20",
      };
  }
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoje";
  if (diffDays === 1) return "Ontem";
  if (diffDays < 7) return `${diffDays} dias atras`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} semanas atras`;
  return `${Math.floor(diffDays / 30)} meses atras`;
}

export default function AlertCard({ alert }: AlertCardProps) {
  const statusConfig = getStatusConfig(alert.status);
  const StatusIcon = statusConfig.icon;

  // Progress towards target
  const progress = Math.min(
    100,
    Math.max(
      0,
      alert.targetPrice > 0
        ? ((alert.currentPrice <= alert.targetPrice
            ? 100
            : ((alert.currentPrice - alert.targetPrice) /
                alert.currentPrice) *
              100))
        : 0
    )
  );

  // Invert: 100% means we reached target
  const progressPct =
    alert.currentPrice <= alert.targetPrice
      ? 100
      : Math.round(
          Math.max(
            0,
            100 -
              ((alert.currentPrice - alert.targetPrice) / alert.currentPrice) *
                100
          )
        );

  return (
    <div className="card p-4 flex flex-col gap-3 hover:-translate-y-0.5 transition-transform">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <Link
          href={`/produto/${alert.productSlug}`}
          className="text-sm font-medium text-text-primary line-clamp-2 hover:text-accent-blue transition-colors flex-1"
        >
          {alert.productName}
        </Link>
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border} flex-shrink-0`}
        >
          <StatusIcon className="w-3 h-3" />
          {statusConfig.label}
        </span>
      </div>

      {/* Price comparison */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-text-muted block">Preco atual</span>
          <span className="font-display font-bold text-text-primary">
            {formatPrice(alert.currentPrice)}
          </span>
        </div>
        <div className="flex items-center gap-1 text-text-muted">
          <Target className="w-3.5 h-3.5" />
        </div>
        <div className="text-right">
          <span className="text-xs text-text-muted block">Alvo</span>
          <span className="font-display font-bold text-accent-blue">
            {formatPrice(alert.targetPrice)}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-text-muted">Progresso</span>
          <span className="text-[10px] font-semibold text-text-secondary">
            {progressPct}%
          </span>
        </div>
        <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progressPct >= 100
                ? "bg-accent-green"
                : progressPct >= 80
                ? "bg-accent-orange"
                : "bg-accent-blue"
            }`}
            style={{ width: `${Math.min(progressPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-2 text-[10px] text-text-muted pt-1">
        <Clock className="w-3 h-3" />
        <span>Criado {timeAgo(alert.createdAt)}</span>
      </div>
    </div>
  );
}
