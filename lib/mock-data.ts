import type { ProductCard, Badge, CategoryCard as CategoryCardType, CouponCard } from "@/types";

function badge(type: Badge["type"], label: string): Badge {
  return { type, label, color: type };
}

export const MOCK_CATEGORIES: CategoryCardType[] = [
  { id: "1", slug: "eletronicos", name: "Eletrônicos", icon: "📱", productCount: 2340 },
  { id: "2", slug: "casa", name: "Casa & Decoração", icon: "🏠", productCount: 1890 },
  { id: "3", slug: "moda", name: "Moda", icon: "👕", productCount: 3200 },
  { id: "4", slug: "beleza", name: "Beleza", icon: "💄", productCount: 1560 },
  { id: "5", slug: "gamer", name: "Gamer", icon: "🎮", productCount: 980 },
  { id: "6", slug: "infantil", name: "Infantil", icon: "🧸", productCount: 1100 },
  { id: "7", slug: "esportes", name: "Esportes", icon: "⚽", productCount: 870 },
  { id: "8", slug: "livros", name: "Livros", icon: "📚", productCount: 2100 },
];

export const MOCK_HOT_OFFERS: ProductCard[] = [
  {
    id: "1", name: "Apple iPhone 15 128GB Preto", slug: "iphone-15-128gb",
    imageUrl: "https://m.media-amazon.com/images/I/71d7rfSl0wL._AC_SL1500_.jpg",
    brand: "Apple", category: "Celulares", categorySlug: "eletronicos",
    bestOffer: { price: 4199, originalPrice: 5999, discount: 30, sourceSlug: "amazon-br", sourceName: "Amazon", affiliateUrl: "#", isFreeShipping: true, offerScore: 87 },
    offersCount: 3, popularityScore: 95, badges: [badge("hot_deal", "🔥 Oferta Quente"), badge("lowest_price", "📉 Menor Preço")],
  },
  {
    id: "2", name: "Fritadeira Elétrica Philips Walita XL 4.1L", slug: "airfryer-philips-xl",
    imageUrl: "https://m.media-amazon.com/images/I/51lqFcBNOEL._AC_SL1000_.jpg",
    brand: "Philips", category: "Cozinha", categorySlug: "casa",
    bestOffer: { price: 349.90, originalPrice: 599.90, discount: 42, sourceSlug: "mercadolivre", sourceName: "Mercado Livre", affiliateUrl: "#", isFreeShipping: true, offerScore: 82 },
    offersCount: 4, popularityScore: 88, badges: [badge("hot_deal", "🔥 Oferta Quente"), badge("coupon", "🏷️ DESCONTO10")],
  },
  {
    id: "3", name: "Cadeira Gamer ThunderX3 TGC12 Preta", slug: "cadeira-gamer-thunderx3",
    imageUrl: "https://m.media-amazon.com/images/I/51X8TX79xKL._AC_SL1000_.jpg",
    brand: "ThunderX3", category: "Gamer", categorySlug: "gamer",
    bestOffer: { price: 699, originalPrice: 1199, discount: 42, sourceSlug: "amazon-br", sourceName: "Amazon", affiliateUrl: "#", isFreeShipping: false, offerScore: 76 },
    offersCount: 2, popularityScore: 72, badges: [badge("best_seller", "⭐ Mais Vendido")],
  },
  {
    id: "4", name: "Samsung Galaxy Buds2 Pro Preto", slug: "galaxy-buds-2-pro",
    imageUrl: "https://m.media-amazon.com/images/I/51ir2sUFnkL._AC_SL1500_.jpg",
    brand: "Samsung", category: "Áudio", categorySlug: "eletronicos",
    bestOffer: { price: 599, originalPrice: 999, discount: 40, sourceSlug: "shopee", sourceName: "Shopee", affiliateUrl: "#", isFreeShipping: false, offerScore: 79 },
    offersCount: 3, popularityScore: 81, badges: [badge("hot_deal", "🔥 Oferta Quente")],
  },
  {
    id: "5", name: 'Smart TV Samsung 55" Crystal UHD 4K', slug: "smartv-samsung-55-4k",
    imageUrl: "https://m.media-amazon.com/images/I/51Tqda-MSSL._AC_SL1000_.jpg",
    brand: "Samsung", category: "TVs", categorySlug: "eletronicos",
    bestOffer: { price: 2199, originalPrice: 3299, discount: 33, sourceSlug: "amazon-br", sourceName: "Amazon", affiliateUrl: "#", isFreeShipping: true, offerScore: 74 },
    offersCount: 2, popularityScore: 85, badges: [badge("lowest_price", "📉 Menor Preço 90d")],
  },
  {
    id: "6", name: "Kindle Paperwhite 16GB 2024", slug: "kindle-paperwhite-2024",
    imageUrl: "https://m.media-amazon.com/images/I/61d5k3VaYRL._AC_SL1000_.jpg",
    brand: "Amazon", category: "Leitores", categorySlug: "eletronicos",
    bestOffer: { price: 549, originalPrice: 699, discount: 21, sourceSlug: "amazon-br", sourceName: "Amazon", affiliateUrl: "#", isFreeShipping: true, offerScore: 71 },
    offersCount: 1, popularityScore: 90, badges: [badge("best_seller", "⭐ Mais Vendido")],
  },
];

