"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#F6F7FB" }}>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⚠️</div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#1a1a2e", marginBottom: "0.5rem" }}>
              Erro inesperado
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#64748b", lineHeight: 1.6, marginBottom: "1.5rem" }}>
              Ocorreu um erro crítico. Tente recarregar a página.
            </p>
            {error.digest && (
              <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "monospace", marginBottom: "1rem" }}>
                Ref: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: "0.75rem 1.5rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#7C4DFF",
                color: "white",
                fontWeight: 600,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
