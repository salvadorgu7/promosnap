import Link from "next/link";
import { PackageSearch, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export default function EmptyState({
  icon: Icon = PackageSearch,
  title,
  description,
  ctaLabel,
  ctaHref,
}: EmptyStateProps) {
  return (
    <div className="text-center py-16 card">
      <Icon className="h-12 w-12 text-surface-300 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-text-primary mb-2">{title}</h2>
      <p className="text-sm text-text-muted max-w-md mx-auto">{description}</p>
      {ctaLabel && ctaHref && (
        <Link
          href={ctaHref}
          className="inline-block mt-6 btn-primary px-6 py-2.5 rounded-lg text-sm font-semibold"
        >
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
