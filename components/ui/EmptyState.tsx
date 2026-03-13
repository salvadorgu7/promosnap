import Link from "next/link";
import { PackageSearch, Search, Database, AlertTriangle, type LucideIcon } from "lucide-react";

type EmptyStateVariant = "search" | "data" | "error"

const variantDefaults: Record<EmptyStateVariant, { icon: LucideIcon; title: string; description: string; iconBg: string; iconColor: string }> = {
  search: {
    icon: Search,
    title: "Nenhum resultado encontrado",
    description: "Tente buscar com outras palavras ou remova os filtros aplicados.",
    iconBg: "bg-accent-blue/8",
    iconColor: "text-accent-blue",
  },
  data: {
    icon: Database,
    title: "Nenhum dado disponivel",
    description: "Esta secao ainda nao possui conteudo. Volte mais tarde para novidades.",
    iconBg: "bg-surface-100",
    iconColor: "text-surface-400",
  },
  error: {
    icon: AlertTriangle,
    title: "Algo deu errado",
    description: "Ocorreu um erro ao carregar os dados. Tente novamente.",
    iconBg: "bg-red-50",
    iconColor: "text-accent-red",
  },
}

interface EmptyStateAction {
  label: string;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary";
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
  /** Structured action CTA — takes precedence over onAction/actionLabel when provided */
  action?: EmptyStateAction;
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
  action,
  children,
}: EmptyStateProps) {
  const defaults = variant ? variantDefaults[variant] : null
  const Icon = icon || defaults?.icon || PackageSearch
  const displayTitle = title || defaults?.title || "Sem dados"
  const displayDesc = description || defaults?.description || ""
  const iconBg = defaults?.iconBg || "bg-surface-100"
  const iconColor = defaults?.iconColor || "text-surface-400"

  return (
    <div className="text-center py-16 px-4">
      {/* Decorative background glow */}
      <div className="relative inline-block mb-5">
        <div className="absolute inset-0 rounded-2xl bg-accent-blue/5 blur-xl scale-150 pointer-events-none" />
        <div className={`relative w-16 h-16 rounded-2xl ${iconBg} flex items-center justify-center mx-auto`}
          style={{ boxShadow: "0 2px 8px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.5)" }}
        >
          <Icon className={`h-7 w-7 ${iconColor}`} />
        </div>
      </div>
      <h2 className="font-display font-semibold text-lg text-text-primary mb-2">{displayTitle}</h2>
      <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">{displayDesc}</p>
      {children}
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
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className={`inline-block mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold ${
              action.variant === "secondary" ? "btn-secondary" : "btn-primary"
            }`}
          >
            {action.label}
          </Link>
        ) : action.onClick ? (
          <button
            onClick={action.onClick}
            className={`inline-block mt-6 px-6 py-2.5 rounded-lg text-sm font-semibold ${
              action.variant === "secondary" ? "btn-secondary" : "btn-primary"
            }`}
          >
            {action.label}
          </button>
        ) : null
      )}
    </div>
  );
}
