/**
 * Fix missing categories on existing products using title-based inference.
 * Uses the same inferCategory() logic from lib/catalog/normalize.ts
 *
 * Usage: node scripts/fix-categories.mjs
 */
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Category keyword map (mirrors inferCategory from lib/catalog/normalize.ts)
const CATEGORY_KEYWORDS = {
  celulares: ['celular', 'smartphone', 'iphone', 'galaxy', 'motorola', 'xiaomi', 'samsung galaxy', 'redmi', 'poco'],
  notebooks: ['notebook', 'laptop', 'macbook', 'chromebook'],
  'smart-tvs': ['smart tv', 'televisor', 'tv led', 'tv 4k', 'tv oled', 'tv qled', 'tv 55', 'tv 50', 'tv 65'],
  audio: ['fone', 'headphone', 'earbuds', 'headset', 'caixa de som', 'soundbar', 'airpods', 'jbl', 'speaker'],
  games: ['playstation', 'ps5', 'ps4', 'xbox', 'nintendo', 'switch', 'console', 'controle gamer'],
  informatica: ['processador', 'placa de video', 'placa mae', 'ssd', 'hd externo', 'memoria ram', 'fonte', 'gabinete', 'cooler', 'cpu', 'ryzen', 'intel core', 'nvidia', 'rtx', 'gtx', 'radeon'],
  gamer: ['monitor gamer', 'cadeira gamer', 'teclado gamer', 'mouse gamer', 'mousepad', 'setup gamer'],
  casa: ['aspirador', 'air fryer', 'fritadeira', 'cafeteira', 'liquidificador', 'microondas', 'panela', 'frigideira', 'fog[aã]o', 'geladeira', 'lava', 'ferro de passar', 'ventilador', 'ar condicionado', 'purificador', 'batedeira', 'sanduicheira', 'extratora', 'climatizador', 'dispenser', 'jarra', 'pote de vidro', 'aparelho de jantar', 'toalha', 'garrafa squeeze', 'boia', 'sabonete', 'conjunto canecas'],
  esporte: ['corda de pular', 'haltere', 'caneleira', 'bicicleta', 'esteira', 'colchonete', 'luva box', 'tenis corrida', 'bola', 'raquete', 'balan[cç]a digital', 'carretilha', 'pesca', 'moto el[eé]trica', 'pr[eé]-treino', 'whey', 'creatina', 'prote[ií]na', 'suplemento'],
  beleza: ['perfume', 'maquiagem', 'base', 'batom', 'esmalte', 'depilador', 'secador', 'prancha', 'shampoo', 'condicionador', 'hidratante', 'protetor solar', 'ipl', 'lip gloss', 'corretivo', 'eau de parfum', 's[eé]rum', 'manteiga modeladora', 'la roche', 'eudora', 'mordedor'],
  relogios: ['relogio', 'smartwatch', 'apple watch', 'galaxy watch', 'garmin', 'tommy hilfiger'],
  tablets: ['tablet', 'ipad'],
  monitores: ['monitor', 'tela curva'],
  impressoras: ['impressora', 'toner', 'cartucho', 'scanner'],
  perifericos: ['teclado', 'mouse', 'webcam', 'hub usb', 'dock'],
  cameras: ['camera', 'gopro', 'drone', 'filmadora'],
  moveis: ['mesa', 'cadeira', 'estante', 'rack', 'sofa', 'colch[aã]o', 'cama', 'guarda-roupa', 'escrivaninha', 'carrinho multifuncional', 'quarto de beb[eê]'],
  infantil: ['brinquedo', 'carrinho beb', 'boneca', 'lego', 'piscina infantil', 'berco', 'banheira beb', 'pijama beb', 'mordedor', 'papinha', 'canguru beb', 'mochila canguru'],
  ferramentas: ['furadeira', 'parafusadeira', 'serra', 'chave', 'kit ferramenta', 'alicate'],
  livros: ['livro', 'kindle', 'e-reader', 'kobo', 'caneta', 'canetinha', 'giz de cera', 'marca texto'],
  brinquedos: ['nerf', 'hot wheels', 'barbie', 'playmobil', 'quebra-cabeca', 'jogo de tabuleiro', 'fazendo m[ií]mica', 'buba'],
  eletronicos: ['ring', 'alexa', 'echo', 'fire tv', 'chromecast', 'roku', 'pilha', 'bateria alcalina'],
}

async function main() {
  const uncategorized = await prisma.product.findMany({
    where: { status: 'ACTIVE', categoryId: null },
    select: { id: true, name: true },
  })

  console.log(`\n🔍 ${uncategorized.length} produtos sem categoria`)

  // Fetch all categories
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } })
  const catMap = new Map(categories.map(c => [c.slug, c.id]))

  let fixed = 0
  let unfixable = 0

  for (const product of uncategorized) {
    const name = product.name.toLowerCase()
    let matched = null

    for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      for (const kw of keywords) {
        const regex = new RegExp(kw, 'i')
        if (regex.test(name)) {
          matched = slug
          break
        }
      }
      if (matched) break
    }

    if (matched && catMap.has(matched)) {
      await prisma.product.update({
        where: { id: product.id },
        data: { categoryId: catMap.get(matched) },
      })
      fixed++
      if (fixed % 50 === 0) console.log(`  ✅ ${fixed} corrigidos...`)
    } else {
      unfixable++
    }
  }

  console.log(`\n✅ ${fixed} categorizados`)
  console.log(`❓ ${unfixable} não identificados (precisam categorização manual)`)

  // Also fix the "impressoras" mismatches
  const wrongImpressoras = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      category: { slug: 'impressoras' },
    },
    select: { id: true, name: true },
  })

  let recategorized = 0
  for (const p of wrongImpressoras) {
    const name = p.name.toLowerCase()
    if (!name.includes('impress') && !name.includes('toner') && !name.includes('cartucho') && !name.includes('print') && !name.includes('scanner')) {
      // Try to find correct category
      let newCat = null
      for (const [slug, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (slug === 'impressoras') continue
        for (const kw of keywords) {
          if (new RegExp(kw, 'i').test(name)) { newCat = slug; break }
        }
        if (newCat) break
      }
      if (newCat && catMap.has(newCat)) {
        await prisma.product.update({
          where: { id: p.id },
          data: { categoryId: catMap.get(newCat) },
        })
        recategorized++
        console.log(`  🔄 [impressoras → ${newCat}] ${p.name.slice(0, 50)}`)
      }
    }
  }

  console.log(`\n🔄 ${recategorized} recategorizados de impressoras`)

  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
