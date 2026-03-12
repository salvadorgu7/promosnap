import Link from "next/link";
import { PackageSearch, Search, Database, AlertTriangle, type LucideIcon } from "lucide-react";

type EmptyStateVariant = "search" | "data" | "error"

const variantDefaults: Record<EmptyStateVariant, { icon: LucideIcon; title: string; description: string; iconBg: string }> = {
  search: {
    icon: Search,
    title: "Nenhum resultado encontrado",
    description: "Tente buscar com outras palavras ou remova os filtros aplicados.",
    iconBg: "bg-blue-50",
  },
  data: {
    icon: Database,
    title: "Nenhum dado disponivel",
    description: "Esta secao ainda nao possui conteudo. Volte mais tarde para novidades.",
    iconBg: "bg-surface-100",
  },
  error: {
    icon: AlertTriangle,
    title: "Algo deu errado",
    description: "Ocorreu um erro ao carregar os dados. Tente novamente.",
    iconBg: "bg-red-50",
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
  /** Optional children rendered below the description */
  children?: React.ReactNode;
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
  children,
}: EmptyStateProps) {
  const defaults = variant ? variantDefaults[variant] : null
  const Icon = icon || defaults?.icon || PackageSearch
  const displayTitle = title || defaults?.title || "Sem dados"
  const displayDesc = description || defaults?.description || ""
  const iconBg = defaults?.iconBg || "bg-surface-100"

  return (
    <div className="text-center py-16 px-4">
      <div className={`w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mx-auto mb-5 shadow-sm`}>
        <Icon className="h-7 w-7 text-surface-400" />
      </div>
      <h2 className="font-display font-semibold text-lg text-text-primary mb-2">{displayTitle}</h2>
      <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">{displayDesc}</p>
      {children}
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-block mt-6 btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
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
