"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle, XCircle } from "lucide-react";

interface JobActionConfig {
  label: string;
  endpoint: string;
  method: "GET" | "POST";
  description: string;
}

const JOBS: JobActionConfig[] = [
  { label: "Seed DB", endpoint: "/api/admin/seed", method: "POST", description: "Popula o banco com dados iniciais" },
  { label: "Trends", endpoint: "/api/admin/trends", method: "GET", description: "Recalcula tendencias e scores" },
];

export default function JobActions() {
  const [running, setRunning] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, { ok: boolean; message: string }>>({});

  async function triggerJob(job: JobActionConfig) {
    setRunning(job.endpoint);
    setResults((prev) => ({ ...prev, [job.endpoint]: undefined as any }));

    try {
      const res = await fetch(job.endpoint, { method: job.method });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setResults((prev) => ({
          ...prev,
          [job.endpoint]: { ok: true, message: data.message || `${job.label} concluido com sucesso` },
        }));
      } else {
        setResults((prev) => ({
          ...prev,
          [job.endpoint]: { ok: false, message: data.error || `Erro: ${res.status}` },
        }));
      }
    } catch (err: any) {
      setResults((prev) => ({
        ...prev,
        [job.endpoint]: { ok: false, message: err.message || "Erro de rede" },
      }));
    } finally {
      setRunning(null);
    }
  }

  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold font-display text-text-primary mb-4">Acoes</h2>
      <div className="space-y-3">
        {JOBS.map((job) => {
          const result = results[job.endpoint];
          const isRunning = running === job.endpoint;

          return (
            <div key={job.endpoint} className="flex items-center justify-between p-3 rounded-lg bg-surface-50">
              <div>
                <p className="text-sm font-medium text-text-primary">{job.label}</p>
                <p className="text-xs text-text-muted">{job.description}</p>
                {result && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${result.ok ? "text-accent-green" : "text-red-500"}`}>
                    {result.ok ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                    {result.message}
                  </div>
                )}
              </div>
              <button
                onClick={() => triggerJob(job)}
                disabled={isRunning || running !== null}
                className="btn-primary text-sm px-3 py-1.5 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Executando...
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" />
                    Executar
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
