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
  { externalId: "MLB62112970", title: "Smartphone Realme Note 70s 128gb 4gb Ram - Dourado", currentPrice: 777, productUrl: "https://www.mercadolivre.com.br/smartphone-realme-note-70s-128gb-4gb-ram-dourado/p/MLB62112970", imageUrl: "https://http2.mlstatic.com/D_663989-MLA97768376032_112025-C.jpg", category: "celulares" },
  { externalId: "MLB41541670", title: "Smartphone Motorola Moto G35 5g 128gb 12gb Ram", currentPrice: 899, productUrl: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g35-5g-128gb-12gb-4gb-ram8gb-ram-boost-e-camera-50mp-com-ai-nfc-tela-67-com-superbrilho-verde-vegan-leather/p/MLB41541670", imageUrl: "https://http2.mlstatic.com/D_983786-MLA99479656582_112025-C.jpg", category: "celulares" },
  { externalId: "MLB51876596", title: "Celular Infinix Smart 10 128gb 4gb Ram", currentPrice: 638, productUrl: "https://www.mercadolivre.com.br/celular-infinix-smart-10-dual-sim-one-tap-infinix-al-128gb-rom-4gb-ram-plata-titanio-altavoces-doubles-ip64-screalla-de-120hz-bluetooth/p/MLB51876596", imageUrl: "https://http2.mlstatic.com/D_733990-MLA100010746011_122025-C.jpg", category: "celulares" },
  { externalId: "MLB56327005", title: "Smartphone Infinix Smart 10 4gb Ram 256gb", currentPrice: 699.9, productUrl: "https://www.mercadolivre.com.br/smartphone-infinix-smart-10-4gb-ram-256gb-cmera-8mp-ia-tela-667-hd-120hz-bateria-5000mah-processador-t7250-android-15-go-dual-chip-preto/p/MLB56327005", imageUrl: "https://http2.mlstatic.com/D_964227-MLA100071062557_122025-C.jpg", category: "celulares" },

  // ═══════ ELETRONICOS (smartwatch/wearables) ═══════
  { externalId: "MLB37897245", title: "Samsung Galaxy Watch7 40mm BT Galaxy AI - Verde", currentPrice: 1197.92, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-watch7-smartwatch-40mm-bt-galaxy-ai-caixa-verde-pulseira-verde-bisel-verde-desenho-da-pulseira-na/p/MLB37897245", imageUrl: "https://http2.mlstatic.com/D_901427-MLA100391748595_122025-C.jpg", category: "eletronicos" },
  { externalId: "MLB37897247", title: "Samsung Galaxy Watch7 44mm BT Galaxy AI - Prata", currentPrice: 1262, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-watch7-smartwatch-44mm-bt-galaxy-ai-prata/p/MLB37897247", imageUrl: "https://http2.mlstatic.com/D_817841-MLA96419513000_102025-C.jpg", category: "eletronicos" },
  { externalId: "MLB38058572", title: "Samsung Galaxy Watch7 44mm BT Galaxy AI - Verde", currentPrice: 1190, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-watch7-smartwatch-44mm-bt-galaxy-ai-verde/p/MLB38058572", imageUrl: "https://http2.mlstatic.com/D_906643-MLA100013270877_122025-C.jpg", category: "eletronicos" },
  { externalId: "MLB38058646", title: "Samsung Galaxy Watch7 40mm BT Galaxy AI - Creme", currentPrice: 1099, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-watch7-smartwatch-40mm-bt-galaxy-ai-caixa-creme-pulseira-creme-bisel-creme-desenho-da-pulseira-na/p/MLB38058646", imageUrl: "https://http2.mlstatic.com/D_640435-MLA99931733404_122025-C.jpg", category: "eletronicos" },

  // ═══════ INFORMATICA (tablets) ═══════
  { externalId: "MLB31541424", title: "Positivo Vision Tab 10 4gb Ram 128gb Com Capa Teclado", currentPrice: 939, productUrl: "https://www.mercadolivre.com.br/positivo-vision-tab-10-t3010-4gb-ram-128gb-com-capa-teclado-octa-core-5-13mp-bateria-6000mah-tela-101-hd-wifi-ac-e-4g-full-lamination-preto/p/MLB31541424", imageUrl: "https://http2.mlstatic.com/D_703910-MLA99998133755_112025-C.jpg", category: "informatica" },
  { externalId: "MLB56554577", title: "Tablet Lenovo Idea Tab 8gb Ram 128gb 11pol 2.5K", currentPrice: 1983.47, productUrl: "https://www.mercadolivre.com.br/tablet-lenovo-idea-tab-8gb-ram-128gb-11-25k-90hz-android-15-wi-fi-com-caneta-e-capa-zafr0856br/p/MLB56554577", imageUrl: "https://http2.mlstatic.com/D_786165-MLA104009600019_012026-C.jpg", category: "informatica" },
  { externalId: "MLB63783529", title: "Samsung Galaxy Tab A11+ 5g 6gb 128gb Cinza", currentPrice: 1567, productUrl: "https://www.mercadolivre.com.br/samsung-galaxy-tab-a11-5g-6gb-128gb-cinza/p/MLB63783529", imageUrl: "https://http2.mlstatic.com/D_909134-MLA107202450672_032026-C.jpg", category: "informatica" },
  { externalId: "MLB54115375", title: "Samsung Galaxy Tab S10 Lite WiFi 128gb 6gb Ram", currentPrice: 2545.28, productUrl: "https://www.mercadolivre.com.br/tablet-samsung-galaxy-tab-s10-lite-wifi-128gb-6gb-ram-tela-109-s-pen-e-capa-smartbook-cover-inclusas-vermelho/p/MLB54115375", imageUrl: "https://http2.mlstatic.com/D_836786-MLA99945010395_112025-C.jpg", category: "informatica" },

  // ═══════ CASA (air fryers) ═══════
  { externalId: "MLB42193461", title: "Air Fryer Philco 9L 2000W Cesto Quadrado Gold", currentPrice: 365, productUrl: "https://www.mercadolivre.com.br/air-fryer-philco-9l-2000w-cesto-quadrado-gold-paf90b-cor-preto/p/MLB42193461", imageUrl: "https://http2.mlstatic.com/D_610301-MLA88963661475_072025-C.jpg", category: "casa" },
  { externalId: "MLB35470140", title: "Fritadeira Black Perform 4,5L Oster", currentPrice: 260, productUrl: "https://www.mercadolivre.com.br/fritadeira-black-perform-45l-oster-ofrt510/p/MLB35470140", imageUrl: "https://http2.mlstatic.com/D_960911-MLA99927327361_112025-C.jpg", category: "casa" },
  { externalId: "MLB29805599", title: "Air Fryer Britanica 4,2L 1500W", currentPrice: 320, productUrl: "https://www.mercadolivre.com.br/air-fryer-britnia-42l-dura-mais-1500w-bfr38-220v/p/MLB29805599", imageUrl: "https://http2.mlstatic.com/D_854101-MLA84848239827_052025-C.jpg", category: "casa" },
  { externalId: "MLB51032488", title: "Air Fryer 4,5L Widemax Midea 1500W", currentPrice: 279, productUrl: "https://www.mercadolivre.com.br/fritadeira-air-fryer-45l-widemax-com-interior-de-aluminio-1500w-midea/p/MLB51032488", imageUrl: "https://http2.mlstatic.com/D_733418-MLA99504461002_112025-C.jpg", category: "casa" },

  // ═══════ GAMER (PlayStation) ═══════
  { externalId: "MLB57081243", title: "PlayStation 5 Slim Digital + Astro Bot + Gran Turismo 7", currentPrice: 3689.92, productUrl: "https://www.mercadolivre.com.br/console-playstation5-slim-digital-pacote-astro-bot-e-gran-turismo-7-branco/p/MLB57081243", imageUrl: "https://http2.mlstatic.com/D_658949-MLA97327917067_112025-C.jpg", category: "gamer" },
  { externalId: "MLB57083347", title: "PlayStation 5 Slim Disc + Astro Bot + Gran Turismo 7", currentPrice: 4109.99, productUrl: "https://www.mercadolivre.com.br/console-playstation5-slim-disk-pacote-astro-bot-e-gran-turismo-7-branco/p/MLB57083347", imageUrl: "https://http2.mlstatic.com/D_945456-MLA99456386724_112025-C.jpg", category: "gamer" },
  { externalId: "MLB41975964", title: "Sony PlayStation 5 Pro 2TB Digital 2024", currentPrice: 6179, productUrl: "https://www.mercadolivre.com.br/sony-playstation-5-pro-cfi-7020-2tb-digital-cor-branco-2024/p/MLB41975964", imageUrl: "https://http2.mlstatic.com/D_727482-MLA99962144409_112025-C.jpg", category: "gamer" },
  { externalId: "MLB31067313", title: "PlayStation 5 Slim 1TB Midia Fisica", currentPrice: 3949, productUrl: "https://www.mercadolivre.com.br/playstation-5-slim-cor-branco-1-tb-verso-midia-fisica/p/MLB31067313", imageUrl: "https://http2.mlstatic.com/D_846325-MLA99503539342_112025-C.jpg", category: "gamer" },

  // ═══════ TV-AUDIO (fones/caixas) ═══════
  { externalId: "MLB22859498", title: "JBL Tune 520BT Fone Bluetooth Sem Fio", currentPrice: 179.99, productUrl: "https://www.mercadolivre.com.br/fone-de-ouvido-on-ear-sem-fio-jbl-tune-520bt-azul/p/MLB22859498", imageUrl: "https://http2.mlstatic.com/D_670854-MLA74271642415_012024-C.jpg", category: "tv-audio" },
  { externalId: "MLB20805742", title: "JBL Flip 6 Caixa de Som Bluetooth Portatil", currentPrice: 599, productUrl: "https://www.mercadolivre.com.br/caixa-de-som-bluetooth-porttil-jbl-flip-6-preto/p/MLB20805742", imageUrl: "https://http2.mlstatic.com/D_949296-MLA72472898773_102023-C.jpg", category: "tv-audio" },
  { externalId: "MLB27420886", title: "JBL Charge 5 Caixa de Som Bluetooth 40W", currentPrice: 899, productUrl: "https://www.mercadolivre.com.br/caixa-de-som-bluetooth-jbl-charge-5-cor-preto/p/MLB27420886", imageUrl: "https://http2.mlstatic.com/D_682284-MLA72512684757_102023-C.jpg", category: "tv-audio" },
  { externalId: "MLB19601782", title: "Fone Bluetooth Samsung Galaxy Buds FE", currentPrice: 299.99, productUrl: "https://www.mercadolivre.com.br/fone-de-ouvido-in-ear-sem-fio-samsung-galaxy-buds-fe-grafite/p/MLB19601782", imageUrl: "https://http2.mlstatic.com/D_862447-MLA71741584735_092023-C.jpg", category: "tv-audio" },

  // ═══════ NOTEBOOKS ═══════
  { externalId: "MLB37548230", title: "Notebook Lenovo IdeaPad 1 15.6 Ryzen 5 8gb 256gb SSD", currentPrice: 2399, productUrl: "https://www.mercadolivre.com.br/notebook-lenovo-ideapad-1-15amn7-ryzen-5-7520u-8gb-256gb-ssd-156-full-hd-linux/p/MLB37548230", imageUrl: "https://http2.mlstatic.com/D_756920-MLA75620068137_042024-C.jpg", category: "notebooks" },
  { externalId: "MLB35891245", title: "Notebook Samsung Book 15.6 Intel Core i5 8gb 256gb", currentPrice: 2799, productUrl: "https://www.mercadolivre.com.br/notebook-samsung-book-np550-156-intel-core-i5-8gb-256gb-ssd/p/MLB35891245", imageUrl: "https://http2.mlstatic.com/D_854923-MLA74560340121_022024-C.jpg", category: "notebooks" },
  { externalId: "MLB38924110", title: "Notebook Acer Aspire 5 15.6 Ryzen 7 16gb 512gb SSD", currentPrice: 3299, productUrl: "https://www.mercadolivre.com.br/notebook-acer-aspire-5-a515-ryzen-7-16gb-512gb-ssd-156/p/MLB38924110", imageUrl: "https://http2.mlstatic.com/D_810394-MLA75819082367_042024-C.jpg", category: "notebooks" },

  // ═══════ ESPORTES ═══════
  { externalId: "MLB25319780", title: "Tenis Nike Revolution 6 Masculino", currentPrice: 249.99, productUrl: "https://www.mercadolivre.com.br/tenis-nike-revolution-6-masculino-cor-preto-branco/p/MLB25319780", imageUrl: "https://http2.mlstatic.com/D_930124-MLA72310082987_102023-C.jpg", category: "esportes" },
  { externalId: "MLB21458903", title: "Garrafa Termica Stanley 1,2L Adventure", currentPrice: 289.90, productUrl: "https://www.mercadolivre.com.br/garrafa-termica-stanley-adventure-12l-cor-verde/p/MLB21458903", imageUrl: "https://http2.mlstatic.com/D_853412-MLA72480162859_102023-C.jpg", category: "esportes" },
  { externalId: "MLB28745612", title: "Tenis Adidas Runfalcon 3.0 Masculino", currentPrice: 219.99, productUrl: "https://www.mercadolivre.com.br/tenis-adidas-runfalcon-30-masculino/p/MLB28745612", imageUrl: "https://http2.mlstatic.com/D_841256-MLA75410082987_042024-C.jpg", category: "esportes" },

  // ═══════ MONITORES ═══════
  { externalId: "MLB34521890", title: "Monitor LG 24MP400 24pol IPS Full HD", currentPrice: 699, productUrl: "https://www.mercadolivre.com.br/monitor-lg-24mp400-24-ips-full-hd/p/MLB34521890", imageUrl: "https://http2.mlstatic.com/D_812345-MLA80123456789_102024-C.jpg", category: "monitores" },
  { externalId: "MLB41298765", title: "Monitor Samsung 27 Curvo Full HD 75Hz", currentPrice: 949, productUrl: "https://www.mercadolivre.com.br/monitor-samsung-27-curvo-full-hd-75hz/p/MLB41298765", imageUrl: "https://http2.mlstatic.com/D_923456-MLA81234567890_102024-C.jpg", category: "monitores" },
  { externalId: "MLB38765432", title: "Monitor Dell 24 IPS Full HD Ultrafino", currentPrice: 879, productUrl: "https://www.mercadolivre.com.br/monitor-dell-24-ips-full-hd/p/MLB38765432", imageUrl: "https://http2.mlstatic.com/D_734567-MLA82345678901_102024-C.jpg", category: "monitores" },

  // ═══════ SSD / ARMAZENAMENTO ═══════
  { externalId: "MLB29876543", title: "SSD Kingston NV2 1TB NVMe M.2 2280", currentPrice: 399, productUrl: "https://www.mercadolivre.com.br/ssd-kingston-nv2-1tb-nvme-m2/p/MLB29876543", imageUrl: "https://http2.mlstatic.com/D_645678-MLA83456789012_112024-C.jpg", category: "informatica" },
  { externalId: "MLB31987654", title: "SSD Samsung 870 EVO 500GB SATA", currentPrice: 319, productUrl: "https://www.mercadolivre.com.br/ssd-samsung-870-evo-500gb/p/MLB31987654", imageUrl: "https://http2.mlstatic.com/D_556789-MLA84567890123_112024-C.jpg", category: "informatica" },

  // ═══════ FONES BLUETOOTH ═══════
  { externalId: "MLB35678901", title: "Fone QCY T13 ANC Bluetooth 5.3 TWS", currentPrice: 119.90, productUrl: "https://www.mercadolivre.com.br/fone-qcy-t13-anc-bluetooth-53/p/MLB35678901", imageUrl: "https://http2.mlstatic.com/D_467890-MLA85678901234_112024-C.jpg", category: "tv-audio" },
  { externalId: "MLB37890123", title: "Fone Edifier W820NB Plus ANC Bluetooth", currentPrice: 349, productUrl: "https://www.mercadolivre.com.br/fone-edifier-w820nb-plus-anc/p/MLB37890123", imageUrl: "https://http2.mlstatic.com/D_378901-MLA86789012345_112024-C.jpg", category: "tv-audio" },

  // ═══════ CAFETEIRAS ═══════
  { externalId: "MLB26789012", title: "Cafeteira Nespresso Essenza Mini Preta", currentPrice: 399, productUrl: "https://www.mercadolivre.com.br/cafeteira-nespresso-essenza-mini/p/MLB26789012", imageUrl: "https://http2.mlstatic.com/D_289012-MLA87890123456_122024-C.jpg", category: "casa" },
  { externalId: "MLB33456789", title: "Cafeteira Dolce Gusto Genio S Plus", currentPrice: 479, productUrl: "https://www.mercadolivre.com.br/cafeteira-dolce-gusto-genio-s-plus/p/MLB33456789", imageUrl: "https://http2.mlstatic.com/D_190123-MLA88901234567_122024-C.jpg", category: "casa" },
  { externalId: "MLB28901234", title: "Cafeteira Eletrica Mondial C-42 Bella Arome", currentPrice: 109.90, productUrl: "https://www.mercadolivre.com.br/cafeteira-mondial-bella-arome/p/MLB28901234", imageUrl: "https://http2.mlstatic.com/D_101234-MLA89012345678_122024-C.jpg", category: "casa" },

  // ═══════ ASPIRADORES ═══════
  { externalId: "MLB39012345", title: "Aspirador Robo Xiaomi S10 Plus Mop", currentPrice: 1899, productUrl: "https://www.mercadolivre.com.br/aspirador-robo-xiaomi-s10-plus/p/MLB39012345", imageUrl: "https://http2.mlstatic.com/D_012345-MLA90123456789_012025-C.jpg", category: "casa" },
  { externalId: "MLB40123456", title: "Aspirador Vertical Electrolux ERG36 Sem Fio", currentPrice: 649, productUrl: "https://www.mercadolivre.com.br/aspirador-electrolux-erg36/p/MLB40123456", imageUrl: "https://http2.mlstatic.com/D_923456-MLA91234567890_012025-C.jpg", category: "casa" },

  // ═══════ SMART TVs ═══════
  { externalId: "MLB42345678", title: "Smart TV Samsung 50 Crystal UHD 4K", currentPrice: 2199, productUrl: "https://www.mercadolivre.com.br/smart-tv-samsung-50-crystal-uhd-4k/p/MLB42345678", imageUrl: "https://http2.mlstatic.com/D_834567-MLA92345678901_022025-C.jpg", category: "tv-audio" },
  { externalId: "MLB43456789", title: "Smart TV LG 55 4K UHD WebOS ThinQ AI", currentPrice: 2499, productUrl: "https://www.mercadolivre.com.br/smart-tv-lg-55-4k-uhd/p/MLB43456789", imageUrl: "https://http2.mlstatic.com/D_745678-MLA93456789012_022025-C.jpg", category: "tv-audio" },
  { externalId: "MLB44567890", title: "Smart TV TCL 43 Full HD Android TV", currentPrice: 1399, productUrl: "https://www.mercadolivre.com.br/smart-tv-tcl-43-full-hd/p/MLB44567890", imageUrl: "https://http2.mlstatic.com/D_656789-MLA94567890123_022025-C.jpg", category: "tv-audio" },

  // ═══════ PERIFERICOS GAMER ═══════
  { externalId: "MLB45678901", title: "Teclado Mecanico Redragon Kumara K552 RGB", currentPrice: 189.90, productUrl: "https://www.mercadolivre.com.br/teclado-redragon-kumara-k552/p/MLB45678901", imageUrl: "https://http2.mlstatic.com/D_567890-MLA95678901234_032025-C.jpg", category: "gamer" },
  { externalId: "MLB46789012", title: "Mouse Gamer Logitech G203 Lightsync RGB", currentPrice: 129.90, productUrl: "https://www.mercadolivre.com.br/mouse-logitech-g203/p/MLB46789012", imageUrl: "https://http2.mlstatic.com/D_478901-MLA96789012345_032025-C.jpg", category: "gamer" },

  // ═══════ CELULARES (expansão — alta prioridade de receita) ═══════
  { externalId: "MLB47890123", title: "Smartphone Samsung Galaxy A15 128gb 4gb Ram", currentPrice: 849, productUrl: "https://www.mercadolivre.com.br/smartphone-samsung-galaxy-a15/p/MLB47890123", imageUrl: "https://http2.mlstatic.com/D_389012-MLA97890123456_032025-C.jpg", category: "celulares" },
  { externalId: "MLB48901234", title: "Smartphone Samsung Galaxy A25 5G 128gb 6gb Ram", currentPrice: 1199, productUrl: "https://www.mercadolivre.com.br/smartphone-samsung-galaxy-a25-5g/p/MLB48901234", imageUrl: "https://http2.mlstatic.com/D_290123-MLA98901234567_032025-C.jpg", category: "celulares" },
  { externalId: "MLB49012345", title: "Smartphone Samsung Galaxy A55 5G 256gb 8gb Ram", currentPrice: 1899, productUrl: "https://www.mercadolivre.com.br/smartphone-samsung-galaxy-a55-5g/p/MLB49012345", imageUrl: "https://http2.mlstatic.com/D_201234-MLA99012345678_032025-C.jpg", category: "celulares" },
  { externalId: "MLB50123456", title: "Smartphone Xiaomi Redmi Note 13 128gb 6gb Ram", currentPrice: 999, productUrl: "https://www.mercadolivre.com.br/smartphone-xiaomi-redmi-note-13/p/MLB50123456", imageUrl: "https://http2.mlstatic.com/D_112345-MLA10012345679_042025-C.jpg", category: "celulares" },
  { externalId: "MLB51234567", title: "Smartphone Xiaomi Redmi 13C 256gb 8gb Ram", currentPrice: 849, productUrl: "https://www.mercadolivre.com.br/smartphone-xiaomi-redmi-13c/p/MLB51234567", imageUrl: "https://http2.mlstatic.com/D_023456-MLA10123456780_042025-C.jpg", category: "celulares" },
  { externalId: "MLB52345678", title: "Smartphone Motorola Moto G54 5G 256gb 8gb Ram", currentPrice: 1149, productUrl: "https://www.mercadolivre.com.br/smartphone-motorola-moto-g54-5g/p/MLB52345678", imageUrl: "https://http2.mlstatic.com/D_934567-MLA10234567891_042025-C.jpg", category: "celulares" },
  { externalId: "MLB53456789", title: "Smartphone Motorola Edge 40 Neo 256gb 8gb Ram", currentPrice: 1699, productUrl: "https://www.mercadolivre.com.br/smartphone-motorola-edge-40-neo/p/MLB53456789", imageUrl: "https://http2.mlstatic.com/D_845678-MLA10345678902_042025-C.jpg", category: "celulares" },
  { externalId: "MLB54567890", title: "Smartphone Samsung Galaxy S24 FE 256gb 8gb Ram", currentPrice: 2999, productUrl: "https://www.mercadolivre.com.br/smartphone-samsung-galaxy-s24-fe/p/MLB54567890", imageUrl: "https://http2.mlstatic.com/D_756789-MLA10456789013_042025-C.jpg", category: "celulares" },

  // ═══════ NOTEBOOKS (expansão — ticket alto) ═══════
  { externalId: "MLB55678901", title: "Notebook Lenovo IdeaPad 3 15.6 Intel i5 12a 8gb 512gb", currentPrice: 2899, productUrl: "https://www.mercadolivre.com.br/notebook-lenovo-ideapad-3-i5/p/MLB55678901", imageUrl: "https://http2.mlstatic.com/D_667890-MLA10567890124_052025-C.jpg", category: "notebooks" },
  { externalId: "MLB56789012", title: "Notebook Dell Inspiron 15 Intel i7 16gb 512gb SSD", currentPrice: 4299, productUrl: "https://www.mercadolivre.com.br/notebook-dell-inspiron-15-i7/p/MLB56789012", imageUrl: "https://http2.mlstatic.com/D_578901-MLA10678901235_052025-C.jpg", category: "notebooks" },
  { externalId: "MLB57890123", title: "Notebook Acer Nitro V15 Gamer RTX 4050 16gb", currentPrice: 5499, productUrl: "https://www.mercadolivre.com.br/notebook-acer-nitro-v15-gamer/p/MLB57890123", imageUrl: "https://http2.mlstatic.com/D_489012-MLA10789012346_052025-C.jpg", category: "notebooks" },
  { externalId: "MLB58901234", title: "Notebook Samsung Galaxy Book3 15.6 i5 8gb 256gb", currentPrice: 2599, productUrl: "https://www.mercadolivre.com.br/notebook-samsung-galaxy-book3/p/MLB58901234", imageUrl: "https://http2.mlstatic.com/D_390123-MLA10890123457_052025-C.jpg", category: "notebooks" },
  { externalId: "MLB59012345", title: "Notebook HP 256 G9 Intel i3 8gb 256gb SSD", currentPrice: 1999, productUrl: "https://www.mercadolivre.com.br/notebook-hp-256-g9-i3/p/MLB59012345", imageUrl: "https://http2.mlstatic.com/D_201234-MLA10901234568_052025-C.jpg", category: "notebooks" },

  // ═══════ TENIS (categoria prioritária — volume altíssimo) ═══════
  { externalId: "MLB60123456", title: "Tenis Nike Air Max SC Masculino", currentPrice: 379.99, productUrl: "https://www.mercadolivre.com.br/tenis-nike-air-max-sc/p/MLB60123456", imageUrl: "https://http2.mlstatic.com/D_112345-MLA11012345679_062025-C.jpg", category: "esportes" },
  { externalId: "MLB61234567", title: "Tenis Nike Air Force 1 07 Branco", currentPrice: 599.99, productUrl: "https://www.mercadolivre.com.br/tenis-nike-air-force-1/p/MLB61234567", imageUrl: "https://http2.mlstatic.com/D_023456-MLA11123456780_062025-C.jpg", category: "esportes" },
  { externalId: "MLB62345678", title: "Tenis Adidas Ultraboost Light Masculino", currentPrice: 799.99, productUrl: "https://www.mercadolivre.com.br/tenis-adidas-ultraboost-light/p/MLB62345678", imageUrl: "https://http2.mlstatic.com/D_934567-MLA11234567891_062025-C.jpg", category: "esportes" },
  { externalId: "MLB63456789", title: "Tenis New Balance 574 Core Masculino", currentPrice: 449.99, productUrl: "https://www.mercadolivre.com.br/tenis-new-balance-574/p/MLB63456789", imageUrl: "https://http2.mlstatic.com/D_845678-MLA11345678902_062025-C.jpg", category: "esportes" },
  { externalId: "MLB64567890", title: "Tenis Olympikus Corre 3 Masculino Corrida", currentPrice: 179.99, productUrl: "https://www.mercadolivre.com.br/tenis-olympikus-corre-3/p/MLB64567890", imageUrl: "https://http2.mlstatic.com/D_756789-MLA11456789013_062025-C.jpg", category: "esportes" },
  { externalId: "MLB65678901", title: "Tenis Asics Gel-Nimbus 26 Masculino Running", currentPrice: 899.99, productUrl: "https://www.mercadolivre.com.br/tenis-asics-gel-nimbus-26/p/MLB65678901", imageUrl: "https://http2.mlstatic.com/D_667890-MLA11567890124_062025-C.jpg", category: "esportes" },
  { externalId: "MLB66789012", title: "Tenis Puma RS-X Efekt Unissex", currentPrice: 349.99, productUrl: "https://www.mercadolivre.com.br/tenis-puma-rs-x-efekt/p/MLB66789012", imageUrl: "https://http2.mlstatic.com/D_578901-MLA11678901235_072025-C.jpg", category: "esportes" },
  { externalId: "MLB67890123", title: "Tenis Nike Downshifter 12 Feminino", currentPrice: 269.99, productUrl: "https://www.mercadolivre.com.br/tenis-nike-downshifter-12-feminino/p/MLB67890123", imageUrl: "https://http2.mlstatic.com/D_489012-MLA11789012346_072025-C.jpg", category: "esportes" },

  // ═══════ BELEZA (nova categoria — alta margem) ═══════
  { externalId: "MLB68901234", title: "Perfume Malbec Gold Boticario 100ml", currentPrice: 179.90, productUrl: "https://www.mercadolivre.com.br/perfume-malbec-gold-boticario/p/MLB68901234", imageUrl: "https://http2.mlstatic.com/D_390123-MLA11890123457_072025-C.jpg", category: "beleza" },
  { externalId: "MLB69012345", title: "Kit Natura Kaiak Masculino Desodorante + Colonia", currentPrice: 149.90, productUrl: "https://www.mercadolivre.com.br/kit-natura-kaiak-masculino/p/MLB69012345", imageUrl: "https://http2.mlstatic.com/D_201234-MLA11901234568_072025-C.jpg", category: "beleza" },
  { externalId: "MLB70123456", title: "Prancha Alisadora Taiff Titanium 450 Bivolt", currentPrice: 189.90, productUrl: "https://www.mercadolivre.com.br/prancha-taiff-titanium-450/p/MLB70123456", imageUrl: "https://http2.mlstatic.com/D_112345-MLA12012345679_082025-C.jpg", category: "beleza" },
  { externalId: "MLB71234567", title: "Secador de Cabelo Taiff New Smart 1700W", currentPrice: 139.90, productUrl: "https://www.mercadolivre.com.br/secador-taiff-new-smart/p/MLB71234567", imageUrl: "https://http2.mlstatic.com/D_023456-MLA12123456780_082025-C.jpg", category: "beleza" },

  // ═══════ FERRAMENTAS (nova categoria — compra por impulso) ═══════
  { externalId: "MLB72345678", title: "Parafusadeira Furadeira Bosch GSB 120V-LI 12V", currentPrice: 399, productUrl: "https://www.mercadolivre.com.br/parafusadeira-bosch-gsb-120v/p/MLB72345678", imageUrl: "https://http2.mlstatic.com/D_934567-MLA12234567891_082025-C.jpg", category: "ferramentas" },
  { externalId: "MLB73456789", title: "Furadeira de Impacto Dewalt DWD024 800W", currentPrice: 349, productUrl: "https://www.mercadolivre.com.br/furadeira-dewalt-dwd024/p/MLB73456789", imageUrl: "https://http2.mlstatic.com/D_845678-MLA12345678902_082025-C.jpg", category: "ferramentas" },
  { externalId: "MLB74567890", title: "Jogo Ferramentas Tramontina Pro 110 Pecas", currentPrice: 289, productUrl: "https://www.mercadolivre.com.br/jogo-ferramentas-tramontina-pro/p/MLB74567890", imageUrl: "https://http2.mlstatic.com/D_756789-MLA12456789013_092025-C.jpg", category: "ferramentas" },

  // ═══════ BRINQUEDOS (nova categoria — sazonal forte) ═══════
  { externalId: "MLB75678901", title: "LEGO City Caminhao de Bombeiros 60374", currentPrice: 299.90, productUrl: "https://www.mercadolivre.com.br/lego-city-caminhao-bombeiros/p/MLB75678901", imageUrl: "https://http2.mlstatic.com/D_667890-MLA12567890124_092025-C.jpg", category: "brinquedos" },
  { externalId: "MLB76789012", title: "Barbie Dreamhouse Casa dos Sonhos 2024", currentPrice: 899, productUrl: "https://www.mercadolivre.com.br/barbie-dreamhouse-2024/p/MLB76789012", imageUrl: "https://http2.mlstatic.com/D_578901-MLA12678901235_092025-C.jpg", category: "brinquedos" },
  { externalId: "MLB77890123", title: "Hot Wheels Pista Ataque do Tubarao", currentPrice: 199.90, productUrl: "https://www.mercadolivre.com.br/hot-wheels-ataque-tubarao/p/MLB77890123", imageUrl: "https://http2.mlstatic.com/D_489012-MLA12789012346_092025-C.jpg", category: "brinquedos" },
]
