import { PrismaClient } from "@prisma/client";
import { seedArticles } from "./seed-articles";

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════
// SEED DATA DEFINITIONS
// ═══════════════════════════════════════════════════

const SOURCES = [
  { name: "Amazon Brasil", slug: "amazon-br", affiliateConfig: { tag: "promosnap-20", region: "br" } },
  { name: "Mercado Livre", slug: "mercadolivre", affiliateConfig: { affiliateId: "promosnap" } },
  { name: "Shopee", slug: "shopee", affiliateConfig: { affiliateId: "promosnap" } },
  { name: "Shein", slug: "shein", affiliateConfig: { affiliateId: "promosnap" } },
];

const CATEGORIES = [
  { name: "Eletrônicos", slug: "eletronicos", icon: "📱", position: 1 },
  { name: "Casa & Cozinha", slug: "casa", icon: "🏠", position: 2 },
  { name: "Moda", slug: "moda", icon: "👕", position: 3 },
  { name: "Beleza & Saúde", slug: "beleza", icon: "💄", position: 4 },
  { name: "Gamer", slug: "gamer", icon: "🎮", position: 5 },
  { name: "Infantil", slug: "infantil", icon: "🧸", position: 6 },
  { name: "Esportes & Fitness", slug: "esportes", icon: "⚽", position: 7 },
  { name: "Livros & Educação", slug: "livros", icon: "📚", position: 8 },
  { name: "Informática & Acessórios", slug: "informatica", icon: "💻", position: 9 },
  { name: "Smart TVs & Áudio", slug: "tv-audio", icon: "📺", position: 10 },
  { name: "Celulares", slug: "celulares", icon: "📲", position: 11 },
  { name: "Notebooks", slug: "notebooks", icon: "💻", position: 12 },
];

const BRANDS = [
  "Apple", "Samsung", "Xiaomi", "Motorola", "JBL", "Sony", "LG", "Philips",
  "Nike", "Adidas", "Logitech", "Razer", "Dell", "Lenovo", "Acer", "ASUS",
  "Mondial", "Oster", "Electrolux", "Brastemp", "Consul", "Walita",
  "Intelbras", "TP-Link", "Multilaser", "Positivo", "Havaianas", "Tramontina",
  "Nestlé", "Natura", "O Boticário", "Melissa", "Lego", "Hot Wheels",
  "Under Armour", "New Balance", "Garmin", "Kindle", "Echo", "Fire TV",
];

// Product definitions organized by category
interface ProductDef {
  name: string;
  brand: string;
  category: string;
  price: number;
  originalPrice: number;
  sources: string[]; // which sources carry this product
  rating: number;
  reviews: number;
  sales: number;
  freeShipping: boolean;
  imageKeyword?: string;
}

