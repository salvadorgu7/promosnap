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
      className="card group flex flex-col items-center justify-center gap-2 p-4 hover:shadow-card-hover hover:border-accent-blue/30 transition-all"
    >
      <span className="text-2xl group-hover:scale-110 transition-transform">{icon || "📦"}</span>
      <span className="text-xs font-medium text-text-primary text-center">{name}</span>
      {productCount !== undefined && (
        <span className="text-[10px] text-text-muted">{productCount}+ ofertas</span>
      )}
    </Link>
  );
}
