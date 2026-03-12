import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding PromoSnap database...\n");

  const sources = await Promise.all([
    prisma.source.upsert({ where: { slug: "amazon-br" }, update: {}, create: { name: "Amazon Brasil", slug: "amazon-br", status: "ACTIVE", affiliateConfig: { tag: "", region: "br" } } }),
    prisma.source.upsert({ where: { slug: "mercadolivre" }, update: {}, create: { name: "Mercado Livre", slug: "mercadolivre", status: "ACTIVE", affiliateConfig: { affiliateId: "" } } }),
    prisma.source.upsert({ where: { slug: "shopee" }, update: {}, create: { name: "Shopee", slug: "shopee", status: "ACTIVE", affiliateConfig: { affiliateId: "" } } }),
    prisma.source.upsert({ where: { slug: "shein" }, update: {}, create: { name: "Shein", slug: "shein", status: "ACTIVE", affiliateConfig: { affiliateId: "" } } }),
  ]);
  console.log(`✅ ${sources.length} sources`);

  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: "eletronicos" }, update: {}, create: { name: "Eletrônicos", slug: "eletronicos", icon: "📱", position: 1 } }),
    prisma.category.upsert({ where: { slug: "casa" }, update: {}, create: { name: "Casa & Decoração", slug: "casa", icon: "🏠", position: 2 } }),
    prisma.category.upsert({ where: { slug: "moda" }, update: {}, create: { name: "Moda", slug: "moda", icon: "👕", position: 3 } }),
    prisma.category.upsert({ where: { slug: "beleza" }, update: {}, create: { name: "Beleza", slug: "beleza", icon: "💄", position: 4 } }),
    prisma.category.upsert({ where: { slug: "gamer" }, update: {}, create: { name: "Gamer", slug: "gamer", icon: "🎮", position: 5 } }),
    prisma.category.upsert({ where: { slug: "infantil" }, update: {}, create: { name: "Infantil", slug: "infantil", icon: "🧸", position: 6 } }),
    prisma.category.upsert({ where: { slug: "esportes" }, update: {}, create: { name: "Esportes", slug: "esportes", icon: "⚽", position: 7 } }),
    prisma.category.upsert({ where: { slug: "livros" }, update: {}, create: { name: "Livros", slug: "livros", icon: "📚", position: 8 } }),
  ]);
  console.log(`✅ ${categories.length} categorias`);

  const brands = await Promise.all([
    prisma.brand.upsert({ where: { slug: "apple" }, update: {}, create: { name: "Apple", slug: "apple" } }),
    prisma.brand.upsert({ where: { slug: "samsung" }, update: {}, create: { name: "Samsung", slug: "samsung" } }),
    prisma.brand.upsert({ where: { slug: "jbl" }, update: {}, create: { name: "JBL", slug: "jbl" } }),
    prisma.brand.upsert({ where: { slug: "nike" }, update: {}, create: { name: "Nike", slug: "nike" } }),
    prisma.brand.upsert({ where: { slug: "philips" }, update: {}, create: { name: "Philips", slug: "philips" } }),
    prisma.brand.upsert({ where: { slug: "logitech" }, update: {}, create: { name: "Logitech", slug: "logitech" } }),
    prisma.brand.upsert({ where: { slug: "sony" }, update: {}, create: { name: "Sony", slug: "sony" } }),
  ]);
  console.log(`✅ ${brands.length} marcas`);

  await prisma.editorialBlock.upsert({ where: { slug: "ofertas-quentes" }, update: {}, create: { blockType: "RAIL", title: "Ofertas Quentes", slug: "ofertas-quentes", subtitle: "As melhores promoções agora", position: 1, status: "PUBLISHED", payloadJson: { minScore: 80, limit: 12 } } });
  await prisma.editorialBlock.upsert({ where: { slug: "menor-preco" }, update: {}, create: { blockType: "RAIL", title: "Menor Preço Histórico", slug: "menor-preco", subtitle: "Nunca estiveram tão baratos", position: 2, status: "PUBLISHED", payloadJson: { period: "90d", limit: 6 } } });
  await prisma.editorialBlock.upsert({ where: { slug: "mais-vendidos" }, update: {}, create: { blockType: "RAIL", title: "Mais Vendidos", slug: "mais-vendidos", subtitle: "Os favoritos", position: 3, status: "PUBLISHED", payloadJson: { sortBy: "sales", limit: 12 } } });
  console.log("✅ Editorial blocks");

  console.log("\n🎉 Seed completo!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });