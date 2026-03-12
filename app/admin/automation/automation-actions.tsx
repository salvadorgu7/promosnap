"use client";

import { useState } from "react";
import {
  Play,
  Pause,
  Zap,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Target,
  Star,
  TrendingUp,
  Radio,
  FileText,
  Eye,
} from "lucide-react";
import type { AutomationThresholds } from "@/lib/automation/rules";

interface RuleDisplay {
  id: string;
  name: string;
  description: string;
  action: string;
  isActive: boolean;
  priority: number;
  thresholds: AutomationThresholds;
}

interface SimulationTriggered {
  ruleId: string;
  ruleName: string;
  action: string;
  productId: string;
  productName: string;
  productSlug: string;
  reasons: string[];
  score: number;
}

interface SimulationData {
  triggered: SimulationTriggered[];
  skipped: { ruleId: string; reason: string }[];
  totalProducts: number;
  totalRulesEvaluated: number;
}

interface AutomationActionsProps {
  rules: RuleDisplay[];
}

const ACTION_ICONS: Record<string, typeof Zap> = {
  feature_product: Star,
  add_to_carousel: TrendingUp,
  mark_deal_of_day: Target,
  suggest_distribution: Radio,
  suggest_article: FileText,
};

const ACTION_LABELS: Record<string, string> = {
  feature_product: "Destacar",
  add_to_carousel: "Carousel",
  mark_deal_of_day: "Oferta do Dia",
  suggest_distribution: "Distribuicao",
  suggest_article: "Artigo",
};

