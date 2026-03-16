"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Tag, TrendingUp, Package, ArrowRight } from "lucide-react";

interface ZeroResultAction {
  type: "related_query" | "category" | "trending" | "popular_product";
  label: string;
  href: string;
  reason: string;
}

interface ZeroResultActionsProps {
  query: string;
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  related_query: <Search className="w-3.5 h-3.5" />,
  category: <Tag className="w-3.5 h-3.5" />,
  trending: <TrendingUp className="w-3.5 h-3.5" />,
  popular_product: <Package className="w-3.5 h-3.5" />,
};

export default function ZeroResultActions({ query }: ZeroResultActionsProps) {
  const [actions, setActions] = useState<ZeroResultAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) return;
    setLoading(true);
    fetch(`/api/search/zero-result?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => setActions(data.actions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query]);

  if (loading || actions.length === 0) return null;

  return (
    <div className="mt-6 p-4 rounded-xl bg-surface-50 border border-surface-200">
      <h3 className="text-sm font-bold font-display text-text-primary mb-3">
        Não encontrou? Experimente:
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((action, i) => (
          <Link
            key={i}
            href={action.href}
            className="flex items-center gap-3 p-3 rounded-lg bg-white border border-surface-100 hover:border-accent-blue/30 hover:bg-blue-50/30 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-surface-100 flex items-center justify-center flex-shrink-0 text-text-muted">
              {TYPE_ICONS[action.type] || <Search className="w-3.5 h-3.5" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{action.label}</p>
              <p className="text-[10px] text-text-muted">{action.reason}</p>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-surface-300 flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
