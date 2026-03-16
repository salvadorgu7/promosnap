"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PromoSnap] Unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-6">
          <AlertTriangle className="w-8 h-8 text-red-500" />
        </div>

        <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
          Algo deu errado
        </h1>
        <p className="text-sm text-text-muted mb-8">
          Ocorreu um erro inesperado. Tente recarregar a pagina ou voltar para o inicio.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-surface-200 text-sm font-medium text-text-secondary hover:bg-surface-50 transition-colors"
          >
            <Home className="w-4 h-4" />
            Pagina inicial
          </Link>
        </div>

        {error.digest && (
          <p className="mt-6 text-xs text-text-muted/50">
            Codigo: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
