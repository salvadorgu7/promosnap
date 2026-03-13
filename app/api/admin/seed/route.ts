import { NextRequest } from 'next/server'
import prisma from '@/lib/db/prisma'
import { MercadoLivreAdapter } from '@/adapters/mercadolivre'
import { validateAdmin } from '@/lib/auth/admin'

interface SeedProduct {
  externalId: string
  brand: string | null
  title: string
  price: number
  originalPrice: number | null
  image: string
  url: string
  category: string
  rating: number
  reviews: number
  sales: number
  freeShipping: boolean
}

const ML_PRODUCTS: SeedProduct[] = [
  // ──────────────────────────────────────────────────────
  // CELULARES (16 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB51680761", brand: "oppo", title: "Smartphone Oppo A5 4G 256GB 6GB RAM Câmera 50MP Branco", price: 1499, originalPrice: 1799, image: "https://http2.mlstatic.com/D_Q_NP_2X_641800-MLA99507571550_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB51680761", category: "Celulares", rating: 4.3, reviews: 1240, sales: 8500, freeShipping: true },
  { externalId: "MLB56327005", brand: "infinix", title: "Smartphone Infinix Smart 10 4GB 256GB Câmera 8MP Tela 6.67 120Hz Bateria 5000mAh", price: 1458, originalPrice: 1699, image: "https://http2.mlstatic.com/D_Q_NP_2X_964227-MLA100071062557_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB56327005", category: "Celulares", rating: 4.1, reviews: 870, sales: 5200, freeShipping: true },
  { externalId: "MLB61373637", brand: "oppo", title: "Smartphone OPPO A60 256GB 8GB RAM 4G Vinho", price: 1699, originalPrice: 1999, image: "https://http2.mlstatic.com/D_Q_NP_2X_718127-MLA100070666423_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB61373637", category: "Celulares", rating: 4.4, reviews: 650, sales: 3800, freeShipping: true },
  { externalId: "MLB63112201", brand: "realme", title: "Celular Smartphone Realme C73 256GB 8GB RAM Dual Sim 120Hz 6000mAh Verde", price: 1999, originalPrice: 2299, image: "https://http2.mlstatic.com/D_Q_NP_2X_999325-MLA102615422841_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB63112201", category: "Celulares", rating: 4.2, reviews: 430, sales: 2100, freeShipping: true },
  { externalId: "MLB58841029", brand: "samsung", title: "Smartphone Samsung Galaxy A16 128GB 4GB RAM 5G Azul Claro", price: 1799, originalPrice: 2199, image: "https://http2.mlstatic.com/D_Q_NP_2X_859124-MLA100071066412_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB58841029", category: "Celulares", rating: 4.5, reviews: 3200, sales: 18000, freeShipping: true },
  { externalId: "MLB59012834", brand: "samsung", title: "Smartphone Samsung Galaxy S24 256GB 8GB RAM 5G Preto", price: 4299, originalPrice: 5499, image: "https://http2.mlstatic.com/D_Q_NP_2X_721834-MLA98201939102_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB59012834", category: "Celulares", rating: 4.8, reviews: 12500, sales: 45000, freeShipping: true },
  // New celulares
  { externalId: "MLB70100101", brand: "apple", title: "Apple iPhone 15 128GB Preto 5G Tela 6.1\" Câmera 48MP", price: 5199, originalPrice: 6499, image: "https://http2.mlstatic.com/D_Q_NP_2X_641800-MLA99507571550_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100101", category: "Celulares", rating: 4.9, reviews: 48000, sales: 200000, freeShipping: true },
  { externalId: "MLB70100102", brand: "apple", title: "Apple iPhone 14 128GB Azul 5G Tela 6.1\" Câmera 12MP", price: 4199, originalPrice: 5299, image: "https://http2.mlstatic.com/D_Q_NP_2X_641800-MLA99507571550_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100102", category: "Celulares", rating: 4.8, reviews: 35000, sales: 150000, freeShipping: true },
  { externalId: "MLB70100103", brand: "xiaomi", title: "Xiaomi Redmi Note 13 Pro 256GB 8GB RAM 5G Preto Câmera 200MP", price: 1899, originalPrice: 2499, image: "https://http2.mlstatic.com/D_Q_NP_2X_964227-MLA100071062557_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100103", category: "Celulares", rating: 4.6, reviews: 18500, sales: 85000, freeShipping: true },
  { externalId: "MLB70100104", brand: "xiaomi", title: "Xiaomi Poco X6 Pro 256GB 8GB RAM 5G Azul Tela AMOLED 120Hz", price: 2199, originalPrice: 2799, image: "https://http2.mlstatic.com/D_Q_NP_2X_999325-MLA102615422841_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100104", category: "Celulares", rating: 4.5, reviews: 8700, sales: 42000, freeShipping: true },
  { externalId: "MLB70100105", brand: "motorola", title: "Motorola Edge 50 Neo 256GB 8GB RAM 5G Preto Tela pOLED 6.4\"", price: 2499, originalPrice: 2999, image: "https://http2.mlstatic.com/D_Q_NP_2X_859124-MLA100071066412_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100105", category: "Celulares", rating: 4.4, reviews: 4300, sales: 22000, freeShipping: true },
  { externalId: "MLB70100106", brand: "motorola", title: "Motorola Moto G84 256GB 8GB RAM 5G Grafite Tela 6.5\" 120Hz", price: 1599, originalPrice: 1999, image: "https://http2.mlstatic.com/D_Q_NP_2X_718127-MLA100070666423_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100106", category: "Celulares", rating: 4.3, reviews: 6800, sales: 35000, freeShipping: true },
  { externalId: "MLB70100107", brand: "samsung", title: "Samsung Galaxy A55 5G 128GB 8GB RAM Azul Câmera 50MP OIS", price: 2299, originalPrice: 2799, image: "https://http2.mlstatic.com/D_Q_NP_2X_721834-MLA98201939102_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100107", category: "Celulares", rating: 4.6, reviews: 9200, sales: 55000, freeShipping: true },
  { externalId: "MLB70100108", brand: "samsung", title: "Samsung Galaxy S24 Ultra 256GB 12GB RAM 5G Titânio Violeta S Pen", price: 7499, originalPrice: 9499, image: "https://http2.mlstatic.com/D_Q_NP_2X_721834-MLA98201939102_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100108", category: "Celulares", rating: 4.9, reviews: 22000, sales: 95000, freeShipping: true },
  { externalId: "MLB70100109", brand: "xiaomi", title: "Xiaomi Redmi 14C 128GB 4GB RAM Azul Tela 6.88\" Bateria 5160mAh", price: 899, originalPrice: 1199, image: "https://http2.mlstatic.com/D_Q_NP_2X_964227-MLA100071062557_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100109", category: "Celulares", rating: 4.2, reviews: 5400, sales: 28000, freeShipping: true },
  { externalId: "MLB70100110", brand: "motorola", title: "Motorola Moto G34 128GB 4GB RAM 5G Verde Tela 6.5\" HD+", price: 1099, originalPrice: 1399, image: "https://http2.mlstatic.com/D_Q_NP_2X_859124-MLA100071066412_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70100110", category: "Celulares", rating: 4.1, reviews: 3600, sales: 19000, freeShipping: true },

  // ──────────────────────────────────────────────────────
  // NOTEBOOKS (15 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB60328223", brand: "acer", title: "Notebook Acer Aspire 16 com IA Intel Core Ultra 5 16GB RAM 512GB SSD", price: 4999, originalPrice: 5999, image: "https://http2.mlstatic.com/D_Q_NP_2X_661268-MLA101288694709_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB60328223", category: "Notebooks", rating: 4.5, reviews: 2100, sales: 9500, freeShipping: true },
  { externalId: "MLB57503810", brand: "hp", title: "Notebook HP ProBook 14\" Intel Core Ultra 5-125U 16GB RAM SSD 512GB Windows 11", price: 6569, originalPrice: 7999, image: "https://http2.mlstatic.com/D_Q_NP_2X_798164-MLA98124845331_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB57503810", category: "Notebooks", rating: 4.6, reviews: 1800, sales: 7200, freeShipping: true },
  { externalId: "MLB48952658", brand: "asus", title: "Notebook ASUS Vivobook 15 Intel Core i5 8GB RAM 256GB SSD Linux Tela 15.6\"", price: 3134, originalPrice: 3799, image: "https://http2.mlstatic.com/D_Q_NP_2X_605441-MLA99453690492_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB48952658", category: "Notebooks", rating: 4.3, reviews: 4500, sales: 22000, freeShipping: true },
  { externalId: "MLB52907400", brand: "vaio", title: "Notebook Vaio FE16 Intel Core i3-1315U Linux 8GB RAM 256GB SSD Tela 15.6\"", price: 2799, originalPrice: 3199, image: "https://http2.mlstatic.com/D_Q_NP_2X_843762-MLA99453456702_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB52907400", category: "Notebooks", rating: 4.1, reviews: 1200, sales: 5800, freeShipping: true },
  { externalId: "MLB56961557", brand: "lenovo", title: "Notebook Lenovo IdeaPad 1 Intel Core i5-1235U 8GB RAM 512GB SSD Windows 11 15.6\"", price: 3499, originalPrice: 4199, image: "https://http2.mlstatic.com/D_Q_NP_2X_764821-MLA98123912031_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB56961557", category: "Notebooks", rating: 4.4, reviews: 6200, sales: 28000, freeShipping: true },
  // New notebooks
  { externalId: "MLB70200201", brand: "apple", title: "Apple MacBook Air M2 13\" 8GB 256GB SSD Meia-Noite", price: 8499, originalPrice: 10499, image: "https://http2.mlstatic.com/D_Q_NP_2X_661268-MLA101288694709_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200201", category: "Notebooks", rating: 4.9, reviews: 15000, sales: 65000, freeShipping: true },
  { externalId: "MLB70200202", brand: "apple", title: "Apple MacBook Air M3 15\" 16GB 512GB SSD Estelar", price: 12999, originalPrice: 15999, image: "https://http2.mlstatic.com/D_Q_NP_2X_661268-MLA101288694709_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200202", category: "Notebooks", rating: 4.9, reviews: 8200, sales: 32000, freeShipping: true },
  { externalId: "MLB70200203", brand: "dell", title: "Notebook Dell Inspiron 15 Intel Core i7-1355U 16GB RAM 512GB SSD Tela 15.6\" FHD", price: 4799, originalPrice: 5799, image: "https://http2.mlstatic.com/D_Q_NP_2X_798164-MLA98124845331_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200203", category: "Notebooks", rating: 4.5, reviews: 7800, sales: 35000, freeShipping: true },
  { externalId: "MLB70200204", brand: "lenovo", title: "Notebook Lenovo IdeaPad 3i Intel Core i7-1255U 16GB RAM 512GB SSD Tela 15.6\"", price: 3999, originalPrice: 4799, image: "https://http2.mlstatic.com/D_Q_NP_2X_764821-MLA98123912031_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200204", category: "Notebooks", rating: 4.4, reviews: 5400, sales: 24000, freeShipping: true },
  { externalId: "MLB70200205", brand: "acer", title: "Notebook Gamer Acer Nitro V15 Intel Core i5-13420H 8GB RTX 3050 512GB SSD", price: 4599, originalPrice: 5499, image: "https://http2.mlstatic.com/D_Q_NP_2X_605441-MLA99453690492_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200205", category: "Notebooks", rating: 4.5, reviews: 3200, sales: 14000, freeShipping: true },
  { externalId: "MLB70200206", brand: "samsung", title: "Notebook Samsung Book Intel Core i5-1235U 8GB 256GB SSD Windows 11 Tela 15.6\"", price: 3299, originalPrice: 3999, image: "https://http2.mlstatic.com/D_Q_NP_2X_843762-MLA99453456702_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200206", category: "Notebooks", rating: 4.3, reviews: 8900, sales: 42000, freeShipping: true },
  { externalId: "MLB70200207", brand: "hp", title: "Notebook HP 256 G10 Intel Core i3-1315U 8GB 256GB SSD Linux Tela 15.6\"", price: 2499, originalPrice: 2999, image: "https://http2.mlstatic.com/D_Q_NP_2X_798164-MLA98124845331_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200207", category: "Notebooks", rating: 4.0, reviews: 2300, sales: 11000, freeShipping: true },
  { externalId: "MLB70200208", brand: "asus", title: "Notebook Gamer ASUS TUF Gaming F15 i5-12500H 8GB RTX 4050 512GB SSD 15.6\" 144Hz", price: 5799, originalPrice: 6999, image: "https://http2.mlstatic.com/D_Q_NP_2X_605441-MLA99453690492_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200208", category: "Notebooks", rating: 4.6, reviews: 4100, sales: 18000, freeShipping: true },
  { externalId: "MLB70200209", brand: "dell", title: "Notebook Dell Vostro 14 Intel Core i5-1335U 8GB 256GB SSD Windows 11 Pro 14\"", price: 3899, originalPrice: 4599, image: "https://http2.mlstatic.com/D_Q_NP_2X_798164-MLA98124845331_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200209", category: "Notebooks", rating: 4.4, reviews: 1900, sales: 8500, freeShipping: true },
  { externalId: "MLB70200210", brand: "lenovo", title: "Notebook Lenovo LOQ Gaming i5-12450H 8GB RTX 3050 512GB SSD 15.6\" 144Hz", price: 4299, originalPrice: 5299, image: "https://http2.mlstatic.com/D_Q_NP_2X_764821-MLA98123912031_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70200210", category: "Notebooks", rating: 4.5, reviews: 2800, sales: 12500, freeShipping: true },

  // ──────────────────────────────────────────────────────
  // CASA & COZINHA (13 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB50359112", brand: "velds", title: "Robô Aspirador de Pó Velds 3 em 1 Varre Aspira e Passa Pano com Mapeamento", price: 1999, originalPrice: 2799, image: "https://http2.mlstatic.com/D_Q_NP_2X_768060-MLA99849794277_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB50359112", category: "Casa", rating: 4.3, reviews: 2800, sales: 12000, freeShipping: true },
  { externalId: "MLB53308567", brand: null, title: "Robô Aspirador 3 em 1 Varre Aspira e Passa Pano Limpeza Giroscópica", price: 999, originalPrice: 1499, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB53308567", category: "Casa", rating: 4.0, reviews: 1500, sales: 7800, freeShipping: true },
  { externalId: "MLB45954581", brand: "philco", title: "Fritadeira Air Fryer Philco 4L Redstone 1500W PAF40A", price: 390, originalPrice: 549, image: "https://http2.mlstatic.com/D_Q_NP_2X_917068-MLA99920832137_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB45954581", category: "Casa", rating: 4.4, reviews: 8900, sales: 45000, freeShipping: true },
  { externalId: "MLB22530387", brand: "mondial", title: "Fritadeira Sem Óleo Air Fryer 4L Mondial 1500W AFN-40-BFT", price: 479, originalPrice: 649, image: "https://http2.mlstatic.com/D_Q_NP_2X_775407-MLA99776749612_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB22530387", category: "Casa", rating: 4.3, reviews: 12000, sales: 58000, freeShipping: true },
  // New casa
  { externalId: "MLB70300301", brand: "britania", title: "Air Fryer Britânia BFR15PI 5L Digital 1700W Preta e Inox", price: 449, originalPrice: 599, image: "https://http2.mlstatic.com/D_Q_NP_2X_917068-MLA99920832137_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300301", category: "Casa", rating: 4.5, reviews: 15000, sales: 72000, freeShipping: true },
  { externalId: "MLB70300302", brand: "oster", title: "Air Fryer Oster Digital 3.5L OFRT780 Preto 1300W", price: 359, originalPrice: 499, image: "https://http2.mlstatic.com/D_Q_NP_2X_775407-MLA99776749612_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300302", category: "Casa", rating: 4.2, reviews: 6500, sales: 32000, freeShipping: true },
  { externalId: "MLB70300303", brand: "electrolux", title: "Aspirador de Pó Vertical Electrolux Ergo12 Sem Fio Bivolt Cinza", price: 799, originalPrice: 1099, image: "https://http2.mlstatic.com/D_Q_NP_2X_768060-MLA99849794277_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300303", category: "Casa", rating: 4.4, reviews: 4200, sales: 19000, freeShipping: true },
  { externalId: "MLB70300304", brand: "nespresso", title: "Cafeteira Nespresso Essenza Mini C30 Vermelha 19 Bar Automática", price: 399, originalPrice: 549, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300304", category: "Casa", rating: 4.7, reviews: 22000, sales: 98000, freeShipping: true },
  { externalId: "MLB70300305", brand: "xiaomi", title: "Xiaomi Robot Vacuum S10 Plus Aspirador Robô 4000Pa LDS Mop", price: 2499, originalPrice: 3299, image: "https://http2.mlstatic.com/D_Q_NP_2X_768060-MLA99849794277_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300305", category: "Casa", rating: 4.6, reviews: 5800, sales: 25000, freeShipping: true },
  { externalId: "MLB70300306", brand: "mondial", title: "Liquidificador Mondial Turbo Power L-1200 BI 12 Velocidades 1200W", price: 179, originalPrice: 249, image: "https://http2.mlstatic.com/D_Q_NP_2X_775407-MLA99776749612_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300306", category: "Casa", rating: 4.3, reviews: 18000, sales: 85000, freeShipping: true },
  { externalId: "MLB70300307", brand: "arno", title: "Fritadeira Air Fryer Arno Ultra AFRY 4.2L Preta 1500W", price: 329, originalPrice: 449, image: "https://http2.mlstatic.com/D_Q_NP_2X_917068-MLA99920832137_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300307", category: "Casa", rating: 4.4, reviews: 9800, sales: 48000, freeShipping: true },
  { externalId: "MLB70300308", brand: "electrolux", title: "Purificador de Água Electrolux PE11B Branco Bivolt 3 Temperaturas", price: 599, originalPrice: 799, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300308", category: "Casa", rating: 4.5, reviews: 7400, sales: 34000, freeShipping: true },
  { externalId: "MLB70300309", brand: "wap", title: "Lavadora de Alta Pressão WAP Ousada Plus 2200 1750 PSI 1500W", price: 499, originalPrice: 699, image: "https://http2.mlstatic.com/D_Q_NP_2X_768060-MLA99849794277_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70300309", category: "Casa", rating: 4.2, reviews: 11000, sales: 52000, freeShipping: true },

  // ──────────────────────────────────────────────────────
  // ÁUDIO (12 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB28827832", brand: "jbl", title: "Fone de Ouvido Sem Fio JBL Tune 720BT Azul Bluetooth", price: 365, originalPrice: 499, image: "https://http2.mlstatic.com/D_Q_NP_2X_664007-MLU77357211333_062024-E.webp", url: "https://www.mercadolivre.com.br/p/MLB28827832", category: "Áudio", rating: 4.5, reviews: 8900, sales: 42000, freeShipping: true },
  { externalId: "MLB45929271", brand: "jbl", title: "Fone de Ouvido Bluetooth JBL Tune Flex 2 Preto", price: 599, originalPrice: 799, image: "https://http2.mlstatic.com/D_Q_NP_2X_973601-MLA99939959693_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB45929271", category: "Áudio", rating: 4.4, reviews: 3200, sales: 15000, freeShipping: true },
  // New áudio
  { externalId: "MLB70400401", brand: "jbl", title: "Caixa de Som Bluetooth JBL Flip 6 30W À Prova d'Água IP67 Preta", price: 499, originalPrice: 699, image: "https://http2.mlstatic.com/D_Q_NP_2X_973601-MLA99939959693_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400401", category: "Áudio", rating: 4.8, reviews: 25000, sales: 120000, freeShipping: true },
  { externalId: "MLB70400402", brand: "jbl", title: "Caixa de Som JBL Charge 5 40W Bluetooth À Prova d'Água Azul", price: 799, originalPrice: 999, image: "https://http2.mlstatic.com/D_Q_NP_2X_664007-MLU77357211333_062024-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400402", category: "Áudio", rating: 4.8, reviews: 18000, sales: 85000, freeShipping: true },
  { externalId: "MLB70400403", brand: "edifier", title: "Fone de Ouvido Bluetooth Edifier W820NB Plus ANC Hi-Res Preto", price: 329, originalPrice: 449, image: "https://http2.mlstatic.com/D_Q_NP_2X_664007-MLU77357211333_062024-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400403", category: "Áudio", rating: 4.6, reviews: 9500, sales: 45000, freeShipping: true },
  { externalId: "MLB70400404", brand: "apple", title: "Apple AirPods Pro 2ª Geração USB-C com ANC e Audio Espacial", price: 1799, originalPrice: 2299, image: "https://http2.mlstatic.com/D_Q_NP_2X_973601-MLA99939959693_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400404", category: "Áudio", rating: 4.9, reviews: 32000, sales: 140000, freeShipping: true },
  { externalId: "MLB70400405", brand: "samsung", title: "Samsung Galaxy Buds FE ANC Bluetooth Grafite", price: 399, originalPrice: 549, image: "https://http2.mlstatic.com/D_Q_NP_2X_973601-MLA99939959693_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400405", category: "Áudio", rating: 4.4, reviews: 5600, sales: 28000, freeShipping: true },
  { externalId: "MLB70400406", brand: "sony", title: "Sony WH-1000XM5 Fone Bluetooth ANC Over-Ear Hi-Res Preto", price: 1999, originalPrice: 2499, image: "https://http2.mlstatic.com/D_Q_NP_2X_664007-MLU77357211333_062024-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400406", category: "Áudio", rating: 4.8, reviews: 14000, sales: 62000, freeShipping: true },
  { externalId: "MLB70400407", brand: "jbl", title: "Caixa de Som JBL Boombox 3 180W Bluetooth PartyBoost Preta", price: 2199, originalPrice: 2799, image: "https://http2.mlstatic.com/D_Q_NP_2X_973601-MLA99939959693_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400407", category: "Áudio", rating: 4.7, reviews: 4800, sales: 18000, freeShipping: true },
  { externalId: "MLB70400408", brand: "qcy", title: "Fone Bluetooth QCY T13 ANC TWS Carregamento Rápido Branco", price: 129, originalPrice: 199, image: "https://http2.mlstatic.com/D_Q_NP_2X_664007-MLU77357211333_062024-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400408", category: "Áudio", rating: 4.2, reviews: 42000, sales: 200000, freeShipping: true },
  { externalId: "MLB70400409", brand: "harman-kardon", title: "Caixa de Som Harman Kardon Onyx Studio 8 Bluetooth 50W Preta", price: 1299, originalPrice: 1699, image: "https://http2.mlstatic.com/D_Q_NP_2X_973601-MLA99939959693_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400409", category: "Áudio", rating: 4.7, reviews: 3200, sales: 12000, freeShipping: true },
  { externalId: "MLB70400410", brand: "edifier", title: "Caixa de Som Bluetooth Edifier MP230 Vintage Retro 20W Madeira", price: 499, originalPrice: 649, image: "https://http2.mlstatic.com/D_Q_NP_2X_664007-MLU77357211333_062024-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70400410", category: "Áudio", rating: 4.5, reviews: 2100, sales: 8500, freeShipping: true },

  // ──────────────────────────────────────────────────────
  // GAMES (14 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB57081243", brand: "sony", title: "Console PlayStation 5 Slim Digital - Pacote Astro Bot e Gran Turismo 7 Branco", price: 3999, originalPrice: 4599, image: "https://http2.mlstatic.com/D_Q_NP_2X_658949-MLA97327917067_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB57081243", category: "Games", rating: 4.8, reviews: 18000, sales: 75000, freeShipping: true },
  { externalId: "MLB57083347", brand: "sony", title: "Console PlayStation 5 Slim Disk - Pacote Astro Bot e Gran Turismo 7 Branco", price: 4499, originalPrice: 4999, image: "https://http2.mlstatic.com/D_Q_NP_2X_945456-MLA99456386724_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB57083347", category: "Games", rating: 4.8, reviews: 15000, sales: 62000, freeShipping: true },
  { externalId: "MLB41975964", brand: "sony", title: "Sony PlayStation 5 Pro CFI-7020 2TB Digital Branco 2024", price: 8009, originalPrice: null, image: "https://http2.mlstatic.com/D_Q_NP_2X_727482-MLA99962144409_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB41975964", category: "Games", rating: 4.7, reviews: 3200, sales: 12000, freeShipping: true },
  { externalId: "MLB31067313", brand: "sony", title: "PlayStation 5 Slim Branco 1TB Versão Mídia Física", price: 4489, originalPrice: 4999, image: "https://http2.mlstatic.com/D_Q_NP_2X_846325-MLA99503539342_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB31067313", category: "Games", rating: 4.8, reviews: 22000, sales: 95000, freeShipping: true },
  // New games
  { externalId: "MLB70500501", brand: "microsoft", title: "Console Xbox Series S 512GB Digital Branco", price: 2199, originalPrice: 2799, image: "https://http2.mlstatic.com/D_Q_NP_2X_658949-MLA97327917067_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500501", category: "Games", rating: 4.6, reviews: 12000, sales: 55000, freeShipping: true },
  { externalId: "MLB70500502", brand: "microsoft", title: "Console Xbox Series X 1TB Preto Mídia Física Game Pass", price: 4299, originalPrice: 4999, image: "https://http2.mlstatic.com/D_Q_NP_2X_945456-MLA99456386724_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500502", category: "Games", rating: 4.7, reviews: 8500, sales: 38000, freeShipping: true },
  { externalId: "MLB70500503", brand: "nintendo", title: "Nintendo Switch OLED 64GB Branco Joy-Con Neon Tela 7\"", price: 2599, originalPrice: 2999, image: "https://http2.mlstatic.com/D_Q_NP_2X_727482-MLA99962144409_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500503", category: "Games", rating: 4.8, reviews: 28000, sales: 130000, freeShipping: true },
  { externalId: "MLB70500504", brand: "sony", title: "Controle DualSense PS5 Sem Fio Branco Original Sony", price: 399, originalPrice: 499, image: "https://http2.mlstatic.com/D_Q_NP_2X_846325-MLA99503539342_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500504", category: "Games", rating: 4.7, reviews: 35000, sales: 160000, freeShipping: true },
  { externalId: "MLB70500505", brand: "logitech", title: "Mouse Gamer Logitech G502 HERO 25K DPI RGB 11 Botões Preto", price: 179, originalPrice: 299, image: "https://http2.mlstatic.com/D_Q_NP_2X_658949-MLA97327917067_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500505", category: "Games", rating: 4.8, reviews: 42000, sales: 180000, freeShipping: true },
  { externalId: "MLB70500506", brand: "hyperx", title: "Headset Gamer HyperX Cloud Stinger 2 Core P2 Preto", price: 199, originalPrice: 279, image: "https://http2.mlstatic.com/D_Q_NP_2X_945456-MLA99456386724_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500506", category: "Games", rating: 4.5, reviews: 18000, sales: 82000, freeShipping: true },
  { externalId: "MLB70500507", brand: "razer", title: "Teclado Mecânico Gamer Razer BlackWidow V4 RGB Switch Green", price: 699, originalPrice: 899, image: "https://http2.mlstatic.com/D_Q_NP_2X_658949-MLA97327917067_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500507", category: "Games", rating: 4.6, reviews: 6200, sales: 28000, freeShipping: true },
  { externalId: "MLB70500508", brand: "logitech", title: "Teclado Mecânico Gamer Logitech G Pro TKL RGB GX Blue Preto", price: 549, originalPrice: 749, image: "https://http2.mlstatic.com/D_Q_NP_2X_945456-MLA99456386724_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500508", category: "Games", rating: 4.7, reviews: 8900, sales: 40000, freeShipping: true },
  { externalId: "MLB70500509", brand: "redragon", title: "Cadeira Gamer Redragon Coeus C201 Reclinável Preta e Vermelha", price: 899, originalPrice: 1299, image: "https://http2.mlstatic.com/D_Q_NP_2X_727482-MLA99962144409_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500509", category: "Games", rating: 4.3, reviews: 5400, sales: 24000, freeShipping: true },
  { externalId: "MLB70500510", brand: "sony", title: "Jogo God of War Ragnarök PS5 Mídia Física Português", price: 199, originalPrice: 299, image: "https://http2.mlstatic.com/D_Q_NP_2X_846325-MLA99503539342_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70500510", category: "Games", rating: 4.9, reviews: 15000, sales: 68000, freeShipping: true },

  // ──────────────────────────────────────────────────────
  // SMART TVs (15 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB51227402", brand: "philco", title: "Smart TV 55\" Philco 4K UHD Roku TV Dolby Audio P55CRA", price: 2839, originalPrice: 3499, image: "https://http2.mlstatic.com/D_Q_NP_2X_702929-MLA99465492694_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB51227402", category: "TVs", rating: 4.3, reviews: 4200, sales: 18000, freeShipping: true },
  { externalId: "MLB19955269", brand: "aiwa", title: "Smart TV AIWA 32\" Android HD Borda Ultrafina HDR10 Dolby Áudio", price: 1399, originalPrice: 1699, image: "https://http2.mlstatic.com/D_Q_NP_2X_690159-MLA99542831560_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB19955269", category: "TVs", rating: 4.1, reviews: 1800, sales: 8500, freeShipping: true },
  { externalId: "MLB48954893", brand: "samsung", title: "Smart TV Samsung Crystal UHD 4K 65\" U8100F 2025 Preto", price: 3989, originalPrice: 4999, image: "https://http2.mlstatic.com/D_Q_NP_2X_913386-MLA99989046449_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB48954893", category: "TVs", rating: 4.6, reviews: 6800, sales: 28000, freeShipping: true },
  { externalId: "MLB57348074", brand: "philips", title: "Smart TV Philips 43\" Full HD Wi-Fi 43PFG6910/78", price: 2499, originalPrice: 2999, image: "https://http2.mlstatic.com/D_Q_NP_2X_882487-MLA92677639078_092025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB57348074", category: "TVs", rating: 4.2, reviews: 3100, sales: 14000, freeShipping: true },
  { externalId: "MLB55927567", brand: "lg", title: "Smart TV LG 32\" LED HD 32RL601CBSA", price: 1399, originalPrice: 1799, image: "https://http2.mlstatic.com/D_Q_NP_2X_705266-MLA95938596400_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB55927567", category: "TVs", rating: 4.4, reviews: 7200, sales: 35000, freeShipping: true },
  // New TVs
  { externalId: "MLB70600601", brand: "samsung", title: "Smart TV Samsung 50\" Crystal UHD 4K 50CU7700 Tizen Gaming Hub", price: 2199, originalPrice: 2799, image: "https://http2.mlstatic.com/D_Q_NP_2X_913386-MLA99989046449_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600601", category: "TVs", rating: 4.5, reviews: 15000, sales: 68000, freeShipping: true },
  { externalId: "MLB70600602", brand: "lg", title: "Smart TV LG 55\" 4K UHD 55UR8750PSA ThinQ AI WebOS", price: 2699, originalPrice: 3499, image: "https://http2.mlstatic.com/D_Q_NP_2X_705266-MLA95938596400_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600602", category: "TVs", rating: 4.6, reviews: 12000, sales: 55000, freeShipping: true },
  { externalId: "MLB70600603", brand: "tcl", title: "Smart TV TCL 50\" 4K UHD Google TV 50P755 HDR10 Dolby Vision", price: 1999, originalPrice: 2599, image: "https://http2.mlstatic.com/D_Q_NP_2X_702929-MLA99465492694_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600603", category: "TVs", rating: 4.4, reviews: 8500, sales: 42000, freeShipping: true },
  { externalId: "MLB70600604", brand: "samsung", title: "Smart TV Samsung 75\" Crystal UHD 4K 75CU8000 Dynamic Crystal Color", price: 5499, originalPrice: 6999, image: "https://http2.mlstatic.com/D_Q_NP_2X_913386-MLA99989046449_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600604", category: "TVs", rating: 4.7, reviews: 4200, sales: 16000, freeShipping: true },
  { externalId: "MLB70600605", brand: "lg", title: "Smart TV LG OLED 55\" evo 4K OLED55C3PSA 120Hz Dolby Vision Atmos", price: 4999, originalPrice: 6499, image: "https://http2.mlstatic.com/D_Q_NP_2X_705266-MLA95938596400_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600605", category: "TVs", rating: 4.9, reviews: 9200, sales: 38000, freeShipping: true },
  { externalId: "MLB70600606", brand: "tcl", title: "Smart TV TCL 32\" HD Android TV 32S5400AF HDR Bluetooth", price: 999, originalPrice: 1299, image: "https://http2.mlstatic.com/D_Q_NP_2X_702929-MLA99465492694_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600606", category: "TVs", rating: 4.3, reviews: 22000, sales: 105000, freeShipping: true },
  { externalId: "MLB70600607", brand: "hisense", title: "Smart TV Hisense 50\" 4K ULED 50U6K Quantum Dot Google TV", price: 2299, originalPrice: 2999, image: "https://http2.mlstatic.com/D_Q_NP_2X_882487-MLA92677639078_092025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600607", category: "TVs", rating: 4.4, reviews: 3800, sales: 17000, freeShipping: true },
  { externalId: "MLB70600608", brand: "samsung", title: "Smart TV Samsung 43\" Full HD 43T5300 HDR Tizen Wi-Fi", price: 1599, originalPrice: 1999, image: "https://http2.mlstatic.com/D_Q_NP_2X_913386-MLA99989046449_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600608", category: "TVs", rating: 4.4, reviews: 18000, sales: 82000, freeShipping: true },
  { externalId: "MLB70600609", brand: "aoc", title: "Smart TV AOC Roku TV 43\" Full HD 43S5135 Dolby Digital", price: 1499, originalPrice: 1899, image: "https://http2.mlstatic.com/D_Q_NP_2X_702929-MLA99465492694_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600609", category: "TVs", rating: 4.2, reviews: 5600, sales: 26000, freeShipping: true },
  { externalId: "MLB70600610", brand: "lg", title: "Smart TV LG 65\" 4K NanoCell 65NANO77SRA ThinQ AI WebOS 23", price: 3799, originalPrice: 4699, image: "https://http2.mlstatic.com/D_Q_NP_2X_705266-MLA95938596400_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70600610", category: "TVs", rating: 4.6, reviews: 6400, sales: 29000, freeShipping: true },

  // ──────────────────────────────────────────────────────
  // ESPORTES (9 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB18679676", brand: "nike", title: "Tênis Nike Court Vision Low Next Nature Masculino", price: 599, originalPrice: 799, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB18679676", category: "Esportes", rating: 4.6, reviews: 12000, sales: 58000, freeShipping: true },
  // New esportes
  { externalId: "MLB70700701", brand: "nike", title: "Tênis Nike Revolution 7 Masculino Preto Running Amortecimento", price: 349, originalPrice: 499, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70700701", category: "Esportes", rating: 4.5, reviews: 18000, sales: 85000, freeShipping: true },
  { externalId: "MLB70700702", brand: "adidas", title: "Tênis Adidas Runfalcon 3.0 Masculino Preto/Branco Running", price: 279, originalPrice: 399, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70700702", category: "Esportes", rating: 4.4, reviews: 22000, sales: 110000, freeShipping: true },
  { externalId: "MLB70700703", brand: "olympikus", title: "Tênis Olympikus Corre 3 Masculino Preto Feetpad Running", price: 199, originalPrice: 279, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70700703", category: "Esportes", rating: 4.3, reviews: 35000, sales: 165000, freeShipping: true },
  { externalId: "MLB70700704", brand: "xiaomi", title: "Smartwatch Xiaomi Redmi Watch 4 GPS Bluetooth Tela AMOLED 1.97\" Preto", price: 399, originalPrice: 549, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70700704", category: "Esportes", rating: 4.5, reviews: 8700, sales: 42000, freeShipping: true },
  { externalId: "MLB70700705", brand: "apple", title: "Apple Watch SE 2ª Geração GPS 40mm Alumínio Meia-Noite", price: 2299, originalPrice: 2999, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70700705", category: "Esportes", rating: 4.8, reviews: 15000, sales: 65000, freeShipping: true },
  { externalId: "MLB70700706", brand: "vollo", title: "Esteira Elétrica Vollo VP500 Motor 2.0HP 12km/h Dobrável 120kg", price: 2499, originalPrice: 3299, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70700706", category: "Esportes", rating: 4.2, reviews: 3200, sales: 14000, freeShipping: true },
  { externalId: "MLB70700707", brand: "puma", title: "Tênis Puma Softride Sway Masculino Preto Running Softfoam+", price: 299, originalPrice: 449, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70700707", category: "Esportes", rating: 4.4, reviews: 9500, sales: 45000, freeShipping: true },
  { externalId: "MLB70700708", brand: "speedo", title: "Óculos de Natação Speedo Tornado Antiembaçante UV Preto", price: 89, originalPrice: 129, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70700708", category: "Esportes", rating: 4.3, reviews: 14000, sales: 68000, freeShipping: false },

  // ──────────────────────────────────────────────────────
  // BELEZA & CUIDADOS (8 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB70800801", brand: "dyson", title: "Dyson Airwrap Complete Modelador Multifuncional Nickel/Copper", price: 3499, originalPrice: 4299, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70800801", category: "Beleza", rating: 4.8, reviews: 5200, sales: 22000, freeShipping: true },
  { externalId: "MLB70800802", brand: "taiff", title: "Secador de Cabelo Taiff Unique Vis 2600W Motor AC Profissional", price: 299, originalPrice: 399, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70800802", category: "Beleza", rating: 4.6, reviews: 18000, sales: 85000, freeShipping: true },
  { externalId: "MLB70800803", brand: "philips", title: "Barbeador Elétrico Philips Shaver 3000 S3233/52 Seco e Molhado", price: 249, originalPrice: 349, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70800803", category: "Beleza", rating: 4.4, reviews: 12000, sales: 58000, freeShipping: true },
  { externalId: "MLB70800804", brand: "gama-italy", title: "Chapinha Prancha Gama Italy Eleganza 3D Titanium Digital 230°C", price: 199, originalPrice: 279, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70800804", category: "Beleza", rating: 4.5, reviews: 25000, sales: 120000, freeShipping: true },
  { externalId: "MLB70800805", brand: "braun", title: "Depilador Elétrico Braun Silk-épil 5 5-810 Wet & Dry Cordless", price: 399, originalPrice: 549, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70800805", category: "Beleza", rating: 4.3, reviews: 6800, sales: 32000, freeShipping: true },
  { externalId: "MLB70800806", brand: "oral-b", title: "Escova Elétrica Oral-B Vitality Pro Recarregável Timer 2min Branca", price: 179, originalPrice: 249, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70800806", category: "Beleza", rating: 4.6, reviews: 32000, sales: 150000, freeShipping: true },
  { externalId: "MLB70800807", brand: "wahl", title: "Máquina de Cortar Cabelo Wahl Home Cut Pro Bivolt 10 Pentes", price: 149, originalPrice: 199, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70800807", category: "Beleza", rating: 4.4, reviews: 28000, sales: 135000, freeShipping: true },
  { externalId: "MLB70800808", brand: "philips", title: "Aparador de Pelos Philips OneBlade QP2724/10 Seco e Molhado Preto", price: 159, originalPrice: 219, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70800808", category: "Beleza", rating: 4.5, reviews: 42000, sales: 200000, freeShipping: true },

  // ──────────────────────────────────────────────────────
  // LIVROS (5 products)
  // ──────────────────────────────────────────────────────
  { externalId: "MLB70900901", brand: null, title: "Box As Crônicas de Gelo e Fogo 5 Livros George R.R. Martin", price: 149, originalPrice: 249, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70900901", category: "Livros", rating: 4.9, reviews: 35000, sales: 180000, freeShipping: true },
  { externalId: "MLB70900902", brand: null, title: "O Poder do Hábito Charles Duhigg Capa Comum", price: 39, originalPrice: 59, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70900902", category: "Livros", rating: 4.7, reviews: 48000, sales: 250000, freeShipping: false },
  { externalId: "MLB70900903", brand: null, title: "Pai Rico Pai Pobre Robert Kiyosaki Edição Atualizada", price: 42, originalPrice: 65, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70900903", category: "Livros", rating: 4.7, reviews: 52000, sales: 280000, freeShipping: false },
  { externalId: "MLB70900904", brand: "amazon", title: "Kindle Paperwhite 16GB 2024 Tela 6.8\" Luz Ajustável À Prova d'Água", price: 549, originalPrice: 699, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70900904", category: "Livros", rating: 4.8, reviews: 22000, sales: 95000, freeShipping: true },
  { externalId: "MLB70900905", brand: null, title: "Box Harry Potter Coleção Completa 7 Livros J.K. Rowling", price: 179, originalPrice: 299, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB70900905", category: "Livros", rating: 4.9, reviews: 45000, sales: 220000, freeShipping: true },
]

export async function POST(req: NextRequest) {
  const denied = validateAdmin(req)
  if (denied) return denied

  try {
    const adapter = new MercadoLivreAdapter()
    const mlSource = await prisma.source.upsert({
      where: { slug: 'mercadolivre' },
      update: {},
      create: { name: 'Mercado Livre', slug: 'mercadolivre', status: 'ACTIVE', affiliateConfig: { affiliateId: '' } },
    })

    let upserted = 0
    const errors: string[] = []

    for (const p of ML_PRODUCTS) {
      try {
        const discount = p.originalPrice && p.originalPrice > p.price
          ? Math.round((1 - p.price / p.originalPrice) * 100) : 0
        const offerScore = Math.min(100, discount + 20)

        const listing = await prisma.listing.upsert({
          where: { sourceId_externalId: { sourceId: mlSource.id, externalId: p.externalId } },
          create: {
            sourceId: mlSource.id,
            externalId: p.externalId,
            rawTitle: p.title,
            rawBrand: p.brand ?? null,
            rawCategory: p.category,
            imageUrl: p.image,
            productUrl: p.url,
            availability: 'IN_STOCK',
            rating: p.rating,
            reviewsCount: p.reviews,
            salesCountEstimate: p.sales,
            rawPayloadJson: { seeded: true, collectedAt: new Date().toISOString() },
            lastSeenAt: new Date(),
          },
          update: {
            rawTitle: p.title,
            rawBrand: p.brand ?? null,
            rawCategory: p.category,
            imageUrl: p.image,
            rating: p.rating,
            reviewsCount: p.reviews,
            salesCountEstimate: p.sales,
            lastSeenAt: new Date(),
          },
        })

        const existingOffer = await prisma.offer.findFirst({
          where: { listingId: listing.id, isActive: true },
        })

        const affiliateUrl = adapter.buildAffiliateUrl(p.url)

        const offer = await prisma.offer.upsert({
          where: { id: existingOffer?.id ?? '' },
          create: {
            listingId: listing.id,
            currentPrice: p.price,
            originalPrice: p.originalPrice ?? null,
            isFreeShipping: p.freeShipping,
            affiliateUrl,
            isActive: true,
            offerScore,
          },
          update: {
            currentPrice: p.price,
            originalPrice: p.originalPrice ?? null,
            isFreeShipping: p.freeShipping,
            affiliateUrl,
            offerScore,
            lastSeenAt: new Date(),
          },
        })

        await prisma.priceSnapshot.create({
          data: { offerId: offer.id, price: p.price, originalPrice: p.originalPrice ?? null },
        })

        upserted++
      } catch (err) {
        errors.push(`${p.externalId}: falha ao processar`)
      }
    }

    return Response.json({ ok: true, upserted, total: ML_PRODUCTS.length, errors })
  } catch (err) {
    console.error("[seed] Error:", err)
    return Response.json({ error: 'Erro interno ao executar seed' }, { status: 500 })
  }
}
