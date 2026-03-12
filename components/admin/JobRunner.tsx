"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react";

export default function JobRunner({ jobName }: { jobName: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/jobs/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job: jobName }),
      });
      const data = await res.json();
      if (res.ok) {
        const r = data.result;
        setResult({
          ok: true,
          message: `${r?.status || "OK"} — ${r?.itemsDone ?? 0}/${r?.itemsTotal ?? 0} items em ${((r?.durationMs ?? 0) / 1000).toFixed(1)}s`,
        });
      } else {
        setResult({ ok: false, message: data.error || "Falhou" });
      }
    } catch {
      setResult({ ok: false, message: "Erro de rede" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={run}
        disabled={loading}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent-blue text-white text-xs font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50 w-full justify-center"
      >
        {loading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Play className="w-3 h-3" />
        )}
        {loading ? "Executando..." : "Executar agora"}
      </button>

      {result && (
        <div className={`flex items-start gap-1.5 text-xs ${result.ok ? "text-accent-green" : "text-red-500"}`}>
          {result.ok ? <CheckCircle className="w-3 h-3 mt-0.5 flex-shrink-0" /> : <XCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />}
          <span>{result.message}</span>
        </div>
      )}
    </div>
  );
}