const PRODUCTS: ProductDef[] = [
  // ═══════════ CELULARES ═══════════
  { name: "iPhone 15 128GB", brand: "Apple", category: "celulares", price: 4299, originalPrice: 5499, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.8, reviews: 12400, sales: 45000, freeShipping: true },
  { name: "iPhone 15 Pro Max 256GB", brand: "Apple", category: "celulares", price: 7499, originalPrice: 9499, sources: ["mercadolivre", "amazon-br"], rating: 4.9, reviews: 8200, sales: 22000, freeShipping: true },
  { name: "iPhone 14 128GB", brand: "Apple", category: "celulares", price: 3599, originalPrice: 4999, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.7, reviews: 18500, sales: 68000, freeShipping: true },
  { name: "iPhone 13 128GB", brand: "Apple", category: "celulares", price: 2899, originalPrice: 3999, sources: ["mercadolivre", "shopee"], rating: 4.7, reviews: 24000, sales: 95000, freeShipping: true },
  { name: "Samsung Galaxy S24 Ultra 256GB", brand: "Samsung", category: "celulares", price: 5999, originalPrice: 7999, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.8, reviews: 9800, sales: 31000, freeShipping: true },
  { name: "Samsung Galaxy S24 128GB", brand: "Samsung", category: "celulares", price: 3299, originalPrice: 4499, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 7200, sales: 28000, freeShipping: true },
  { name: "Samsung Galaxy A55 128GB", brand: "Samsung", category: "celulares", price: 1699, originalPrice: 2299, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.5, reviews: 15300, sales: 82000, freeShipping: true },
  { name: "Samsung Galaxy A35 128GB", brand: "Samsung", category: "celulares", price: 1399, originalPrice: 1899, sources: ["mercadolivre", "shopee"], rating: 4.4, reviews: 11200, sales: 64000, freeShipping: true },
  { name: "Samsung Galaxy A15 128GB", brand: "Samsung", category: "celulares", price: 849, originalPrice: 1199, sources: ["mercadolivre", "shopee"], rating: 4.2, reviews: 22000, sales: 120000, freeShipping: false },
  { name: "Xiaomi Redmi Note 13 Pro 256GB", brand: "Xiaomi", category: "celulares", price: 1499, originalPrice: 1999, sources: ["mercadolivre", "shopee"], rating: 4.6, reviews: 8400, sales: 45000, freeShipping: true },
  { name: "Xiaomi Redmi Note 13 128GB", brand: "Xiaomi", category: "celulares", price: 999, originalPrice: 1399, sources: ["mercadolivre", "shopee"], rating: 4.5, reviews: 14200, sales: 78000, freeShipping: true },
  { name: "Xiaomi Poco X6 Pro 256GB", brand: "Xiaomi", category: "celulares", price: 1799, originalPrice: 2299, sources: ["mercadolivre", "shopee"], rating: 4.7, reviews: 5600, sales: 23000, freeShipping: true },
  { name: "Xiaomi 14 Ultra 512GB", brand: "Xiaomi", category: "celulares", price: 5499, originalPrice: 6999, sources: ["mercadolivre"], rating: 4.8, reviews: 2100, sales: 5400, freeShipping: true },
  { name: "Motorola Edge 40 Neo 256GB", brand: "Motorola", category: "celulares", price: 1599, originalPrice: 2199, sources: ["mercadolivre", "amazon-br"], rating: 4.4, reviews: 6800, sales: 34000, freeShipping: true },
  { name: "Motorola Moto G84 256GB", brand: "Motorola", category: "celulares", price: 1299, originalPrice: 1699, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.3, reviews: 9400, sales: 56000, freeShipping: true },
  { name: "Motorola Moto G54 128GB", brand: "Motorola", category: "celulares", price: 899, originalPrice: 1299, sources: ["mercadolivre", "shopee"], rating: 4.2, reviews: 16800, sales: 92000, freeShipping: false },

  // ═══════════ NOTEBOOKS ═══════════
  { name: "MacBook Air M2 256GB", brand: "Apple", category: "notebooks", price: 7499, originalPrice: 9999, sources: ["mercadolivre", "amazon-br"], rating: 4.9, reviews: 5200, sales: 12000, freeShipping: true },
  { name: "MacBook Air M3 256GB", brand: "Apple", category: "notebooks", price: 9299, originalPrice: 11499, sources: ["mercadolivre", "amazon-br"], rating: 4.9, reviews: 2800, sales: 6500, freeShipping: true },
  { name: "MacBook Pro M3 Pro 512GB", brand: "Apple", category: "notebooks", price: 14999, originalPrice: 18499, sources: ["amazon-br"], rating: 4.9, reviews: 1800, sales: 3200, freeShipping: true },
  { name: "Dell Inspiron 15 i5 16GB 512GB SSD", brand: "Dell", category: "notebooks", price: 3299, originalPrice: 4299, sources: ["mercadolivre", "amazon-br"], rating: 4.4, reviews: 4800, sales: 18000, freeShipping: true },
  { name: "Dell G15 Gaming i7 RTX 4060 16GB", brand: "Dell", category: "notebooks", price: 5799, originalPrice: 7499, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 3200, sales: 8900, freeShipping: true },
  { name: "Lenovo IdeaPad 3i i5 8GB 256GB", brand: "Lenovo", category: "notebooks", price: 2499, originalPrice: 3199, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.3, reviews: 6400, sales: 28000, freeShipping: true },
  { name: "Lenovo Legion 5 i7 RTX 4070 16GB", brand: "Lenovo", category: "notebooks", price: 7999, originalPrice: 9999, sources: ["mercadolivre", "amazon-br"], rating: 4.7, reviews: 2400, sales: 5800, freeShipping: true },
  { name: "Acer Nitro V15 i5 RTX 4050 16GB", brand: "Acer", category: "notebooks", price: 4499, originalPrice: 5799, sources: ["mercadolivre", "amazon-br"], rating: 4.4, reviews: 3800, sales: 12000, freeShipping: true },
  { name: "Acer Aspire 5 i5 8GB 512GB SSD", brand: "Acer", category: "notebooks", price: 2899, originalPrice: 3699, sources: ["mercadolivre", "amazon-br"], rating: 4.3, reviews: 5200, sales: 22000, freeShipping: true },
  { name: "ASUS Vivobook 15 i5 8GB 512GB", brand: "ASUS", category: "notebooks", price: 2799, originalPrice: 3499, sources: ["mercadolivre", "amazon-br"], rating: 4.4, reviews: 4100, sales: 16000, freeShipping: true },
  { name: "ASUS ROG Strix G16 i9 RTX 4070 32GB", brand: "ASUS", category: "notebooks", price: 11999, originalPrice: 14999, sources: ["amazon-br"], rating: 4.8, reviews: 1200, sales: 2800, freeShipping: true },
  { name: "Samsung Book i5 8GB 256GB", brand: "Samsung", category: "notebooks", price: 2599, originalPrice: 3299, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.2, reviews: 3600, sales: 14000, freeShipping: true },
  { name: "Positivo Motion i3 4GB 128GB", brand: "Positivo", category: "notebooks", price: 1499, originalPrice: 1999, sources: ["mercadolivre", "shopee"], rating: 3.8, reviews: 8200, sales: 42000, freeShipping: false },

  // ═══════════ SMART TVs & ÁUDIO ═══════════
  { name: "Samsung Smart TV 55\" Crystal UHD 4K", brand: "Samsung", category: "tv-audio", price: 2299, originalPrice: 3199, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 9800, sales: 38000, freeShipping: true },
  { name: "Samsung Smart TV 65\" Neo QLED 4K", brand: "Samsung", category: "tv-audio", price: 4999, originalPrice: 6999, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 4200, sales: 12000, freeShipping: true },
  { name: "LG Smart TV 50\" 4K UHD ThinQ AI", brand: "LG", category: "tv-audio", price: 1999, originalPrice: 2699, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 7600, sales: 32000, freeShipping: true },
  { name: "LG Smart TV 55\" OLED Evo 4K", brand: "LG", category: "tv-audio", price: 5499, originalPrice: 7499, sources: ["amazon-br"], rating: 4.9, reviews: 3100, sales: 8200, freeShipping: true },
  { name: "LG Smart TV 43\" Full HD", brand: "LG", category: "tv-audio", price: 1499, originalPrice: 1999, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.3, reviews: 12400, sales: 58000, freeShipping: true },
  { name: "JBL Tune 520BT Fone Bluetooth", brand: "JBL", category: "tv-audio", price: 179, originalPrice: 299, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.5, reviews: 28000, sales: 180000, freeShipping: true },
  { name: "JBL Tune 770NC Fone ANC Bluetooth", brand: "JBL", category: "tv-audio", price: 349, originalPrice: 549, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.6, reviews: 12000, sales: 65000, freeShipping: true },
  { name: "JBL Flip 6 Caixa Bluetooth", brand: "JBL", category: "tv-audio", price: 549, originalPrice: 799, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.7, reviews: 18500, sales: 95000, freeShipping: true },
  { name: "JBL Charge 5 Caixa Bluetooth", brand: "JBL", category: "tv-audio", price: 799, originalPrice: 1099, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 14200, sales: 72000, freeShipping: true },
  { name: "AirPods Pro 2ª Geração", brand: "Apple", category: "tv-audio", price: 1699, originalPrice: 2399, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 9200, sales: 42000, freeShipping: true },
  { name: "AirPods 3ª Geração", brand: "Apple", category: "tv-audio", price: 1199, originalPrice: 1599, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 7800, sales: 35000, freeShipping: true },
  { name: "Sony WH-1000XM5 Headphone ANC", brand: "Sony", category: "tv-audio", price: 1799, originalPrice: 2499, sources: ["amazon-br"], rating: 4.9, reviews: 5400, sales: 18000, freeShipping: true },
  { name: "Sony WF-1000XM5 Earbuds ANC", brand: "Sony", category: "tv-audio", price: 1499, originalPrice: 1999, sources: ["amazon-br"], rating: 4.8, reviews: 3800, sales: 12000, freeShipping: true },
  { name: "Samsung Soundbar HW-Q600C 3.1.2ch", brand: "Samsung", category: "tv-audio", price: 1899, originalPrice: 2699, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 2800, sales: 8500, freeShipping: true },
  { name: "Echo Dot 5ª Geração Alexa", brand: "Echo", category: "tv-audio", price: 249, originalPrice: 399, sources: ["amazon-br"], rating: 4.6, reviews: 42000, sales: 250000, freeShipping: true },
  { name: "Echo Show 5 3ª Geração", brand: "Echo", category: "tv-audio", price: 449, originalPrice: 599, sources: ["amazon-br"], rating: 4.5, reviews: 18000, sales: 85000, freeShipping: true },
  { name: "Fire TV Stick 4K Max", brand: "Fire TV", category: "tv-audio", price: 339, originalPrice: 449, sources: ["amazon-br"], rating: 4.6, reviews: 22000, sales: 130000, freeShipping: true },

  // ═══════════ GAMER ═══════════
  { name: "PlayStation 5 Slim 1TB", brand: "Sony", category: "gamer", price: 3499, originalPrice: 4499, sources: ["mercadolivre", "amazon-br"], rating: 4.9, reviews: 15000, sales: 45000, freeShipping: true },
  { name: "PlayStation 5 Digital Edition", brand: "Sony", category: "gamer", price: 2999, originalPrice: 3799, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 8200, sales: 28000, freeShipping: true },
  { name: "Xbox Series X 1TB", brand: "Microsoft", category: "gamer", price: 3299, originalPrice: 4199, sources: ["mercadolivre", "amazon-br"], rating: 4.7, reviews: 6800, sales: 18000, freeShipping: true },
  { name: "Nintendo Switch OLED 64GB", brand: "Nintendo", category: "gamer", price: 2199, originalPrice: 2799, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.8, reviews: 12500, sales: 55000, freeShipping: true },
  { name: "Controle DualSense PS5 Branco", brand: "Sony", category: "gamer", price: 349, originalPrice: 499, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.7, reviews: 24000, sales: 120000, freeShipping: true },
  { name: "Cadeira Gamer ThunderX3 EC3 Preta", brand: "Razer", category: "gamer", price: 899, originalPrice: 1499, sources: ["mercadolivre", "amazon-br"], rating: 4.3, reviews: 5600, sales: 22000, freeShipping: true },
  { name: "Headset Gamer HyperX Cloud III", brand: "Logitech", category: "gamer", price: 399, originalPrice: 599, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.5, reviews: 8200, sales: 38000, freeShipping: true },
  { name: "Mouse Gamer Logitech G502 HERO", brand: "Logitech", category: "gamer", price: 199, originalPrice: 349, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.7, reviews: 18000, sales: 85000, freeShipping: true },
  { name: "Teclado Mecânico Logitech G Pro", brand: "Logitech", category: "gamer", price: 499, originalPrice: 799, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 6200, sales: 28000, freeShipping: true },
  { name: "Monitor Gamer LG UltraGear 27\" 165Hz", brand: "LG", category: "gamer", price: 1299, originalPrice: 1799, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 4800, sales: 16000, freeShipping: true },
  { name: "Razer DeathAdder V3 Mouse", brand: "Razer", category: "gamer", price: 299, originalPrice: 449, sources: ["mercadolivre", "amazon-br"], rating: 4.7, reviews: 7200, sales: 32000, freeShipping: true },
  { name: "Razer BlackShark V2 X Headset", brand: "Razer", category: "gamer", price: 249, originalPrice: 399, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.4, reviews: 9800, sales: 45000, freeShipping: true },

  // ═══════════ CASA & COZINHA ═══════════
  { name: "Air Fryer Mondial Family 4L", brand: "Mondial", category: "casa", price: 249, originalPrice: 399, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.4, reviews: 32000, sales: 180000, freeShipping: true },
  { name: "Air Fryer Philips Walita 4.1L Digital", brand: "Walita", category: "casa", price: 449, originalPrice: 649, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 18000, sales: 82000, freeShipping: true },
  { name: "Air Fryer Oster 4L Digital", brand: "Oster", category: "casa", price: 399, originalPrice: 549, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 14000, sales: 65000, freeShipping: true },
  { name: "Cafeteira Nespresso Vertuo Next", brand: "Nestlé", category: "casa", price: 599, originalPrice: 899, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 8200, sales: 35000, freeShipping: true },
  { name: "Cafeteira Dolce Gusto Mini Me", brand: "Nestlé", category: "casa", price: 399, originalPrice: 549, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.4, reviews: 22000, sales: 120000, freeShipping: true },
  { name: "Aspirador Robô Intelbras i-Robot W320", brand: "Intelbras", category: "casa", price: 899, originalPrice: 1299, sources: ["mercadolivre", "amazon-br"], rating: 4.2, reviews: 5600, sales: 18000, freeShipping: true },
  { name: "Geladeira Brastemp Frost Free 375L", brand: "Brastemp", category: "casa", price: 2899, originalPrice: 3699, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 6800, sales: 22000, freeShipping: true },
  { name: "Máquina de Lavar Electrolux 12kg", brand: "Electrolux", category: "casa", price: 1999, originalPrice: 2699, sources: ["mercadolivre", "amazon-br"], rating: 4.4, reviews: 8400, sales: 28000, freeShipping: true },
  { name: "Micro-ondas Electrolux 31L", brand: "Electrolux", category: "casa", price: 549, originalPrice: 749, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.3, reviews: 12000, sales: 52000, freeShipping: true },
  { name: "Ventilador Mondial Maxi Power 40cm", brand: "Mondial", category: "casa", price: 149, originalPrice: 229, sources: ["mercadolivre", "shopee"], rating: 4.1, reviews: 28000, sales: 200000, freeShipping: false },
  { name: "Panela de Pressão Tramontina 4.5L", brand: "Tramontina", category: "casa", price: 129, originalPrice: 189, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.6, reviews: 18000, sales: 95000, freeShipping: false },
  { name: "Conjunto de Panelas Tramontina 5 Peças", brand: "Tramontina", category: "casa", price: 299, originalPrice: 449, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 14200, sales: 72000, freeShipping: true },
  { name: "Ferro de Passar Philips Walita", brand: "Walita", category: "casa", price: 119, originalPrice: 179, sources: ["mercadolivre", "shopee"], rating: 4.2, reviews: 9800, sales: 58000, freeShipping: false },
  { name: "Purificador de Água Electrolux PE12B", brand: "Electrolux", category: "casa", price: 499, originalPrice: 699, sources: ["mercadolivre", "amazon-br"], rating: 4.4, reviews: 7200, sales: 32000, freeShipping: true },

  // ═══════════ INFORMÁTICA & ACESSÓRIOS ═══════════
  { name: "Mouse Logitech MX Master 3S", brand: "Logitech", category: "informatica", price: 499, originalPrice: 699, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 6200, sales: 28000, freeShipping: true },
  { name: "Teclado Logitech MX Keys Mini", brand: "Logitech", category: "informatica", price: 449, originalPrice: 649, sources: ["mercadolivre", "amazon-br"], rating: 4.7, reviews: 4800, sales: 18000, freeShipping: true },
  { name: "Webcam Logitech C920s Full HD", brand: "Logitech", category: "informatica", price: 349, originalPrice: 499, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 8200, sales: 42000, freeShipping: true },
  { name: "Roteador Wi-Fi TP-Link Archer AX73", brand: "TP-Link", category: "informatica", price: 399, originalPrice: 549, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 5600, sales: 22000, freeShipping: true },
  { name: "SSD Kingston NV2 1TB NVMe", brand: "Multilaser", category: "informatica", price: 349, originalPrice: 499, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.6, reviews: 12000, sales: 65000, freeShipping: true },
  { name: "HD Externo Seagate 2TB USB 3.0", brand: "Multilaser", category: "informatica", price: 399, originalPrice: 549, sources: ["mercadolivre", "amazon-br"], rating: 4.4, reviews: 8400, sales: 38000, freeShipping: true },
  { name: "Monitor Dell 24\" Full HD IPS", brand: "Dell", category: "informatica", price: 899, originalPrice: 1199, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 4200, sales: 16000, freeShipping: true },
  { name: "Impressora HP DeskJet 2774", brand: "Multilaser", category: "informatica", price: 349, originalPrice: 449, sources: ["mercadolivre", "amazon-br"], rating: 4.0, reviews: 14000, sales: 72000, freeShipping: true },
  { name: "Tablet Samsung Galaxy Tab A9 64GB", brand: "Samsung", category: "informatica", price: 999, originalPrice: 1399, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.3, reviews: 6800, sales: 28000, freeShipping: true },
  { name: "iPad 10ª Geração 64GB Wi-Fi", brand: "Apple", category: "informatica", price: 3299, originalPrice: 4299, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 5200, sales: 18000, freeShipping: true },
  { name: "Apple Watch SE 2ª Geração 40mm", brand: "Apple", category: "informatica", price: 1999, originalPrice: 2699, sources: ["mercadolivre", "amazon-br"], rating: 4.7, reviews: 4800, sales: 16000, freeShipping: true },
  { name: "Smartwatch Samsung Galaxy Watch6 40mm", brand: "Samsung", category: "informatica", price: 1299, originalPrice: 1799, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 3600, sales: 12000, freeShipping: true },
  { name: "Garmin Forerunner 265 GPS", brand: "Garmin", category: "informatica", price: 2499, originalPrice: 3199, sources: ["amazon-br"], rating: 4.8, reviews: 2200, sales: 5800, freeShipping: true },
  { name: "Kindle Paperwhite 16GB", brand: "Kindle", category: "informatica", price: 549, originalPrice: 699, sources: ["amazon-br"], rating: 4.8, reviews: 28000, sales: 150000, freeShipping: true },
  { name: "Kindle 11ª Geração 16GB", brand: "Kindle", category: "informatica", price: 399, originalPrice: 499, sources: ["amazon-br"], rating: 4.7, reviews: 35000, sales: 200000, freeShipping: true },

  // ═══════════ ESPORTES & FITNESS ═══════════
  { name: "Tênis Nike Air Max 270", brand: "Nike", category: "esportes", price: 499, originalPrice: 799, sources: ["mercadolivre", "shopee", "shein"], rating: 4.6, reviews: 18000, sales: 85000, freeShipping: true },
  { name: "Tênis Nike Revolution 6", brand: "Nike", category: "esportes", price: 249, originalPrice: 399, sources: ["mercadolivre", "shopee", "shein"], rating: 4.4, reviews: 22000, sales: 120000, freeShipping: true },
  { name: "Tênis Adidas Ultraboost 23", brand: "Adidas", category: "esportes", price: 599, originalPrice: 999, sources: ["mercadolivre", "amazon-br"], rating: 4.7, reviews: 8200, sales: 32000, freeShipping: true },
  { name: "Tênis Adidas Grand Court", brand: "Adidas", category: "esportes", price: 199, originalPrice: 349, sources: ["mercadolivre", "shopee", "shein"], rating: 4.3, reviews: 28000, sales: 160000, freeShipping: true },
  { name: "Tênis New Balance 574", brand: "New Balance", category: "esportes", price: 399, originalPrice: 599, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 9800, sales: 42000, freeShipping: true },
  { name: "Camiseta Under Armour Tech 2.0", brand: "Under Armour", category: "esportes", price: 99, originalPrice: 169, sources: ["mercadolivre", "shopee"], rating: 4.4, reviews: 14000, sales: 78000, freeShipping: false },
  { name: "Garrafa Térmica Stanley 1.4L", brand: "Tramontina", category: "esportes", price: 199, originalPrice: 299, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.5, reviews: 24000, sales: 130000, freeShipping: true },
  { name: "Esteira Elétrica Dream Fitness DR2110", brand: "Mondial", category: "esportes", price: 1499, originalPrice: 2199, sources: ["mercadolivre", "amazon-br"], rating: 4.2, reviews: 3200, sales: 12000, freeShipping: true },
  { name: "Bicicleta Ergométrica Kikos KR 3.8", brand: "Mondial", category: "esportes", price: 999, originalPrice: 1499, sources: ["mercadolivre", "amazon-br"], rating: 4.1, reviews: 2800, sales: 9500, freeShipping: true },
  { name: "Kit Halteres Emborrachados 20kg", brand: "Nike", category: "esportes", price: 249, originalPrice: 399, sources: ["mercadolivre", "shopee"], rating: 4.3, reviews: 8400, sales: 42000, freeShipping: true },
  { name: "Smartband Xiaomi Mi Band 8", brand: "Xiaomi", category: "esportes", price: 199, originalPrice: 279, sources: ["mercadolivre", "shopee"], rating: 4.5, reviews: 18000, sales: 95000, freeShipping: true },

  // ═══════════ BELEZA & SAÚDE ═══════════
  { name: "Perfume 212 VIP Carolina Herrera 80ml", brand: "Natura", category: "beleza", price: 399, originalPrice: 599, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 5600, sales: 22000, freeShipping: true },
  { name: "Perfume Good Girl Carolina Herrera 80ml", brand: "O Boticário", category: "beleza", price: 499, originalPrice: 749, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 4200, sales: 16000, freeShipping: true },
  { name: "Kit Natura Kaiak Masculino", brand: "Natura", category: "beleza", price: 149, originalPrice: 229, sources: ["mercadolivre", "shopee"], rating: 4.5, reviews: 12000, sales: 65000, freeShipping: true },
  { name: "Creme Hidratante Nivea Soft 200ml", brand: "Natura", category: "beleza", price: 29, originalPrice: 45, sources: ["mercadolivre", "shopee", "shein"], rating: 4.6, reviews: 32000, sales: 250000, freeShipping: false },
  { name: "Secador de Cabelo Philips 2100W", brand: "Philips", category: "beleza", price: 149, originalPrice: 229, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.4, reviews: 18000, sales: 82000, freeShipping: true },
  { name: "Prancha Alisadora Mondial Titanium", brand: "Mondial", category: "beleza", price: 99, originalPrice: 179, sources: ["mercadolivre", "shopee"], rating: 4.2, reviews: 22000, sales: 120000, freeShipping: false },
  { name: "Barbeador Philips OneBlade", brand: "Philips", category: "beleza", price: 149, originalPrice: 249, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.5, reviews: 24000, sales: 130000, freeShipping: true },
  { name: "Escova Elétrica Oral-B Pro 2", brand: "Philips", category: "beleza", price: 199, originalPrice: 329, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 8200, sales: 35000, freeShipping: true },
  { name: "Kit Maquiagem Ruby Rose 24 Sombras", brand: "O Boticário", category: "beleza", price: 49, originalPrice: 89, sources: ["mercadolivre", "shopee", "shein"], rating: 4.1, reviews: 28000, sales: 180000, freeShipping: false },
  { name: "Perfume Malbec O Boticário 100ml", brand: "O Boticário", category: "beleza", price: 169, originalPrice: 249, sources: ["mercadolivre"], rating: 4.7, reviews: 15000, sales: 72000, freeShipping: true },

  // ═══════════ MODA ═══════════
  { name: "Chinelo Havaianas Top", brand: "Havaianas", category: "moda", price: 24, originalPrice: 39, sources: ["mercadolivre", "shopee", "shein"], rating: 4.5, reviews: 45000, sales: 500000, freeShipping: false },
  { name: "Tênis Melissa Ulitsa Sneaker", brand: "Melissa", category: "moda", price: 199, originalPrice: 329, sources: ["mercadolivre", "shopee"], rating: 4.3, reviews: 8200, sales: 38000, freeShipping: true },
  { name: "Mochila Nike Brasilia 24L", brand: "Nike", category: "moda", price: 149, originalPrice: 229, sources: ["mercadolivre", "shopee", "shein"], rating: 4.4, reviews: 14000, sales: 72000, freeShipping: true },
  { name: "Relógio Casio Vintage A168WA", brand: "Multilaser", category: "moda", price: 199, originalPrice: 299, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.6, reviews: 18000, sales: 85000, freeShipping: true },
  { name: "Óculos de Sol Ray-Ban Aviator", brand: "Nike", category: "moda", price: 499, originalPrice: 799, sources: ["mercadolivre", "amazon-br"], rating: 4.7, reviews: 5600, sales: 22000, freeShipping: true },
  { name: "Bolsa Feminina WJ Transversal", brand: "Melissa", category: "moda", price: 89, originalPrice: 149, sources: ["mercadolivre", "shopee", "shein"], rating: 4.2, reviews: 22000, sales: 130000, freeShipping: false },
  { name: "Jaqueta Corta-Vento Nike Windrunner", brand: "Nike", category: "moda", price: 299, originalPrice: 499, sources: ["mercadolivre", "shopee"], rating: 4.5, reviews: 6800, sales: 28000, freeShipping: true },
  { name: "Bermuda Adidas Essentials", brand: "Adidas", category: "moda", price: 99, originalPrice: 179, sources: ["mercadolivre", "shopee", "shein"], rating: 4.3, reviews: 12000, sales: 65000, freeShipping: false },
  { name: "Calça Jeans Levi's 501 Original", brand: "Adidas", category: "moda", price: 199, originalPrice: 349, sources: ["mercadolivre", "amazon-br"], rating: 4.6, reviews: 7200, sales: 32000, freeShipping: true },
  { name: "Camiseta Básica Hering Masculina", brand: "Havaianas", category: "moda", price: 39, originalPrice: 69, sources: ["mercadolivre", "shopee"], rating: 4.2, reviews: 28000, sales: 200000, freeShipping: false },

  // ═══════════ INFANTIL ═══════════
  { name: "LEGO Classic Caixa Criativa 790 Peças", brand: "Lego", category: "infantil", price: 249, originalPrice: 399, sources: ["mercadolivre", "amazon-br"], rating: 4.8, reviews: 8200, sales: 35000, freeShipping: true },
  { name: "LEGO Technic Ferrari 488 GTE", brand: "Lego", category: "infantil", price: 399, originalPrice: 599, sources: ["mercadolivre", "amazon-br"], rating: 4.7, reviews: 4200, sales: 16000, freeShipping: true },
  { name: "Hot Wheels Pista Ataque Tubarão", brand: "Hot Wheels", category: "infantil", price: 149, originalPrice: 249, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.4, reviews: 12000, sales: 58000, freeShipping: true },
  { name: "Boneca Barbie Dreamhouse", brand: "Hot Wheels", category: "infantil", price: 299, originalPrice: 499, sources: ["mercadolivre", "amazon-br"], rating: 4.5, reviews: 6800, sales: 28000, freeShipping: true },
  { name: "Tablet Infantil Multilaser Kids 32GB", brand: "Multilaser", category: "infantil", price: 399, originalPrice: 549, sources: ["mercadolivre", "amazon-br", "shopee"], rating: 4.1, reviews: 9800, sales: 42000, freeShipping: true },
  { name: "Carrinho Controle Remoto 4x4", brand: "Multilaser", category: "infantil", price: 129, originalPrice: 199, sources: ["mercadolivre", "shopee"], rating: 4.0, reviews: 14000, sales: 72000, freeShipping: false },
  { name: "Jogo Uno Copag", brand: "Multilaser", category: "infantil", price: 19, originalPrice: 34, sources: ["mercadolivre", "shopee"], rating: 4.6, reviews: 32000, sales: 250000, freeShipping: false },
  { name: "Bicicleta Infantil Nathor Aro 16", brand: "Multilaser", category: "infantil", price: 449, originalPrice: 649, sources: ["mercadolivre", "amazon-br"], rating: 4.4, reviews: 5600, sales: 22000, freeShipping: true },

  // ═══════════ LIVROS & EDUCAÇÃO ═══════════
  { name: "Atomic Habits — James Clear", brand: "Kindle", category: "livros", price: 34, originalPrice: 59, sources: ["amazon-br", "mercadolivre"], rating: 4.9, reviews: 45000, sales: 350000, freeShipping: false },
  { name: "O Poder do Hábito — Charles Duhigg", brand: "Kindle", category: "livros", price: 29, originalPrice: 54, sources: ["amazon-br", "mercadolivre"], rating: 4.7, reviews: 38000, sales: 280000, freeShipping: false },
  { name: "Sapiens — Yuval Noah Harari", brand: "Kindle", category: "livros", price: 32, originalPrice: 69, sources: ["amazon-br", "mercadolivre"], rating: 4.8, reviews: 42000, sales: 320000, freeShipping: false },
  { name: "Pai Rico Pai Pobre", brand: "Kindle", category: "livros", price: 26, originalPrice: 49, sources: ["amazon-br", "mercadolivre", "shopee"], rating: 4.6, reviews: 52000, sales: 450000, freeShipping: false },
  { name: "A Psicologia Financeira — Morgan Housel", brand: "Kindle", category: "livros", price: 29, originalPrice: 54, sources: ["amazon-br", "mercadolivre"], rating: 4.8, reviews: 28000, sales: 200000, freeShipping: false },
  { name: "Mindset — Carol S. Dweck", brand: "Kindle", category: "livros", price: 32, originalPrice: 59, sources: ["amazon-br", "mercadolivre"], rating: 4.7, reviews: 22000, sales: 180000, freeShipping: false },
  { name: "O Homem Mais Rico da Babilônia", brand: "Kindle", category: "livros", price: 14, originalPrice: 29, sources: ["amazon-br", "mercadolivre", "shopee"], rating: 4.7, reviews: 48000, sales: 400000, freeShipping: false },
  { name: "12 Regras para a Vida — Jordan Peterson", brand: "Kindle", category: "livros", price: 34, originalPrice: 64, sources: ["amazon-br", "mercadolivre"], rating: 4.5, reviews: 18000, sales: 120000, freeShipping: false },
];

