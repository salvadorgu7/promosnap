import Link from "next/link";

interface CategoryCardProps {
  slug: string;
  name: string;
  icon?: string;
  productCount?: number;
}

export default function CategoryCard({ slug, name, icon, productCount }: CategoryCardProps) {
  return (
    <Link
      href={`/categoria/${slug}`}
      className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl
                 bg-surface-800/50 border border-white/[0.06]
                 hover:border-accent-blue/30 hover:shadow-glow-blue
                 transition-all duration-200 hover:scale-105"
    >
      <span className="text-3xl group-hover:scale-110 transition-transform duration-200">{icon || "📦"}</span>
      <span className="text-xs font-medium text-surface-300 text-center">{name}</span>
      {productCount !== undefined && (
        <span className="text-[10px] text-surface-600">{productCount}+ ofertas</span>
      )}
    </Link>
  );
}
