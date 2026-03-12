import Link from "next/link";
import { PackageSearch, Search, Database, AlertTriangle, type LucideIcon } from "lucide-react";

type EmptyStateVariant = "search" | "data" | "error"

const variantDefaults: Record<EmptyStateVariant, { icon: LucideIcon; title: string; description: string }> = {
  search: {
    icon: Search,
    title: "Nenhum resultado encontrado",
    description: "Tente buscar com outras palavras ou remova os filtros.",
  },
  data: {
    icon: Database,
    title: "Sem dados",
    description: "Nenhum dado disponivel no momento.",
  },
  error: {
    icon: AlertTriangle,
    title: "Algo deu errado",
    description: "Ocorreu um erro ao carregar os dados. Tente novamente.",
  },
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaHref?: string;
  variant?: EmptyStateVariant;
  onAction?: () => void;
  actionLabel?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  ctaLabel,
  ctaHref,
  variant,
  onAction,
  actionLabel,
}: EmptyStateProps) {
  const defaults = variant ? variantDefaults[variant] : null
  const Icon = icon || defaults?.icon || PackageSearch
  const displayTitle = title || defaults?.title || "Sem dados"
  const displayDesc = description || defaults?.description || ""

  return (
    <div className="text-center py-16 card">
      <div className="w-16 h-16 rounded-2xl bg-surface-100 flex items-center justify-center mx-auto mb-4">
        <Icon className="h-8 w-8 text-surface-300" />
      </div>
      <h2 className="text-lg font-semibold text-text-primary mb-2">{displayTitle}</h2>
      <p className="text-sm text-text-muted max-w-md mx-auto">{displayDesc}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-block mt-6 btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold"
        >
          {ctaLabel}
        </Link>
      )}
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          className="inline-block mt-6 btn-secondary px-6 py-2.5 rounded-lg text-sm font-semibold"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
