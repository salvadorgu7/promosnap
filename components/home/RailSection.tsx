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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon className={`w-5 h-5 ${iconColor}`} />}
            <div>
              <h2 className="font-display font-bold text-lg text-surface-900">{title}</h2>
              {subtitle && <p className="text-xs text-surface-500 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {href && (
            <Link href={href} className="flex items-center gap-1 text-sm text-accent-blue hover:text-accent-purple transition-colors font-medium">
              Ver tudo <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
        <div className="rail">{children}</div>
      </div>
    </section>
  );
}
