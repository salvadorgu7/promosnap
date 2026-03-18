import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. All categories with ACTIVE product counts
  const categories = await prisma.category.findMany({
    include: {
      _count: {
        select: {
          products: { where: { status: "ACTIVE" } },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  console.log("=== CATEGORIES WITH ACTIVE PRODUCT COUNTS ===\n");
  console.log(
    "ID".padEnd(28),
    "Name".padEnd(30),
    "Slug".padEnd(35),
    "ParentId".padEnd(28),
    "Active Products"
  );
  console.log("-".repeat(150));

  for (const c of categories) {
    console.log(
      c.id.padEnd(28),
      c.name.padEnd(30),
      c.slug.padEnd(35),
      (c.parentId ?? "(root)").padEnd(28),
      String(c._count.products)
    );
  }

  console.log(`\nTotal categories: ${categories.length}`);
  const totalActive = categories.reduce((s, c) => s + c._count.products, 0);
  console.log(`Total ACTIVE products across all categories: ${totalActive}`);

  // 2. Check for duplicate category names
  console.log("\n=== DUPLICATE CATEGORY NAMES ===\n");
  const nameMap = {};
  for (const c of categories) {
    const lower = c.name.toLowerCase().trim();
    if (!nameMap[lower]) nameMap[lower] = [];
    nameMap[lower].push({ id: c.id, name: c.name, slug: c.slug });
  }

  const dupes = Object.entries(nameMap).filter(([, v]) => v.length > 1);
  if (dupes.length === 0) {
    console.log("No duplicate category names found.");
  } else {
    for (const [name, entries] of dupes) {
      console.log(`Duplicate: "${name}"`);
      for (const e of entries) {
        console.log(`  - id=${e.id}  slug=${e.slug}`);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
