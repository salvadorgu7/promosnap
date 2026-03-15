"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import LogoIcon from "@/components/ui/LogoIcon";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const rawFrom = searchParams.get("from") || "/admin";
        const from = rawFrom.startsWith("/") && !rawFrom.startsWith("//") ? rawFrom : "/admin";
        router.push(from);
        router.refresh();
      } else {
        setError("Senha incorreta. Tente novamente.");
        setPassword("");
      }
    } catch {
      setError("Erro de conexao. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <Lock className="w-4 h-4 text-surface-400" />
        <h2 className="font-display font-semibold text-surface-700 text-sm">
          Acesso restrito
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="password"
            className="block text-xs font-medium text-surface-500 mb-1.5"
          >
            Senha de administrador
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Digite a senha"
              autoFocus
              autoComplete="current-password"
              className="w-full h-11 rounded-xl border border-surface-200 bg-surface-50 px-4 pr-10 text-sm text-surface-800 placeholder:text-surface-400 outline-none focus:border-brand-500/50 focus:bg-white focus:shadow-glow transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-accent-red bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !password.trim()}
          className="w-full h-11 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-semibold text-sm hover:shadow-glow transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Verificando...
            </span>
          ) : (
            "Entrar"
          )}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "linear-gradient(135deg, #F6F7FB 0%, #EEEAFE 50%, #F1F4FA 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <LogoIcon size={48} className="mb-3" />
          <h1 className="font-display font-extrabold text-xl text-surface-900 tracking-tight">
            Promo<span className="text-gradient">Snap</span>
          </h1>
          <p className="text-sm text-surface-400 mt-1">Painel Administrativo</p>
        </div>

        {/* Login card */}
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6 flex items-center justify-center h-48">
              <div className="w-5 h-5 border-2 border-surface-300 border-t-brand-500 rounded-full animate-spin" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="text-center text-[11px] text-surface-400 mt-4">
          Acesso exclusivo para administradores do PromoSnap.
        </p>
      </div>
    </div>
  );
}
