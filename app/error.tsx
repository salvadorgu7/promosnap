"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ErrorBoundary]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>

        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
            Algo deu errado
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            Ocorreu um erro inesperado. Tente recarregar a página ou volte para o início.
          </p>
          {error.digest && (
            <p className="text-xs text-text-muted mt-2 font-mono">
              Ref: {error.digest}
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Home className="h-4 w-4" />
            Início
          </Link>
        </div>
      </div>
    </div>
  );
}
