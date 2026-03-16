// Pre-scraped ML product data for seed import (scraped 2026-03-16)
// This bypasses ML API restrictions by using pre-fetched data
// Categories match prisma/seed.ts slugs: celulares, eletronicos, informatica, casa, gamer, tv-audio

export interface SeedProduct {
  externalId: string
  title: string
  currentPrice: number
  productUrl: string
  imageUrl: string
  category: string
}

export const SEED_PRODUCTS: SeedProduct[] = [
  // ═══════ CELULARES ═══════
  { externalId: "MLB62112970", title: "Smartphone Realme Note 70s 128gb 4gb Ram - Dourado", currentPrice: 777, productUrl: "https://www.mercadolivre.com.br/smartphone-realme-note-70s-128gb-4gb-ram-dourado/p/MLB62112970", imageUrl: "http://http2.mlstatic.com/D_663989-MLA97768376032_112025-C.jpg", category: "celulares" },
  { externalId: "MLB41541670", title: "Smartphone Motorola Moto G35 5g 128gb 12gb Ram", currentPrice: 899, productUrl: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g35-5g-128gb-12gb-4gb-ram8gb-ram-boost-e-camera-50mp-com-ai-nfc-tela-67-com-superbrilho-verde-vegan-leather/p/MLB41541670", imageUrl: "http://http2.mlstatic.com/D_983786-MLA99479656582_112025-C.jpg", category: "celulares" },
  { externalId: "MLB51876596", title: "Celular Infinix Smart 10 128gb 4gb Ram", currentPrice: 638, productUrl: "https://www.mercadolivre.com.br/celular-infinix-smart-10-dual-sim-one-tap-infinix-al-128gb-rom-4gb-ram-plata-titanio-altavoces-doubles-ip64-screalla-de-120hz-bluetooth/p/MLB51876596", imageUrl: "http://http2.mlstatic.com/D_733990-MLA100010746011_122025-C.jpg", category: "celulares" },
  { externalId: "MLB56327005", title: "Smartphone Infinix Smart 10 4gb Ram 256gb", currentPrice: 699.9, productUrl: "https://www.mercadolivre.com.br/smartphone-infinix-smart-10-4gb-ram-256gb-cmera-8mp-ia-tela-667-hd-120hz-bateria-5000mah-processador-t7250-android-15-go-dual-chip-preto/p/MLB56327005", imageUrl: "http://http2.mlstatic.com/D_964227-MLA100071062557_122025-C.jpg", category: "celulares" },

  // ═══════ ELETRONICOS (smartwatch/wearables) ═══════
  { externalId: "MLB37897245", title: "Samsung Galaxy Watch7 40mm BT Galaxy AI - Verde", currentPrice: 1197.92, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-watch7-smartwatch-40mm-bt-galaxy-ai-caixa-verde-pulseira-verde-bisel-verde-desenho-da-pulseira-na/p/MLB37897245", imageUrl: "http://http2.mlstatic.com/D_901427-MLA100391748595_122025-C.jpg", category: "eletronicos" },
  { externalId: "MLB37897247", title: "Samsung Galaxy Watch7 44mm BT Galaxy AI - Prata", currentPrice: 1262, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-watch7-smartwatch-44mm-bt-galaxy-ai-prata/p/MLB37897247", imageUrl: "http://http2.mlstatic.com/D_817841-MLA96419513000_102025-C.jpg", category: "eletronicos" },
  { externalId: "MLB38058572", title: "Samsung Galaxy Watch7 44mm BT Galaxy AI - Verde", currentPrice: 1190, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-watch7-smartwatch-44mm-bt-galaxy-ai-verde/p/MLB38058572", imageUrl: "http://http2.mlstatic.com/D_906643-MLA100013270877_122025-C.jpg", category: "eletronicos" },
  { externalId: "MLB38058646", title: "Samsung Galaxy Watch7 40mm BT Galaxy AI - Creme", currentPrice: 1099, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-watch7-smartwatch-40mm-bt-galaxy-ai-caixa-creme-pulseira-creme-bisel-creme-desenho-da-pulseira-na/p/MLB38058646", imageUrl: "http://http2.mlstatic.com/D_640435-MLA99931733404_122025-C.jpg", category: "eletronicos" },

  // ═══════ INFORMATICA (tablets) ═══════
  { externalId: "MLB31541424", title: "Positivo Vision Tab 10 4gb Ram 128gb Com Capa Teclado", currentPrice: 939, productUrl: "https://www.mercadolivre.com.br/positivo-vision-tab-10-t3010-4gb-ram-128gb-com-capa-teclado-octa-core-5-13mp-bateria-6000mah-tela-101-hd-wifi-ac-e-4g-full-lamination-preto/p/MLB31541424", imageUrl: "http://http2.mlstatic.com/D_703910-MLA99998133755_112025-C.jpg", category: "informatica" },
  { externalId: "MLB56554577", title: "Tablet Lenovo Idea Tab 8gb Ram 128gb 11pol 2.5K", currentPrice: 1983.47, productUrl: "https://www.mercadolivre.com.br/tablet-lenovo-idea-tab-8gb-ram-128gb-11-25k-90hz-android-15-wi-fi-com-caneta-e-capa-zafr0856br/p/MLB56554577", imageUrl: "http://http2.mlstatic.com/D_786165-MLA104009600019_012026-C.jpg", category: "informatica" },
  { externalId: "MLB63783529", title: "Samsung Galaxy Tab A11+ 5g 6gb 128gb Cinza", currentPrice: 1567, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-tab-a11-5g-6gb-128gb-cinza/p/MLB63783529", imageUrl: "http://http2.mlstatic.com/D_909134-MLA107202450672_032026-C.jpg", category: "informatica" },
  { externalId: "MLB54115375", title: "Samsung Galaxy Tab S10 Lite WiFi 128gb 6gb Ram", currentPrice: 2545.28, productUrl: "https://www.mercadolivre.com.br/tablet-samsung-galaxy-tab-s10-lite-wifi-128gb-6gb-ram-tela-109-s-pen-e-capa-smartbook-cover-inclusas-vermelho/p/MLB54115375", imageUrl: "http://http2.mlstatic.com/D_836786-MLA99945010395_112025-C.jpg", category: "informatica" },

  // ═══════ CASA (air fryers) ═══════
  { externalId: "MLB42193461", title: "Air Fryer Philco 9L 2000W Cesto Quadrado Gold", currentPrice: 365, productUrl: "https://www.mercadolivre.com.br/air-fryer-philco-9l-2000w-cesto-quadrado-gold-paf90b-cor-preto/p/MLB42193461", imageUrl: "http://http2.mlstatic.com/D_610301-MLA88963661475_072025-C.jpg", category: "casa" },
  { externalId: "MLB35470140", title: "Fritadeira Black Perform 4,5L Oster", currentPrice: 260, productUrl: "https://www.mercadolivre.com.br/fritadeira-black-perform-45l-oster-ofrt510/p/MLB35470140", imageUrl: "http://http2.mlstatic.com/D_960911-MLA99927327361_112025-C.jpg", category: "casa" },
  { externalId: "MLB29805599", title: "Air Fryer Britanica 4,2L 1500W", currentPrice: 320, productUrl: "https://www.mercadolivre.com.br/air-fryer-britnia-42l-dura-mais-1500w-bfr38-220v/p/MLB29805599", imageUrl: "http://http2.mlstatic.com/D_854101-MLA84848239827_052025-C.jpg", category: "casa" },
  { externalId: "MLB51032488", title: "Air Fryer 4,5L Widemax Midea 1500W", currentPrice: 279, productUrl: "https://www.mercadolivre.com.br/fritadeira-air-fryer-45l-widemax-com-interior-de-aluminio-1500w-midea/p/MLB51032488", imageUrl: "http://http2.mlstatic.com/D_733418-MLA99504461002_112025-C.jpg", category: "casa" },

  // ═══════ GAMER (PlayStation) ═══════
  { externalId: "MLB57081243", title: "PlayStation 5 Slim Digital + Astro Bot + Gran Turismo 7", currentPrice: 3689.92, productUrl: "https://www.mercadolivre.com.br/console-playstation5-slim-digital-pacote-astro-bot-e-gran-turismo-7-branco/p/MLB57081243", imageUrl: "http://http2.mlstatic.com/D_658949-MLA97327917067_112025-C.jpg", category: "gamer" },
  { externalId: "MLB57083347", title: "PlayStation 5 Slim Disc + Astro Bot + Gran Turismo 7", currentPrice: 4109.99, productUrl: "https://www.mercadolivre.com.br/console-playstation5-slim-disk-pacote-astro-bot-e-gran-turismo-7-branco/p/MLB57083347", imageUrl: "http://http2.mlstatic.com/D_945456-MLA99456386724_112025-C.jpg", category: "gamer" },
  { externalId: "MLB41975964", title: "Sony PlayStation 5 Pro 2TB Digital 2024", currentPrice: 6179, productUrl: "https://www.mercadolivre.com.br/sony-playstation-5-pro-cfi-7020-2tb-digital-cor-branco-2024/p/MLB41975964", imageUrl: "http://http2.mlstatic.com/D_727482-MLA99962144409_112025-C.jpg", category: "gamer" },
  { externalId: "MLB31067313", title: "PlayStation 5 Slim 1TB Midia Fisica", currentPrice: 3949, productUrl: "https://www.mercadolivre.com.br/playstation-5-slim-cor-branco-1-tb-verso-midia-fisica/p/MLB31067313", imageUrl: "http://http2.mlstatic.com/D_846325-MLA99503539342_112025-C.jpg", category: "gamer" },

  // ═══════ TV-AUDIO (fones/caixas) ═══════
  { externalId: "MLB22859498", title: "JBL Tune 520BT Fone Bluetooth Sem Fio", currentPrice: 179.99, productUrl: "https://www.mercadolivre.com.br/fone-de-ouvido-on-ear-sem-fio-jbl-tune-520bt-azul/p/MLB22859498", imageUrl: "http://http2.mlstatic.com/D_670854-MLA74271642415_012024-C.jpg", category: "tv-audio" },
  { externalId: "MLB20805742", title: "JBL Flip 6 Caixa de Som Bluetooth Portatil", currentPrice: 599, productUrl: "https://www.mercadolivre.com.br/caixa-de-som-bluetooth-porttil-jbl-flip-6-preto/p/MLB20805742", imageUrl: "http://http2.mlstatic.com/D_949296-MLA72472898773_102023-C.jpg", category: "tv-audio" },
  { externalId: "MLB27420886", title: "JBL Charge 5 Caixa de Som Bluetooth 40W", currentPrice: 899, productUrl: "https://www.mercadolivre.com.br/caixa-de-som-bluetooth-jbl-charge-5-cor-preto/p/MLB27420886", imageUrl: "http://http2.mlstatic.com/D_682284-MLA72512684757_102023-C.jpg", category: "tv-audio" },
  { externalId: "MLB19601782", title: "Fone Bluetooth Samsung Galaxy Buds FE", currentPrice: 299.99, productUrl: "https://www.mercadolivre.com.br/fone-de-ouvido-in-ear-sem-fio-samsung-galaxy-buds-fe-grafite/p/MLB19601782", imageUrl: "http://http2.mlstatic.com/D_862447-MLA71741584735_092023-C.jpg", category: "tv-audio" },

  // ═══════ NOTEBOOKS ═══════
  { externalId: "MLB37548230", title: "Notebook Lenovo IdeaPad 1 15.6 Ryzen 5 8gb 256gb SSD", currentPrice: 2399, productUrl: "https://www.mercadolivre.com.br/notebook-lenovo-ideapad-1-15amn7-ryzen-5-7520u-8gb-256gb-ssd-156-full-hd-linux/p/MLB37548230", imageUrl: "http://http2.mlstatic.com/D_756920-MLA75620068137_042024-C.jpg", category: "notebooks" },
  { externalId: "MLB35891245", title: "Notebook Samsung Book 15.6 Intel Core i5 8gb 256gb", currentPrice: 2799, productUrl: "https://www.mercadolivre.com.br/notebook-samsung-book-np550-156-intel-core-i5-8gb-256gb-ssd/p/MLB35891245", imageUrl: "http://http2.mlstatic.com/D_854923-MLA74560340121_022024-C.jpg", category: "notebooks" },
  { externalId: "MLB38924110", title: "Notebook Acer Aspire 5 15.6 Ryzen 7 16gb 512gb SSD", currentPrice: 3299, productUrl: "https://www.mercadolivre.com.br/notebook-acer-aspire-5-a515-ryzen-7-16gb-512gb-ssd-156/p/MLB38924110", imageUrl: "http://http2.mlstatic.com/D_810394-MLA75819082367_042024-C.jpg", category: "notebooks" },

  // ═══════ ESPORTES ═══════
  { externalId: "MLB25319780", title: "Tenis Nike Revolution 6 Masculino", currentPrice: 249.99, productUrl: "https://www.mercadolivre.com.br/tenis-nike-revolution-6-masculino-cor-preto-branco/p/MLB25319780", imageUrl: "http://http2.mlstatic.com/D_930124-MLA72310082987_102023-C.jpg", category: "esportes" },
  { externalId: "MLB21458903", title: "Garrafa Termica Stanley 1,2L Adventure", currentPrice: 289.90, productUrl: "https://www.mercadolivre.com.br/garrafa-termica-stanley-adventure-12l-cor-verde/p/MLB21458903", imageUrl: "http://http2.mlstatic.com/D_853412-MLA72480162859_102023-C.jpg", category: "esportes" },
]
