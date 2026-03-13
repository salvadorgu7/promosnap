"use client";

import { useState } from "react";
import { Play, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface ExecuteButtonProps {
  type: string;
  payload: Record<string, unknown>;
  label?: string;
}

export function ExecuteButton({ type, payload, label = "Executar" }: ExecuteButtonProps) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleExecute() {
    setState("loading");
    setError(null);

    try {
      const res = await fetch("/api/admin/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, payload, origin: "manual" }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.execution?.status === "failed") {
        setState("failed");
        setError(data.execution.error || "Execucao falhou");
      } else {
        setState("success");
      }
    } catch (err) {
      setState("failed");
      setError(err instanceof Error ? err.message : "Erro desconhecido");
    }
  }

  if (state === "success") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
        <CheckCircle2 className="h-3 w-3" /> OK
      </span>
    );
  }

  if (state === "failed") {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-lg cursor-pointer"
        title={error || "Falhou"}
        onClick={handleExecute}
      >
        <XCircle className="h-3 w-3" /> Falhou
      </span>
    );
  }

  return (
    <button
      onClick={handleExecute}
      disabled={state === "loading"}
      className="inline-flex items-center gap-1 text-xs font-medium text-accent-blue hover:text-white hover:bg-accent-blue bg-blue-50 px-2 py-1 rounded-lg transition-colors disabled:opacity-50"
    >
      {state === "loading" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Play className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}
