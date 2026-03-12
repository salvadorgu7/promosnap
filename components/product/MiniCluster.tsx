import { Store, Layers, Tag } from "lucide-react";

interface MiniClusterProps {
  stores?: number;
  variants?: number;
  offers?: number;
  compact?: boolean;
}

export default function MiniCluster({
  stores,
  variants,
  offers,
  compact = false,
}: MiniClusterProps) {
  const items: { icon: typeof Store; label: string }[] = [];

  if (stores && stores > 0) {
    items.push({
      icon: Store,
      label: `${stores} ${stores === 1 ? "loja" : "lojas"}`,
    });
  }

  if (variants && variants > 0) {
    items.push({
      icon: Layers,
      label: `${variants} ${variants === 1 ? "versao" : "versoes"}`,
    });
  }

  if (offers && offers > 0) {
    items.push({
      icon: Tag,
      label: `${offers} ${offers === 1 ? "oferta" : "ofertas"}`,
    });
  }

  if (items.length === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${compact ? "gap-1.5" : "gap-2"}`}>
      {items.map((item, i) => {
        const Icon = item.icon;
        return (
          <span
            key={i}
            className={`inline-flex items-center gap-1 rounded-full bg-surface-100 text-text-muted font-medium ${
              compact
                ? "px-1.5 py-0.5 text-[9px]"
                : "px-2 py-0.5 text-[10px]"
            }`}
          >
            <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            {item.label}
          </span>
        );
      })}
    </div>
  );
}
