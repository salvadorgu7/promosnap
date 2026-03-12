import prisma from "@/lib/db/prisma";
import { CatalogEditor } from "./catalog-editor";

export const dynamic = "force-dynamic";

export default async function CatalogEditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string; flags?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const limit = 30;
  const search = sp.search || "";
  const statusFilter = sp.status || "";
  const flagsFilter = sp.flags || "";

  const where: any = {};

  if (statusFilter) {
    where.status = statusFilter;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { brand: { name: { contains: search, mode: "insensitive" } } },
      { category: { name: { contains: search, mode: "insensitive" } } },
    ];
  }

  if (flagsFilter === "featured") where.featured = true;
  else if (flagsFilter === "hidden") where.hidden = true;
  else if (flagsFilter === "needsReview") where.needsReview = true;

  const [products, total, categories, brands] = await Promise.all([
    prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        status: true,
        featured: true,
        hidden: true,
        needsReview: true,
        editorialScore: true,
        updatedAt: true,
        brand: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-text-primary">Editor de Catalogo</h1>
        <p className="text-sm text-text-muted">
          {total} produtos encontrados
        </p>
      </div>

      <CatalogEditor
        products={products}
        categories={categories}
        brands={brands}
        page={page}
        totalPages={totalPages}
        total={total}
        search={search}
        statusFilter={statusFilter}
        flagsFilter={flagsFilter}
      />
    </div>
  );
}
