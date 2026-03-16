import Link from "next/link";
import { Search, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md space-y-6">
        <div className="text-8xl font-bold font-display text-surface-200">
          404
        </div>

        <div>
          <h1 className="text-2xl font-bold font-display text-text-primary mb-2">
            Página não encontrada
          </h1>
          <p className="text-text-secondary text-sm leading-relaxed">
            A página que você procura não existe ou foi movida. Tente buscar o que precisa.
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/"
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Home className="h-4 w-4" />
            Início
          </Link>
          <Link
            href="/busca"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Search className="h-4 w-4" />
            Buscar ofertas
          </Link>
          <Link
            href="/categorias"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Categorias
          </Link>
        </div>
      </div>
    </div>
  );
}