export const MOCK_LOWEST: ProductCard[] = [
  {
    id: "7", name: "Echo Dot 5ª Geração com Alexa", slug: "echo-dot-5gen",
    imageUrl: "https://m.media-amazon.com/images/I/71xoR4A6q-L._AC_SL1000_.jpg",
    brand: "Amazon", category: "Smart Home", categorySlug: "eletronicos",
    bestOffer: { price: 199, originalPrice: 399, discount: 50, sourceSlug: "amazon-br", sourceName: "Amazon", affiliateUrl: "#", isFreeShipping: true, offerScore: 91 },
    offersCount: 1, popularityScore: 96, badges: [badge("lowest_price", "📉 Menor Preço Histórico"), badge("hot_deal", "🔥 Oferta Quente")],
  },
  {
    id: "8", name: "JBL Flip 6 Caixa de Som Bluetooth", slug: "jbl-flip-6",
    imageUrl: "https://m.media-amazon.com/images/I/71V-dv3aRtL._AC_SL1500_.jpg",
    brand: "JBL", category: "Áudio", categorySlug: "eletronicos",
    bestOffer: { price: 459, originalPrice: 699, discount: 34, sourceSlug: "mercadolivre", sourceName: "Mercado Livre", affiliateUrl: "#", isFreeShipping: true, offerScore: 84 },
    offersCount: 3, popularityScore: 82, badges: [badge("lowest_price", "📉 Menor Preço 90d")],
  },
  ...MOCK_HOT_OFFERS.slice(0, 4),
];

export const MOCK_BEST_SELLERS: ProductCard[] = [
  ...MOCK_HOT_OFFERS.slice(2, 6),
  {
    id: "9", name: "Edifier W820NB Plus Fone ANC", slug: "fone-edifier-w820nb",
    brand: "Edifier", category: "Áudio", categorySlug: "eletronicos",
    bestOffer: { price: 329, originalPrice: 449, discount: 27, sourceSlug: "amazon-br", sourceName: "Amazon", affiliateUrl: "#", isFreeShipping: true, offerScore: 73 },
    offersCount: 2, popularityScore: 78, badges: [badge("best_seller", "⭐ Mais Vendido")],
  },
  {
    id: "10", name: "Mouse Gamer Logitech G502 HERO", slug: "mouse-logitech-g502",
    brand: "Logitech", category: "Periféricos", categorySlug: "gamer",
    bestOffer: { price: 179, originalPrice: 299, discount: 40, sourceSlug: "amazon-br", sourceName: "Amazon", affiliateUrl: "#", isFreeShipping: false, offerScore: 80 },
    offersCount: 3, popularityScore: 91, badges: [badge("best_seller", "⭐ Mais Vendido"), badge("hot_deal", "🔥 Oferta Quente")],
  },
];

export const MOCK_COUPONS: CouponCard[] = [
  { id: "c1", code: "DESCONTO10", description: "10% off na primeira compra", sourceName: "Shopee", sourceSlug: "shopee", endAt: "2 dias" },
  { id: "c2", code: "FRETEGRATIS", description: "Frete grátis acima de R$99", sourceName: "Mercado Livre", sourceSlug: "mercadolivre", endAt: "5 dias" },
  { id: "c3", code: "TECH20", description: "R$20 off em eletrônicos", sourceName: "Amazon", sourceSlug: "amazon-br", endAt: "3 dias" },
  { id: "c4", code: "CASA15", description: "15% off em casa e decoração", sourceName: "Shein", sourceSlug: "shein", endAt: "1 dia" },
];
