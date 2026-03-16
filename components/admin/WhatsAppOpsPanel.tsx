"use client";

import {
  MessageCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart3,
  Tag,
  Store,
} from "lucide-react";

export interface ParsedProduct {
  title: string;
  url: string;
  currentPrice: number;
  originalPrice?: number;
  imageUrl?: string;
  coupon?: string;
  category?: string;
  brand?: string;
  confidence: number;
  warnings: string[];
  sourceSlug?: string;
}

interface WhatsAppOpsPanelProps {
  products: ParsedProduct[];
  onImport: (minConfidence: number) => void;
  onReview: () => void;
}

/* ── helpers ───────────────────────────────────────────────────────────── */

const MARKETPLACE_DOMAINS = [
  "mercadolivre.com.br",
  "mercadolibre.com",
  "amazon.com.br",
  "shopee.com.br",
  "magazineluiza.com.br",
  "magalu.com",
  "americanas.com.br",
  "casasbahia.com.br",
  "kabum.com.br",
  "aliexpress.com",
];

function isMarketplaceUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return MARKETPLACE_DOMAINS.some((d) => host.includes(d));
  } catch {
    return false;
  }
}

function pct(n: number, total: number): string {
  if (total === 0) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

function mostCommon(items: (string | undefined)[]): string {
  const counts: Record<string, number> = {};
  for (const item of items) {
    if (!item) continue;
    counts[item] = (counts[item] || 0) + 1;
  }
  const entries = Object.entries(counts);
  if (entries.length === 0) return "—";
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/* ── stat pill sub-component ──────────────────────────────────────────── */

function StatPill({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: "green" | "yellow" | "red" | "blue" | "purple" | "neutral";
}) {
  const colorMap: Record<string, string> = {
    green: "bg-accent-green/10 text-accent-green border-accent-green/20",
    yellow: "bg-accent-orange/10 text-accent-orange border-accent-orange/20",
    red: "bg-accent-red/10 text-accent-red border-accent-red/20",
    blue: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
    purple: "bg-accent-purple/10 text-accent-purple border-accent-purple/20",
    neutral: "bg-surface-100 text-surface-600 border-surface-200",
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${colorMap[color]}`}
    >
      {icon}
      <div className="flex flex-col">
        <span className="text-xs opacity-70">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
    </div>
  );
}

/* ── quality row sub-component ────────────────────────────────────────── */

function QualityRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-semibold text-text-primary">{value}</span>
    </div>
  );
}

/* ── main component ───────────────────────────────────────────────────── */

export default function WhatsAppOpsPanel({
  products,
  onImport,
  onReview,
}: WhatsAppOpsPanelProps) {
  const total = products.length;

  if (total === 0) return null;

  /* summary counts */
  const highConf = products.filter((p) => p.confidence >= 70).length;
  const midConf = products.filter(
    (p) => p.confidence >= 40 && p.confidence < 70
  ).length;
  const lowConf = products.filter((p) => p.confidence < 40).length;
  const withMarketplaceUrl = products.filter((p) =>
    isMarketplaceUrl(p.url)
  ).length;
  const withBrand = products.filter((p) => !!p.brand).length;
  const withCategory = products.filter((p) => !!p.category).length;

  /* quality indicators */
  const avgConfidence = Math.round(
    products.reduce((sum, p) => sum + p.confidence, 0) / total
  );
  const withPrice = products.filter((p) => p.currentPrice > 0).length;
  const topCategory = mostCommon(products.map((p) => p.category));

  return (
    <div className="animate-fade-in space-y-4">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 text-text-primary">
        <MessageCircle className="h-5 w-5 text-accent-green" />
        <h3 className="font-display text-base font-bold">
          Resultado do Parse
        </h3>
        <span className="ml-auto rounded-full bg-surface-100 px-2.5 py-0.5 text-xs font-medium text-surface-600">
          {total} {total === 1 ? "item" : "itens"}
        </span>
      </div>

      {/* ── Summary Stats Bar ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatPill
          icon={<BarChart3 className="h-4 w-4" />}
          label="Total parseado"
          value={total}
          color="neutral"
        />
        <StatPill
          icon={<CheckCircle className="h-4 w-4" />}
          label="Confianca >= 70"
          value={highConf}
          color="green"
        />
        <StatPill
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Confianca 40-69"
          value={midConf}
          color="yellow"
        />
        <StatPill
          icon={<XCircle className="h-4 w-4" />}
          label="Confianca < 40"
          value={lowConf}
          color="red"
        />
        <StatPill
          icon={<Store className="h-4 w-4" />}
          label="URL marketplace"
          value={withMarketplaceUrl}
          color="blue"
        />
        <StatPill
          icon={<Tag className="h-4 w-4" />}
          label="Marca detectada"
          value={withBrand}
          color="purple"
        />
        <StatPill
          icon={<Tag className="h-4 w-4" />}
          label="Categoria detectada"
          value={withCategory}
          color="purple"
        />
      </div>

      {/* ── Quality Indicators ────────────────────────────────────────── */}
      <div className="rounded-xl border border-surface-200/80 bg-white p-4 shadow-card">
        <h4 className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-text-primary">
          <BarChart3 className="h-4 w-4 text-accent-blue" />
          Indicadores de Qualidade
        </h4>
        <div className="divide-y divide-surface-200/60">
          <QualityRow
            label="Confianca media"
            value={`${avgConfidence}/100`}
          />
          <QualityRow
            label="Com URL de marketplace"
            value={pct(withMarketplaceUrl, total)}
          />
          <QualityRow
            label="Com preco detectado"
            value={pct(withPrice, total)}
          />
          <QualityRow
            label="Com marca detectada"
            value={pct(withBrand, total)}
          />
          <QualityRow
            label="Categoria mais comum"
            value={topCategory}
          />
        </div>
      </div>

      {/* ── Confidence Distribution Bar ───────────────────────────────── */}
      {total > 0 && (
        <div className="rounded-xl border border-surface-200/80 bg-white p-4 shadow-card">
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            Distribuicao de Confianca
          </h4>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {highConf > 0 && (
              <div
                className="bg-accent-green transition-all"
                style={{ width: pct(highConf, total) }}
                title={`>= 70: ${highConf}`}
              />
            )}
            {midConf > 0 && (
              <div
                className="bg-accent-orange transition-all"
                style={{ width: pct(midConf, total) }}
                title={`40-69: ${midConf}`}
              />
            )}
            {lowConf > 0 && (
              <div
                className="bg-accent-red transition-all"
                style={{ width: pct(lowConf, total) }}
                title={`< 40: ${lowConf}`}
              />
            )}
          </div>
          <div className="mt-2 flex gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-green" />
              Alta ({highConf})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-orange" />
              Media ({midConf})
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-accent-red" />
              Baixa ({lowConf})
            </span>
          </div>
        </div>
      )}

      {/* ── Action Buttons ────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onImport(70)}
          disabled={highConf === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-accent-green px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
        >
          <CheckCircle className="h-4 w-4" />
          Importar todos com confianca &gt;= 70
          {highConf > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
              {highConf}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onImport(40)}
          disabled={highConf + midConf === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-accent-orange/30 bg-accent-orange/10 px-4 py-2.5 text-sm font-semibold text-accent-orange shadow-sm transition-all hover:bg-accent-orange/20 active:scale-[0.97] disabled:opacity-40 disabled:pointer-events-none"
        >
          <AlertTriangle className="h-4 w-4" />
          Importar todos com confianca &gt;= 40
          {highConf + midConf > 0 && (
            <span className="rounded-full bg-accent-orange/20 px-1.5 py-0.5 text-xs">
              {highConf + midConf}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onReview}
          className="inline-flex items-center gap-2 rounded-lg border border-surface-300 bg-white px-4 py-2.5 text-sm font-medium text-surface-700 shadow-sm transition-all hover:bg-surface-50 hover:text-surface-900 hover:border-surface-400 active:scale-[0.97]"
        >
          <MessageCircle className="h-4 w-4" />
          Revisar manualmente
        </button>
      </div>
    </div>
  );
}
