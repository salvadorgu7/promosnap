import prisma from '@/lib/db/prisma'
import { MercadoLivreAdapter } from '@/adapters/mercadolivre'

const ML_PRODUCTS = [
  // Celulares
  { externalId: "MLB51680761", brand: "oppo", title: "Smartphone Oppo A5 4G 256GB 6GB RAM Câmera 50MP Branco", price: 1499, originalPrice: 1799, image: "https://http2.mlstatic.com/D_Q_NP_2X_641800-MLA99507571550_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB51680761" },
  { externalId: "MLB56327005", brand: null, title: "Smartphone Infinix Smart 10 4GB 256GB Câmera 8MP Tela 6.67 120Hz Bateria 5000mAh", price: 1458, originalPrice: 1699, image: "https://http2.mlstatic.com/D_Q_NP_2X_964227-MLA100071062557_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB56327005" },
  { externalId: "MLB61373637", brand: "oppo", title: "Smartphone OPPO A60 256GB 8GB RAM 4G Vinho", price: 1699, originalPrice: 1999, image: "https://http2.mlstatic.com/D_Q_NP_2X_718127-MLA100070666423_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB61373637" },
  { externalId: "MLB63112201", brand: null, title: "Celular Smartphone Realme C73 256GB 8GB RAM Dual Sim 120Hz 6000mAh Verde", price: 1999, originalPrice: 2299, image: "https://http2.mlstatic.com/D_Q_NP_2X_999325-MLA102615422841_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB63112201" },
  { externalId: "MLB58841029", brand: "samsung", title: "Smartphone Samsung Galaxy A16 128GB 4GB RAM 5G Azul Claro", price: 1799, originalPrice: 2199, image: "https://http2.mlstatic.com/D_Q_NP_2X_859124-MLA100071066412_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB58841029" },
  { externalId: "MLB59012834", brand: "samsung", title: "Smartphone Samsung Galaxy S24 256GB 8GB RAM 5G Preto", price: 4299, originalPrice: 5499, image: "https://http2.mlstatic.com/D_Q_NP_2X_721834-MLA98201939102_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB59012834" },
  // Notebooks
  { externalId: "MLB60328223", brand: null, title: "Notebook Acer Aspire 16 com IA Intel Core Ultra 5 16GB RAM 512GB SSD", price: 4999, originalPrice: 5999, image: "https://http2.mlstatic.com/D_Q_NP_2X_661268-MLA101288694709_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB60328223" },
  { externalId: "MLB57503810", brand: null, title: "Notebook HP ProBook 14\" Intel Core Ultra 5-125U 16GB RAM SSD 512GB Windows 11", price: 6569, originalPrice: 7999, image: "https://http2.mlstatic.com/D_Q_NP_2X_798164-MLA98124845331_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB57503810" },
  { externalId: "MLB48952658", brand: null, title: "Notebook ASUS Vivobook 15 Intel Core i5 8GB RAM 256GB SSD Linux Tela 15.6\"", price: 3134, originalPrice: 3799, image: "https://http2.mlstatic.com/D_Q_NP_2X_605441-MLA99453690492_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB48952658" },
  { externalId: "MLB52907400", brand: null, title: "Notebook Vaio FE16 Intel Core i3-1315U Linux 8GB RAM 256GB SSD Tela 15.6\"", price: 2799, originalPrice: 3199, image: "https://http2.mlstatic.com/D_Q_NP_2X_843762-MLA99453456702_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB52907400" },
  { externalId: "MLB56961557", brand: null, title: "Notebook Lenovo IdeaPad 1 Intel Core i5-1235U 8GB RAM 512GB SSD Windows 11 15.6\"", price: 3499, originalPrice: 4199, image: "https://http2.mlstatic.com/D_Q_NP_2X_764821-MLA98123912031_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB56961557" },
  // Games / PS5
  { externalId: "MLB57081243", brand: "sony", title: "Console PlayStation 5 Slim Digital - Pacote Astro Bot e Gran Turismo 7 Branco", price: 3999, originalPrice: 4599, image: "https://http2.mlstatic.com/D_Q_NP_2X_658949-MLA97327917067_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB57081243" },
  { externalId: "MLB57083347", brand: "sony", title: "Console PlayStation 5 Slim Disk - Pacote Astro Bot e Gran Turismo 7 Branco", price: 4499, originalPrice: 4999, image: "https://http2.mlstatic.com/D_Q_NP_2X_945456-MLA99456386724_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB57083347" },
  { externalId: "MLB41975964", brand: "sony", title: "Sony PlayStation 5 Pro CFI-7020 2TB Digital Branco 2024", price: 8009, originalPrice: null, image: "https://http2.mlstatic.com/D_Q_NP_2X_727482-MLA99962144409_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB41975964" },
  { externalId: "MLB31067313", brand: "sony", title: "PlayStation 5 Slim Branco 1TB Versão Mídia Física", price: 4489, originalPrice: 4999, image: "https://http2.mlstatic.com/D_Q_NP_2X_846325-MLA99503539342_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB31067313" },
  // Smart TVs
  { externalId: "MLB51227402", brand: null, title: "Smart TV 55\" Philco 4K UHD Roku TV Dolby Audio P55CRA", price: 2839, originalPrice: 3499, image: "https://http2.mlstatic.com/D_Q_NP_2X_702929-MLA99465492694_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB51227402" },
  { externalId: "MLB19955269", brand: null, title: "Smart TV AIWA 32\" Android HD Borda Ultrafina HDR10 Dolby Áudio", price: 1399, originalPrice: 1699, image: "https://http2.mlstatic.com/D_Q_NP_2X_690159-MLA99542831560_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB19955269" },
  { externalId: "MLB48954893", brand: "samsung", title: "Smart TV Samsung Crystal UHD 4K 65\" U8100F 2025 Preto", price: 3989, originalPrice: 4999, image: "https://http2.mlstatic.com/D_Q_NP_2X_913386-MLA99989046449_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB48954893" },
  { externalId: "MLB57348074", brand: null, title: "Smart TV Philips 43\" Full HD Wi-Fi 43PFG6910/78", price: 2499, originalPrice: 2999, image: "https://http2.mlstatic.com/D_Q_NP_2X_882487-MLA92677639078_092025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB57348074" },
  { externalId: "MLB55927567", brand: null, title: "Smart TV LG 32\" LED HD 32RL601CBSA", price: 1399, originalPrice: 1799, image: "https://http2.mlstatic.com/D_Q_NP_2X_705266-MLA95938596400_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB55927567" },
  // Áudio
  { externalId: "MLB28827832", brand: "jbl", title: "Fone de Ouvido Sem Fio JBL Tune 720BT Azul Bluetooth", price: 365, originalPrice: 499, image: "https://http2.mlstatic.com/D_Q_NP_2X_664007-MLU77357211333_062024-E.webp", url: "https://www.mercadolivre.com.br/p/MLB28827832" },
  { externalId: "MLB45929271", brand: "jbl", title: "Fone de Ouvido Bluetooth JBL Tune Flex 2 Preto", price: 599, originalPrice: 799, image: "https://http2.mlstatic.com/D_Q_NP_2X_973601-MLA99939959693_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB45929271" },
  // Esportes
  { externalId: "MLB18679676", brand: "nike", title: "Tênis Nike Court Vision Low Next Nature Masculino", price: 599, originalPrice: 799, image: "https://http2.mlstatic.com/D_Q_NP_2X_832604-MLA95693142332_102025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB18679676" },
  { externalId: "MLB50359112", brand: null, title: "Robô Aspirador de Pó Velds 3 em 1 Varre Aspira e Passa Pano com Mapeamento", price: 1999, originalPrice: 2799, image: "https://http2.mlstatic.com/D_Q_NP_2X_768060-MLA99849794277_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB50359112" },
  // Casa
  { externalId: "MLB53308567", brand: null, title: "Robô Aspirador 3 em 1 Varre Aspira e Passa Pano Limpeza Giroscópica", price: 999, originalPrice: 1499, image: "https://http2.mlstatic.com/D_Q_NP_2X_637177-MLA107324926148_032026-E.webp", url: "https://www.mercadolivre.com.br/p/MLB53308567" },
  { externalId: "MLB45954581", brand: null, title: "Fritadeira Air Fryer Philco 4L Redstone 1500W PAF40A", price: 390, originalPrice: 549, image: "https://http2.mlstatic.com/D_Q_NP_2X_917068-MLA99920832137_112025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB45954581" },
  { externalId: "MLB22530387", brand: null, title: "Fritadeira Sem Óleo Air Fryer 4L Mondial 1500W AFN-40-BFT", price: 479, originalPrice: 649, image: "https://http2.mlstatic.com/D_Q_NP_2X_775407-MLA99776749612_122025-E.webp", url: "https://www.mercadolivre.com.br/p/MLB22530387" },
]

export async function POST() {
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
            imageUrl: p.image,
            productUrl: p.url,
            availability: 'IN_STOCK',
            rawPayloadJson: { seeded: true, collectedAt: new Date().toISOString() },
            lastSeenAt: new Date(),
          },
          update: { rawTitle: p.title, imageUrl: p.image, lastSeenAt: new Date() },
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
            isFreeShipping: true,
            affiliateUrl,
            isActive: true,
            offerScore,
          },
          update: {
            currentPrice: p.price,
            originalPrice: p.originalPrice ?? null,
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
        errors.push(`${p.externalId}: ${String(err)}`)
      }
    }

    return Response.json({ ok: true, upserted, total: ML_PRODUCTS.length, errors })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
