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
      className="card group flex flex-col items-center justify-center gap-1.5 p-3 hover:border-brand-500/25 transition-all"
    >
      <span className="text-xl group-hover:scale-110 transition-transform">{icon || "📦"}</span>
      <span className="text-[11px] font-medium text-text-primary text-center leading-tight">{name}</span>
      {productCount !== undefined && (
        <span className="text-[10px] text-text-muted">{productCount}+ ofertas</span>
      )}
    </Link>
  );
}
