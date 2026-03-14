import Link from "next/link";
import { ArrowRight, Award, Tag, Scale, HelpCircle } from "lucide-react";
import type { InternalLink } from "@/lib/seo/internal-links";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  best: <Award className="w-3.5 h-3.5 text-amber-500" />,
  offer: <Tag className="w-3.5 h-3.5 text-accent-green" />,
  comparison: <Scale className="w-3.5 h-3.5 text-accent-blue" />,
  "vale-a-pena": <HelpCircle className="w-3.5 h-3.5 text-purple-500" />,
  category: <Tag className="w-3.5 h-3.5 text-text-muted" />,
  brand: <Tag className="w-3.5 h-3.5 text-text-muted" />,
  search: <Tag className="w-3.5 h-3.5 text-text-muted" />,
};

interface RelatedContentProps {
  links: InternalLink[];
  title?: string;
}

export default function RelatedContent({ links, title = "Conteudo Relacionado" }: RelatedContentProps) {
  if (links.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="text-base font-bold font-display text-text-primary mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {links.map((link, i) => (
          <Link
            key={i}
            href={link.href}
            className="flex items-center gap-2.5 p-3 rounded-lg border border-surface-100 hover:border-accent-blue/30 hover:bg-blue-50/30 transition-colors group"
          >
            {TYPE_ICONS[link.type] || <Tag className="w-3.5 h-3.5 text-text-muted" />}
            <span className="text-sm text-text-secondary group-hover:text-accent-blue flex-1 truncate">
              {link.label}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-surface-300 group-hover:text-accent-blue flex-shrink-0" />
          </Link>
        ))}
      </div>
    </section>
  );
}
