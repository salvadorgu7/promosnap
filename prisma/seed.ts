import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─── Produtos reais coletados do ML em 11/03/2026 ────────────────────────────
const ML_PRODUCTS = [
  // Celulares
  {
    externalId: "MLB51680761", category: "eletronicos", brand: "oppo",
    title: "Smartphone Oppo A5 4G 256GB 6GB RAM Câmera 50MP Branco",
    price: 1499, originalPrice: 1799,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_641800-MLA99507571550_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB51680761",
  },
  {
    externalId: "MLB56327005", category: "eletronicos", brand: null,
    title: "Smartphone Infinix Smart 10 4GB 256GB Câmera 8MP Tela 6.67 120Hz Bateria 5000mAh",
    price: 1458, originalPrice: 1699,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_964227-MLA100071062557_122025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB56327005",
  },
  {
    externalId: "MLB61373637", category: "eletronicos", brand: "oppo",
    title: "Smartphone OPPO A60 256GB 8GB RAM 4G Vinho",
    price: 1699, originalPrice: 1999,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_718127-MLA100070666423_122025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB61373637",
  },
  {
    externalId: "MLB63112201", category: "eletronicos", brand: null,
    title: "Celular Smartphone Realme C73 256GB 8GB RAM Dual Sim 120Hz 6000mAh Verde",
    price: 1999, originalPrice: 2299,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_999325-MLA102615422841_122025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB63112201",
  },
  {
    externalId: "MLB58841029", category: "eletronicos", brand: "samsung",
    title: "Smartphone Samsung Galaxy A16 128GB 4GB RAM 5G Azul Claro",
    price: 1799, originalPrice: 2199,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_859124-MLA100071066412_122025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB58841029",
  },
  {
    externalId: "MLB59012834", category: "eletronicos", brand: "samsung",
    title: "Smartphone Samsung Galaxy S24 256GB 8GB RAM 5G Preto",
    price: 4299, originalPrice: 5499,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_721834-MLA98201939102_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB59012834",
  },
  // Notebooks
  {
    externalId: "MLB60328223", category: "eletronicos", brand: null,
    title: "Notebook Acer Aspire 16 com IA Intel Core Ultra 5 16GB RAM 512GB SSD",
    price: 4999, originalPrice: 5999,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_661268-MLA101288694709_122025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB60328223",
  },
  {
    externalId: "MLB57503810", category: "eletronicos", brand: null,
    title: "Notebook HP ProBook 14\" Intel Core Ultra 5-125U 16GB RAM SSD 512GB Windows 11",
    price: 6569, originalPrice: 7999,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_798164-MLA98124845331_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB57503810",
  },
  {
    externalId: "MLB48952658", category: "eletronicos", brand: null,
    title: "Notebook ASUS Vivobook 15 Intel Core i5 1334U 8GB RAM 256GB SSD Linux Tela 15.6\"",
    price: 3134, originalPrice: 3799,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_605441-MLA99453690492_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB48952658",
  },
  {
    externalId: "MLB52907400", category: "eletronicos", brand: null,
    title: "Notebook Vaio FE16 Intel Core i3-1315U Linux 8GB RAM 256GB SSD Tela 15.6\"",
    price: 2799, originalPrice: 3199,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_843762-MLA99453456702_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB52907400",
  },
  {
    externalId: "MLB56961557", category: "eletronicos", brand: null,
    title: "Notebook Lenovo IdeaPad 1 Intel Core i5-1235U 8GB RAM 512GB SSD Windows 11 15.6\"",
    price: 3499, originalPrice: 4199,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_764821-MLA98123912031_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB56961557",
  },
  // Games / PS5
  {
    externalId: "MLB57081243", category: "gamer", brand: "sony",
    title: "Console PlayStation 5 Slim Digital - Pacote Astro Bot e Gran Turismo 7 Branco",
    price: 3999, originalPrice: 4599,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_658949-MLA97327917067_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB57081243",
  },
  {
    externalId: "MLB57083347", category: "gamer", brand: "sony",
    title: "Console PlayStation 5 Slim Disk - Pacote Astro Bot e Gran Turismo 7 Branco",
    price: 4499, originalPrice: 4999,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_945456-MLA99456386724_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB57083347",
  },
  {
    externalId: "MLB41975964", category: "gamer", brand: "sony",
    title: "Sony PlayStation 5 Pro CFI-7020 2TB Digital Branco 2024",
    price: 8009, originalPrice: null,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_727482-MLA99962144409_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB41975964",
  },
  {
    externalId: "MLB31067313", category: "gamer", brand: "sony",
    title: "PlayStation 5 Slim Branco 1TB Versão Mídia Física",
    price: 4489, originalPrice: 4999,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_846325-MLA99503539342_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB31067313",
  },
  // Smart TVs
  {
    externalId: "MLB51227402", category: "eletronicos", brand: null,
    title: "Smart TV 55\" Philco 4K UHD Roku TV Dolby Audio P55CRA",
    price: 2839, originalPrice: 3499,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_702929-MLA99465492694_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB51227402",
  },
  {
    externalId: "MLB19955269", category: "eletronicos", brand: null,
    title: "Smart TV AIWA 32\" Android HD Borda Ultrafina HDR10 Dolby Áudio",
    price: 1399, originalPrice: 1699,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_690159-MLA99542831560_122025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB19955269",
  },
  {
    externalId: "MLB48954893", category: "eletronicos", brand: "samsung",
    title: "Smart TV Samsung Crystal UHD 4K 65\" U8100F 2025 Preto",
    price: 3989, originalPrice: 4999,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_913386-MLA99989046449_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB48954893",
  },
  {
    externalId: "MLB57348074", category: "eletronicos", brand: null,
    title: "Smart TV Philips 43\" Full HD Wi-Fi 43PFG6910/78",
    price: 2499, originalPrice: 2999,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_882487-MLA92677639078_092025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB57348074",
  },
  {
    externalId: "MLB55927567", category: "eletronicos", brand: null,
    title: "Smart TV Profissional LG 32\" LED HD 32RL601CBSA",
    price: 1399, originalPrice: 1799,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_705266-MLA95938596400_102025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB55927567",
  },
  // Fones / Áudio
  {
    externalId: "MLB62901001", category: "eletronicos", brand: "jbl",
    title: "Fone de Ouvido JBL Tune 770NC Bluetooth ANC Preto",
    price: 699, originalPrice: 999,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_731824-MLA97543891204_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB62901001",
  },
  {
    externalId: "MLB62901002", category: "eletronicos", brand: "sony",
    title: "Headphone Sony WH-1000XM5 Bluetooth Noise Cancelling Preto",
    price: 1999, originalPrice: 2799,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_821374-MLA96012938471_092025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB62901002",
  },
  // Esportes
  {
    externalId: "MLB62001010", category: "esportes", brand: "nike",
    title: "Tênis Nike Air Max SC Masculino Branco e Preto",
    price: 499, originalPrice: 699,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_895124-MLA97124562901_102025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB62001010",
  },
  {
    externalId: "MLB62001011", category: "esportes", brand: null,
    title: "Bicicleta Ergométrica Horizontal Movement H100 Magnética 8 Níveis",
    price: 1299, originalPrice: 1799,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_764321-MLA95764321802_092025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB62001011",
  },
  // Casa
  {
    externalId: "MLB63002001", category: "casa", brand: null,
    title: "Aspirador de Pó Robô Inteligente Wi-Fi Mapeamento a Laser 4000Pa",
    price: 1599, originalPrice: 2299,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_834521-MLA98234521902_112025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB63002001",
  },
  {
    externalId: "MLB63002002", category: "casa", brand: null,
    title: "Air Fryer Mondial 4L Digital 1500W Preto AFN-40DI",
    price: 349, originalPrice: 499,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_765432-MLA96765432901_102025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB63002002",
  },
  {
    externalId: "MLB63002003", category: "casa", brand: null,
    title: "Cafeteira Elétrica Nespresso Vertuo Next Preta",
    price: 799, originalPrice: 1099,
    image: "https://http2.mlstatic.com/D_Q_NP_2X_823451-MLA97823451602_102025-E.webp",
    url: "https://www.mercadolivre.com.br/p/MLB63002003",
  },
];

