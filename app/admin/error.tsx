"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error.digest) {
      console.error("[admin] Error digest:", error.digest);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mb-5">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>

        <h1 className="text-xl font-bold text-text-primary mb-2">
          Erro no painel admin
        </h1>
        <p className="text-sm text-text-muted mb-6">
          {error.message || "Ocorreu um erro inesperado. Tente recarregar."}
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Tentar novamente
          </button>
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-surface-200 text-sm font-medium text-text-secondary hover:bg-surface-50 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>

        {error.digest && (
          <p className="mt-4 text-[10px] text-text-muted/40 font-mono">
            {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
