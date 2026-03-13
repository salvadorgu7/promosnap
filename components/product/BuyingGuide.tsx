"use client";

import { useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertTriangle,
  Cpu,
} from "lucide-react";

interface BuyingGuideProps {
  productName: string;
  specsJson?: Record<string, string> | null;
  attributes?: Record<string, string> | null;
  offersCount: number;
  bestPrice: number;
  avgPrice?: number;
  isFreeShipping: boolean;
  hasRating: boolean;
  rating?: number | null;
  reviewsCount?: number | null;
  fastDelivery?: boolean;
  sourcesCount: number;
}

function getKeySpecs(
  specsJson?: Record<string, string> | null,
  attributes?: Record<string, string> | null
): string[] {
  const specs: string[] = [];
  const all = { ...attributes, ...specsJson };
  if (!all || Object.keys(all).length === 0) return specs;

  // Pick the most relevant specs (up to 4)
  const priorityKeys = [
    "marca", "brand",
    "modelo", "model",
    "cor", "color",
    "tamanho", "size",
    "capacidade", "capacity", "storage",
    "memoria", "memory", "ram",
    "processador", "processor", "cpu",
    "tela", "screen", "display",
    "peso", "weight",
    "material",
    "voltagem", "voltage",
    "potencia", "power",
    "garantia", "warranty",
  ];

  for (const key of priorityKeys) {
    if (specs.length >= 4) break;
    const normalizedKey = key.toLowerCase();
    for (const [k, v] of Object.entries(all)) {
      if (k.toLowerCase().includes(normalizedKey) && v && !specs.includes(`${k}: ${v}`)) {
        specs.push(`${k}: ${v}`);
        break;
      }
    }
  }

  // If we didn't find priority keys, take first few
  if (specs.length === 0) {
    for (const [k, v] of Object.entries(all).slice(0, 4)) {
      if (v) specs.push(`${k}: ${v}`);
    }
  }

  return specs.slice(0, 4);
}

function getPros(props: BuyingGuideProps): string[] {
  const pros: string[] = [];

  if (props.avgPrice && props.bestPrice < props.avgPrice * 0.95) {
    pros.push("Preco abaixo da media");
  }
  if (props.isFreeShipping) {
    pros.push("Frete gratis disponivel");
  }
  if (props.fastDelivery) {
    pros.push("Entrega rapida");
  }
  if (props.hasRating && (props.rating ?? 0) >= 4.0) {
    pros.push(`Boa avaliacao (${(props.rating ?? 0).toFixed(1)} estrelas)`);
  }
  if (props.sourcesCount >= 3) {
    pros.push(`Disponivel em ${props.sourcesCount} fontes`);
  }
  if (props.offersCount >= 2) {
    pros.push("Multiplas ofertas para comparar");
  }
  if (props.reviewsCount && props.reviewsCount >= 100) {
    pros.push(`${props.reviewsCount.toLocaleString("pt-BR")} avaliacoes`);
  }

  return pros.slice(0, 4);
}

function getConsiderations(props: BuyingGuideProps): string[] {
  const cons: string[] = [];

  if (props.sourcesCount <= 1) {
    cons.push("Apenas 1 fonte disponivel");
  }
  if (!props.hasRating || (props.rating ?? 0) === 0) {
    cons.push("Sem avaliacoes de usuarios");
  }
  if (!props.isFreeShipping) {
    cons.push("Frete pode ser cobrado");
  }
  if (props.avgPrice && props.bestPrice > props.avgPrice * 1.05) {
    cons.push("Preco acima da media recente");
  }
  if (props.hasRating && (props.rating ?? 0) > 0 && (props.rating ?? 0) < 3.5) {
    cons.push("Avaliacao abaixo de 3.5 estrelas");
  }
  if (props.reviewsCount != null && props.reviewsCount > 0 && props.reviewsCount < 10) {
    cons.push("Poucas avaliacoes");
  }

  return cons.slice(0, 4);
}

export default function BuyingGuide(props: BuyingGuideProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const specs = getKeySpecs(props.specsJson, props.attributes);
  const pros = getPros(props);
  const considerations = getConsiderations(props);

  // Don't render if we have no useful info
  if (specs.length === 0 && pros.length === 0 && considerations.length === 0) {
    return null;
  }

  return (
    <div className="card p-4 border border-surface-200">
      {/* Header — collapsible on mobile */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between gap-2 sm:cursor-default"
      >
        <h3 className="text-sm font-bold font-display text-text-primary flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-accent-purple" />
          Guia Rapido
        </h3>
        <span className="sm:hidden text-text-muted">
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>

      <div className={`mt-3 space-y-3 ${isExpanded ? "block" : "hidden sm:block"}`}>
        {/* Key specs */}
        {specs.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Cpu className="h-3 w-3" /> Especificacoes principais
            </p>
            <div className="flex flex-wrap gap-1.5">
              {specs.map((spec) => (
                <span
                  key={spec}
                  className="inline-flex text-[11px] text-text-secondary bg-surface-50 px-2 py-1 rounded-md border border-surface-100"
                >
                  {spec}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pros */}
        {pros.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-accent-green uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Pontos positivos
            </p>
            <ul className="space-y-1">
              {pros.map((pro) => (
                <li
                  key={pro}
                  className="flex items-start gap-1.5 text-xs text-text-secondary"
                >
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-accent-green flex-shrink-0" />
                  {pro}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Considerations */}
        {considerations.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-accent-orange uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Considere
            </p>
            <ul className="space-y-1">
              {considerations.map((con) => (
                <li
                  key={con}
                  className="flex items-start gap-1.5 text-xs text-text-secondary"
                >
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-accent-orange flex-shrink-0" />
                  {con}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