// ═══════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function randomBetween(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

function buildAffiliateUrl(source: string, externalId: string): string {
  switch (source) {
    case "amazon-br": return `https://www.amazon.com.br/dp/${externalId}?tag=promosnap-20`;
    case "mercadolivre": return `https://www.mercadolivre.com.br/p/${externalId}`;
    case "shopee": return `https://shopee.com.br/product/${externalId}`;
    case "shein": return `https://www.shein.com/product-${externalId}.html`;
    default: return `#`;
  }
}

function generateExternalId(source: string, idx: number): string {
  switch (source) {
    case "amazon-br": return `B0${String(idx).padStart(8, "0")}`;
    case "mercadolivre": return `MLB${String(2000000000 + idx)}`;
    case "shopee": return `${100000000 + idx}.${200000000 + idx}`;
    case "shein": return `sw${String(2200000 + idx)}`;
    default: return `EXT${idx}`;
  }
}

// Compute offer score based on discount, reviews, rating
function computeScore(price: number, originalPrice: number, rating: number, reviews: number, freeShipping: boolean): number {
  const discount = originalPrice > price ? (originalPrice - price) / originalPrice : 0;
  const discountScore = Math.min(discount * 100, 40) * 0.9; // up to 36
  const ratingScore = (rating / 5) * 25; // up to 25
  const popularityScore = Math.min(Math.log10(reviews + 1) / 5, 1) * 20; // up to 20
  const shippingBonus = freeShipping ? 10 : 0;
  const freshnessScore = 9; // assume fresh
  return Math.min(100, Math.round(discountScore + ratingScore + popularityScore + shippingBonus + freshnessScore));
}

