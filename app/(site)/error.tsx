"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home, Search } from "lucide-react";
import Link from "next/link";

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (error.digest) {
      console.error("[PromoSnap] Error digest:", error.digest);
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 mb-5">
          <AlertTriangle className="w-7 h-7 text-red-500" />
        </div>

        <h1 className="text-xl font-bold font-display text-text-primary mb-2">
          Ops! Algo deu errado
        </h1>
        <p className="text-sm text-text-muted mb-6">
          Tivemos um problema ao carregar esta pagina. Tente novamente ou busque outro produto.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <button
            onClick={() => reset()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 transition-colors touch-target"
          >
            <RotateCcw className="w-4 h-4" />
            Tentar novamente
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-surface-200 text-sm font-medium text-text-secondary hover:bg-surface-50 transition-colors touch-target"
          >
            <Home className="w-4 h-4" />
            Inicio
          </Link>
        </div>

        <Link
          href="/busca"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-accent-blue transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          Buscar produtos
        </Link>

        {error.digest && (
          <p className="mt-4 text-[10px] text-text-muted/40">
            ref: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
