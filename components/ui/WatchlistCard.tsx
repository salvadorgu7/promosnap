"use client";

import {
  TrendingUp,
  TrendingDown,
  Minus,
  Bell,
  Trash2,
  Share2,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import ImageWithFallback from "@/components/ui/ImageWithFallback";

export interface WatchlistItem {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  currentPrice: number;
  previousPrice?: number | null;
  sourceName: string;
  hasAlert: boolean;
}

interface WatchlistCardProps {
  item: WatchlistItem;
  onRemove?: (id: string) => void;
  onCreateAlert?: (id: string) => void;
  onShare?: (id: string) => void;
}

function PriceChangeIndicator({
  current,
  previous,
}: {
  current: number;
  previous?: number | null;
}) {
  if (!previous || previous === current) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-surface-400">
        <Minus className="w-3 h-3" />
        Estavel
      </span>
    );
  }
  if (current < previous) {
    const pct = Math.round(((previous - current) / previous) * 100);
    return (
      <span className="inline-flex items-center gap-1 text-xs text-accent-green font-semibold">
        <TrendingDown className="w-3 h-3" />
        -{pct}%
      </span>
    );
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-accent-red font-semibold">
      <TrendingUp className="w-3 h-3" />
      +{pct}%
    </span>
  );
}

export default function WatchlistCard({
  item,
  onRemove,
  onCreateAlert,
  onShare,
}: WatchlistCardProps) {
  return (
    <div className="card p-4 flex gap-4 group hover:-translate-y-0.5">
      {/* Image */}
      <Link
        href={`/produto/${item.slug}`}
        className="w-20 h-20 rounded-lg overflow-hidden image-container flex-shrink-0"
      >
        <ImageWithFallback
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-contain p-2"
          width={80}
          height={80}
        />
      </Link>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/produto/${item.slug}`} className="min-w-0">
            <h3 className="text-sm font-medium text-text-primary line-clamp-2 group-hover:text-accent-blue transition-colors">
              {item.name}
            </h3>
          </Link>
          {item.hasAlert && (
            <span className="badge-hot flex-shrink-0 text-[10px]">
              <Bell className="w-3 h-3" />
              Alerta ativo
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-text-muted">{item.sourceName}</span>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className="font-display font-extrabold text-lg text-primary-900">
            {formatPrice(item.currentPrice)}
          </span>
          {item.previousPrice && item.previousPrice !== item.currentPrice && (
            <span className="price-old text-xs">
              {formatPrice(item.previousPrice)}
            </span>
          )}
          <PriceChangeIndicator
            current={item.currentPrice}
            previous={item.previousPrice}
          />
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-1 mt-3">
          {onRemove && (
            <button
              onClick={() => onRemove(item.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-accent-red hover:bg-accent-red/5 transition-colors"
              title="Remover dos favoritos"
            >
              <Trash2 className="w-3 h-3" />
              Remover
            </button>
          )}
          {onCreateAlert && !item.hasAlert && (
            <button
              onClick={() => onCreateAlert(item.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-accent-blue hover:bg-accent-blue/5 transition-colors"
              title="Criar alerta de preco"
            >
              <Bell className="w-3 h-3" />
              Criar alerta
            </button>
          )}
          {onShare && (
            <button
              onClick={() => onShare(item.id)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-accent-purple hover:bg-accent-purple/5 transition-colors"
              title="Compartilhar"
            >
              <Share2 className="w-3 h-3" />
              Compartilhar
            </button>
          )}
          <Link
            href={`/produto/${item.slug}`}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-text-muted hover:text-accent-blue hover:bg-accent-blue/5 transition-colors ml-auto"
          >
            <ExternalLink className="w-3 h-3" />
            Ver produto
          </Link>
        </div>
      </div>
    </div>
  );
}
