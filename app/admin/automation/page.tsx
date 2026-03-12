import {
  Zap,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Target,
  BarChart3,
  Star,
  Truck,
  TrendingUp,
  FileText,
  Radio,
} from "lucide-react";
import { getActiveRules } from "@/lib/automation/rules";
import AutomationActions from "./automation-actions";

export const dynamic = "force-dynamic";

const ACTION_ICONS: Record<string, typeof Zap> = {
  feature_product: Star,
  add_to_carousel: TrendingUp,
  mark_deal_of_day: Target,
  suggest_distribution: Radio,
  suggest_article: FileText,
};

const ACTION_LABELS: Record<string, string> = {
  feature_product: "Destacar Produto",
  add_to_carousel: "Adicionar ao Carousel",
  mark_deal_of_day: "Oferta do Dia",
  suggest_distribution: "Sugerir Distribuicao",
  suggest_article: "Sugerir Artigo",
};

export default function AutomationPage() {
  const rules = getActiveRules();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary flex items-center gap-2">
            <Zap className="h-6 w-6 text-accent-blue" />
            Automacao de Merchandising
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Regras automaticas para destaque, carousel, oferta do dia e distribuicao
          </p>
        </div>
      </div>

      {/* Rules grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent-blue" />
          Regras Configuradas
        </h2>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rules.map((rule) => {
            const ActionIcon = ACTION_ICONS[rule.action] ?? Zap;
            return (
              <div
                key={rule.id}
                className={`relative rounded-xl border p-5 transition-all ${
                  rule.isActive
                    ? "border-surface-200 bg-white"
                    : "border-surface-100 bg-surface-50 opacity-60"
                }`}
              >
                {/* Status indicator */}
                <div className="absolute top-3 right-3">
                  {rule.isActive ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-accent-green bg-green-50 px-2 py-0.5 rounded-full">
                      <Play className="h-2.5 w-2.5" /> Ativa
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-text-muted bg-surface-100 px-2 py-0.5 rounded-full">
                      <Pause className="h-2.5 w-2.5" /> Inativa
                    </span>
                  )}
                </div>

                {/* Icon + title */}
                <div className="flex items-start gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-blue/10 flex-shrink-0">
                    <ActionIcon className="h-5 w-5 text-accent-blue" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">
                      {rule.name}
                    </h3>
                    <p className="text-xs text-text-muted mt-0.5">
                      {rule.description}
                    </p>
                  </div>
                </div>

                {/* Action label */}
                <div className="mb-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full">
                    <ActionIcon className="h-2.5 w-2.5" />
                    {ACTION_LABELS[rule.action] ?? rule.action}
                  </span>
                </div>

                {/* Thresholds */}
                <div className="space-y-1.5">
                  {rule.thresholds.minOfferScore !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Min. Offer Score</span>
                      <span className="font-medium text-text-secondary">
                        {rule.thresholds.minOfferScore}
                      </span>
                    </div>
                  )}
                  {rule.thresholds.minDiscount !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Min. Desconto</span>
                      <span className="font-medium text-text-secondary">
                        {rule.thresholds.minDiscount}%
                      </span>
                    </div>
                  )}
                  {rule.thresholds.minDecisionValue !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Min. Decision Value</span>
                      <span className="font-medium text-text-secondary">
                        {rule.thresholds.minDecisionValue}
                      </span>
                    </div>
                  )}
                  {rule.thresholds.minTrust !== undefined && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-text-muted">Min. Trust</span>
                      <span className="font-medium text-text-secondary">
                        {rule.thresholds.minTrust}
                      </span>
                    </div>
                  )}
                </div>

                {/* Priority */}
                <div className="mt-3 pt-3 border-t border-surface-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-muted">Prioridade</span>
                    <span className="font-medium text-text-secondary">
                      {rule.priority}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive section */}
      <AutomationActions rules={rules} />
    </div>
  );
}
