import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { PackageOpen } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
}

export default function EmptyState({ icon: Icon = PackageOpen, title, description, actionLabel, actionHref }: EmptyStateProps) {
  return (
    <div className="text-center py-16 card">
      <Icon className="h-12 w-12 text-surface-300 mx-auto mb-4" />
      <h2 className="text-lg font-semibold text-surface-900 mb-2">{title}</h2>
      {description && <p className="text-sm text-surface-500 mb-4">{description}</p>}
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn-primary text-sm">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
