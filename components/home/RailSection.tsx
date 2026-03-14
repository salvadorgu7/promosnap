import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

interface RailSectionProps {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: LucideIcon;
  iconColor?: string;
  liveBadge?: boolean;
  children: React.ReactNode;
}

export default function RailSection({ title, subtitle, href, icon: Icon, iconColor = "text-accent-blue", liveBadge, children }: RailSectionProps) {
  return (
    <section className="py-4">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(139,92,246,0.06) 100%)",
                  boxShadow: "0 1px 4px rgba(99,102,241,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-base text-text-primary tracking-tight">{title}</h2>
                {liveBadge && (
                  <span className="section-live-indicator">
                    <span className="pulse-dot" />
                    Ao vivo
                  </span>
                )}
              </div>
              {subtitle && <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{subtitle}</p>}
            </div>
          </div>
          {href && (
            <Link
              href={href}
              className="flex items-center gap-1 text-sm text-accent-blue hover:text-brand-500 transition-colors duration-200 font-medium group/link px-3 py-1.5 rounded-lg hover:bg-accent-blue/5"
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