// ═══════════════════════════════════════════════════
// MAIN SEED
// ═══════════════════════════════════════════════════

async function main() {
  console.log("🌱 Seeding PromoSnap V8 database...\n");

  // 1. Sources
  const sourceMap: Record<string, string> = {};
  for (const s of SOURCES) {
    const source = await prisma.source.upsert({
      where: { slug: s.slug },
      update: { name: s.name, affiliateConfig: s.affiliateConfig },
      create: { name: s.name, slug: s.slug, status: "ACTIVE", affiliateConfig: s.affiliateConfig },
    });
    sourceMap[s.slug] = source.id;
  }
  console.log(`✅ ${SOURCES.length} sources`);

  // 2. Categories
  const catMap: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, icon: c.icon, position: c.position },
      create: { name: c.name, slug: c.slug, icon: c.icon, position: c.position },
    });
    catMap[c.slug] = cat.id;
  }
  console.log(`✅ ${CATEGORIES.length} categorias`);

  // 3. Brands
  const brandMap: Record<string, string> = {};
  for (const b of BRANDS) {
    const slug = slugify(b);
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: { name: b },
      create: { name: b, slug },
    });
    brandMap[b] = brand.id;
  }
  console.log(`✅ ${BRANDS.length} marcas`);

  // 4. Products, Listings, Offers, Snapshots
  let productCount = 0;
  let listingCount = 0;
  let offerCount = 0;
  let snapshotCount = 0;
  let globalIdx = 0;

  for (const pDef of PRODUCTS) {
    const slug = slugify(pDef.name);
    const brandId = brandMap[pDef.brand] || null;
    const categoryId = catMap[pDef.category] || null;

    // Upsert product
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name: pDef.name,
        brandId,
        categoryId,
        popularityScore: pDef.sales / 1000,
      },
      create: {
        name: pDef.name,
        slug,
        brandId,
        categoryId,
        status: "ACTIVE",
        popularityScore: pDef.sales / 1000,
        imageUrl: null, // will be populated by actual images later
        description: `${pDef.name} — Compre com o melhor preço. Compare ofertas de ${pDef.sources.length} lojas e economize.`,
      },
    });
    productCount++;

    // Create listings + offers for each source
    for (const sourceSlug of pDef.sources) {
      const sourceId = sourceMap[sourceSlug];
      if (!sourceId) continue;
      globalIdx++;

      const externalId = generateExternalId(sourceSlug, globalIdx);

      // Vary price by source (±5-15%)
      const priceVariation = sourceSlug === pDef.sources[0] ? 1 : (0.92 + Math.random() * 0.16);
      const currentPrice = Math.round(pDef.price * priceVariation * 100) / 100;
      const originalPrice = Math.round(pDef.originalPrice * (0.95 + Math.random() * 0.1) * 100) / 100;

      const listing = await prisma.listing.upsert({
        where: { sourceId_externalId: { sourceId, externalId } },
        update: {
          rawTitle: pDef.name,
          rawBrand: pDef.brand,
          rawCategory: pDef.category,
          productId: product.id,
          rating: pDef.rating + (Math.random() * 0.3 - 0.15),
          reviewsCount: pDef.reviews + randomBetween(-500, 500),
          salesCountEstimate: pDef.sales + randomBetween(-1000, 1000),
          lastSeenAt: new Date(),
        },
        create: {
          sourceId,
          externalId,
          rawTitle: pDef.name,
          rawBrand: pDef.brand,
          rawCategory: pDef.category,
          productId: product.id,
          productUrl: buildAffiliateUrl(sourceSlug, externalId),
          imageUrl: null,
          availability: "IN_STOCK",
          rating: Math.min(5, Math.max(1, pDef.rating + (Math.random() * 0.3 - 0.15))),
          reviewsCount: Math.max(0, pDef.reviews + randomBetween(-500, 500)),
          salesCountEstimate: Math.max(0, pDef.sales + randomBetween(-1000, 1000)),
          status: "ACTIVE",
          lastSeenAt: new Date(),
        },
      });
      listingCount++;

      const score = computeScore(currentPrice, originalPrice, pDef.rating, pDef.reviews, pDef.freeShipping);

      // Delete existing offers for this listing to avoid duplicates
      await prisma.offer.deleteMany({ where: { listingId: listing.id } });

      const offer = await prisma.offer.create({
        data: {
          listingId: listing.id,
          currentPrice,
          originalPrice,
          isFreeShipping: pDef.freeShipping,
          isActive: true,
          offerScore: score,
          affiliateUrl: buildAffiliateUrl(sourceSlug, externalId),
          lastSeenAt: new Date(),
        },
      });
      offerCount++;

      // Create price history snapshots (last 30 days, ~10 points)
      const now = Date.now();
      const snapshotDays = [30, 25, 20, 16, 12, 9, 7, 5, 3, 1, 0];
      for (const daysAgo of snapshotDays) {
        // Simulate price variation over time
        const historicalMultiplier = daysAgo > 15 ? (1.05 + Math.random() * 0.15) : // higher price historically
                                    daysAgo > 7 ? (0.98 + Math.random() * 0.1) :
                                    (0.95 + Math.random() * 0.08);
        const snapshotPrice = Math.round(currentPrice * historicalMultiplier * 100) / 100;

        await prisma.priceSnapshot.create({
          data: {
            offerId: offer.id,
            price: daysAgo === 0 ? currentPrice : snapshotPrice,
            originalPrice: originalPrice,
            capturedAt: new Date(now - daysAgo * 24 * 60 * 60 * 1000),
          },
        });
        snapshotCount++;
      }
    }
  }

  console.log(`✅ ${productCount} produtos`);
  console.log(`✅ ${listingCount} listings`);
  console.log(`✅ ${offerCount} ofertas`);
  console.log(`✅ ${snapshotCount} snapshots de preço`);

  // 5. Coupons
  const couponData = [
    { code: "PROMO10", description: "10% off em eletrônicos", source: "amazon-br" },
    { code: "FRETE99", description: "Frete grátis acima de R$99", source: "mercadolivre" },
    { code: "SHOPEE15", description: "R$15 off primeira compra", source: "shopee" },
    { code: "SHEIN20", description: "20% off moda e acessórios", source: "shein" },
    { code: "PRIME50", description: "R$50 off assinatura Prime", source: "amazon-br" },
    { code: "ML200", description: "R$200 off TVs acima de R$2000", source: "mercadolivre" },
    { code: "GAMER15", description: "15% off em games e acessórios", source: "amazon-br" },
    { code: "CASA10", description: "10% off em Casa & Cozinha", source: "mercadolivre" },
    { code: "promosnap-20", description: "Tag de afiliado Amazon — compras via links com tag=promosnap-20 geram comissao para o PromoSnap. Nao e cupom de desconto.", source: "amazon-br" },
  ];

  for (const c of couponData) {
    await prisma.coupon.upsert({
      where: { id: `coupon-${c.code.toLowerCase()}` },
      update: {},
      create: {
        id: `coupon-${c.code.toLowerCase()}`,
        sourceId: sourceMap[c.source],
        code: c.code,
        description: c.description,
        status: "ACTIVE",
        startAt: new Date(),
        endAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
  }
  console.log(`✅ ${couponData.length} cupons`);

  // 6. Editorial blocks
  await prisma.editorialBlock.upsert({ where: { slug: "ofertas-quentes" }, update: {}, create: { blockType: "RAIL", title: "Ofertas Quentes", slug: "ofertas-quentes", subtitle: "As melhores promoções agora", position: 1, status: "PUBLISHED", payloadJson: { minScore: 80, limit: 12 } } });
  await prisma.editorialBlock.upsert({ where: { slug: "menor-preco" }, update: {}, create: { blockType: "RAIL", title: "Menor Preço Histórico", slug: "menor-preco", subtitle: "Nunca estiveram tão baratos", position: 2, status: "PUBLISHED", payloadJson: { period: "90d", limit: 6 } } });
  await prisma.editorialBlock.upsert({ where: { slug: "mais-vendidos" }, update: {}, create: { blockType: "RAIL", title: "Mais Vendidos", slug: "mais-vendidos", subtitle: "Os favoritos", position: 3, status: "PUBLISHED", payloadJson: { sortBy: "sales", limit: 12 } } });
  console.log("✅ Editorial blocks");

  // 7. Trending keywords
  const trends = [
    "iphone 15", "air fryer", "ps5", "notebook gamer", "fone bluetooth",
    "smart tv 55", "kindle", "smartwatch", "cadeira gamer", "xiaomi",
    "nike air max", "perfume importado", "lego", "echo dot", "samsung galaxy",
  ];
  for (let i = 0; i < trends.length; i++) {
    await prisma.trendingKeyword.upsert({
      where: { keyword_fetchedAt: { keyword: trends[i], fetchedAt: new Date(Date.now() - 60000) } },
      update: {},
      create: {
        keyword: trends[i],
        url: `/busca?q=${encodeURIComponent(trends[i])}`,
        position: i + 1,
        fetchedAt: new Date(Date.now() - 60000),
      },
    });
  }
  console.log(`✅ ${trends.length} trending keywords`);

  // 8. Subscribers
  const subscriberEmails = [
    { email: "test1@promosnap.com", tags: ["eletronicos", "gamer"], interests: ["eletronicos", "gamer"] },
    { email: "test2@promosnap.com", tags: ["beleza", "moda"], interests: ["beleza", "moda"] },
    { email: "test3@promosnap.com", tags: ["informatica", "notebooks"], interests: ["informatica", "notebooks"] },
    { email: "test4@promosnap.com", tags: ["casa", "infantil"], interests: ["casa", "infantil"] },
    { email: "test5@promosnap.com", tags: ["esportes", "celulares"], interests: ["esportes", "celulares"] },
  ];

  for (const sub of subscriberEmails) {
    await prisma.subscriber.upsert({
      where: { email: sub.email },
      update: {},
      create: {
        email: sub.email,
        status: "ACTIVE",
        frequency: "daily",
        tags: sub.tags,
        interests: sub.interests,
      },
    });
  }
  console.log(`✅ ${subscriberEmails.length} subscribers`);

  // 9. Price Alerts (linked to real listings, targetPrice slightly above current to allow testing)
  const sampleListings = await prisma.listing.findMany({
    take: 5,
    orderBy: { createdAt: "desc" },
    include: {
      offers: {
        where: { isActive: true },
        take: 1,
        orderBy: { currentPrice: "asc" },
      },
    },
  });

  let alertCount = 0;
  for (let i = 0; i < sampleListings.length; i++) {
    const listing = sampleListings[i];
    const bestOffer = listing.offers[0];
    if (!bestOffer) continue;

    // Set target price slightly above current so alerts can be triggered by price drops
    const targetPrice = Math.round(bestOffer.currentPrice * 1.05 * 100) / 100;

    await prisma.priceAlert.create({
      data: {
        listingId: listing.id,
        email: subscriberEmails[i % subscriberEmails.length].email,
        targetPrice,
        isActive: true,
      },
    });
    alertCount++;
  }
  console.log(`✅ ${alertCount} price alerts`);

  // 10. Search Logs (simulated searches from last 7 days)
  const popularQueries = [
    "iphone 15", "air fryer", "notebook gamer", "fone bluetooth", "smart tv",
    "playstation 5", "cadeira gamer", "kindle", "xiaomi", "nike air max",
    "samsung galaxy", "macbook", "jbl flip", "airpods", "perfume importado",
    "lego", "echo dot", "tênis adidas", "mouse gamer", "monitor gamer",
  ];
  const zeroResultQueries = [
    "geladeira duplex smart", "drone dji mini 4", "oculus quest 3",
    "aspirador dyson v15", "gopro hero 12",
  ];

  let searchLogCount = 0;
  const now = Date.now();
  for (const q of popularQueries) {
    const daysAgo = randomBetween(0, 6);
    const count = randomBetween(2, 8);
    for (let j = 0; j < count; j++) {
      await prisma.searchLog.create({
        data: {
          query: q,
          normalizedQuery: q.toLowerCase(),
          resultsCount: randomBetween(3, 50),
          createdAt: new Date(now - daysAgo * 86400000 - randomBetween(0, 86400000)),
        },
      });
      searchLogCount++;
    }
  }
  for (const q of zeroResultQueries) {
    const daysAgo = randomBetween(0, 4);
    for (let j = 0; j < randomBetween(2, 5); j++) {
      await prisma.searchLog.create({
        data: {
          query: q,
          normalizedQuery: q.toLowerCase(),
          resultsCount: 0,
          createdAt: new Date(now - daysAgo * 86400000 - randomBetween(0, 86400000)),
        },
      });
      searchLogCount++;
    }
  }
  console.log(`✅ ${searchLogCount} search logs (${zeroResultQueries.length} zero-result queries)`);

  // 11. Articles
  await seedArticles();

  console.log("\n🎉 Seed V9 completo!");
  console.log(`   📦 ${productCount} produtos | 📋 ${listingCount} listings | 💰 ${offerCount} ofertas | 📊 ${snapshotCount} snapshots`);
  console.log(`   👥 ${subscriberEmails.length} subscribers | 🔔 ${alertCount} alerts | 🔍 ${searchLogCount} search logs`);
}

main()
  .catch((e) => { console.error("❌ Seed failed:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