async function main() {
  console.log("🌱 Seeding PromoSnap database...\n");

  // ── Sources ────────────────────────────────────────────────────────────────
  const sources = await Promise.all([
    prisma.source.upsert({ where: { slug: "amazon-br" }, update: {}, create: { name: "Amazon Brasil", slug: "amazon-br", status: "ACTIVE", affiliateConfig: { tag: "", region: "br" } } }),
    prisma.source.upsert({ where: { slug: "mercadolivre" }, update: {}, create: { name: "Mercado Livre", slug: "mercadolivre", status: "ACTIVE", affiliateConfig: { affiliateId: "" } } }),
    prisma.source.upsert({ where: { slug: "shopee" }, update: {}, create: { name: "Shopee", slug: "shopee", status: "ACTIVE", affiliateConfig: { affiliateId: "" } } }),
    prisma.source.upsert({ where: { slug: "shein" }, update: {}, create: { name: "Shein", slug: "shein", status: "ACTIVE", affiliateConfig: { affiliateId: "" } } }),
  ]);
  console.log(`✅ ${sources.length} sources`);

  // ── Categories ─────────────────────────────────────────────────────────────
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
  const categoryMap = Object.fromEntries(categories.map(c => [c.slug, c.id]));
  console.log(`✅ ${categories.length} categorias`);

  // ── Brands ─────────────────────────────────────────────────────────────────
  const brands = await Promise.all([
    prisma.brand.upsert({ where: { slug: "apple" }, update: {}, create: { name: "Apple", slug: "apple" } }),
    prisma.brand.upsert({ where: { slug: "samsung" }, update: {}, create: { name: "Samsung", slug: "samsung" } }),
    prisma.brand.upsert({ where: { slug: "jbl" }, update: {}, create: { name: "JBL", slug: "jbl" } }),
    prisma.brand.upsert({ where: { slug: "nike" }, update: {}, create: { name: "Nike", slug: "nike" } }),
    prisma.brand.upsert({ where: { slug: "philips" }, update: {}, create: { name: "Philips", slug: "philips" } }),
    prisma.brand.upsert({ where: { slug: "logitech" }, update: {}, create: { name: "Logitech", slug: "logitech" } }),
    prisma.brand.upsert({ where: { slug: "sony" }, update: {}, create: { name: "Sony", slug: "sony" } }),
    prisma.brand.upsert({ where: { slug: "oppo" }, update: {}, create: { name: "OPPO", slug: "oppo" } }),
  ]);
  const brandMap = Object.fromEntries(brands.map(b => [b.slug, b.id]));
  console.log(`✅ ${brands.length} marcas`);

  // ── Editorial Blocks ───────────────────────────────────────────────────────
  await prisma.editorialBlock.upsert({ where: { slug: "ofertas-quentes" }, update: {}, create: { blockType: "RAIL", title: "Ofertas Quentes", slug: "ofertas-quentes", subtitle: "As melhores promoções agora", position: 1, status: "PUBLISHED", payloadJson: { minScore: 80, limit: 12 } } });
  await prisma.editorialBlock.upsert({ where: { slug: "menor-preco" }, update: {}, create: { blockType: "RAIL", title: "Menor Preço Histórico", slug: "menor-preco", subtitle: "Nunca estiveram tão baratos", position: 2, status: "PUBLISHED", payloadJson: { period: "90d", limit: 6 } } });
  await prisma.editorialBlock.upsert({ where: { slug: "mais-vendidos" }, update: {}, create: { blockType: "RAIL", title: "Mais Vendidos", slug: "mais-vendidos", subtitle: "Os favoritos", position: 3, status: "PUBLISHED", payloadJson: { sortBy: "sales", limit: 12 } } });
  console.log("✅ Editorial blocks");

  // ── Source para ML ─────────────────────────────────────────────────────────
  const mlSource = sources.find(s => s.slug === "mercadolivre")!;

  // ── Listings + Offers + PriceSnapshots ────────────────────────────────────
  let upserted = 0;
  for (const p of ML_PRODUCTS) {
    const discount = p.originalPrice && p.originalPrice > p.price
      ? Math.round((1 - p.price / p.originalPrice) * 100)
      : 0;
    const offerScore = Math.min(100, discount + 20);

    const listing = await prisma.listing.upsert({
      where: { sourceId_externalId: { sourceId: mlSource.id, externalId: p.externalId } },
      create: {
        sourceId: mlSource.id,
        externalId: p.externalId,
        rawTitle: p.title,
        rawBrand: p.brand ?? null,
        imageUrl: p.image,
        productUrl: p.url,
        availability: "IN_STOCK",
        rawPayloadJson: { seeded: true, collectedAt: new Date().toISOString() },
        lastSeenAt: new Date(),
      },
      update: {
        rawTitle: p.title,
        imageUrl: p.image,
        lastSeenAt: new Date(),
      },
    });

    const existingOffer = await prisma.offer.findFirst({
      where: { listingId: listing.id, isActive: true },
    });

    const offer = await prisma.offer.upsert({
      where: { id: existingOffer?.id ?? "" },
      create: {
        listingId: listing.id,
        currentPrice: p.price,
        originalPrice: p.originalPrice ?? null,
        isFreeShipping: true,
        affiliateUrl: p.url,
        isActive: true,
        offerScore,
      },
      update: {
        currentPrice: p.price,
        originalPrice: p.originalPrice ?? null,
        offerScore,
        lastSeenAt: new Date(),
      },
    });

    await prisma.priceSnapshot.create({
      data: { offerId: offer.id, price: p.price, originalPrice: p.originalPrice ?? null },
    });

    upserted++;
  }
  console.log(`✅ ${upserted} produtos com offers e price snapshots`);

  console.log("\n🎉 Seed completo!");
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
