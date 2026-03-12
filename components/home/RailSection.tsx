import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface RailSectionProps {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
}

export default function RailSection({ title, subtitle, href, icon: Icon, iconColor = "text-accent-blue", children }: RailSectionProps) {
  return (
    <section className="py-6">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4.5 h-4.5 ${iconColor}`} />
              </div>
            )}
            <div>
              <h2 className="font-display font-bold text-lg text-text-primary tracking-tight">{title}</h2>
              {subtitle && <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{subtitle}</p>}
            </div>
          </div>
          {href && (
            <Link
              href={href}
              className="flex items-center gap-1 text-sm text-accent-blue hover:text-brand-500 transition-colors font-medium group/link"
            >
              Ver tudo
              <ChevronRight className="w-4 h-4 group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
        <div className="rail">{children}</div>
      </div>
    </section>
  );
}