export default function AutomationActions({ rules: initialRules }: AutomationActionsProps) {
  const [rules, setRules] = useState(initialRules);
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [simulation, setSimulation] = useState<SimulationData | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [editingThresholds, setEditingThresholds] = useState<string | null>(null);
  const [thresholdValues, setThresholdValues] = useState<AutomationThresholds>({});

  async function handleToggle(ruleId: string, currentActive: boolean) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", ruleId, isActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao alternar regra");

      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: !currentActive } : r))
      );
      setMessage({
        type: "success",
        text: `Regra "${ruleId}" ${!currentActive ? "ativada" : "desativada"}`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
    setLoading(false);
  }

  async function handleSimulate() {
    setSimulating(true);
    setMessage(null);
    setSimulation(null);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "simulate" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro na simulacao");
      setSimulation(data.simulation);
      setMessage({
        type: "success",
        text: `Simulacao concluida: ${data.simulation.triggered.length} acoes encontradas`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
    setSimulating(false);
  }

  async function handleApply() {
    if (!simulation || simulation.triggered.length === 0) return;
    setApplying(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "apply" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao aplicar automacao");
      setMessage({
        type: "success",
        text: `Automacao aplicada: ${data.applied} acoes executadas`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
    setApplying(false);
  }

  async function handleUpdateThresholds(ruleId: string) {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/automation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_thresholds",
          ruleId,
          thresholds: thresholdValues,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao atualizar thresholds");

      setRules((prev) =>
        prev.map((r) =>
          r.id === ruleId
            ? { ...r, thresholds: { ...r.thresholds, ...thresholdValues } }
            : r
        )
      );
      setEditingThresholds(null);
      setThresholdValues({});
      setMessage({ type: "success", text: "Thresholds atualizados" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Erro desconhecido",
      });
    }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Status message */}
      {message && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-accent-green"
              : "bg-red-50 text-red-600"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          )}
          {message.text}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={handleSimulate}
          disabled={simulating}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 transition-all"
        >
          {simulating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          {simulating ? "Simulando..." : "Simular Automacao"}
        </button>

        {simulation && simulation.triggered.length > 0 && (
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-accent-green text-white hover:bg-accent-green/90 disabled:opacity-50 transition-all"
          >
            {applying ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {applying ? "Aplicando..." : "Aplicar Automacao"}
          </button>
        )}
      </div>

      {/* Toggle rules */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-text-primary">Controle de Regras</h3>
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-3 rounded-lg border border-surface-200 bg-white"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggle(rule.id, rule.isActive)}
                  disabled={loading}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                    rule.isActive
                      ? "bg-accent-green/10 text-accent-green hover:bg-accent-green/20"
                      : "bg-surface-100 text-text-muted hover:bg-surface-200"
                  }`}
                >
                  {rule.isActive ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <Pause className="h-4 w-4" />
                  )}
                </button>
                <div>
                  <p className="text-sm font-medium text-text-primary">{rule.name}</p>
                  <p className="text-xs text-text-muted">{rule.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit thresholds button */}
                <button
                  onClick={() => {
                    if (editingThresholds === rule.id) {
                      setEditingThresholds(null);
                      setThresholdValues({});
                    } else {
                      setEditingThresholds(rule.id);
                      setThresholdValues(rule.thresholds);
                    }
                  }}
                  className="text-xs text-accent-blue hover:underline"
                >
                  {editingThresholds === rule.id ? "Cancelar" : "Ajustar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Threshold editor */}
      {editingThresholds && (
        <div className="p-4 rounded-xl border border-accent-blue/30 bg-accent-blue/5 space-y-3">
          <h4 className="text-sm font-bold text-text-primary">
            Ajustar Thresholds: {rules.find((r) => r.id === editingThresholds)?.name}
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            {thresholdValues.minOfferScore !== undefined && (
              <div>
                <label className="text-xs text-text-muted block mb-1">
                  Min. Offer Score
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={thresholdValues.minOfferScore ?? 50}
                  onChange={(e) =>
                    setThresholdValues((prev) => ({
                      ...prev,
                      minOfferScore: parseInt(e.target.value),
                    }))
                  }
                  className="w-full accent-accent-blue"
                />
                <span className="text-xs font-medium text-text-secondary">
                  {thresholdValues.minOfferScore}
                </span>
              </div>
            )}
            {thresholdValues.minDiscount !== undefined && (
              <div>
                <label className="text-xs text-text-muted block mb-1">
                  Min. Desconto (%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  value={thresholdValues.minDiscount ?? 20}
                  onChange={(e) =>
                    setThresholdValues((prev) => ({
                      ...prev,
                      minDiscount: parseInt(e.target.value),
                    }))
                  }
                  className="w-full accent-accent-blue"
                />
                <span className="text-xs font-medium text-text-secondary">
                  {thresholdValues.minDiscount}%
                </span>
              </div>
            )}
            {thresholdValues.minDecisionValue !== undefined && (
              <div>
                <label className="text-xs text-text-muted block mb-1">
                  Min. Decision Value
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={thresholdValues.minDecisionValue ?? 50}
                  onChange={(e) =>
                    setThresholdValues((prev) => ({
                      ...prev,
                      minDecisionValue: parseInt(e.target.value),
                    }))
                  }
                  className="w-full accent-accent-blue"
                />
                <span className="text-xs font-medium text-text-secondary">
                  {thresholdValues.minDecisionValue}
                </span>
              </div>
            )}
            {thresholdValues.minTrust !== undefined && (
              <div>
                <label className="text-xs text-text-muted block mb-1">
                  Min. Trust
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={thresholdValues.minTrust ?? 50}
                  onChange={(e) =>
                    setThresholdValues((prev) => ({
                      ...prev,
                      minTrust: parseInt(e.target.value),
                    }))
                  }
                  className="w-full accent-accent-blue"
                />
                <span className="text-xs font-medium text-text-secondary">
                  {thresholdValues.minTrust}
                </span>
              </div>
            )}
          </div>
          <button
            onClick={() => handleUpdateThresholds(editingThresholds)}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-accent-blue text-white hover:bg-accent-blue/90 disabled:opacity-50 transition-all"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Salvar Thresholds
          </button>
        </div>
      )}

      {/* Simulation results */}
      {simulation && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
              <Eye className="h-5 w-5 text-accent-blue" />
              Se rodarmos agora...
            </h3>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <span>{simulation.totalProducts} produtos analisados</span>
              <span>{simulation.totalRulesEvaluated} avaliacoes</span>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-surface-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold font-display text-accent-blue">
                {simulation.triggered.length}
              </p>
              <p className="text-xs text-text-muted mt-1">Acoes disparadas</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold font-display text-text-primary">
                {simulation.totalProducts}
              </p>
              <p className="text-xs text-text-muted mt-1">Produtos analisados</p>
            </div>
            <div className="rounded-xl border border-surface-200 bg-white p-4 text-center">
              <p className="text-2xl font-bold font-display text-text-muted">
                {simulation.skipped.length}
              </p>
              <p className="text-xs text-text-muted mt-1">Regras ignoradas</p>
            </div>
          </div>

          {/* Triggered actions */}
          {simulation.triggered.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-text-primary">
                Acoes que seriam executadas
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {simulation.triggered.map((item, idx) => {
                  const ActionIcon = ACTION_ICONS[item.action] ?? Zap;
                  return (
                    <div
                      key={`${item.ruleId}-${item.productId}-${idx}`}
                      className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 bg-white"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-blue/10 flex-shrink-0">
                        <ActionIcon className="h-4 w-4 text-accent-blue" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {item.productName}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-medium text-accent-blue bg-accent-blue/10 px-1.5 py-0.5 rounded-full">
                            {ACTION_LABELS[item.action] ?? item.action}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            Regra: {item.ruleName}
                          </span>
                          {item.reasons.map((r, ri) => (
                            <span
                              key={ri}
                              className="text-[10px] text-text-muted"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-text-primary">
                          {Math.round(item.score)}
                        </p>
                        <p className="text-[10px] text-text-muted">score</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {simulation.triggered.length === 0 && (
            <div className="rounded-xl border border-surface-200 bg-white p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-text-muted mx-auto mb-2" />
              <p className="text-sm text-text-muted">
                Nenhuma acao seria disparada com as regras atuais
              </p>
              <p className="text-xs text-text-muted mt-1">
                Ajuste os thresholds ou ative mais regras
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
